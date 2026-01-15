/**
 * Electron Preload Script
 *
 * Exposes secure, type-safe APIs to the renderer process using contextBridge.
 * All IPC communication between renderer and main process goes through here.
 */

import { contextBridge, ipcRenderer } from 'electron';
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
  InvokeChannel,
  ListenChannel,
  SaveBindingRequest,
  DeleteBindingRequest,
  OpenFileDialogOptions,
} from '../shared/types/ipc';
import {
  DeviceChannels,
  ProfileChannels,
  ConfigChannels,
  ActionChannels,
  AppChannels,
  DialogChannels,
  INVOKE_CHANNELS,
  LISTEN_CHANNELS,
} from '../shared/types/ipc';
import type { ButtonEvent, EncoderEvent } from '../shared/types/device';
import type { Action, ActionExecutionResult, ActionBinding } from '../shared/types/actions';
import type { AppConfig, Profile, DeviceSettings, AppSettings, IntegrationSettings } from '../shared/types/config';

// Type for wrapped IPC listener
type IpcListener = (event: Electron.IpcRendererEvent, ...args: unknown[]) => void;

// Store listener references for cleanup
const listenerMap = new Map<string, Map<(...args: unknown[]) => void, IpcListener>>();

/**
 * Validate that a channel is in the allowed list
 */
function validateInvokeChannel(channel: string): channel is InvokeChannel {
  return (INVOKE_CHANNELS as readonly string[]).includes(channel);
}

function validateListenChannel(channel: string): channel is ListenChannel {
  return (LISTEN_CHANNELS as readonly string[]).includes(channel);
}

/**
 * Subscribe to an IPC channel with cleanup tracking
 */
function subscribeToChannel<T>(
  channel: ListenChannel,
  callback: (data: T) => void
): () => void {
  // Wrap callback to extract args from event
  const wrappedCallback: IpcListener = (_event, data) => {
    callback(data as T);
  };

  // Store reference for cleanup
  if (!listenerMap.has(channel)) {
    listenerMap.set(channel, new Map());
  }
  listenerMap.get(channel)!.set(callback as (...args: unknown[]) => void, wrappedCallback);

  ipcRenderer.on(channel, wrappedCallback);

  // Return unsubscribe function
  return () => {
    const channelListeners = listenerMap.get(channel);
    if (channelListeners) {
      const wrapped = channelListeners.get(callback as (...args: unknown[]) => void);
      if (wrapped) {
        ipcRenderer.removeListener(channel, wrapped);
        channelListeners.delete(callback as (...args: unknown[]) => void);
      }
    }
  };
}

// ============================================================================
// Device API
// ============================================================================

const deviceAPI: DeviceAPI = {
  getStatus: (): Promise<DeviceStatus> => {
    return ipcRenderer.invoke(DeviceChannels.GET_STATUS);
  },

  connect: (): Promise<void> => {
    return ipcRenderer.invoke(DeviceChannels.CONNECT);
  },

  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke(DeviceChannels.DISCONNECT);
  },

  setBrightness: (brightness: number): Promise<void> => {
    return ipcRenderer.invoke(DeviceChannels.SET_BRIGHTNESS, brightness);
  },

  setButtonImage: (buttonIndex: number, imageData: string): Promise<void> => {
    return ipcRenderer.invoke(DeviceChannels.SET_BUTTON_IMAGE, { buttonIndex, imageData });
  },

  onConnected: (callback: () => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.CONNECTED, callback);
  },

  onDisconnected: (callback: () => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.DISCONNECTED, callback);
  },

  onButtonPress: (callback: (event: ButtonEvent) => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.BUTTON_PRESS, callback);
  },

  onButtonRelease: (callback: (event: ButtonEvent) => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.BUTTON_RELEASE, callback);
  },

  onEncoderRotate: (callback: (event: EncoderEvent) => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.ENCODER_ROTATE, callback);
  },

  onEncoderPress: (callback: (event: EncoderEvent) => void): (() => void) => {
    return subscribeToChannel(DeviceChannels.ENCODER_PRESS, callback);
  },
};

// ============================================================================
// Profile API
// ============================================================================

