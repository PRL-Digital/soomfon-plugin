/**
 * Import/Export Tests
 *
 * Tests for the import-export module that handles configuration and profile
 * serialization for backup, sharing, and data transfer:
 * - Exporting complete configuration as JSON
 * - Exporting individual profiles as JSON
 * - Importing and validating complete configurations
 * - Importing and validating individual profiles
 * - Error handling for invalid JSON and validation failures
 * - Async wrapper functions
 *
 * Why these tests matter:
 * Import/export is the primary mechanism for users to backup, share, and
 * transfer their configurations. Bugs here could cause data loss (failed imports),
 * corrupted configurations (invalid data imported), or security issues (malformed
 * data bypassing validation). These tests ensure data integrity and proper error
 * handling during serialization operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppConfig, Profile, ButtonConfig, EncoderConfig } from '../../shared/types/config';
import type { ConfigManager } from './config-manager';
import type { ProfileManager } from './profile-manager';
import {
  ImportExportError,
  exportConfig,
  exportProfile,
  importConfig,
  importProfile,
  exportConfigAsync,
  exportProfileAsync,
  importConfigAsync,
  importProfileAsync,
} from './import-export';

// Mock uuid to return predictable IDs
let mockUuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter}`),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createTestProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'test-profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  isDefault: true,
  buttons: [],
  encoders: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  version: 1,
  profiles: [createTestProfile()],
  activeProfileId: 'test-profile-1',
  deviceSettings: {
    brightness: 75,
    sleepTimeout: 5,
    screensaverEnabled: false,
  },
  appSettings: {
    launchOnStartup: false,
    minimizeToTray: true,
    closeToTray: true,
    theme: 'system',
    language: 'en',
  },
  integrations: {
    homeAssistant: { enabled: false },
    nodeRed: { enabled: false },
  },
  ...overrides,
});

const createMockConfigManager = (config: AppConfig = createTestConfig()): ConfigManager => {
  let storedConfig = { ...config };
  return {
    getConfig: vi.fn(() => ({ ...storedConfig })),
    setConfig: vi.fn((newConfig: AppConfig) => {
      storedConfig = newConfig;
    }),
  } as unknown as ConfigManager;
};

const createMockProfileManager = (profiles: Profile[] = [createTestProfile()]): ProfileManager => {
  const storedProfiles = [...profiles];
  let createdProfile: Profile | null = null;

  return {
    getById: vi.fn((id: string) => {
      return storedProfiles.find(p => p.id === id) || null;
    }),
    create: vi.fn((name: string, options?: { description?: string; buttons?: ButtonConfig[]; encoders?: EncoderConfig[]; isDefault?: boolean }) => {
      createdProfile = {
        id: `mock-uuid-${++mockUuidCounter}`,
        name,
        description: options?.description ?? '',
        isDefault: options?.isDefault ?? false,
        buttons: options?.buttons ?? [],
        encoders: options?.encoders ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storedProfiles.push(createdProfile);
      return createdProfile;
    }),
    setActive: vi.fn(),
  } as unknown as ProfileManager;
};

// ============================================================================
// ImportExportError Class Tests
// ============================================================================

describe('ImportExportError', () => {
  it('creates error with correct properties', () => {
    const error = new ImportExportError('Test error', 'import', 'config');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ImportExportError');
    expect(error.operation).toBe('import');
    expect(error.targetType).toBe('config');
    expect(error.validationErrors).toBeUndefined();
  });

  it('creates error with validation errors', () => {
    const zodError = { errors: [{ path: ['test'], message: 'Invalid' }] };
    const error = new ImportExportError('Validation failed', 'import', 'profile', zodError as any);

    expect(error.validationErrors).toBeDefined();
    expect(error.validationErrors?.errors).toHaveLength(1);
  });

  it('is instance of Error', () => {
    const error = new ImportExportError('Test', 'export', 'config');
    expect(error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// Export Config Tests
// ============================================================================

describe('exportConfig', () => {
  it('exports configuration as JSON string', () => {
    const config = createTestConfig();
    const configManager = createMockConfigManager(config);

    const result = exportConfig(configManager);

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();
    expect(result.error).toBeUndefined();

    // Verify JSON is valid and contains expected data
    const parsed = JSON.parse(result.json!);
    expect(parsed.version).toBe(1);
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.activeProfileId).toBe('test-profile-1');
  });

  it('exports configuration with pretty formatting', () => {
    const config = createTestConfig();
    const configManager = createMockConfigManager(config);

    const result = exportConfig(configManager);

    // Check for indentation (pretty print)
    expect(result.json).toContain('\n');
    expect(result.json).toContain('  '); // 2-space indent
  });

  it('includes all configuration sections', () => {
    const config = createTestConfig();
    const configManager = createMockConfigManager(config);

    const result = exportConfig(configManager);
    const parsed = JSON.parse(result.json!);

    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('profiles');
    expect(parsed).toHaveProperty('activeProfileId');
    expect(parsed).toHaveProperty('deviceSettings');
    expect(parsed).toHaveProperty('appSettings');
    expect(parsed).toHaveProperty('integrations');
  });

  it('handles error when getConfig throws', () => {
    const configManager = {
      getConfig: vi.fn(() => {
        throw new Error('Database connection failed');
      }),
    } as unknown as ConfigManager;

    const result = exportConfig(configManager);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database connection failed');
    expect(result.json).toBeUndefined();
  });

  it('exports complex configuration with buttons and encoders', () => {
    const config = createTestConfig({
      profiles: [createTestProfile({
        buttons: [
          {
            index: 0,
            label: 'Button 1',
            action: { type: 'keyboard', key: 'A', modifiers: [] },
          },
        ],
        encoders: [
          {
            index: 0,
            clockwiseAction: { type: 'media', action: 'volumeUp' },
            counterClockwiseAction: { type: 'media', action: 'volumeDown' },
          },
        ],
      })],
    });
    const configManager = createMockConfigManager(config);

    const result = exportConfig(configManager);
    const parsed = JSON.parse(result.json!);

    expect(parsed.profiles[0].buttons).toHaveLength(1);
    expect(parsed.profiles[0].encoders).toHaveLength(1);
  });
});

// ============================================================================
// Export Profile Tests
// ============================================================================

describe('exportProfile', () => {
  it('exports profile as JSON string', () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([profile]);

    const result = exportProfile(profileManager, 'test-profile-1');

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();

    const parsed = JSON.parse(result.json!);
    expect(parsed.id).toBe('test-profile-1');
    expect(parsed.name).toBe('Test Profile');
  });

  it('returns error for non-existent profile', () => {
    const profileManager = createMockProfileManager([]);

    const result = exportProfile(profileManager, 'non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.json).toBeUndefined();
  });

  it('exports profile with pretty formatting', () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([profile]);

    const result = exportProfile(profileManager, 'test-profile-1');

    expect(result.json).toContain('\n');
    expect(result.json).toContain('  ');
  });

  it('handles error when getById throws', () => {
    const profileManager = {
      getById: vi.fn(() => {
        throw new Error('Internal error');
      }),
    } as unknown as ProfileManager;

    const result = exportProfile(profileManager, 'test-id');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Internal error');
  });

  it('exports profile with all fields intact', () => {
    const profile = createTestProfile({
      buttons: [{ index: 0, label: 'Test' }],
      encoders: [{ index: 0 }],
      description: 'Detailed description',
    });
    const profileManager = createMockProfileManager([profile]);

    const result = exportProfile(profileManager, 'test-profile-1');
    const parsed = JSON.parse(result.json!);

    expect(parsed.buttons).toHaveLength(1);
    expect(parsed.encoders).toHaveLength(1);
    expect(parsed.description).toBe('Detailed description');
    expect(parsed.createdAt).toBeDefined();
    expect(parsed.updatedAt).toBeDefined();
  });
});

// ============================================================================
// Import Config Tests
// ============================================================================

describe('importConfig', () => {
  it('imports valid configuration', () => {
    const config = createTestConfig();
    const jsonString = JSON.stringify(config);
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, jsonString);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.version).toBe(1);
    expect(configManager.setConfig).toHaveBeenCalled();
  });

  it('returns error for invalid JSON', () => {
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, '{ invalid json }');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
    expect(configManager.setConfig).not.toHaveBeenCalled();
  });

  it('returns error for malformed JSON syntax', () => {
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, 'not json at all');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('returns validation errors for invalid config structure', () => {
    const configManager = createMockConfigManager();
    const invalidConfig = { version: 'wrong', profiles: 'not array' };

    const result = importConfig(configManager, JSON.stringify(invalidConfig));

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors!.length).toBeGreaterThan(0);
  });

  it('returns validation errors for missing required fields', () => {
    const configManager = createMockConfigManager();
    const incompleteConfig = { version: 1 };

    const result = importConfig(configManager, JSON.stringify(incompleteConfig));

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles setConfig failure', () => {
    const configManager = {
      getConfig: vi.fn(),
      setConfig: vi.fn(() => {
        throw new Error('Write failed');
      }),
    } as unknown as ConfigManager;

    const config = createTestConfig();
    const result = importConfig(configManager, JSON.stringify(config));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Write failed');
  });

  it('formats single validation error correctly', () => {
    const configManager = createMockConfigManager();
    // Create a mostly valid config with just one error - invalid theme value
    const invalidConfig = createTestConfig();
    (invalidConfig.appSettings as any).theme = 'invalid-theme';

    const result = importConfig(configManager, JSON.stringify(invalidConfig));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed at');
  });

  it('formats multiple validation errors correctly', () => {
    const configManager = createMockConfigManager();
    // Completely invalid config to generate multiple errors
    const invalidConfig = {};

    const result = importConfig(configManager, JSON.stringify(invalidConfig));

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
  });

  it('returns the imported config data on success', () => {
    const config = createTestConfig({
      deviceSettings: { brightness: 50, sleepTimeout: 10, screensaverEnabled: true },
    });
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, JSON.stringify(config));

    expect(result.success).toBe(true);
    expect(result.data?.deviceSettings.brightness).toBe(50);
    expect(result.data?.deviceSettings.sleepTimeout).toBe(10);
  });
});

// ============================================================================
// Import Profile Tests
// ============================================================================

describe('importProfile', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('imports valid profile', () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([]);

    const result = importProfile(profileManager, JSON.stringify(profile));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(profileManager.create).toHaveBeenCalled();
  });

  it('generates new UUID for imported profile', () => {
    const profile = createTestProfile({ id: 'original-id' });
    const profileManager = createMockProfileManager([]);

    const result = importProfile(profileManager, JSON.stringify(profile));

    expect(result.success).toBe(true);
    expect(result.data?.id).not.toBe('original-id');
    expect(result.data?.id).toContain('mock-uuid');
  });

  it('allows name override', () => {
    const profile = createTestProfile({ name: 'Original Name' });
    const profileManager = createMockProfileManager([]);

    const result = importProfile(profileManager, JSON.stringify(profile), { name: 'New Name' });

    expect(result.success).toBe(true);
    expect(profileManager.create).toHaveBeenCalledWith('New Name', expect.any(Object));
  });

  it('uses original name when no override provided', () => {
    const profile = createTestProfile({ name: 'Original Name' });
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile));

    expect(profileManager.create).toHaveBeenCalledWith('Original Name', expect.any(Object));
  });

  it('sets profile as active when requested', () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile), { setActive: true });

    expect(profileManager.setActive).toHaveBeenCalled();
  });

  it('does not set profile as active by default', () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile));

    expect(profileManager.setActive).not.toHaveBeenCalled();
  });

  it('never sets imported profile as default', () => {
    const profile = createTestProfile({ isDefault: true });
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile));

    expect(profileManager.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ isDefault: false })
    );
  });

  it('preserves buttons and encoders from imported profile', () => {
    const profile = createTestProfile({
      buttons: [{ index: 0, label: 'Test Button', actions: {} }],
      encoders: [{ index: 0 }],
    });
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile));

    expect(profileManager.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        buttons: expect.arrayContaining([expect.objectContaining({ label: 'Test Button' })]),
        encoders: expect.arrayContaining([expect.objectContaining({ index: 0 })]),
      })
    );
  });

  it('returns error for invalid JSON', () => {
    const profileManager = createMockProfileManager([]);

    const result = importProfile(profileManager, '{ not valid }');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('returns validation errors for invalid profile structure', () => {
    const profileManager = createMockProfileManager([]);
    const invalidProfile = { id: 123, name: null };

    const result = importProfile(profileManager, JSON.stringify(invalidProfile));

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
  });

  it('handles create failure', () => {
    const profileManager = {
      getById: vi.fn(),
      create: vi.fn(() => {
        throw new Error('Storage full');
      }),
      setActive: vi.fn(),
    } as unknown as ProfileManager;

    const profile = createTestProfile();
    const result = importProfile(profileManager, JSON.stringify(profile));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage full');
  });

  it('preserves description from imported profile', () => {
    const profile = createTestProfile({ description: 'Important profile for work' });
    const profileManager = createMockProfileManager([]);

    importProfile(profileManager, JSON.stringify(profile));

    expect(profileManager.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ description: 'Important profile for work' })
    );
  });
});

// ============================================================================
// Async Wrapper Tests
// ============================================================================

describe('exportConfigAsync', () => {
  it('returns promise that resolves to ExportResult', async () => {
    const config = createTestConfig();
    const configManager = createMockConfigManager(config);

    const result = await exportConfigAsync(configManager);

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();
  });

  it('resolves with error on failure', async () => {
    const configManager = {
      getConfig: vi.fn(() => {
        throw new Error('Async error');
      }),
    } as unknown as ConfigManager;

    const result = await exportConfigAsync(configManager);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Async error');
  });
});

describe('exportProfileAsync', () => {
  it('returns promise that resolves to ExportResult', async () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([profile]);

    const result = await exportProfileAsync(profileManager, 'test-profile-1');

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();
  });

  it('resolves with error for non-existent profile', async () => {
    const profileManager = createMockProfileManager([]);

    const result = await exportProfileAsync(profileManager, 'missing');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('importConfigAsync', () => {
  it('returns promise that resolves to ImportResult', async () => {
    const config = createTestConfig();
    const configManager = createMockConfigManager();

    const result = await importConfigAsync(configManager, JSON.stringify(config));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('resolves with error for invalid JSON', async () => {
    const configManager = createMockConfigManager();

    const result = await importConfigAsync(configManager, 'bad json');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });
});

describe('importProfileAsync', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('returns promise that resolves to ImportResult', async () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([]);

    const result = await importProfileAsync(profileManager, JSON.stringify(profile));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('accepts options parameter', async () => {
    const profile = createTestProfile();
    const profileManager = createMockProfileManager([]);

    const result = await importProfileAsync(
      profileManager,
      JSON.stringify(profile),
      { name: 'Async Import', setActive: true }
    );

    expect(result.success).toBe(true);
    expect(profileManager.create).toHaveBeenCalledWith('Async Import', expect.any(Object));
    expect(profileManager.setActive).toHaveBeenCalled();
  });

  it('resolves with error for invalid profile', async () => {
    const profileManager = createMockProfileManager([]);

    const result = await importProfileAsync(profileManager, '{}');

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('edge cases', () => {
  it('handles empty string JSON input', () => {
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, '');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('handles null JSON value', () => {
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, 'null');

    expect(result.success).toBe(false);
  });

  it('handles array JSON value for config', () => {
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, '[]');

    expect(result.success).toBe(false);
  });

  it('handles configuration with many profiles', () => {
    // Create multiple profiles (valid up to reasonable limits)
    const profiles: Profile[] = Array.from({ length: 10 }, (_, i) => ({
      ...createTestProfile({ id: `profile-${i}`, name: `Profile ${i}`, isDefault: i === 0 }),
    }));
    const config = createTestConfig({
      profiles,
      activeProfileId: 'profile-0',
    });
    const configManager = createMockConfigManager();

    const result = importConfig(configManager, JSON.stringify(config));

    // Should still work with multiple profiles
    expect(result.success).toBe(true);
    expect(result.data?.profiles).toHaveLength(10);
  });

  it('preserves special characters in profile names', () => {
    const profile = createTestProfile({ name: 'Profile with "quotes" & <special> chars' });
    const profileManager = createMockProfileManager([profile]);

    const exportResult = exportProfile(profileManager, 'test-profile-1');
    expect(exportResult.success).toBe(true);

    const parsed = JSON.parse(exportResult.json!);
    expect(parsed.name).toBe('Profile with "quotes" & <special> chars');
  });

  it('handles unicode characters in configuration', () => {
    const config = createTestConfig({
      profiles: [createTestProfile({ name: '日本語プロファイル 🎮' })],
    });
    const configManager = createMockConfigManager(config);

    const exportResult = exportConfig(configManager);
    expect(exportResult.success).toBe(true);

    const parsed = JSON.parse(exportResult.json!);
    expect(parsed.profiles[0].name).toBe('日本語プロファイル 🎮');
  });

  it('round-trips configuration correctly', () => {
    const originalConfig = createTestConfig({
      profiles: [createTestProfile({
        name: 'Gaming',
        buttons: [{ index: 0, label: 'Volume', actions: { press: { type: 'media', action: 'mute' } } }],
      })],
      deviceSettings: { brightness: 100, sleepTimeout: 0, screensaverEnabled: false },
    });
    const configManager = createMockConfigManager(originalConfig);

    // Export
    const exportResult = exportConfig(configManager);
    expect(exportResult.success).toBe(true);

    // Import back
    const importManager = createMockConfigManager();
    const importResult = importConfig(importManager, exportResult.json!);

    expect(importResult.success).toBe(true);
    expect(importResult.data?.profiles[0].name).toBe('Gaming');
    expect(importResult.data?.deviceSettings.brightness).toBe(100);
  });
});
