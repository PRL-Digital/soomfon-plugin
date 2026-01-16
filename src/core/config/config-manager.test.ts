/**
 * ConfigManager Tests
 *
 * Tests for the ConfigManager class that manages application configuration:
 * - Full config access (get/set)
 * - Device settings management
 * - App settings management
 * - Integration settings management
 * - Profile access (read-only)
 * - Change listeners
 * - Backup/restore operations
 *
 * Why these tests matter:
 * The ConfigManager is the central source of truth for all application settings.
 * Bugs here could cause data loss, settings corruption, or application crashes.
 * These tests ensure configuration is persisted correctly and validated properly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppConfig, DeviceSettings, AppSettings, IntegrationSettings, Profile } from '../../shared/types/config';

// Mock store state that persists across tests
let mockStoreState: AppConfig = {} as AppConfig;
const mockPath = '/mock/config/path/config.json';

// Mock electron-store before importing ConfigManager
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      public path: string;

      constructor(options: { defaults: AppConfig }) {
        // Only initialize if mockStoreState is empty (first time or after reset)
        if (!mockStoreState.profiles || mockStoreState.profiles.length === 0) {
          mockStoreState = { ...options.defaults };
        }
        this.path = mockPath;
      }

      get store(): AppConfig {
        return mockStoreState;
      }

      set store(value: AppConfig) {
        mockStoreState = value;
      }

      get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return mockStoreState[key];
      }

      set(key: string | AppConfig, value?: unknown): void {
        if (typeof key === 'string' && value !== undefined) {
          (mockStoreState as Record<string, unknown>)[key] = value;
        }
      }
    },
  };
});

// Mock migrations module
vi.mock('./migrations', () => ({
  checkAndMigrate: vi.fn((config: AppConfig) => ({
    config,
    migrated: false,
    backupPath: undefined,
  })),
  createConfigMigrator: vi.fn(() => ({
    backup: vi.fn(() => ({ success: true, backupPath: '/mock/backup/path.json' })),
    listBackups: vi.fn(() => ['/mock/backup/1.json', '/mock/backup/2.json']),
    restore: vi.fn(() => ({ success: true })),
    getConfigPath: vi.fn(() => '/mock/config/path/config.json'),
  })),
}));

// Import after mocking
import { ConfigManager, createConfigManager } from './config-manager';
import { checkAndMigrate, createConfigMigrator } from './migrations';

// Helper to create valid test data
const createValidProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'test-profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  isDefault: true,
  buttons: [],
  encoders: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createValidConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  version: 1,
  profiles: [createValidProfile()],
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

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock store state - this will be overwritten by constructor
    mockStoreState = createValidConfig();
    configManager = new ConfigManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create a ConfigManager instance', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('should initialize with default options', () => {
      const cm = new ConfigManager();
      expect(cm).toBeDefined();
    });

    it('should accept custom options', () => {
      const cm = new ConfigManager({
        name: 'custom-config',
        cwd: '/custom/path',
        fileExtension: 'json5',
      });
      expect(cm).toBeDefined();
    });

    it('should run migration check on initialization', () => {
      new ConfigManager();
      expect(checkAndMigrate).toHaveBeenCalled();
    });

    it('should create migrator on initialization', () => {
      new ConfigManager();
      expect(createConfigMigrator).toHaveBeenCalled();
    });
  });

  describe('Full Config Access', () => {
    it('should get the complete configuration', () => {
      const config = configManager.getConfig();
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('profiles');
      expect(config).toHaveProperty('activeProfileId');
      expect(config).toHaveProperty('deviceSettings');
      expect(config).toHaveProperty('appSettings');
      expect(config).toHaveProperty('integrations');
    });

    it('should return a copy of the config (not the original reference)', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should set a complete configuration', () => {
      const newConfig = createValidConfig({
        activeProfileId: 'test-profile-1',
        deviceSettings: { brightness: 50, sleepTimeout: 10, screensaverEnabled: true },
      });

      configManager.setConfig(newConfig);

      expect(mockStoreState).toEqual(newConfig);
    });

    it('should throw error when setting invalid configuration', () => {
      const invalidConfig = {
        version: 1,
        profiles: [], // Invalid: must have at least one profile
        activeProfileId: 'non-existent',
        deviceSettings: { brightness: 75, sleepTimeout: 5, screensaverEnabled: false },
        appSettings: {
          launchOnStartup: false,
          minimizeToTray: true,
          closeToTray: true,
          theme: 'system' as const,
          language: 'en' as const,
        },
        integrations: {
          homeAssistant: { enabled: false },
          nodeRed: { enabled: false },
        },
      };

      expect(() => configManager.setConfig(invalidConfig as AppConfig)).toThrow();
    });

    it('should notify listeners when config is set', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      const newConfig = createValidConfig();
      configManager.setConfig(newConfig);

      expect(listener).toHaveBeenCalledWith('full', expect.anything(), expect.anything());
    });
  });

  describe('Device Settings', () => {
    it('should get device settings', () => {
      const settings = configManager.getDeviceSettings();
      expect(settings).toHaveProperty('brightness');
      expect(settings).toHaveProperty('sleepTimeout');
      expect(settings).toHaveProperty('screensaverEnabled');
    });

    it('should return a copy of device settings', () => {
      const settings1 = configManager.getDeviceSettings();
      const settings2 = configManager.getDeviceSettings();
      expect(settings1).not.toBe(settings2);
    });

    it('should set device settings', () => {
      const newSettings: DeviceSettings = {
        brightness: 50,
        sleepTimeout: 10,
        screensaverEnabled: true,
      };

      configManager.setDeviceSettings(newSettings);

      expect(mockStoreState.deviceSettings).toEqual(newSettings);
    });

    it('should throw error for invalid device settings', () => {
      const invalidSettings = {
        brightness: 150, // Invalid: max is 100
        sleepTimeout: 5,
        screensaverEnabled: false,
      };

      expect(() => configManager.setDeviceSettings(invalidSettings as DeviceSettings)).toThrow();
    });

    it('should update partial device settings', () => {
      mockStoreState.deviceSettings = {
        brightness: 75,
        sleepTimeout: 5,
        screensaverEnabled: false,
      };

      configManager.updateDeviceSettings({ brightness: 50 });

      expect(mockStoreState.deviceSettings.brightness).toBe(50);
      expect(mockStoreState.deviceSettings.sleepTimeout).toBe(5);
    });

    it('should notify listeners when device settings change', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      configManager.setDeviceSettings({
        brightness: 50,
        sleepTimeout: 5,
        screensaverEnabled: false,
      });

      expect(listener).toHaveBeenCalledWith('deviceSettings', expect.anything(), expect.anything());
    });
  });

  describe('App Settings', () => {
    it('should get app settings', () => {
      const settings = configManager.getAppSettings();
      expect(settings).toHaveProperty('launchOnStartup');
      expect(settings).toHaveProperty('minimizeToTray');
      expect(settings).toHaveProperty('closeToTray');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('language');
    });

    it('should return a copy of app settings', () => {
      const settings1 = configManager.getAppSettings();
      const settings2 = configManager.getAppSettings();
      expect(settings1).not.toBe(settings2);
    });

    it('should set app settings', () => {
      const newSettings: AppSettings = {
        launchOnStartup: true,
        minimizeToTray: false,
        closeToTray: false,
        theme: 'dark',
        language: 'zh',
      };

      configManager.setAppSettings(newSettings);

      expect(mockStoreState.appSettings).toEqual(newSettings);
    });

    it('should throw error for invalid app settings', () => {
      const invalidSettings = {
        launchOnStartup: false,
        minimizeToTray: true,
        closeToTray: true,
        theme: 'invalid-theme', // Invalid theme
        language: 'en',
      };

      expect(() => configManager.setAppSettings(invalidSettings as AppSettings)).toThrow();
    });

    it('should update partial app settings', () => {
      mockStoreState.appSettings = {
        launchOnStartup: false,
        minimizeToTray: true,
        closeToTray: true,
        theme: 'system',
        language: 'en',
      };

      configManager.updateAppSettings({ theme: 'dark' });

      expect(mockStoreState.appSettings.theme).toBe('dark');
      expect(mockStoreState.appSettings.launchOnStartup).toBe(false);
    });

    it('should notify listeners when app settings change', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      configManager.setAppSettings({
        launchOnStartup: true,
        minimizeToTray: true,
        closeToTray: true,
        theme: 'dark',
        language: 'en',
      });

      expect(listener).toHaveBeenCalledWith('appSettings', expect.anything(), expect.anything());
    });
  });

  describe('Integration Settings', () => {
    it('should get integration settings', () => {
      const integrations = configManager.getIntegrations();
      expect(integrations).toHaveProperty('homeAssistant');
      expect(integrations).toHaveProperty('nodeRed');
    });

    it('should return a deep copy of integration settings', () => {
      const integrations1 = configManager.getIntegrations();
      const integrations2 = configManager.getIntegrations();
      expect(integrations1).not.toBe(integrations2);
      expect(integrations1.homeAssistant).not.toBe(integrations2.homeAssistant);
      expect(integrations1.nodeRed).not.toBe(integrations2.nodeRed);
    });

    it('should set integration settings', () => {
      const newSettings: IntegrationSettings = {
        homeAssistant: {
          enabled: true,
          url: 'http://localhost:8123',
          accessToken: 'test-token',
        },
        nodeRed: {
          enabled: true,
          url: 'http://localhost:1880',
        },
      };

      configManager.setIntegrations(newSettings);

      expect(mockStoreState.integrations).toEqual(newSettings);
    });

    it('should update partial integration settings', () => {
      mockStoreState.integrations = {
        homeAssistant: { enabled: false },
        nodeRed: { enabled: false },
      };

      configManager.updateIntegrations({
        homeAssistant: { enabled: true, url: 'http://localhost:8123', accessToken: 'test-token' },
      });

      expect(mockStoreState.integrations.homeAssistant.enabled).toBe(true);
      expect(mockStoreState.integrations.homeAssistant.url).toBe('http://localhost:8123');
      expect(mockStoreState.integrations.nodeRed.enabled).toBe(false);
    });

    it('should notify listeners when integration settings change', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      // When enabled, URL and accessToken are required by validation
      configManager.setIntegrations({
        homeAssistant: { enabled: true, url: 'http://localhost:8123', accessToken: 'test-token' },
        nodeRed: { enabled: false },
      });

      expect(listener).toHaveBeenCalledWith('integrations', expect.anything(), expect.anything());
    });
  });

  describe('Profile Access', () => {
    beforeEach(() => {
      mockStoreState.profiles = [
        createValidProfile({ id: 'profile-1', name: 'Profile 1', isDefault: true }),
        createValidProfile({ id: 'profile-2', name: 'Profile 2', isDefault: false }),
      ];
      mockStoreState.activeProfileId = 'profile-1';
    });

    it('should get all profiles', () => {
      const profiles = configManager.getProfiles();
      expect(profiles).toHaveLength(2);
      expect(profiles[0].name).toBe('Profile 1');
      expect(profiles[1].name).toBe('Profile 2');
    });

    it('should return copies of profiles', () => {
      const profiles1 = configManager.getProfiles();
      const profiles2 = configManager.getProfiles();
      expect(profiles1).not.toBe(profiles2);
      expect(profiles1[0]).not.toBe(profiles2[0]);
    });

    it('should get a profile by ID', () => {
      const profile = configManager.getProfile('profile-1');
      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Profile 1');
    });

    it('should return undefined for non-existent profile ID', () => {
      const profile = configManager.getProfile('non-existent');
      expect(profile).toBeUndefined();
    });

    it('should get the active profile', () => {
      const activeProfile = configManager.getActiveProfile();
      expect(activeProfile.id).toBe('profile-1');
    });

    it('should fallback to first profile if active profile is missing', () => {
      mockStoreState.activeProfileId = 'non-existent';
      const activeProfile = configManager.getActiveProfile();
      expect(activeProfile.id).toBe('profile-1');
    });

    it('should throw error if no profiles exist', () => {
      mockStoreState.profiles = [];
      mockStoreState.activeProfileId = 'non-existent';
      expect(() => configManager.getActiveProfile()).toThrow('No profiles found');
    });

    it('should get active profile ID', () => {
      const activeId = configManager.getActiveProfileId();
      expect(activeId).toBe('profile-1');
    });

    it('should set active profile ID', () => {
      configManager.setActiveProfileId('profile-2');
      expect(mockStoreState.activeProfileId).toBe('profile-2');
    });

    it('should throw error when setting non-existent profile as active', () => {
      expect(() => configManager.setActiveProfileId('non-existent')).toThrow('not found');
    });

    it('should notify listeners when active profile changes', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      configManager.setActiveProfileId('profile-2');

      expect(listener).toHaveBeenCalledWith('activeProfile', 'profile-2', 'profile-1');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      mockStoreState.profiles = [
        createValidProfile({ id: 'profile-1' }),
        createValidProfile({ id: 'profile-2', isDefault: false }),
      ];
    });

    it('should return config version', () => {
      mockStoreState.version = 1;
      expect(configManager.getVersion()).toBe(1);
    });

    it('should check if profiles exist', () => {
      expect(configManager.hasProfiles()).toBe(true);

      mockStoreState.profiles = [];
      expect(configManager.hasProfiles()).toBe(false);
    });

    it('should get profile count', () => {
      expect(configManager.getProfileCount()).toBe(2);
    });

    it('should check if a profile exists by ID', () => {
      expect(configManager.hasProfile('profile-1')).toBe(true);
      expect(configManager.hasProfile('non-existent')).toBe(false);
    });

    it('should get config path', () => {
      expect(configManager.getConfigPath()).toBe('/mock/config/path/config.json');
    });
  });

  describe('Reset and Clear', () => {
    it('should reset configuration to defaults', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      configManager.reset();

      // Should have created new default config with new profile
      expect(mockStoreState).toBeDefined();
      expect(mockStoreState.profiles).toHaveLength(1);
      expect(mockStoreState.profiles[0].name).toBe('Default Profile');
      expect(listener).toHaveBeenCalledWith('full', expect.anything(), expect.anything());
    });

    it('should clear configuration (alias for reset)', () => {
      configManager.clear();
      expect(mockStoreState.profiles).toHaveLength(1);
      expect(mockStoreState.profiles[0].name).toBe('Default Profile');
    });
  });

  describe('Change Listeners', () => {
    it('should add a change listener', () => {
      const listener = vi.fn();
      const unsubscribe = configManager.onChange(listener);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should remove a listener using returned unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = configManager.onChange(listener);

      unsubscribe();

      configManager.setDeviceSettings({
        brightness: 50,
        sleepTimeout: 5,
        screensaverEnabled: false,
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove a listener using offChange', () => {
      const listener = vi.fn();
      configManager.onChange(listener);
      configManager.offChange(listener);

      configManager.setDeviceSettings({
        brightness: 50,
        sleepTimeout: 5,
        screensaverEnabled: false,
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      configManager.onChange(errorListener);
      configManager.onChange(normalListener);

      // Should not throw, should continue to other listeners
      expect(() => {
        configManager.setDeviceSettings({
          brightness: 50,
          sleepTimeout: 5,
          screensaverEnabled: false,
        });
      }).not.toThrow();

      expect(normalListener).toHaveBeenCalled();
    });

    it('should pass correct arguments to listeners', () => {
      const listener = vi.fn();
      configManager.onChange(listener);

      const oldSettings = configManager.getDeviceSettings();
      const newSettings: DeviceSettings = {
        brightness: 50,
        sleepTimeout: 5,
        screensaverEnabled: false,
      };

      configManager.setDeviceSettings(newSettings);

      expect(listener).toHaveBeenCalledWith('deviceSettings', newSettings, oldSettings);
    });
  });

  describe('Migration Support', () => {
    it('should get the migrator instance', () => {
      const migrator = configManager.getMigrator();
      expect(migrator).toBeDefined();
    });

    it('should create a backup', () => {
      const result = configManager.createBackup();
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
    });

    it('should return error when migrator not initialized', () => {
      // Create a manager and forcefully set migrator to null
      const cm = new ConfigManager();
      (cm as unknown as { migrator: null }).migrator = null;

      const result = cm.createBackup();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Migrator not initialized');
    });

    it('should list backups', () => {
      const backups = configManager.listBackups();
      expect(backups).toEqual(['/mock/backup/1.json', '/mock/backup/2.json']);
    });

    it('should return empty array if migrator not initialized', () => {
      const cm = new ConfigManager();
      (cm as unknown as { migrator: null }).migrator = null;

      const backups = cm.listBackups();
      expect(backups).toEqual([]);
    });

    it('should restore from backup', () => {
      const result = configManager.restoreFromBackup('/mock/backup/1.json');
      expect(result.success).toBe(true);
    });

    it('should return error when restoring without migrator', () => {
      const cm = new ConfigManager();
      (cm as unknown as { migrator: null }).migrator = null;

      const result = cm.restoreFromBackup('/mock/backup/1.json');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Migrator not initialized');
    });
  });

  describe('Factory Function', () => {
    it('should create ConfigManager via factory function', () => {
      const cm = createConfigManager();
      expect(cm).toBeInstanceOf(ConfigManager);
    });

    it('should pass options to ConfigManager', () => {
      const cm = createConfigManager({
        name: 'custom-config',
        cwd: '/custom/path',
      });
      expect(cm).toBeInstanceOf(ConfigManager);
    });
  });
});
