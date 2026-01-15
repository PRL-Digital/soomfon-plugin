/**
 * IPC Handlers
 * Main process IPC handlers for device, profile, config, and action operations
 */

import { ipcMain, BrowserWindow } from 'electron';
import {
  DeviceChannels,
  ProfileChannels,
  ConfigChannels,
  ActionChannels,
  AppChannels,
} from '../shared/types/ipc';
import type {
  DeviceStatus,
  SetButtonImageRequest,
  CreateProfileRequest,
  UpdateProfileRequest,
  DuplicateProfileRequest,
  ProfileChangeEvent,
  ConfigChangeEvent,
  AutoLaunchStatusResponse,
  SetAutoLaunchRequest,
} from '../shared/types/ipc';
import type { Action, ActionExecutionResult } from '../shared/types/actions';
import type { AppConfig, DeviceSettings, AppSettings, IntegrationSettings, Profile } from '../shared/types/config';
import { ConnectionState } from '../shared/types/device';

// Import core modules
import { HIDManager } from '../core/device/hid-manager';
import { ConfigManager, createConfigManager } from '../core/config/config-manager';
import { ProfileManager, createProfileManager } from '../core/config/profile-manager';
import { ActionEngine } from '../core/actions/action-engine';
import { AutoLaunchManager, getAutoLaunchManager } from './auto-launch';
import { SoomfonProtocol } from '../core/device/soomfon-protocol';
import { ImageProcessor } from '../core/device/image-processor';
import { DeviceEventParser } from '../core/device/device-events';
import { EventBinder, createEventBinder } from '../core/actions/event-binder';
import type { ActionBinding, ElementType, ButtonTrigger, EncoderTrigger } from '../shared/types/actions';
import type { ButtonConfig, EncoderConfig } from '../shared/types/config';

// Import action handlers
import { KeyboardHandler } from '../core/actions/handlers/keyboard-handler';
import { LaunchHandler } from '../core/actions/handlers/launch-handler';
import { ScriptHandler } from '../core/actions/handlers/script-handler';
import { HttpHandler } from '../core/actions/handlers/http-handler';
import { MediaHandler } from '../core/actions/handlers/media-handler';
import { SystemHandler } from '../core/actions/handlers/system-handler';

// Services singleton instances
let hidManager: HIDManager | null = null;
let configManager: ConfigManager | null = null;
let profileManager: ProfileManager | null = null;
let actionEngine: ActionEngine | null = null;
let autoLaunchManager: AutoLaunchManager | null = null;
let soomfonProtocol: SoomfonProtocol | null = null;
let deviceEventParser: DeviceEventParser | null = null;
let eventBinder: EventBinder | null = null;

/**
 * Get the main browser window for sending events
 */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

/**
 * Send an event to the renderer process
 */
function sendToRenderer(channel: string, ...args: unknown[]): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

/**
 * Initialize the HID Manager with event forwarding
 */
function initHidManager(): HIDManager {
  if (!hidManager) {
    hidManager = new HIDManager();

    // Forward device events to renderer
    hidManager.on('connected', () => {
      sendToRenderer(DeviceChannels.CONNECTED);
    });

    hidManager.on('disconnected', () => {
      sendToRenderer(DeviceChannels.DISCONNECTED);
    });

    hidManager.on('error', (error) => {
      console.error('HID Manager error:', error);
    });
  }
  return hidManager;
}

/**
 * Initialize the Config Manager
 */
function initConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = createConfigManager();

    // Forward config change events to renderer
    configManager.onChange((changeType, newValue, _oldValue) => {
      const event: ConfigChangeEvent = { changeType, newValue };
      sendToRenderer(ConfigChannels.CHANGED, event);
    });
  }
  return configManager;
}

/**
 * Initialize the Profile Manager with event forwarding
 */
function initProfileManager(): ProfileManager {
  const config = initConfigManager();
  if (!profileManager) {
    profileManager = createProfileManager(config);

    // Forward profile events to renderer
    profileManager.onEvent((eventType, profile, metadata) => {
      const event: ProfileChangeEvent = {
        eventType: eventType.replace('profile:', '') as ProfileChangeEvent['eventType'],
        profile,
        sourceProfileId: metadata?.sourceProfileId,
      };
      sendToRenderer(ProfileChannels.CHANGED, event);
    });
  }
  return profileManager;
}

/**
 * Initialize the Action Engine with all handlers registered
 */
function initActionEngine(): ActionEngine {
  if (!actionEngine) {
    actionEngine = new ActionEngine();

    // Register all action handlers
    actionEngine.registerHandler(new KeyboardHandler());
    actionEngine.registerHandler(new LaunchHandler());
    actionEngine.registerHandler(new ScriptHandler());
    actionEngine.registerHandler(new HttpHandler());
    actionEngine.registerHandler(new MediaHandler());
    actionEngine.registerHandler(new SystemHandler());

    console.log('ActionEngine initialized with handlers:', actionEngine.getRegisteredTypes());
  }
  return actionEngine;
}

