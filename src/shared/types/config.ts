/**
 * Configuration Types
 * Type definitions for the configuration system including profiles, buttons, encoders, and settings
 */

import type { Action } from './actions';

/**
 * Button configuration for LCD buttons
 * LCD buttons can display images and have short and long press actions
 * When the shift button (small button 0) is held, shift actions are used instead
 */
export interface ButtonConfig {
  /** Button index (0-14 for 15-button layout) */
  index: number;
  /** Base64-encoded image data or path to image file */
  image?: string;
  /** Text label displayed on the button */
  label?: string;
  /** Action executed on button press */
  action?: Action;
  /** Action executed on long press */
  longPressAction?: Action;
  /** Action executed on button press while shift is held */
  shiftAction?: Action;
  /** Action executed on long press while shift is held */
  shiftLongPressAction?: Action;
  /** Time in milliseconds to trigger long press (default: 500) */
  longPressThreshold?: number;
}

/**
 * Encoder configuration for rotary encoders
 * Encoders have press, long press, and rotation actions
 * When the shift button (small button 0) is held, shift actions are used instead
 */
export interface EncoderConfig {
  /** Encoder index (0-2 for 3-encoder layout) */
  index: number;
  /** Action executed on encoder press */
  pressAction?: Action;
  /** Action executed on long press */
  longPressAction?: Action;
  /** Action executed on clockwise rotation */
  clockwiseAction?: Action;
  /** Action executed on counter-clockwise rotation */
  counterClockwiseAction?: Action;
  /** Action executed on encoder press while shift is held */
  shiftPressAction?: Action;
  /** Action executed on long press while shift is held */
  shiftLongPressAction?: Action;
  /** Action executed on clockwise rotation while shift is held */
  shiftClockwiseAction?: Action;
  /** Action executed on counter-clockwise rotation while shift is held */
  shiftCounterClockwiseAction?: Action;
  /** Time in milliseconds to trigger long press (default: 500) */
  longPressThreshold?: number;
}

/**
 * Profile containing button and encoder configurations
 * Profiles allow users to switch between different configurations
 */
export interface Profile {
  /** Unique identifier for the profile */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether this is the default profile */
  isDefault: boolean;
  /** Button configurations indexed by button index */
  buttons: ButtonConfig[];
  /** Encoder configurations indexed by encoder index */
  encoders: EncoderConfig[];
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Device-specific settings
 * Controls hardware behavior like brightness and sleep
 */
export interface DeviceSettings {
  /** Display brightness (0-100) */
  brightness: number;
  /** Sleep timeout in minutes (0 = never sleep) */
  sleepTimeout: number;
  /** Whether screensaver is enabled */
  screensaverEnabled: boolean;
}

/** Theme options for the application */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Language options */
export type Language = 'en' | 'zh' | 'de' | 'fr' | 'es' | 'ja' | 'ko';

/**
 * Application settings
 * Controls application behavior and appearance
 */
export interface AppSettings {
  /** Launch application on system startup */
  launchOnStartup: boolean;
  /** Minimize to system tray instead of taskbar */
  minimizeToTray: boolean;
  /** Close button minimizes to tray instead of exiting */
  closeToTray: boolean;
  /** Application theme */
  theme: ThemeMode;
  /** Interface language */
  language: Language;
}

/**
 * Home Assistant integration settings
 */
export interface HomeAssistantSettings {
  /** Whether the integration is enabled */
  enabled: boolean;
  /** Home Assistant server URL (e.g., http://homeassistant.local:8123) */
  url?: string;
  /** Long-lived access token for authentication */
  accessToken?: string;
}

/**
 * Node-RED integration settings
 */
export interface NodeRedSettings {
  /** Whether the integration is enabled */
  enabled: boolean;
  /** Node-RED server URL (e.g., http://localhost:1880) */
  url?: string;
  /** Authentication credentials (if required) */
  username?: string;
  password?: string;
}

/**
 * Integration settings for external services
 */
export interface IntegrationSettings {
  /** Home Assistant integration */
  homeAssistant: HomeAssistantSettings;
  /** Node-RED integration */
  nodeRed: NodeRedSettings;
}

/**
 * Root application configuration
 * This is the structure stored in electron-store
 */
export interface AppConfig {
  /** Configuration schema version for migrations */
  version: number;
  /** Available profiles */
  profiles: Profile[];
  /** ID of the currently active profile */
  activeProfileId: string;
  /** Device-specific settings */
  deviceSettings: DeviceSettings;
  /** Application settings */
  appSettings: AppSettings;
  /** External service integrations */
  integrations: IntegrationSettings;
}

/**
 * Default values for creating new configurations
 */
export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  brightness: 80,
  sleepTimeout: 5,
  screensaverEnabled: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchOnStartup: false,
  minimizeToTray: true,
  closeToTray: true,
  theme: 'system',
  language: 'en',
};

export const DEFAULT_HOME_ASSISTANT_SETTINGS: HomeAssistantSettings = {
  enabled: false,
};

export const DEFAULT_NODE_RED_SETTINGS: NodeRedSettings = {
  enabled: false,
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  homeAssistant: DEFAULT_HOME_ASSISTANT_SETTINGS,
  nodeRed: DEFAULT_NODE_RED_SETTINGS,
};

/** Current configuration schema version */
export const CONFIG_VERSION = 1;
