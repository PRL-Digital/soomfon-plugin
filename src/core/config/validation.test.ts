/**
 * Configuration Validation Tests
 *
 * Tests for Zod schemas that validate configuration data:
 * - Profile configuration
 * - Button and encoder configurations
 * - Device and app settings
 * - Integration settings
 *
 * Why these tests matter:
 * Invalid configuration could cause the app to crash or behave unexpectedly.
 * These schemas ensure all user data is validated before use.
 */

import { describe, it, expect } from 'vitest';
import {
  buttonConfigSchema,
  encoderConfigSchema,
  profileSchema,
  deviceSettingsSchema,
  appSettingsSchema,
  configSchema,
  validateConfig,
  validateProfile,
  validateButtonConfig,
  validateEncoderConfig,
  MAX_BUTTON_INDEX,
  MAX_ENCODER_INDEX,
  MIN_BRIGHTNESS,
  MAX_BRIGHTNESS,
} from './validation';

// Helper to create a valid keyboard action
const createValidAction = () => ({
  id: 'action-1',
  type: 'keyboard' as const,
  name: 'Test Action',
  keys: 'a',
  enabled: true,
});

// Helper to create a valid profile
const createValidProfile = (overrides = {}) => ({
  id: 'profile-1',
  name: 'Default Profile',
  description: 'Test profile',
  isDefault: true,
  buttons: [],
  encoders: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to create valid full config
const createValidConfig = () => ({
  version: 1,
  profiles: [createValidProfile()],
  activeProfileId: 'profile-1',
  deviceSettings: {
    brightness: 75,
    sleepTimeout: 5,
    screensaverEnabled: false,
  },
  appSettings: {
    launchOnStartup: false,
    minimizeToTray: true,
    closeToTray: true,
    theme: 'system' as const,
    language: 'en' as const,
  },
  integrations: {
    homeAssistant: {
      enabled: false,
    },
    nodeRed: {
      enabled: false,
    },
  },
});

describe('Button Configuration Schema', () => {
  it('should validate a valid button config', () => {
    const config = {
      index: 0,
      action: createValidAction(),
    };

    const result = buttonConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate button index range (0 to MAX_BUTTON_INDEX)', () => {
    // Valid indices
    for (const index of [0, 5, 10, MAX_BUTTON_INDEX]) {
      const result = buttonConfigSchema.safeParse({ index });
      expect(result.success).toBe(true);
    }

    // Invalid indices
    expect(buttonConfigSchema.safeParse({ index: -1 }).success).toBe(false);
    expect(buttonConfigSchema.safeParse({ index: MAX_BUTTON_INDEX + 1 }).success).toBe(false);
  });

  it('should accept optional fields', () => {
    const config = {
      index: 0,
      image: 'base64data...',
      label: 'Button Label',
      action: createValidAction(),
      longPressAction: createValidAction(),
      longPressThreshold: 600,
    };

    const result = buttonConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject non-integer index', () => {
    const config = { index: 1.5 };
    const result = buttonConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject negative longPressThreshold', () => {
    const config = {
      index: 0,
      longPressThreshold: -100,
    };
    const result = buttonConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('Encoder Configuration Schema', () => {
  it('should validate a valid encoder config', () => {
    const config = {
      index: 0,
      pressAction: createValidAction(),
      clockwiseAction: createValidAction(),
      counterClockwiseAction: createValidAction(),
    };

    const result = encoderConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate encoder index range (0 to MAX_ENCODER_INDEX)', () => {
    // Valid indices
    for (const index of [0, 1, MAX_ENCODER_INDEX]) {
      const result = encoderConfigSchema.safeParse({ index });
      expect(result.success).toBe(true);
    }

    // Invalid indices
    expect(encoderConfigSchema.safeParse({ index: -1 }).success).toBe(false);
    expect(encoderConfigSchema.safeParse({ index: MAX_ENCODER_INDEX + 1 }).success).toBe(false);
  });

  it('should accept all action types', () => {
    const config = {
      index: 0,
      pressAction: createValidAction(),
      longPressAction: createValidAction(),
      clockwiseAction: createValidAction(),
      counterClockwiseAction: createValidAction(),
    };

    const result = encoderConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('Profile Schema', () => {
  it('should validate a valid profile', () => {
    const profile = createValidProfile();
    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it('should require non-empty id', () => {
    const profile = createValidProfile({ id: '' });
    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should require non-empty name', () => {
    const profile = createValidProfile({ name: '' });
    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should validate nested button configs', () => {
    const profile = createValidProfile({
      buttons: [
        { index: 0, action: createValidAction() },
        { index: 1, label: 'Button 2' },
      ],
    });

    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it('should reject invalid button config in profile', () => {
    const profile = createValidProfile({
      buttons: [{ index: 999 }], // Invalid index
    });

    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should validate date strings', () => {
    const profile = createValidProfile({
      createdAt: 'invalid-date',
    });

    const result = profileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });
});

describe('Device Settings Schema', () => {
  it('should validate valid device settings', () => {
    const settings = {
      brightness: 75,
      sleepTimeout: 5,
      screensaverEnabled: true,
    };

    const result = deviceSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should validate brightness range', () => {
    // Valid brightness values
    expect(
      deviceSettingsSchema.safeParse({
        brightness: MIN_BRIGHTNESS,
        sleepTimeout: 0,
        screensaverEnabled: false,
      }).success
    ).toBe(true);

    expect(
      deviceSettingsSchema.safeParse({
        brightness: MAX_BRIGHTNESS,
        sleepTimeout: 0,
        screensaverEnabled: false,
      }).success
    ).toBe(true);

    // Invalid brightness values
    expect(
      deviceSettingsSchema.safeParse({
        brightness: MIN_BRIGHTNESS - 1,
        sleepTimeout: 0,
        screensaverEnabled: false,
      }).success
    ).toBe(false);

    expect(
      deviceSettingsSchema.safeParse({
        brightness: MAX_BRIGHTNESS + 1,
        sleepTimeout: 0,
        screensaverEnabled: false,
      }).success
    ).toBe(false);
  });

  it('should reject negative sleepTimeout', () => {
    const settings = {
      brightness: 50,
      sleepTimeout: -1,
      screensaverEnabled: false,
    };

    const result = deviceSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });
});

describe('App Settings Schema', () => {
  it('should validate valid app settings', () => {
    const settings = {
      launchOnStartup: true,
      minimizeToTray: true,
      closeToTray: false,
      theme: 'dark',
      language: 'en',
    };

    const result = appSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should validate all theme options', () => {
    const themes = ['light', 'dark', 'system'];

    for (const theme of themes) {
      const settings = {
        launchOnStartup: false,
        minimizeToTray: false,
        closeToTray: false,
        theme,
        language: 'en',
      };

      const result = appSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    }
  });

  it('should validate all language options', () => {
    const languages = ['en', 'zh', 'de', 'fr', 'es', 'ja', 'ko'];

    for (const language of languages) {
      const settings = {
        launchOnStartup: false,
        minimizeToTray: false,
        closeToTray: false,
        theme: 'system',
        language,
      };

      const result = appSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid theme', () => {
    const settings = {
      launchOnStartup: false,
      minimizeToTray: false,
      closeToTray: false,
      theme: 'invalid',
      language: 'en',
    };

    const result = appSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });
});

describe('Full Config Schema', () => {
  it('should validate a complete valid config', () => {
    const config = createValidConfig();
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should require at least one profile', () => {
    const config = {
      ...createValidConfig(),
      profiles: [],
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should require activeProfileId to reference existing profile', () => {
    const config = {
      ...createValidConfig(),
      activeProfileId: 'non-existent',
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should require exactly one default profile', () => {
    // No default profile
    const configNoDefault = {
      ...createValidConfig(),
      profiles: [createValidProfile({ isDefault: false })],
    };
    expect(configSchema.safeParse(configNoDefault).success).toBe(false);

    // Multiple default profiles
    const configMultiDefault = {
      ...createValidConfig(),
      profiles: [
        createValidProfile({ id: 'p1', isDefault: true }),
        createValidProfile({ id: 'p2', isDefault: true }),
      ],
    };
    expect(configSchema.safeParse(configMultiDefault).success).toBe(false);
  });

  it('should validate nested structures', () => {
    const config = {
      ...createValidConfig(),
      profiles: [
        createValidProfile({
          buttons: [
            { index: 0, action: createValidAction() },
            { index: 5, label: 'Test' },
          ],
          encoders: [
            { index: 0, clockwiseAction: createValidAction() },
          ],
        }),
      ],
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('Validation Helper Functions', () => {
  describe('validateConfig', () => {
    it('should return success for valid config', () => {
      const result = validateConfig(createValidConfig());
      expect(result.success).toBe(true);
    });

    it('should return error for invalid config', () => {
      const result = validateConfig({ invalid: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('validateProfile', () => {
    it('should return success for valid profile', () => {
      const result = validateProfile(createValidProfile());
      expect(result.success).toBe(true);
    });

    it('should return error for invalid profile', () => {
      const result = validateProfile({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateButtonConfig', () => {
    it('should validate button config', () => {
      const result = validateButtonConfig({ index: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('validateEncoderConfig', () => {
    it('should validate encoder config', () => {
      const result = validateEncoderConfig({ index: 0 });
      expect(result.success).toBe(true);
    });
  });
});

describe('Constants', () => {
  it('should export correct constants', () => {
    expect(MAX_BUTTON_INDEX).toBe(14);
    expect(MAX_ENCODER_INDEX).toBe(2);
    expect(MIN_BRIGHTNESS).toBe(0);
    expect(MAX_BRIGHTNESS).toBe(100);
  });
});
