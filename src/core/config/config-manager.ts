/**
 * Configuration Manager
 *
 * In-memory configuration store for test environments.
 * Production code uses the Tauri Rust backend for config storage.
 *
 * This module exists to support:
 * - Unit tests that need a ConfigManager instance
 * - Shared business logic that operates on config data
 *
 * The interface matches the original electron-store-based implementation
 * so existing code (ProfileManager, handlers) continues to work.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AppConfig,
  DeviceSettings,
  AppSettings,
  IntegrationSettings,
  Profile,
} from '../../shared/types/config';
import {
  configSchema,
  deviceSettingsSchema,
  appSettingsSchema,
  integrationSettingsSchema,
  profileSchema,
} from './validation';
import { checkAndMigrate, createConfigMigrator, type ConfigMigrator } from './migrations';

// Import defaults as values
import {
  DEFAULT_DEVICE_SETTINGS as defaultDeviceSettings,
  DEFAULT_APP_SETTINGS as defaultAppSettings,
  DEFAULT_INTEGRATION_SETTINGS as defaultIntegrationSettings,
  CONFIG_VERSION as configVersion,
} from '../../shared/types/config';

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  /** Custom config file name (for path simulation, not used for storage) */
  name?: string;
  /** Custom config directory path (for path simulation, not used for storage) */
  cwd?: string;
  /** Initial config data (for testing) */
  initialConfig?: AppConfig;
  /** Skip migration check (for testing) */
  skipMigration?: boolean;
}

/**
 * Configuration change event types
 */
export type ConfigChangeType =
  | 'deviceSettings'
  | 'appSettings'
  | 'integrations'
  | 'profiles'
  | 'activeProfile'
  | 'full';

/**
 * Configuration change listener
 */
export type ConfigChangeListener = (
  changeType: ConfigChangeType,
  newValue: unknown,
  oldValue: unknown
) => void;

/**
 * Creates the default profile for new configurations
 */
function createDefaultProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: 'Default Profile',
    description: 'Default configuration profile',
    isDefault: true,
    buttons: [],
    encoders: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates the default application configuration
 */
function createDefaultConfig(): AppConfig {
  const defaultProfile = createDefaultProfile();
  return {
    version: configVersion,
    profiles: [defaultProfile],
    activeProfileId: defaultProfile.id,
    deviceSettings: { ...defaultDeviceSettings },
    appSettings: { ...defaultAppSettings },
    integrations: { ...defaultIntegrationSettings },
  };
}

/**
 * ConfigManager class
 * In-memory configuration store with type-safe access and validation.
 *
 * This is used for testing and shared business logic.
 * Production config is handled by the Tauri Rust backend.
 */
export class ConfigManager {
  private config: AppConfig;
  private listeners: Set<ConfigChangeListener> = new Set();
  private migrator: ConfigMigrator | null = null;
  private configPath: string;

  constructor(options: ConfigManagerOptions = {}) {
    // Use initial config or create defaults
    this.config = options.initialConfig
      ? { ...options.initialConfig }
      : createDefaultConfig();

    // Simulate a config path for compatibility
    const configDir = options.cwd ?? '/mock/config';
    const configName = options.name ?? 'config';
    this.configPath = `${configDir}/${configName}.json`;

    // Initialize migrator (may be null in test environments)
    this.migrator = createConfigMigrator(this.configPath);

    // Run migration check unless skipped
    if (!options.skipMigration) {
      this.checkMigrationAndValidate();
    }
  }

  /**
   * Checks for needed migrations and validates the configuration
   * @private
   */
  private checkMigrationAndValidate(): void {
    try {
      const result = checkAndMigrate(this.config, this.configPath);

      if (result.migrated) {
        // Config was migrated, update the store
        console.info(`Configuration migrated from backup at: ${result.backupPath}`);
        this.config = result.config;
      }
    } catch (error) {
      // Migration failed, fall back to validation
      console.warn('Migration check failed, validating config:', error);
      this.validateAndFixConfig();
    }
  }

  /**
   * Validates the current config and fixes any issues
   * @private
   */
  private validateAndFixConfig(): void {
    const result = configSchema.safeParse(this.config);

    if (!result.success) {
      // If config is invalid, reset to defaults
      console.warn('Invalid configuration detected, resetting to defaults:', result.error.issues);
      this.reset();
    }
  }

  // ============================================================================
  // Full Config Access
  // ============================================================================

