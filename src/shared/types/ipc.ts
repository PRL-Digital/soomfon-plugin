/**
 * IPC Channel Type Definitions
 * Type-safe IPC channel names and payload types for Electron main-to-renderer communication
 */

import type { Action, ActionExecutionResult, ActionBinding } from './actions';
import type { AppConfig, Profile, DeviceSettings, AppSettings, IntegrationSettings } from './config';
import type { ConnectionState, DeviceInfo, ButtonEvent, EncoderEvent } from './device';

// ============================================================================
// IPC Channel Names
// ============================================================================

/** Device-related IPC channels */
export const DeviceChannels = {
  // Invoke channels (renderer -> main -> renderer)
  GET_STATUS: 'device:getStatus',
  CONNECT: 'device:connect',
  DISCONNECT: 'device:disconnect',
  SET_BRIGHTNESS: 'device:setBrightness',
  SET_BUTTON_IMAGE: 'device:setButtonImage',
  // Listen channels (main -> renderer)
  CONNECTED: 'device:connected',
  DISCONNECTED: 'device:disconnected',
  BUTTON_PRESS: 'device:buttonPress',
  BUTTON_RELEASE: 'device:buttonRelease',
  ENCODER_ROTATE: 'device:encoderRotate',
  ENCODER_PRESS: 'device:encoderPress',
} as const;

/** Action-related IPC channels */
export const ActionChannels = {
  // Invoke channels
  EXECUTE: 'action:execute',
  GET_BINDINGS: 'action:getBindings',
  SAVE_BINDING: 'action:saveBinding',
  DELETE_BINDING: 'action:deleteBinding',
} as const;

/** Dialog-related IPC channels */
export const DialogChannels = {
  OPEN_FILE: 'dialog:openFile',
} as const;

/** Profile-related IPC channels */
export const ProfileChannels = {
  // Invoke channels
  GET_ALL: 'profile:getAll',
  GET_ACTIVE: 'profile:getActive',
  SET_ACTIVE: 'profile:setActive',
  CREATE: 'profile:create',
  UPDATE: 'profile:update',
  DELETE: 'profile:delete',
  DUPLICATE: 'profile:duplicate',
  // Listen channels
  CHANGED: 'profile:changed',
} as const;

/** Config-related IPC channels */
export const ConfigChannels = {
  // Invoke channels
  GET: 'config:get',
  SET: 'config:set',
  GET_DEVICE_SETTINGS: 'config:getDeviceSettings',
  SET_DEVICE_SETTINGS: 'config:setDeviceSettings',
  GET_APP_SETTINGS: 'config:getAppSettings',
  SET_APP_SETTINGS: 'config:setAppSettings',
  GET_INTEGRATIONS: 'config:getIntegrations',
  SET_INTEGRATIONS: 'config:setIntegrations',
  RESET: 'config:reset',
  // Listen channels
  CHANGED: 'config:changed',
} as const;

/** App-related IPC channels */
export const AppChannels = {
  GET_VERSION: 'app:getVersion',
  GET_NAME: 'app:getName',
  // Auto-launch channels
  GET_AUTO_LAUNCH_STATUS: 'app:getAutoLaunchStatus',
  SET_AUTO_LAUNCH: 'app:setAutoLaunch',
} as const;

// ============================================================================
// Channel Lists for Preload Security
// ============================================================================

/** All invoke channels that the renderer can call */
export const INVOKE_CHANNELS = [
  // App
  AppChannels.GET_VERSION,
  AppChannels.GET_NAME,
  AppChannels.GET_AUTO_LAUNCH_STATUS,
  AppChannels.SET_AUTO_LAUNCH,
  // Device
  DeviceChannels.GET_STATUS,
  DeviceChannels.CONNECT,
  DeviceChannels.DISCONNECT,
  DeviceChannels.SET_BRIGHTNESS,
  DeviceChannels.SET_BUTTON_IMAGE,
  // Action
  ActionChannels.EXECUTE,
  ActionChannels.GET_BINDINGS,
  ActionChannels.SAVE_BINDING,
  ActionChannels.DELETE_BINDING,
  // Profile
  ProfileChannels.GET_ALL,
  ProfileChannels.GET_ACTIVE,
  ProfileChannels.SET_ACTIVE,
  ProfileChannels.CREATE,
  ProfileChannels.UPDATE,
  ProfileChannels.DELETE,
  ProfileChannels.DUPLICATE,
  // Config
  ConfigChannels.GET,
  ConfigChannels.SET,
  ConfigChannels.GET_DEVICE_SETTINGS,
  ConfigChannels.SET_DEVICE_SETTINGS,
  ConfigChannels.GET_APP_SETTINGS,
  ConfigChannels.SET_APP_SETTINGS,
  ConfigChannels.GET_INTEGRATIONS,
  ConfigChannels.SET_INTEGRATIONS,
  ConfigChannels.RESET,
  // Dialog
  DialogChannels.OPEN_FILE,
] as const;

