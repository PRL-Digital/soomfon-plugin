/**
 * Configuration Validation Schemas
 * Zod schemas for validating configuration data
 */

import { z } from 'zod';
import { actionSchema } from '../actions/schemas';
import { validateImageInput, MAX_BASE64_STRING_LENGTH } from '../../shared/utils/validation';

// ============================================================================
// Constants for validation
// ============================================================================

/** Maximum button index (15-button layout: 0-14) */
export const MAX_BUTTON_INDEX = 14;

/** Maximum encoder index (3-encoder layout: 0-2) */
export const MAX_ENCODER_INDEX = 2;

/** Minimum brightness value */
export const MIN_BRIGHTNESS = 0;

/** Maximum brightness value */
export const MAX_BRIGHTNESS = 100;

/** Default long press threshold in milliseconds */
export const DEFAULT_LONG_PRESS_THRESHOLD = 500;

/** Maximum label length */
const MAX_LABEL_LENGTH = 255;

// ============================================================================
// Image Validation Schema
// ============================================================================

/**
 * Image data schema with format validation
 * Accepts either base64-encoded image data (with optional data URL prefix)
 * or a file path to an image file
 */
export const imageDataSchema = z.string()
  .max(MAX_BASE64_STRING_LENGTH, `Image data too large (max ${MAX_BASE64_STRING_LENGTH} characters)`)
  .refine(
    (value) => {
      const result = validateImageInput(value);
      return result.isValid;
    },
    (value) => {
      const result = validateImageInput(value);
      return { message: 'error' in result ? result.error : 'warnings' in result ? result.warnings.join('; ') : 'Invalid image data' };
    }
  )
  .optional();

// ============================================================================
// Button Configuration Schema
// ============================================================================

/**
 * Button configuration schema for LCD buttons
 * Validates button index range (0-14), image data, labels, and actions
 */
export const buttonConfigSchema = z.object({
  /** Button index (0-14 for 15-button layout) */
  index: z.number()
    .int('Button index must be an integer')
    .min(0, 'Button index must be at least 0')
    .max(MAX_BUTTON_INDEX, `Button index must be at most ${MAX_BUTTON_INDEX}`),
  /** Base64-encoded image data or path to image file */
  image: imageDataSchema,
  /** Text label displayed on the button */
  label: z.string().max(MAX_LABEL_LENGTH, `Label too long (max ${MAX_LABEL_LENGTH} characters)`).optional(),
  /** Action executed on button press */
  action: actionSchema.optional(),
  /** Action executed on long press */
  longPressAction: actionSchema.optional(),
  /** Time in milliseconds to trigger long press (default: 500) */
  longPressThreshold: z.number()
    .int('Long press threshold must be an integer')
    .positive('Long press threshold must be positive')
    .default(DEFAULT_LONG_PRESS_THRESHOLD)
    .optional(),
});

// ============================================================================
// Encoder Configuration Schema
// ============================================================================

/**
 * Encoder configuration schema for rotary encoders
 * Validates encoder index range (0-2) and all encoder actions
 */
export const encoderConfigSchema = z.object({
  /** Encoder index (0-2 for 3-encoder layout) */
  index: z.number()
    .int('Encoder index must be an integer')
    .min(0, 'Encoder index must be at least 0')
    .max(MAX_ENCODER_INDEX, `Encoder index must be at most ${MAX_ENCODER_INDEX}`),
  /** Action executed on encoder press */
  pressAction: actionSchema.optional(),
  /** Action executed on long press */
  longPressAction: actionSchema.optional(),
  /** Action executed on clockwise rotation */
  clockwiseAction: actionSchema.optional(),
  /** Action executed on counter-clockwise rotation */
  counterClockwiseAction: actionSchema.optional(),
  /** Time in milliseconds to trigger long press (default: 500) */
  longPressThreshold: z.number()
    .int('Long press threshold must be an integer')
    .positive('Long press threshold must be positive')
    .default(DEFAULT_LONG_PRESS_THRESHOLD)
    .optional(),
});

// ============================================================================
// Profile Schema
// ============================================================================

/** ISO 8601 date string schema */
const iso8601DateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO 8601 date string' }
);

/**
 * Profile schema containing button and encoder configurations
 */