const profileAPI: ProfileAPI = {
  getAll: (): Promise<Profile[]> => {
    return ipcRenderer.invoke(ProfileChannels.GET_ALL);
  },

  getActive: (): Promise<Profile> => {
    return ipcRenderer.invoke(ProfileChannels.GET_ACTIVE);
  },

  setActive: (id: string): Promise<void> => {
    return ipcRenderer.invoke(ProfileChannels.SET_ACTIVE, id);
  },

  create: (name: string, description?: string): Promise<Profile> => {
    return ipcRenderer.invoke(ProfileChannels.CREATE, { name, description });
  },

  update: (
    id: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Profile> => {
    return ipcRenderer.invoke(ProfileChannels.UPDATE, { id, updates });
  },

  delete: (id: string): Promise<void> => {
    return ipcRenderer.invoke(ProfileChannels.DELETE, id);
  },

  duplicate: (id: string, newName: string): Promise<Profile> => {
    return ipcRenderer.invoke(ProfileChannels.DUPLICATE, { id, newName });
  },

  onChanged: (callback: (event: ProfileChangeEvent) => void): (() => void) => {
    return subscribeToChannel(ProfileChannels.CHANGED, callback);
  },
};

// ============================================================================
// Config API
// ============================================================================

const configAPI: ConfigAPI = {
  get: (): Promise<AppConfig> => {
    return ipcRenderer.invoke(ConfigChannels.GET);
  },

  set: (config: AppConfig): Promise<void> => {
    return ipcRenderer.invoke(ConfigChannels.SET, config);
  },

  getDeviceSettings: (): Promise<DeviceSettings> => {
    return ipcRenderer.invoke(ConfigChannels.GET_DEVICE_SETTINGS);
  },

  setDeviceSettings: (settings: DeviceSettings): Promise<void> => {
    return ipcRenderer.invoke(ConfigChannels.SET_DEVICE_SETTINGS, settings);
  },

  getAppSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke(ConfigChannels.GET_APP_SETTINGS);
  },

  setAppSettings: (settings: AppSettings): Promise<void> => {
    return ipcRenderer.invoke(ConfigChannels.SET_APP_SETTINGS, settings);
  },

  getIntegrations: (): Promise<IntegrationSettings> => {
    return ipcRenderer.invoke(ConfigChannels.GET_INTEGRATIONS);
  },

  setIntegrations: (settings: IntegrationSettings): Promise<void> => {
    return ipcRenderer.invoke(ConfigChannels.SET_INTEGRATIONS, settings);
  },

  reset: (): Promise<void> => {
    return ipcRenderer.invoke(ConfigChannels.RESET);
  },

  onChanged: (callback: (event: ConfigChangeEvent) => void): (() => void) => {
    return subscribeToChannel(ConfigChannels.CHANGED, callback);
  },
};

// ============================================================================
// Action API
// ============================================================================

const actionAPI: ActionAPI = {
  execute: (action: Action): Promise<ActionExecutionResult> => {
    return ipcRenderer.invoke(ActionChannels.EXECUTE, action);
  },

  getBindings: (profileId?: string): Promise<ActionBinding[]> => {
    return ipcRenderer.invoke(ActionChannels.GET_BINDINGS, profileId ? { profileId } : undefined);
  },

  saveBinding: (request: SaveBindingRequest): Promise<void> => {
    return ipcRenderer.invoke(ActionChannels.SAVE_BINDING, request);
  },

  deleteBinding: (request: DeleteBindingRequest): Promise<void> => {
    return ipcRenderer.invoke(ActionChannels.DELETE_BINDING, request);
  },
};

// ============================================================================
// Auto-Launch API
// ============================================================================

const autoLaunchAPI: AutoLaunchAPI = {
  getStatus: (): Promise<AutoLaunchStatusResponse> => {
    return ipcRenderer.invoke(AppChannels.GET_AUTO_LAUNCH_STATUS);
  },

  setEnabled: (enabled: boolean, startMinimized?: boolean): Promise<void> => {
    return ipcRenderer.invoke(AppChannels.SET_AUTO_LAUNCH, { enabled, startMinimized });
  },
};

// ============================================================================
// Dialog API
// ============================================================================

const dialogAPI: DialogAPI = {
  openFile: (options?: OpenFileDialogOptions): Promise<string[]> => {
    return ipcRenderer.invoke(DialogChannels.OPEN_FILE, options);
  },
};

// ============================================================================
// Full Electron API
// ============================================================================

const electronAPI: ElectronAPI = {
  // App info
  getVersion: () => ipcRenderer.invoke(AppChannels.GET_VERSION),
  getName: () => ipcRenderer.invoke(AppChannels.GET_NAME),

  // Domain-specific APIs
  device: deviceAPI,
  profile: profileAPI,
  config: configAPI,
  action: actionAPI,
  autoLaunch: autoLaunchAPI,
  dialog: dialogAPI,

  // Legacy openFileDialog for backwards compatibility with existing components
  openFileDialog: (options?: OpenFileDialogOptions): Promise<string[]> => {
    return ipcRenderer.invoke(DialogChannels.OPEN_FILE, options);
  },

  // Generic IPC invoke with channel validation
  invoke: async <T>(channel: InvokeChannel, ...args: unknown[]): Promise<T> => {
    if (!validateInvokeChannel(channel)) {
      throw new Error(`IPC channel "${channel}" is not allowed`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  // Subscribe to IPC events with channel validation
  on: (channel: ListenChannel, callback: (...args: unknown[]) => void): void => {
    if (!validateListenChannel(channel)) {
      throw new Error(`IPC channel "${channel}" is not allowed for listening`);
    }

    // Wrap callback to extract args from event
    const wrappedCallback: IpcListener = (_event, ...args) => {
      callback(...args);
    };

    // Store reference for cleanup
    if (!listenerMap.has(channel)) {
      listenerMap.set(channel, new Map());
    }
    listenerMap.get(channel)!.set(callback, wrappedCallback);

    ipcRenderer.on(channel, wrappedCallback);
  },

  // Unsubscribe from IPC events
  off: (channel: ListenChannel, callback: (...args: unknown[]) => void): void => {
    const channelListeners = listenerMap.get(channel);
    if (channelListeners) {
      const wrappedCallback = channelListeners.get(callback);
      if (wrappedCallback) {
        ipcRenderer.removeListener(channel, wrappedCallback);
        channelListeners.delete(callback);
      }
    }
  },

  // Subscribe to IPC events once
  once: (channel: ListenChannel, callback: (...args: unknown[]) => void): void => {
    if (!validateListenChannel(channel)) {
      throw new Error(`IPC channel "${channel}" is not allowed for listening`);
    }

    ipcRenderer.once(channel, (_event, ...args) => {
      callback(...args);
    });
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
