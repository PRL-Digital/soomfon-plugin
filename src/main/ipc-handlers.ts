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

// Services singleton instances
let hidManager: HIDManager | null = null;
let configManager: ConfigManager | null = null;
let profileManager: ProfileManager | null = null;
let actionEngine: ActionEngine | null = null;
let autoLaunchManager: AutoLaunchManager | null = null;

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
 * Initialize the Action Engine
 */
function initActionEngine(): ActionEngine {
  if (!actionEngine) {
    actionEngine = new ActionEngine();
    // Handlers are registered in the main index.ts after all modules are loaded
  }
  return actionEngine;
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

    if (!hid.isConnected()) {
      throw new Error('Device not connected');
    }

    // Update device settings
    config.updateDeviceSettings({ brightness });

    // TODO: Send brightness command to device via protocol
    // This will be implemented when integrating with soomfon-protocol.ts
  });

  ipcMain.handle(DeviceChannels.SET_BUTTON_IMAGE, async (_event, request: SetButtonImageRequest): Promise<void> => {
    const hid = initHidManager();

    if (!hid.isConnected()) {
      throw new Error('Device not connected');
    }

    // TODO: Send button image to device via image-processor.ts
    // This will be implemented when integrating with image transmission
    console.log(`Setting button ${request.buttonIndex} image`);
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
 * Clean up resources on app quit
 */
export function cleanupIpcHandlers(): void {
  if (hidManager) {
    hidManager.disconnect();
    hidManager = null;
  }
  configManager = null;
  profileManager = null;
  actionEngine = null;
  autoLaunchManager = null;
}
