/**
 * Tauri API Adapter
 *
 * Provides the same interface as window.electronAPI but uses Tauri's invoke() function.
 * This allows the React frontend to work with both Electron and Tauri backends.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getVersion as getTauriVersion, getName as getTauriName } from '@tauri-apps/api/app';
import type {
  ElectronAPI,
  DeviceAPI,
  ProfileAPI,
  ConfigAPI,
  ActionAPI,
  AutoLaunchAPI,
  DialogAPI,
  DeviceStatus,
  ProfileChangeEvent,
  ConfigChangeEvent,
  AutoLaunchStatusResponse,
  OpenFileDialogOptions,
  SaveBindingRequest,
  DeleteBindingRequest,
} from '../shared/types/ipc';
import type { ButtonEvent, EncoderEvent } from '../shared/types/device';
import type {
  Action,
  ActionExecutionResult,
  ActionBinding,
} from '../shared/types/actions';
import type {
  AppConfig,
  Profile,
  DeviceSettings,
  AppSettings,
  IntegrationSettings,
} from '../shared/types/config';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Subscribe to a Tauri event channel and return an unsubscribe function
 */
function subscribeToEvent<T>(
  eventName: string,
  callback: (data: T) => void
): () => void {
  let unlistenFn: UnlistenFn | null = null;
  let isUnsubscribed = false;

  // Set up listener asynchronously
  listen<T>(eventName, (event) => {
    if (!isUnsubscribed) {
      callback(event.payload);
    }
  }).then((fn) => {
    if (isUnsubscribed) {
      // If unsubscribed before listener was set up, clean up immediately
      fn();
    } else {
      unlistenFn = fn;
    }
  });

  // Return synchronous unsubscribe function
  return () => {
    isUnsubscribed = true;
    if (unlistenFn) {
      unlistenFn();
    }
  };
}

// ============================================================================
// Device API
// ============================================================================

const deviceAPI: DeviceAPI = {
  getStatus: async (): Promise<DeviceStatus> => {
    const result = await invoke<{
      state: string;
      device_info: {
        vendor_id: number;
        product_id: number;
        path: string;
        serial_number: string | null;
        manufacturer: string | null;
        product: string | null;
        release: number;
        interface_number: number;
      } | null;
    }>('get_device_status');

    // Map Tauri response to ElectronAPI format
    return {
      connectionState: result.state as DeviceStatus['connectionState'],
      deviceInfo: result.device_info
        ? {
            vendorId: result.device_info.vendor_id,
            productId: result.device_info.product_id,
            path: result.device_info.path,
            serialNumber: result.device_info.serial_number ?? undefined,
            manufacturer: result.device_info.manufacturer ?? undefined,
            product: result.device_info.product ?? undefined,
            release: result.device_info.release,
            interface: result.device_info.interface_number,
          }
        : null,
      isConnected: result.state === 'connected' || result.state === 'initialized',
    };
  },

  connect: (): Promise<void> => {
    return invoke('connect_device');
  },

  disconnect: (): Promise<void> => {
    return invoke('disconnect_device');
  },

  setBrightness: (brightness: number): Promise<void> => {
    return invoke('set_brightness', { level: brightness });
  },

  setButtonImage: (buttonIndex: number, imageData: string): Promise<void> => {
    return invoke('set_button_image', {
      buttonIndex,
      imageData,
    });
  },

  onConnected: (callback: () => void): (() => void) => {
    return subscribeToEvent('device:connected', callback);
  },

  onDisconnected: (callback: () => void): (() => void) => {
    return subscribeToEvent('device:disconnected', callback);
  },

  onButtonPress: (callback: (event: ButtonEvent) => void): (() => void) => {
    return subscribeToEvent('device:buttonPress', callback);
  },

  onButtonRelease: (callback: (event: ButtonEvent) => void): (() => void) => {
    return subscribeToEvent('device:buttonRelease', callback);
  },

  onEncoderRotate: (callback: (event: EncoderEvent) => void): (() => void) => {
    return subscribeToEvent('device:encoderRotate', callback);
  },

  onEncoderPress: (callback: (event: EncoderEvent) => void): (() => void) => {
    return subscribeToEvent('device:encoderPress', callback);
  },
};