/**
 * Initialize the Soomfon Protocol
 */
function initSoomfonProtocol(): SoomfonProtocol {
  const hid = initHidManager();
  if (!soomfonProtocol) {
    soomfonProtocol = new SoomfonProtocol(hid);
  }
  return soomfonProtocol;
}

/**
 * Initialize the Device Event Parser
 */
function initDeviceEventParser(): DeviceEventParser {
  if (!deviceEventParser) {
    deviceEventParser = new DeviceEventParser();
  }
  return deviceEventParser;
}

/**
 * Initialize the Event Binder
 */
function initEventBinder(): EventBinder {
  if (!eventBinder) {
    const engine = initActionEngine();
    eventBinder = createEventBinder(engine);

    // Log binding matches and executions for debugging
    eventBinder.on('binding:matched', (binding, event) => {
      console.log(`Binding matched: ${binding.elementType}[${binding.elementIndex}].${binding.trigger}`);
    });

    eventBinder.on('binding:executed', (binding, result) => {
      console.log(`Action executed: ${binding.action.type} - ${result.status}`);
    });

    eventBinder.on('binding:error', (binding, error) => {
      console.error(`Action execution error: ${error.message}`);
    });

    eventBinder.on('binding:notFound', (event) => {
      // Silent - no binding configured for this event
    });
  }
  return eventBinder;
}

/**
 * Convert a ButtonConfig to ActionBinding(s)
 * Creates bindings for press and longPress actions
 */
function buttonConfigToBindings(button: ButtonConfig): ActionBinding[] {
  const bindings: ActionBinding[] = [];
  const elementType: ElementType = button.index < 6 ? 'lcdButton' : 'normalButton';
  const elementIndex = button.index < 6 ? button.index : button.index - 6;

  if (button.action) {
    bindings.push({
      id: `button-${button.index}-press`,
      elementType,
      elementIndex,
      trigger: 'press' as ButtonTrigger,
      action: button.action,
    });
  }

  if (button.longPressAction) {
    bindings.push({
      id: `button-${button.index}-longPress`,
      elementType,
      elementIndex,
      trigger: 'longPress' as ButtonTrigger,
      action: button.longPressAction,
    });
  }

  return bindings;
}

/**
 * Convert an EncoderConfig to ActionBinding(s)
 * Creates bindings for press, longPress, clockwise, and counter-clockwise actions
 */
function encoderConfigToBindings(encoder: EncoderConfig): ActionBinding[] {
  const bindings: ActionBinding[] = [];

  if (encoder.pressAction) {
    bindings.push({
      id: `encoder-${encoder.index}-press`,
      elementType: 'encoder',
      elementIndex: encoder.index,
      trigger: 'press' as EncoderTrigger,
      action: encoder.pressAction,
    });
  }

  if (encoder.longPressAction) {
    bindings.push({
      id: `encoder-${encoder.index}-longPress`,
      elementType: 'encoder',
      elementIndex: encoder.index,
      trigger: 'press' as EncoderTrigger, // Note: EventBinder doesn't have longPress for encoder in EncoderTrigger type
      action: encoder.longPressAction,
    });
  }

  if (encoder.clockwiseAction) {
    bindings.push({
      id: `encoder-${encoder.index}-cw`,
      elementType: 'encoder',
      elementIndex: encoder.index,
      trigger: 'rotateCW' as EncoderTrigger,
      action: encoder.clockwiseAction,
    });
  }

  if (encoder.counterClockwiseAction) {
    bindings.push({
      id: `encoder-${encoder.index}-ccw`,
      elementType: 'encoder',
      elementIndex: encoder.index,
      trigger: 'rotateCCW' as EncoderTrigger,
      action: encoder.counterClockwiseAction,
    });
  }

  return bindings;
}

/**
 * Load bindings from the active profile into the EventBinder
 */
function loadBindingsFromProfile(): void {
  const pm = initProfileManager();
  const binder = initEventBinder();

  try {
    const activeProfile = pm.getActive();
    const allBindings: ActionBinding[] = [];

    // Convert button configs to bindings
    for (const button of activeProfile.buttons) {
      allBindings.push(...buttonConfigToBindings(button));
    }

    // Convert encoder configs to bindings
    for (const encoder of activeProfile.encoders) {
      allBindings.push(...encoderConfigToBindings(encoder));
    }

    binder.loadBindings(allBindings);
    console.log(`Loaded ${allBindings.length} bindings from profile: ${activeProfile.name}`);
  } catch (error) {
    console.error('Failed to load bindings from profile:', error);
  }
}

/**
 * Initialize the Auto-Launch Manager
 */