/** All listen channels that the renderer can subscribe to */
export const LISTEN_CHANNELS = [
  // Device events
  DeviceChannels.CONNECTED,
  DeviceChannels.DISCONNECTED,
  DeviceChannels.BUTTON_PRESS,
  DeviceChannels.BUTTON_RELEASE,
  DeviceChannels.ENCODER_ROTATE,
  DeviceChannels.ENCODER_PRESS,
  // Profile events
  ProfileChannels.CHANGED,
  // Config events
  ConfigChannels.CHANGED,
] as const;

// ============================================================================
// IPC Payload Types
// ============================================================================

/** Device status returned by GET_STATUS */
export interface DeviceStatus {
  connectionState: ConnectionState;
  deviceInfo: DeviceInfo | null;
  isConnected: boolean;
}

/** Button image set request */
export interface SetButtonImageRequest {
  buttonIndex: number;
  imageData: string; // Base64 encoded image
}

/** Profile create request */
export interface CreateProfileRequest {
  name: string;
  description?: string;
}

/** Profile update request */
export interface UpdateProfileRequest {
  id: string;
  updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>;
}

/** Profile duplicate request */
export interface DuplicateProfileRequest {
  id: string;
  newName: string;
}

/** Config change event payload */
export interface ConfigChangeEvent {
  changeType: 'deviceSettings' | 'appSettings' | 'integrations' | 'profiles' | 'activeProfile' | 'full';
  newValue: unknown;
}

/** Profile change event payload */
export interface ProfileChangeEvent {
  eventType: 'created' | 'updated' | 'deleted' | 'duplicated' | 'activated';
  profile: Profile;
  sourceProfileId?: string;
}

/** Auto-launch status response */
export interface AutoLaunchStatusResponse {
  enabled: boolean;
  startMinimized: boolean;
  error?: string;
}

/** Auto-launch set request */
export interface SetAutoLaunchRequest {
  enabled: boolean;
  startMinimized?: boolean;
}

/** Element binding target - identifies where an action should be saved */
export interface BindingTarget {
  /** Type of element */
  elementType: 'lcdButton' | 'normalButton' | 'encoder';
  /** Index of the element (0-5 for LCD buttons, 0-2 for normal buttons, 0-2 for encoders) */
  elementIndex: number;
  /** Trigger type for the binding (uses EncoderTrigger naming convention for rotation) */
  trigger: 'press' | 'longPress' | 'rotateCW' | 'rotateCCW';
}

/** Save binding request */
export interface SaveBindingRequest {
  /** Optional profile ID. If not provided, uses active profile */
  profileId?: string;
  /** Target element and trigger */
  target: BindingTarget;
  /** Action to bind */
  action: Action;
}

/** Delete binding request */
export interface DeleteBindingRequest {
  /** Optional profile ID. If not provided, uses active profile */
  profileId?: string;
  /** Target element and trigger */
  target: BindingTarget;
}

/** Get bindings request */
export interface GetBindingsRequest {
  /** Optional profile ID. If not provided, uses active profile */
  profileId?: string;
}