export const profileSchema = z.object({
  /** Unique identifier for the profile */
  id: z.string().min(1, 'Profile ID is required'),
  /** Human-readable name */
  name: z.string().min(1, 'Profile name is required'),
  /** Optional description */
  description: z.string().optional(),
  /** Whether this is the default profile */
  isDefault: z.boolean(),
  /** Button configurations */
  buttons: z.array(buttonConfigSchema),
  /** Encoder configurations */
  encoders: z.array(encoderConfigSchema),
  /** Creation timestamp (ISO 8601) */
  createdAt: iso8601DateSchema,
  /** Last update timestamp (ISO 8601) */
  updatedAt: iso8601DateSchema,
});

// ============================================================================
// Device Settings Schema
// ============================================================================

/**
 * Device settings schema for hardware configuration
 */
export const deviceSettingsSchema = z.object({
  /** Display brightness (0-100) */
  brightness: z.number()
    .int('Brightness must be an integer')
    .min(MIN_BRIGHTNESS, `Brightness must be at least ${MIN_BRIGHTNESS}`)
    .max(MAX_BRIGHTNESS, `Brightness must be at most ${MAX_BRIGHTNESS}`),
  /** Sleep timeout in minutes (0 = never sleep) */
  sleepTimeout: z.number()
    .int('Sleep timeout must be an integer')
    .nonnegative('Sleep timeout must be non-negative'),
  /** Whether screensaver is enabled */
  screensaverEnabled: z.boolean(),
});

// ============================================================================
// App Settings Schema
// ============================================================================

/** Theme mode schema */
export const themeModeSchema = z.enum(['light', 'dark', 'system']);

/** Language schema */
export const languageSchema = z.enum(['en', 'zh', 'de', 'fr', 'es', 'ja', 'ko']);

/**
 * Application settings schema
 */
export const appSettingsSchema = z.object({
  /** Launch application on system startup */
  launchOnStartup: z.boolean(),
  /** Minimize to system tray instead of taskbar */
  minimizeToTray: z.boolean(),
  /** Close button minimizes to tray instead of exiting */
  closeToTray: z.boolean(),
  /** Application theme */
  theme: themeModeSchema,
  /** Interface language */
  language: languageSchema,
});

// ============================================================================
// Integration Settings Schemas
// ============================================================================

/**
 * Home Assistant settings schema
 */
export const homeAssistantSettingsSchema = z.object({
  /** Whether the integration is enabled */
  enabled: z.boolean(),
  /** Home Assistant server URL */
  url: z.string().url('Invalid Home Assistant URL').optional(),
  /** Long-lived access token for authentication */
  accessToken: z.string().optional(),
}).refine(
  (data) => {
    // If enabled, url and accessToken should be provided
    if (data.enabled) {
      return data.url !== undefined && data.accessToken !== undefined;
    }
    return true;
  },
  { message: 'URL and access token are required when Home Assistant is enabled' }
);

/**
 * Node-RED settings schema
 */
export const nodeRedSettingsSchema = z.object({
  /** Whether the integration is enabled */
  enabled: z.boolean(),
  /** Node-RED server URL */
  url: z.string().url('Invalid Node-RED URL').optional(),
  /** Authentication username */
  username: z.string().optional(),
  /** Authentication password */
  password: z.string().optional(),
}).refine(
  (data) => {
    // If enabled, url should be provided
    if (data.enabled) {
      return data.url !== undefined;
    }
    return true;
  },
  { message: 'URL is required when Node-RED is enabled' }
);

/**
 * Integration settings schema
 */
export const integrationSettingsSchema = z.object({
  /** Home Assistant integration */
  homeAssistant: homeAssistantSettingsSchema,
  /** Node-RED integration */
  nodeRed: nodeRedSettingsSchema,
});

// ============================================================================
// Root Configuration Schema
// ============================================================================

/**
 * Root application configuration schema
 * This is the complete configuration structure stored in electron-store
 */