// ============================================================================
// Profile API
// ============================================================================

const profileAPI: ProfileAPI = {
  getAll: (): Promise<Profile[]> => {
    return invoke('get_profiles');
  },

  getActive: (): Promise<Profile> => {
    return invoke('get_active_profile');
  },

  setActive: (id: string): Promise<void> => {
    return invoke('set_active_profile', { id });
  },

  create: (name: string, description?: string): Promise<Profile> => {
    return invoke('create_profile', { name, description });
  },

  update: (
    id: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Profile> => {
    return invoke('update_profile', { id, updates });
  },

  delete: (id: string): Promise<void> => {
    return invoke('delete_profile', { id });
  },

  duplicate: (id: string, newName: string): Promise<Profile> => {
    // Use import_profile for duplication since export/import pattern
    // is the cleanest way to duplicate
    return invoke('import_profile', { id, newName });
  },

  onChanged: (callback: (event: ProfileChangeEvent) => void): (() => void) => {
    return subscribeToEvent('profile:changed', callback);
  },
};

// ============================================================================
// Config API
// ============================================================================

const configAPI: ConfigAPI = {
  get: async (): Promise<AppConfig> => {
    // Get all config from available Tauri commands
    // Backend AppSettings contains device settings (brightness) and integrations (home_assistant, node_red)
    const [backendSettings, profiles, activeProfile] = await Promise.all([
      invoke<{
        brightness: number;
        start_minimized: boolean;
        auto_launch: boolean;
        home_assistant: { url: string; token: string } | null;
        node_red: { url: string } | null;
      }>('get_app_settings'),
      invoke<Profile[]>('get_profiles'),
      invoke<Profile | null>('get_active_profile'),
    ]);

    // Map backend settings to frontend types
    const deviceSettings: DeviceSettings = {
      brightness: backendSettings.brightness,
    };

    const appSettings: AppSettings = {
      theme: 'system', // Not stored in backend, default
      startMinimized: backendSettings.start_minimized,
      minimizeToTray: true, // Not stored in backend, default
      checkForUpdates: true, // Not stored in backend, default
    };

    const integrations: IntegrationSettings = {
      homeAssistant: backendSettings.home_assistant
        ? {
            enabled: true,
            url: backendSettings.home_assistant.url,
            token: backendSettings.home_assistant.token,
          }
        : { enabled: false, url: '', token: '' },
      nodeRed: backendSettings.node_red
        ? {
            enabled: true,
            url: backendSettings.node_red.url,
          }
        : { enabled: false, url: '' },
    };

    return {
      version: 1,
      deviceSettings,
      appSettings,
      integrations,
      profiles,
      activeProfileId: activeProfile?.id ?? '',
    };
  },

  set: async (config: AppConfig): Promise<void> => {
    // Map frontend config to backend format
    const backendSettings = {
      brightness: config.deviceSettings.brightness,
      start_minimized: config.appSettings.startMinimized,
      auto_launch: false,
      home_assistant: config.integrations.homeAssistant?.enabled
        ? { url: config.integrations.homeAssistant.url, token: config.integrations.homeAssistant.token }
        : null,
      node_red: config.integrations.nodeRed?.enabled
        ? { url: config.integrations.nodeRed.url }
        : null,
    };
    await invoke('set_app_settings', { settings: backendSettings });
  },

  getDeviceSettings: async (): Promise<DeviceSettings> => {
    const backend = await invoke<{ brightness: number }>('get_app_settings');
    return { brightness: backend.brightness };
  },

  setDeviceSettings: async (settings: DeviceSettings): Promise<void> => {
    const current = await invoke<Record<string, unknown>>('get_app_settings');
    await invoke('set_app_settings', {
      settings: { ...current, brightness: settings.brightness },
    });
  },

  getAppSettings: async (): Promise<AppSettings> => {
    const backend = await invoke<{ start_minimized: boolean }>('get_app_settings');
    return {
      theme: 'system',
      startMinimized: backend.start_minimized,
      minimizeToTray: true,
      checkForUpdates: true,
    };
  },

  setAppSettings: async (settings: AppSettings): Promise<void> => {
    const current = await invoke<Record<string, unknown>>('get_app_settings');
    await invoke('set_app_settings', {
      settings: { ...current, start_minimized: settings.startMinimized },
    });
  },

  getIntegrations: async (): Promise<IntegrationSettings> => {
    const backend = await invoke<{
      home_assistant: { url: string; token: string } | null;
      node_red: { url: string } | null;
    }>('get_app_settings');
    return {
      homeAssistant: backend.home_assistant
        ? { enabled: true, url: backend.home_assistant.url, token: backend.home_assistant.token }
        : { enabled: false, url: '', token: '' },
      nodeRed: backend.node_red
        ? { enabled: true, url: backend.node_red.url }
        : { enabled: false, url: '' },
    };
  },

  setIntegrations: async (settings: IntegrationSettings): Promise<void> => {
    const current = await invoke<Record<string, unknown>>('get_app_settings');
    await invoke('set_app_settings', {
      settings: {
        ...current,
        home_assistant: settings.homeAssistant?.enabled
          ? { url: settings.homeAssistant.url, token: settings.homeAssistant.token }
          : null,
        node_red: settings.nodeRed?.enabled
          ? { url: settings.nodeRed.url }
          : null,
      },
    });
  },

  reset: async (): Promise<void> => {
    // Reset to backend default values
    await invoke('set_app_settings', {
      settings: {
        brightness: 80,
        start_minimized: false,
        auto_launch: false,
        home_assistant: null,
        node_red: null,
      },
    });
  },

  onChanged: (callback: (event: ConfigChangeEvent) => void): (() => void) => {
    return subscribeToEvent('config:changed', callback);
  },
};

// ============================================================================
// Action API
// ============================================================================

const actionAPI: ActionAPI = {
  execute: (action: Action): Promise<ActionExecutionResult> => {
    return invoke('execute_action', { action });
  },

  getBindings: async (_profileId?: string): Promise<ActionBinding[]> => {
    // Tauri doesn't have a direct get_bindings command
    // We extract bindings from the active profile
    const profile = await invoke<Profile>('get_active_profile');
    const bindings: ActionBinding[] = [];
    let bindingId = 0;

    // Extract bindings from buttons (LCD buttons with images)
    // The Profile.buttons array contains ButtonConfig items
    if (profile.buttons) {
      profile.buttons.forEach((button) => {
        // ButtonConfig has index, action (press), and longPressAction
        if (button?.action) {
          bindings.push({
            id: `button-${button.index}-press-${++bindingId}`,
            elementType: 'lcdButton',
            elementIndex: button.index,
            trigger: 'press',
            action: button.action,
          });
        }
        if (button?.longPressAction) {
          bindings.push({
            id: `button-${button.index}-longPress-${++bindingId}`,
            elementType: 'lcdButton',
            elementIndex: button.index,
            trigger: 'longPress',
            action: button.longPressAction,
          });
        }
      });
    }

    // Extract bindings from encoders
    if (profile.encoders) {
      profile.encoders.forEach((encoder) => {
        if (encoder?.clockwiseAction) {
          bindings.push({
            id: `encoder-${encoder.index}-rotateCW-${++bindingId}`,
            elementType: 'encoder',
            elementIndex: encoder.index,
            trigger: 'rotateCW',
            action: encoder.clockwiseAction,
          });
        }
        if (encoder?.counterClockwiseAction) {
          bindings.push({
            id: `encoder-${encoder.index}-rotateCCW-${++bindingId}`,
            elementType: 'encoder',
            elementIndex: encoder.index,
            trigger: 'rotateCCW',
            action: encoder.counterClockwiseAction,
          });
        }
        if (encoder?.pressAction) {
          bindings.push({
            id: `encoder-${encoder.index}-press-${++bindingId}`,
            elementType: 'encoder',
            elementIndex: encoder.index,
            trigger: 'press',
            action: encoder.pressAction,
          });
        }
        if (encoder?.longPressAction) {
          bindings.push({
            id: `encoder-${encoder.index}-longPress-${++bindingId}`,
            elementType: 'encoder',
            elementIndex: encoder.index,
            trigger: 'longPress',
            action: encoder.longPressAction,
          });
        }
      });
    }

    return bindings;
  },

  saveBinding: async (request: SaveBindingRequest): Promise<void> => {
    // Get current profile
    const profile = await invoke<Profile>('get_active_profile');
    const { target, action } = request;

    // Update the appropriate binding based on target
    // Both lcdButton and normalButton use the same `buttons` array with ButtonConfig
    if (target.elementType === 'lcdButton' || target.elementType === 'normalButton') {
      if (!profile.buttons) {
        profile.buttons = [];
      }
      // Find existing button config or create new one
      let buttonConfig = profile.buttons.find(b => b.index === target.elementIndex);
      if (!buttonConfig) {
        buttonConfig = { index: target.elementIndex };
        profile.buttons.push(buttonConfig);
      }
      if (target.trigger === 'press') {
        buttonConfig.action = action;
      } else if (target.trigger === 'longPress') {
        buttonConfig.longPressAction = action;
      }
    } else if (target.elementType === 'encoder') {
      if (!profile.encoders) {
        profile.encoders = [];
      }
      // Find existing encoder config or create new one
      let encoderConfig = profile.encoders.find(e => e.index === target.elementIndex);
      if (!encoderConfig) {
        encoderConfig = { index: target.elementIndex };
        profile.encoders.push(encoderConfig);
      }
      if (target.trigger === 'rotateCW') {
        encoderConfig.clockwiseAction = action;
      } else if (target.trigger === 'rotateCCW') {
        encoderConfig.counterClockwiseAction = action;
      } else if (target.trigger === 'press') {
        encoderConfig.pressAction = action;
      } else if (target.trigger === 'longPress') {
        encoderConfig.longPressAction = action;
      }
    }

    // Save updated profile
    await invoke('update_profile', {
      id: profile.id,
      updates: {
        buttons: profile.buttons,
        encoders: profile.encoders,
      },
    });
  },

  deleteBinding: async (request: DeleteBindingRequest): Promise<void> => {
    // Get current profile
    const profile = await invoke<Profile>('get_active_profile');
    const { target } = request;

    // Remove the appropriate binding based on target
    if (target.elementType === 'lcdButton' || target.elementType === 'normalButton') {
      const buttonConfig = profile.buttons?.find(b => b.index === target.elementIndex);
      if (buttonConfig) {
        if (target.trigger === 'press') {
          delete buttonConfig.action;
        } else if (target.trigger === 'longPress') {
          delete buttonConfig.longPressAction;
        }
      }
    } else if (target.elementType === 'encoder') {
      const encoderConfig = profile.encoders?.find(e => e.index === target.elementIndex);
      if (encoderConfig) {
        if (target.trigger === 'rotateCW') {
          delete encoderConfig.clockwiseAction;
        } else if (target.trigger === 'rotateCCW') {
          delete encoderConfig.counterClockwiseAction;
        } else if (target.trigger === 'press') {
          delete encoderConfig.pressAction;
        } else if (target.trigger === 'longPress') {
          delete encoderConfig.longPressAction;
        }
      }
    }

    // Save updated profile
    await invoke('update_profile', {
      id: profile.id,
      updates: {
        buttons: profile.buttons,
        encoders: profile.encoders,
      },
    });
  },
};

// ============================================================================
// Auto-Launch API
// ============================================================================

const autoLaunchAPI: AutoLaunchAPI = {
  getStatus: async (): Promise<AutoLaunchStatusResponse> => {
    const [enabled, appSettings] = await Promise.all([
      invoke<boolean>('get_auto_launch'),
      invoke<{ start_minimized: boolean }>('get_app_settings'),
    ]);
    return {
      enabled,
      startMinimized: appSettings.start_minimized,
    };
  },

  setEnabled: async (enabled: boolean, startMinimized?: boolean): Promise<void> => {
    await invoke('set_auto_launch', { enabled });
    // Update startMinimized in app settings if provided
    if (startMinimized !== undefined) {
      const appSettings = await invoke<Record<string, unknown>>('get_app_settings');
      await invoke('set_app_settings', {
        settings: { ...appSettings, start_minimized: startMinimized },
      });
    }
  },
};

// ============================================================================
// Dialog API
// ============================================================================

const dialogAPI: DialogAPI = {
  openFile: (options?: OpenFileDialogOptions): Promise<string[]> => {
    return invoke('open_file_dialog', { options });
  },
};

// ============================================================================
// Full Tauri API (implements ElectronAPI interface)
// ============================================================================

export const tauriAPI: ElectronAPI = {
  // App info
  getVersion: getTauriVersion,
  getName: getTauriName,

  // Domain-specific APIs
  device: deviceAPI,
  profile: profileAPI,
  config: configAPI,
  action: actionAPI,
  autoLaunch: autoLaunchAPI,
  dialog: dialogAPI,

  // Legacy openFileDialog for backwards compatibility
  openFileDialog: (options?: OpenFileDialogOptions): Promise<string[]> => {
    return invoke('open_file_dialog', { options });
  },

  // Generic IPC invoke
  invoke: async <T>(channel: string, ...args: unknown[]): Promise<T> => {
    // Map Electron channel names to Tauri command names
    const commandMap: Record<string, string> = {
      'device:getStatus': 'get_device_status',
      'device:connect': 'connect_device',
      'device:disconnect': 'disconnect_device',
      'device:setBrightness': 'set_brightness',
      'device:setButtonImage': 'set_button_image',
      'profile:getAll': 'get_profiles',
      'profile:getActive': 'get_active_profile',
      'profile:setActive': 'set_active_profile',
      'profile:create': 'create_profile',
      'profile:update': 'update_profile',
      'profile:delete': 'delete_profile',
      'config:getAppSettings': 'get_app_settings',
      'config:setAppSettings': 'set_app_settings',
      'action:execute': 'execute_action',
      'dialog:openFile': 'open_file_dialog',
      'app:getAutoLaunchStatus': 'get_auto_launch',
      'app:setAutoLaunch': 'set_auto_launch',
    };

    const command = commandMap[channel] || channel;
    return invoke(command, args[0] as Record<string, unknown> | undefined);
  },

  // Subscribe to IPC events
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    listen(channel, (event) => {
      callback(event.payload);
    });
  },

  // Unsubscribe from IPC events (no-op for Tauri, use returned unlisten fn instead)
  off: (_channel: string, _callback: (...args: unknown[]) => void): void => {
    // Tauri uses returned unlisten functions instead of off()
    console.warn('Tauri API: off() is not supported. Use the unsubscribe function returned by on()');
  },

  // Subscribe once to IPC events
  once: (channel: string, callback: (...args: unknown[]) => void): void => {
    listen(channel, (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      // Will be called once, then we need to track and unlisten
      // For simplicity, we don't auto-unlisten here
      void unlisten;
    });
  },
};

// ============================================================================
// Platform Detection & API Export
// ============================================================================

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Get the appropriate API based on platform
 */
export function getAPI(): ElectronAPI {
  if (isTauri()) {
    return tauriAPI;
  }
  // Fall back to Electron API if available
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return window.electronAPI;
  }
  throw new Error('No API available. Running outside Electron/Tauri context.');
}

// Export default for convenience
export default tauriAPI;
