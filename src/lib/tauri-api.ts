/**
 * Tauri API Adapter
 *
 * Provides the same interface as window.electronAPI but uses Tauri's invoke() function.
 * This allows the React frontend to work with both Electron and Tauri backends.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
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
        serial_number: string | null;
        manufacturer: string | null;
        product: string | null;
      } | null;
    }>('get_device_status');

    // Map Tauri response to ElectronAPI format
    return {
      connectionState: result.state as DeviceStatus['connectionState'],
      deviceInfo: result.device_info
        ? {
            vendorId: result.device_info.vendor_id,
            productId: result.device_info.product_id,
            serialNumber: result.device_info.serial_number ?? undefined,
            manufacturer: result.device_info.manufacturer ?? undefined,
            product: result.device_info.product ?? undefined,
          }
        : null,
      isConnected: result.state === 'connected',
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
    // Tauri doesn't have a single "get all config" command
    // We need to assemble it from individual getters
    const [deviceSettings, appSettings, integrations, profiles, activeProfile] =
      await Promise.all([
        invoke<DeviceSettings>('get_app_settings'), // Note: this gets app settings in Tauri
        invoke<AppSettings>('get_app_settings'),
        invoke<IntegrationSettings>('get_app_settings'),
        invoke<Profile[]>('get_profiles'),
        invoke<Profile>('get_active_profile'),
      ]);

    return {
      version: '1.0.0', // TODO: Get from Tauri
      deviceSettings,
      appSettings,
      integrations,
      profiles,
      activeProfileId: activeProfile.id,
    };
  },

  set: async (config: AppConfig): Promise<void> => {
    // Set individual config sections
    await Promise.all([
      invoke('set_app_settings', { settings: config.appSettings }),
    ]);
  },

  getDeviceSettings: (): Promise<DeviceSettings> => {
    // Device settings are part of app settings in Tauri
    return invoke('get_app_settings');
  },

  setDeviceSettings: (settings: DeviceSettings): Promise<void> => {
    return invoke('set_app_settings', { settings });
  },

  getAppSettings: (): Promise<AppSettings> => {
    return invoke('get_app_settings');
  },

  setAppSettings: (settings: AppSettings): Promise<void> => {
    return invoke('set_app_settings', { settings });
  },

  getIntegrations: (): Promise<IntegrationSettings> => {
    // Integrations are part of app settings in Tauri
    return invoke('get_app_settings');
  },

  setIntegrations: (settings: IntegrationSettings): Promise<void> => {
    return invoke('set_app_settings', { settings });
  },

  reset: (): Promise<void> => {
    // Reset by setting default values
    return invoke('set_app_settings', {
      settings: {
        theme: 'system',
        startMinimized: false,
        minimizeToTray: true,
        checkForUpdates: true,
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

    // Extract bindings from profile configuration
    if (profile.lcdButtons) {
      profile.lcdButtons.forEach((button, index) => {
        if (button?.pressAction) {
          bindings.push({
            elementType: 'lcdButton',
            elementIndex: index,
            trigger: 'press',
            action: button.pressAction,
          });
        }
        if (button?.longPressAction) {
          bindings.push({
            elementType: 'lcdButton',
            elementIndex: index,
            trigger: 'longPress',
            action: button.longPressAction,
          });
        }
      });
    }

    if (profile.normalButtons) {
      profile.normalButtons.forEach((button, index) => {
        if (button?.pressAction) {
          bindings.push({
            elementType: 'normalButton',
            elementIndex: index,
            trigger: 'press',
            action: button.pressAction,
          });
        }
        if (button?.longPressAction) {
          bindings.push({
            elementType: 'normalButton',
            elementIndex: index,
            trigger: 'longPress',
            action: button.longPressAction,
          });
        }
      });
    }

    if (profile.encoders) {
      profile.encoders.forEach((encoder, index) => {
        if (encoder?.clockwiseAction) {
          bindings.push({
            elementType: 'encoder',
            elementIndex: index,
            trigger: 'rotateCW',
            action: encoder.clockwiseAction,
          });
        }
        if (encoder?.counterClockwiseAction) {
          bindings.push({
            elementType: 'encoder',
            elementIndex: index,
            trigger: 'rotateCCW',
            action: encoder.counterClockwiseAction,
          });
        }
        if (encoder?.pressAction) {
          bindings.push({
            elementType: 'encoder',
            elementIndex: index,
            trigger: 'press',
            action: encoder.pressAction,
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
    if (target.elementType === 'lcdButton') {
      if (!profile.lcdButtons) {
        profile.lcdButtons = [];
      }
      if (!profile.lcdButtons[target.elementIndex]) {
        profile.lcdButtons[target.elementIndex] = {};
      }
      if (target.trigger === 'press') {
        profile.lcdButtons[target.elementIndex].pressAction = action;
      } else if (target.trigger === 'longPress') {
        profile.lcdButtons[target.elementIndex].longPressAction = action;
      }
    } else if (target.elementType === 'normalButton') {
      if (!profile.normalButtons) {
        profile.normalButtons = [];
      }
      if (!profile.normalButtons[target.elementIndex]) {
        profile.normalButtons[target.elementIndex] = {};
      }
      if (target.trigger === 'press') {
        profile.normalButtons[target.elementIndex].pressAction = action;
      } else if (target.trigger === 'longPress') {
        profile.normalButtons[target.elementIndex].longPressAction = action;
      }
    } else if (target.elementType === 'encoder') {
      if (!profile.encoders) {
        profile.encoders = [];
      }
      if (!profile.encoders[target.elementIndex]) {
        profile.encoders[target.elementIndex] = {};
      }
      if (target.trigger === 'rotateCW') {
        profile.encoders[target.elementIndex].clockwiseAction = action;
      } else if (target.trigger === 'rotateCCW') {
        profile.encoders[target.elementIndex].counterClockwiseAction = action;
      } else if (target.trigger === 'press') {
        profile.encoders[target.elementIndex].pressAction = action;
      }
    }

    // Save updated profile
    await invoke('update_profile', {
      id: profile.id,
      updates: {
        lcdButtons: profile.lcdButtons,
        normalButtons: profile.normalButtons,
        encoders: profile.encoders,
      },
    });
  },

  deleteBinding: async (request: DeleteBindingRequest): Promise<void> => {
    // Get current profile
    const profile = await invoke<Profile>('get_active_profile');
    const { target } = request;

    // Remove the appropriate binding based on target
    if (target.elementType === 'lcdButton' && profile.lcdButtons?.[target.elementIndex]) {
      if (target.trigger === 'press') {
        delete profile.lcdButtons[target.elementIndex].pressAction;
      } else if (target.trigger === 'longPress') {
        delete profile.lcdButtons[target.elementIndex].longPressAction;
      }
    } else if (target.elementType === 'normalButton' && profile.normalButtons?.[target.elementIndex]) {
      if (target.trigger === 'press') {
        delete profile.normalButtons[target.elementIndex].pressAction;
      } else if (target.trigger === 'longPress') {
        delete profile.normalButtons[target.elementIndex].longPressAction;
      }
    } else if (target.elementType === 'encoder' && profile.encoders?.[target.elementIndex]) {
      if (target.trigger === 'rotateCW') {
        delete profile.encoders[target.elementIndex].clockwiseAction;
      } else if (target.trigger === 'rotateCCW') {
        delete profile.encoders[target.elementIndex].counterClockwiseAction;
      } else if (target.trigger === 'press') {
        delete profile.encoders[target.elementIndex].pressAction;
      }
    }

    // Save updated profile
    await invoke('update_profile', {
      id: profile.id,
      updates: {
        lcdButtons: profile.lcdButtons,
        normalButtons: profile.normalButtons,
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
    const enabled = await invoke<boolean>('get_auto_launch');
    return {
      enabled,
      startMinimized: false, // TODO: Get from app settings
    };
  },

  setEnabled: async (enabled: boolean, _startMinimized?: boolean): Promise<void> => {
    await invoke('set_auto_launch', { enabled });
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
  getVersion: async () => {
    // TODO: Get from Tauri app info
    return '0.1.0';
  },
  getName: async () => {
    return 'SOOMFON Controller';
  },

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