  /**
   * Gets the complete application configuration
   * @returns The full AppConfig object
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Sets the complete application configuration
   * Validates the config before saving
   * @param config - The new configuration
   * @throws Error if validation fails
   */
  setConfig(config: AppConfig): void {
    const result = configSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }

    const oldConfig = this.config;
    this.config = result.data;
    this.notifyListeners('full', result.data, oldConfig);
  }

  // ============================================================================
  // Device Settings
  // ============================================================================

  /**
   * Gets device-specific settings
   * @returns DeviceSettings object
   */
  getDeviceSettings(): DeviceSettings {
    return { ...this.config.deviceSettings };
  }

  /**
   * Sets device-specific settings
   * Validates settings before saving
   * @param settings - The new device settings
   * @throws Error if validation fails
   */
  setDeviceSettings(settings: DeviceSettings): void {
    const result = deviceSettingsSchema.safeParse(settings);
    if (!result.success) {
      throw new Error(`Invalid device settings: ${result.error.message}`);
    }

    const oldSettings = this.config.deviceSettings;
    this.config.deviceSettings = result.data;
    this.notifyListeners('deviceSettings', result.data, oldSettings);
  }

  /**
   * Updates partial device settings (merges with existing)
   * @param settings - Partial device settings to update
   * @throws Error if resulting settings are invalid
   */
  updateDeviceSettings(settings: Partial<DeviceSettings>): void {
    const current = this.getDeviceSettings();
    this.setDeviceSettings({ ...current, ...settings });
  }

  // ============================================================================
  // App Settings
  // ============================================================================

  /**
   * Gets application settings
   * @returns AppSettings object
   */
  getAppSettings(): AppSettings {
    return { ...this.config.appSettings };
  }

  /**
   * Sets application settings
   * Validates settings before saving
   * @param settings - The new app settings
   * @throws Error if validation fails
   */
  setAppSettings(settings: AppSettings): void {
    const result = appSettingsSchema.safeParse(settings);
    if (!result.success) {
      throw new Error(`Invalid app settings: ${result.error.message}`);
    }

    const oldSettings = this.config.appSettings;
    this.config.appSettings = result.data;
    this.notifyListeners('appSettings', result.data, oldSettings);
  }

  /**
   * Updates partial app settings (merges with existing)
   * @param settings - Partial app settings to update
   * @throws Error if resulting settings are invalid
   */
  updateAppSettings(settings: Partial<AppSettings>): void {
    const current = this.getAppSettings();
    this.setAppSettings({ ...current, ...settings });
  }

  // ============================================================================
  // Integration Settings
  // ============================================================================

  /**
   * Gets integration settings
   * @returns IntegrationSettings object
   */
  getIntegrations(): IntegrationSettings {
    const integrations = this.config.integrations;
    return {
      homeAssistant: { ...integrations.homeAssistant },
      nodeRed: { ...integrations.nodeRed },
    };
  }

  /**
   * Sets integration settings
   * Validates settings before saving
   * @param settings - The new integration settings
   * @throws Error if validation fails
   */
  setIntegrations(settings: IntegrationSettings): void {
    const result = integrationSettingsSchema.safeParse(settings);
    if (!result.success) {
      throw new Error(`Invalid integration settings: ${result.error.message}`);
    }

    const oldSettings = this.config.integrations;
    this.config.integrations = result.data;
    this.notifyListeners('integrations', result.data, oldSettings);
  }

  /**
   * Updates partial integration settings (merges with existing)
   * @param settings - Partial integration settings to update
   * @throws Error if resulting settings are invalid
   */
  updateIntegrations(settings: Partial<IntegrationSettings>): void {
    const current = this.getIntegrations();
    const merged: IntegrationSettings = {
      homeAssistant: settings.homeAssistant
        ? { ...current.homeAssistant, ...settings.homeAssistant }
        : current.homeAssistant,
      nodeRed: settings.nodeRed
        ? { ...current.nodeRed, ...settings.nodeRed }
        : current.nodeRed,
    };
    this.setIntegrations(merged);
  }

  // ============================================================================
  // Profile Access
  // ============================================================================

  /**
   * Gets all profiles
   * @returns Array of Profile objects
   */
  getProfiles(): Profile[] {
    return this.config.profiles.map(p => ({ ...p }));
  }

  /**
   * Gets a profile by ID
   * @param id - The profile ID
   * @returns The profile or undefined if not found
   */
  getProfile(id: string): Profile | undefined {
    const profile = this.config.profiles.find(p => p.id === id);
    return profile ? { ...profile } : undefined;
  }

  /**
   * Gets the currently active profile
   * @returns The active Profile object
   */
  getActiveProfile(): Profile {
    const activeId = this.config.activeProfileId;
    const profile = this.getProfile(activeId);
    if (!profile) {
      // Fallback to first profile if active profile is missing
      const profiles = this.getProfiles();
      if (profiles.length > 0) {
        return profiles[0];
      }
      throw new Error('No profiles found in configuration');
    }
    return profile;
  }

  /**
   * Gets the active profile ID
   * @returns The active profile ID string
   */
  getActiveProfileId(): string {
    return this.config.activeProfileId;
  }

  /**
   * Sets the active profile by ID
   * @param id - The profile ID to activate
   * @throws Error if profile doesn't exist
   */
  setActiveProfileId(id: string): void {
    if (!this.config.profiles.some(p => p.id === id)) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    const oldId = this.config.activeProfileId;
    this.config.activeProfileId = id;
    this.notifyListeners('activeProfile', id, oldId);
  }

  /**
   * Gets the configuration version
   * @returns The configuration version number
   */
  getVersion(): number {
    return this.config.version;
  }

  // ============================================================================
  // Reset and Clear
  // ============================================================================

  /**
   * Resets all configuration to defaults
   * Creates a new default profile
   */
  reset(): void {
    const oldConfig = this.config;
    const newConfig = createDefaultConfig();
    this.config = newConfig;
    this.notifyListeners('full', newConfig, oldConfig);
  }

  /**
   * Clears the entire store (same as reset but kept for API compatibility)
   */
  clear(): void {
    this.reset();
  }

  // ============================================================================
  // File Path Access
  // ============================================================================

  /**
   * Gets the path to the configuration file
   * @returns The simulated path (for compatibility)
   */
  getConfigPath(): string {
    return this.configPath;
  }

  // ============================================================================
  // Change Listeners
  // ============================================================================

  /**
   * Adds a listener for configuration changes
   * @param listener - The callback function to invoke on changes
   * @returns A function to remove the listener
   */
  onChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Removes a configuration change listener
   * @param listener - The listener to remove
   */
  offChange(listener: ConfigChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notifies all listeners of a configuration change
   * @private
   */
  private notifyListeners(
    changeType: ConfigChangeType,
    newValue: unknown,
    oldValue: unknown
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(changeType, newValue, oldValue);
      } catch (error) {
        console.error('Config change listener error:', error);
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Checks if the configuration has any profiles
   * @returns True if at least one profile exists
   */
  hasProfiles(): boolean {
    return this.config.profiles.length > 0;
  }

  /**
   * Gets the number of profiles
   * @returns The profile count
   */
  getProfileCount(): number {
    return this.config.profiles.length;
  }

  /**
   * Checks if a profile with the given ID exists
   * @param id - The profile ID to check
   * @returns True if the profile exists
   */
  hasProfile(id: string): boolean {
    return this.config.profiles.some(p => p.id === id);
  }

  // ============================================================================
  // Migration Support
  // ============================================================================

  /**
   * Gets the ConfigMigrator instance for this configuration
   * @returns ConfigMigrator instance or null if not initialized
   */
  getMigrator(): ConfigMigrator | null {
    return this.migrator;
  }

  /**
   * Creates a backup of the current configuration
   * @returns Backup result with success status and backup path
   */
  createBackup(): { success: boolean; backupPath?: string; error?: string } {
    if (!this.migrator) {
      return { success: false, error: 'Migrator not initialized' };
    }
    return this.migrator.backup();
  }

  /**
   * Lists all available configuration backups
   * @returns Array of backup file paths
   */
  listBackups(): string[] {
    if (!this.migrator) {
      return [];
    }
    return this.migrator.listBackups();
  }

  /**
   * Restores configuration from a backup file
   * @param backupPath - Path to the backup file
   * @returns Restore result with success status
   */
  restoreFromBackup(backupPath: string): { success: boolean; error?: string } {
    if (!this.migrator) {
      return { success: false, error: 'Migrator not initialized' };
    }

    const result = this.migrator.restore(backupPath);
    if (result.success) {
      // Validate config after restore
      this.validateAndFixConfig();
    }
    return result;
  }
}

/**
 * Factory function to create a ConfigManager instance
 * @param options - Optional configuration options
 * @returns A new ConfigManager instance
 */
export function createConfigManager(options?: ConfigManagerOptions): ConfigManager {
  return new ConfigManager(options);
}