/** File dialog options */
export interface OpenFileDialogOptions {
  /** Dialog title */
  title?: string;
  /** Default path to open */
  defaultPath?: string;
  /** File filters */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  /** Dialog properties */
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

// ============================================================================
// IPC Handler Types (for main process)
// ============================================================================

/** Device IPC handlers */
export interface DeviceIpcHandlers {
  [DeviceChannels.GET_STATUS]: () => Promise<DeviceStatus>;
  [DeviceChannels.CONNECT]: () => Promise<void>;
  [DeviceChannels.DISCONNECT]: () => Promise<void>;
  [DeviceChannels.SET_BRIGHTNESS]: (brightness: number) => Promise<void>;
  [DeviceChannels.SET_BUTTON_IMAGE]: (request: SetButtonImageRequest) => Promise<void>;
}

/** Action IPC handlers */
export interface ActionIpcHandlers {
  [ActionChannels.EXECUTE]: (action: Action) => Promise<ActionExecutionResult>;
  [ActionChannels.GET_BINDINGS]: (request?: GetBindingsRequest) => Promise<ActionBinding[]>;
  [ActionChannels.SAVE_BINDING]: (request: SaveBindingRequest) => Promise<void>;
  [ActionChannels.DELETE_BINDING]: (request: DeleteBindingRequest) => Promise<void>;
}

/** Dialog IPC handlers */
export interface DialogIpcHandlers {
  [DialogChannels.OPEN_FILE]: (options?: OpenFileDialogOptions) => Promise<string[]>;
}

/** Profile IPC handlers */
export interface ProfileIpcHandlers {
  [ProfileChannels.GET_ALL]: () => Promise<Profile[]>;
  [ProfileChannels.GET_ACTIVE]: () => Promise<Profile>;
  [ProfileChannels.SET_ACTIVE]: (id: string) => Promise<void>;
  [ProfileChannels.CREATE]: (request: CreateProfileRequest) => Promise<Profile>;
  [ProfileChannels.UPDATE]: (request: UpdateProfileRequest) => Promise<Profile>;
  [ProfileChannels.DELETE]: (id: string) => Promise<void>;
  [ProfileChannels.DUPLICATE]: (request: DuplicateProfileRequest) => Promise<Profile>;
}

/** Config IPC handlers */
export interface ConfigIpcHandlers {
  [ConfigChannels.GET]: () => Promise<AppConfig>;
  [ConfigChannels.SET]: (config: AppConfig) => Promise<void>;
  [ConfigChannels.GET_DEVICE_SETTINGS]: () => Promise<DeviceSettings>;
  [ConfigChannels.SET_DEVICE_SETTINGS]: (settings: DeviceSettings) => Promise<void>;
  [ConfigChannels.GET_APP_SETTINGS]: () => Promise<AppSettings>;
  [ConfigChannels.SET_APP_SETTINGS]: (settings: AppSettings) => Promise<void>;
  [ConfigChannels.GET_INTEGRATIONS]: () => Promise<IntegrationSettings>;
  [ConfigChannels.SET_INTEGRATIONS]: (settings: IntegrationSettings) => Promise<void>;
  [ConfigChannels.RESET]: () => Promise<void>;
}

// ============================================================================
// Electron API Types (for renderer process)
// ============================================================================

/** Type-safe invoke function signature */
export type InvokeChannel = typeof INVOKE_CHANNELS[number];
export type ListenChannel = typeof LISTEN_CHANNELS[number];

/** Device API exposed to renderer */
export interface DeviceAPI {
  getStatus: () => Promise<DeviceStatus>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setBrightness: (brightness: number) => Promise<void>;
  setButtonImage: (buttonIndex: number, imageData: string) => Promise<void>;
  onConnected: (callback: () => void) => () => void;
  onDisconnected: (callback: () => void) => () => void;
  onButtonPress: (callback: (event: ButtonEvent) => void) => () => void;
  onButtonRelease: (callback: (event: ButtonEvent) => void) => () => void;
  onEncoderRotate: (callback: (event: EncoderEvent) => void) => () => void;
  onEncoderPress: (callback: (event: EncoderEvent) => void) => () => void;
}

/** Profile API exposed to renderer */
export interface ProfileAPI {
  getAll: () => Promise<Profile[]>;
  getActive: () => Promise<Profile>;
  setActive: (id: string) => Promise<void>;
  create: (name: string, description?: string) => Promise<Profile>;
  update: (id: string, updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Profile>;
  delete: (id: string) => Promise<void>;
  duplicate: (id: string, newName: string) => Promise<Profile>;
  onChanged: (callback: (event: ProfileChangeEvent) => void) => () => void;
}

/** Config API exposed to renderer */
export interface ConfigAPI {
  get: () => Promise<AppConfig>;
  set: (config: AppConfig) => Promise<void>;
  getDeviceSettings: () => Promise<DeviceSettings>;
  setDeviceSettings: (settings: DeviceSettings) => Promise<void>;
  getAppSettings: () => Promise<AppSettings>;
  setAppSettings: (settings: AppSettings) => Promise<void>;
  getIntegrations: () => Promise<IntegrationSettings>;
  setIntegrations: (settings: IntegrationSettings) => Promise<void>;
  reset: () => Promise<void>;
  onChanged: (callback: (event: ConfigChangeEvent) => void) => () => void;
}

/** Action API exposed to renderer */
export interface ActionAPI {
  execute: (action: Action) => Promise<ActionExecutionResult>;
  getBindings: (profileId?: string) => Promise<ActionBinding[]>;
  saveBinding: (request: SaveBindingRequest) => Promise<void>;
  deleteBinding: (request: DeleteBindingRequest) => Promise<void>;
}

/** Dialog API exposed to renderer */
export interface DialogAPI {
  openFile: (options?: OpenFileDialogOptions) => Promise<string[]>;
}

/** Auto-launch API exposed to renderer */
export interface AutoLaunchAPI {
  getStatus: () => Promise<AutoLaunchStatusResponse>;
  setEnabled: (enabled: boolean, startMinimized?: boolean) => Promise<void>;
}

/** Complete Electron API exposed to renderer */
export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getName: () => Promise<string>;
  // Domain-specific APIs
  device: DeviceAPI;
  profile: ProfileAPI;
  config: ConfigAPI;
  action: ActionAPI;
  autoLaunch: AutoLaunchAPI;
  dialog: DialogAPI;
  // Legacy openFileDialog for backwards compatibility
  openFileDialog?: (options?: OpenFileDialogOptions) => Promise<string[]>;
  // Generic IPC (for advanced usage)
  invoke: <T>(channel: InvokeChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: ListenChannel, callback: (...args: unknown[]) => void) => void;
  off: (channel: ListenChannel, callback: (...args: unknown[]) => void) => void;
  once: (channel: ListenChannel, callback: (...args: unknown[]) => void) => void;
}