function initAutoLaunchManager(): AutoLaunchManager {
  if (!autoLaunchManager) {
    autoLaunchManager = getAutoLaunchManager();
  }
  return autoLaunchManager;
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // ============================================================================
  // App Handlers
  // ============================================================================

  ipcMain.handle(AppChannels.GET_VERSION, () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  ipcMain.handle(AppChannels.GET_NAME, () => {
    const { app } = require('electron');
    return app.getName();
  });

  ipcMain.handle(AppChannels.GET_AUTO_LAUNCH_STATUS, async (): Promise<AutoLaunchStatusResponse> => {
    const manager = initAutoLaunchManager();
    return manager.getStatus();
  });

  ipcMain.handle(AppChannels.SET_AUTO_LAUNCH, async (_event, request: SetAutoLaunchRequest): Promise<void> => {
    const manager = initAutoLaunchManager();
    await manager.setEnabled(request.enabled, { startMinimized: request.startMinimized });

    // Also update the config to keep it in sync
    const config = initConfigManager();
    const appSettings = config.getAppSettings();
    config.setAppSettings({
      ...appSettings,
      launchOnStartup: request.enabled,
    });
  });

  // ============================================================================
  // Device Handlers
  // ============================================================================

  ipcMain.handle(DeviceChannels.GET_STATUS, (): DeviceStatus => {
    const hid = initHidManager();
    return {
      connectionState: hid.getConnectionState(),
      deviceInfo: hid.getDeviceInfo(),
      isConnected: hid.isConnected(),
    };
  });

  ipcMain.handle(DeviceChannels.CONNECT, async (): Promise<void> => {
    const hid = initHidManager();
    await hid.connect();
  });

  ipcMain.handle(DeviceChannels.DISCONNECT, (): void => {
    const hid = initHidManager();
    hid.disconnect();
  });

  ipcMain.handle(DeviceChannels.SET_BRIGHTNESS, async (_event, brightness: number): Promise<void> => {
    const hid = initHidManager();
    const config = initConfigManager();
    const protocol = initSoomfonProtocol();

    if (!hid.isConnected()) {
      throw new Error('Device not connected');
    }

    // Validate brightness
    if (brightness < 0 || brightness > 100) {
      throw new Error('Brightness must be between 0 and 100');
    }

    // Update device settings
    config.updateDeviceSettings({ brightness });

    // Send brightness command to device
    await protocol.setBrightness(brightness);
    console.log(`Brightness set to ${brightness}%`);
  });

  ipcMain.handle(DeviceChannels.SET_BUTTON_IMAGE, async (_event, request: SetButtonImageRequest): Promise<void> => {
    const hid = initHidManager();
    const protocol = initSoomfonProtocol();

    if (!hid.isConnected()) {
      throw new Error('Device not connected');
    }

    // Validate button index
    if (request.buttonIndex < 0 || request.buttonIndex > 5) {
      throw new Error('Button index must be between 0 and 5 for LCD buttons');
    }

    // Decode Base64 image data to Buffer
    const imageBuffer = Buffer.from(request.imageData, 'base64');

    // Process image to RGB565 format (72x72)
    const processedImage = await ImageProcessor.processImage(imageBuffer);

    // Send image to device
    await protocol.setButtonImage(request.buttonIndex, processedImage);
    console.log(`Button ${request.buttonIndex} image set successfully`);
  });

  // ============================================================================
  // Profile Handlers
  // ============================================================================

  ipcMain.handle(ProfileChannels.GET_ALL, (): Profile[] => {
    const pm = initProfileManager();
    return pm.list();
  });

  ipcMain.handle(ProfileChannels.GET_ACTIVE, (): Profile => {
    const pm = initProfileManager();
    return pm.getActive();
  });

  ipcMain.handle(ProfileChannels.SET_ACTIVE, (_event, id: string): void => {
    const pm = initProfileManager();
    pm.setActive(id);
  });

  ipcMain.handle(ProfileChannels.CREATE, (_event, request: CreateProfileRequest): Profile => {
    const pm = initProfileManager();
    return pm.create(request.name, { description: request.description });
  });

  ipcMain.handle(ProfileChannels.UPDATE, (_event, request: UpdateProfileRequest): Profile => {
    const pm = initProfileManager();
    return pm.update(request.id, request.updates);
  });

  ipcMain.handle(ProfileChannels.DELETE, (_event, id: string): void => {
    const pm = initProfileManager();
    pm.delete(id);
  });

  ipcMain.handle(ProfileChannels.DUPLICATE, (_event, request: DuplicateProfileRequest): Profile => {
    const pm = initProfileManager();
    return pm.duplicate(request.id, request.newName);
  });

  // ============================================================================
  // Config Handlers
  // ============================================================================

  ipcMain.handle(ConfigChannels.GET, (): AppConfig => {
    const config = initConfigManager();
    return config.getConfig();
  });

  ipcMain.handle(ConfigChannels.SET, (_event, newConfig: AppConfig): void => {
    const config = initConfigManager();
    config.setConfig(newConfig);
  });

  ipcMain.handle(ConfigChannels.GET_DEVICE_SETTINGS, (): DeviceSettings => {
    const config = initConfigManager();
    return config.getDeviceSettings();
  });

  ipcMain.handle(ConfigChannels.SET_DEVICE_SETTINGS, (_event, settings: DeviceSettings): void => {
    const config = initConfigManager();
    config.setDeviceSettings(settings);
  });

  ipcMain.handle(ConfigChannels.GET_APP_SETTINGS, (): AppSettings => {
    const config = initConfigManager();
    return config.getAppSettings();
  });

  ipcMain.handle(ConfigChannels.SET_APP_SETTINGS, (_event, settings: AppSettings): void => {
    const config = initConfigManager();
    config.setAppSettings(settings);
  });

  ipcMain.handle(ConfigChannels.GET_INTEGRATIONS, (): IntegrationSettings => {
    const config = initConfigManager();
    return config.getIntegrations();
  });

  ipcMain.handle(ConfigChannels.SET_INTEGRATIONS, (_event, settings: IntegrationSettings): void => {
    const config = initConfigManager();
    config.setIntegrations(settings);
  });

  ipcMain.handle(ConfigChannels.RESET, (): void => {
    const config = initConfigManager();
    config.reset();
  });

  // ============================================================================
  // Action Handlers
  // ============================================================================

  ipcMain.handle(ActionChannels.EXECUTE, async (_event, action: Action): Promise<ActionExecutionResult> => {
    const engine = initActionEngine();
    return engine.execute(action);
  });
}

/**
 * Get the HID Manager instance (for use by other modules)
 */
export function getHidManager(): HIDManager {
  return initHidManager();
}

/**
 * Get the Config Manager instance (for use by other modules)
 */
export function getConfigManager(): ConfigManager {
  return initConfigManager();
}

/**
 * Get the Profile Manager instance (for use by other modules)
 */
export function getProfileManager(): ProfileManager {
  return initProfileManager();
}

/**
 * Get the Action Engine instance (for use by other modules)
 */
export function getActionEngine(): ActionEngine {
  return initActionEngine();
}

/**
 * Get the Auto-Launch Manager instance (for use by other modules)
 */
export function getAutoLaunchManagerInstance(): AutoLaunchManager {
  return initAutoLaunchManager();
}

/**
 * Wire up the event processing pipeline
 * HIDManager -> DeviceEventParser -> EventBinder -> ActionEngine
 */
export function wireEventPipeline(): void {
  const hid = initHidManager();
  const parser = initDeviceEventParser();
  const binder = initEventBinder();

  // Wire HID data events to parser
  hid.on('data', (data: Buffer) => {
    parser.parseData(data);
  });

  // Wire parser button events to event binder
  parser.on('button', async (event) => {
    try {
      // Forward to renderer for UI feedback
      sendToRenderer(DeviceChannels.BUTTON_PRESS, event);

      // Execute action via event binder
      await binder.handleButtonEvent(event);
    } catch (error) {
      console.error('Error handling button event:', error);
    }
  });

  // Wire parser encoder events to event binder
  parser.on('encoder', async (event) => {
    try {
      // Forward to renderer for UI feedback
      sendToRenderer(DeviceChannels.ENCODER_ROTATE, event);

      // Execute action via event binder
      await binder.handleEncoderEvent(event);
    } catch (error) {
      console.error('Error handling encoder event:', error);
    }
  });

  // Load initial bindings from active profile
  loadBindingsFromProfile();

  // Subscribe to profile changes to reload bindings
  const pm = initProfileManager();
  pm.onEvent((eventType, _profile, _metadata) => {
    if (eventType === 'profile:activated' || eventType === 'profile:updated') {
      loadBindingsFromProfile();
    }
  });

  console.log('Event processing pipeline wired successfully');
}

/**
 * Get the Event Binder instance (for use by other modules)
 */
export function getEventBinder(): EventBinder {
  return initEventBinder();
}

/**
 * Get the Soomfon Protocol instance (for use by other modules)
 */
export function getSoomfonProtocol(): SoomfonProtocol {
  return initSoomfonProtocol();
}

/**
 * Clean up resources on app quit
 */
export function cleanupIpcHandlers(): void {
  if (deviceEventParser) {
    deviceEventParser.reset();
    deviceEventParser = null;
  }
  if (eventBinder) {
    eventBinder.clearBindings();
    eventBinder = null;
  }
  if (hidManager) {
    hidManager.disconnect();
    hidManager = null;
  }
  soomfonProtocol = null;
  configManager = null;
  profileManager = null;
  actionEngine = null;
  autoLaunchManager = null;
}