export const configSchema = z.object({
  /** Configuration schema version for migrations */
  version: z.number().int().positive(),
  /** Available profiles */
  profiles: z.array(profileSchema).min(1, 'At least one profile is required'),
  /** ID of the currently active profile */
  activeProfileId: z.string().min(1, 'Active profile ID is required'),
  /** Device-specific settings */
  deviceSettings: deviceSettingsSchema,
  /** Application settings */
  appSettings: appSettingsSchema,
  /** External service integrations */
  integrations: integrationSettingsSchema,
}).refine(
  (data) => {
    // Validate that activeProfileId references an existing profile
    return data.profiles.some(p => p.id === data.activeProfileId);
  },
  { message: 'Active profile ID must reference an existing profile' }
).refine(
  (data) => {
    // Validate that exactly one profile is marked as default
    const defaultProfiles = data.profiles.filter(p => p.isDefault);
    return defaultProfiles.length === 1;
  },
  { message: 'Exactly one profile must be marked as default' }
);

// ============================================================================
// Type Inference
// ============================================================================

/** Inferred types from schemas */
export type ValidatedButtonConfig = z.output<typeof buttonConfigSchema>;
export type ValidatedEncoderConfig = z.output<typeof encoderConfigSchema>;
export type ValidatedProfile = z.output<typeof profileSchema>;
export type ValidatedDeviceSettings = z.output<typeof deviceSettingsSchema>;
export type ValidatedAppSettings = z.output<typeof appSettingsSchema>;
export type ValidatedHomeAssistantSettings = z.output<typeof homeAssistantSettingsSchema>;
export type ValidatedNodeRedSettings = z.output<typeof nodeRedSettingsSchema>;
export type ValidatedIntegrationSettings = z.output<typeof integrationSettingsSchema>;
export type ValidatedConfig = z.output<typeof configSchema>;

/** Input types (before transformation) */
export type ButtonConfigInput = z.input<typeof buttonConfigSchema>;
export type EncoderConfigInput = z.input<typeof encoderConfigSchema>;
export type ProfileInput = z.input<typeof profileSchema>;
export type ConfigInput = z.input<typeof configSchema>;

// ============================================================================
// Validation Result Types
// ============================================================================

/** Validation result for config */
export type ConfigValidationResult =
  | { success: true; data: ValidatedConfig }
  | { success: false; error: z.ZodError };

/** Validation result for profile */
export type ProfileValidationResult =
  | { success: true; data: ValidatedProfile }
  | { success: false; error: z.ZodError };

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates a complete configuration object
 * Returns a typed result with either the validated data or validation errors
 * @param data - The data to validate
 * @returns ConfigValidationResult with success status and data/error
 */
export function validateConfig(data: unknown): ConfigValidationResult {
  const result = configSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a single profile
 * Returns a typed result with either the validated data or validation errors
 * @param data - The profile data to validate
 * @returns ProfileValidationResult with success status and data/error
 */
export function validateProfile(data: unknown): ProfileValidationResult {
  const result = profileSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a button configuration
 * @param data - The button config data to validate
 * @returns Validation result with success status
 */
export function validateButtonConfig(data: unknown): { success: true; data: ValidatedButtonConfig } | { success: false; error: z.ZodError } {
  const result = buttonConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates an encoder configuration
 * @param data - The encoder config data to validate
 * @returns Validation result with success status
 */
export function validateEncoderConfig(data: unknown): { success: true; data: ValidatedEncoderConfig } | { success: false; error: z.ZodError } {
  const result = encoderConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates device settings
 * @param data - The device settings to validate
 * @returns Validation result with success status
 */
export function validateDeviceSettings(data: unknown): { success: true; data: ValidatedDeviceSettings } | { success: false; error: z.ZodError } {
  const result = deviceSettingsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates app settings
 * @param data - The app settings to validate
 * @returns Validation result with success status
 */
export function validateAppSettings(data: unknown): { success: true; data: ValidatedAppSettings } | { success: false; error: z.ZodError } {
  const result = appSettingsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Parse and validate config, throwing on error
 * Use this when you want exceptions for invalid data
 * @param data - The data to validate
 * @returns Validated configuration
 * @throws ZodError if validation fails
 */
export function parseConfig(data: unknown): ValidatedConfig {
  return configSchema.parse(data);
}

/**
 * Parse and validate profile, throwing on error
 * Use this when you want exceptions for invalid data
 * @param data - The data to validate
 * @returns Validated profile
 * @throws ZodError if validation fails
 */
export function parseProfile(data: unknown): ValidatedProfile {
  return profileSchema.parse(data);
}
