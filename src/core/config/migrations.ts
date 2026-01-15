/**
 * Configuration Migration System
 * Handles version upgrades with backup support
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig } from '../../shared/types/config';
import { CONFIG_VERSION } from '../../shared/types/config';
import { configSchema } from './validation';

// ============================================================================
// Version History
// ============================================================================

/**
 * Array of schema versions in order of release
 * Each entry represents a version that may require migration
 */
export const VERSION_HISTORY: number[] = [
  1, // Initial version
  // Future versions will be added here:
  // 2, // Added new feature X
  // 3, // Changed structure Y
];

/**
 * Current configuration version (should match CONFIG_VERSION from types)
 */
export const CURRENT_VERSION = CONFIG_VERSION;

// ============================================================================
// Migration Function Types
// ============================================================================

/**
 * Migration function signature
 * Takes config at version N, returns config at version N+1
 */
export type MigrationFunction = (config: unknown) => unknown;

/**
 * Migration entry in the migrations map
 */
export interface MigrationEntry {
  /** Source version */
  fromVersion: number;
  /** Target version */
  toVersion: number;
  /** Migration function */
  migrate: MigrationFunction;
  /** Description of changes */
  description: string;
}

// ============================================================================
// Migration Functions Map
// ============================================================================

/**
 * Map of migration functions keyed by "fromVersion->toVersion"
 * Add new migrations here as schema evolves
 */
export const MIGRATIONS: Map<string, MigrationEntry> = new Map([
  // Example migration from version 1 to 2 (for future use):
  // [
  //   '1->2',
  //   {
  //     fromVersion: 1,
  //     toVersion: 2,
  //     description: 'Added new field X to profiles',
  //     migrate: (config: unknown) => {
  //       const cfg = config as AppConfig;
  //       return {
  //         ...cfg,
  //         version: 2,
  //         // Add migration logic here
  //       };
  //     },
  //   },
  // ],
]);

/**
 * Gets the migration key for a version transition
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migration key string
 */
export function getMigrationKey(fromVersion: number, toVersion: number): string {
  return `${fromVersion}->${toVersion}`;
}

/**
 * Gets a migration function for a specific version transition
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migration entry or undefined if not found
 */
export function getMigration(fromVersion: number, toVersion: number): MigrationEntry | undefined {
  return MIGRATIONS.get(getMigrationKey(fromVersion, toVersion));
}

// ============================================================================
// Backup System
// ============================================================================

/**
 * Backup result containing the backup file path
 */
export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

/**
 * Creates a backup of the configuration file before migration
 * @param configPath - Path to the configuration file
 * @returns BackupResult with success status and backup path
 */
export function backup(configPath: string): BackupResult {
  try {
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: 'Configuration file does not exist',
      };
    }

    // Create backup directory if it doesn't exist
    const configDir = path.dirname(configPath);
    const backupDir = path.join(configDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configName = path.basename(configPath, path.extname(configPath));
    const backupFilename = `${configName}-backup-${timestamp}${path.extname(configPath)}`;
    const backupPath = path.join(backupDir, backupFilename);

    // Copy the configuration file to backup
    fs.copyFileSync(configPath, backupPath);

    return {
      success: true,
      backupPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during backup',
    };
  }
}

/**
 * Lists all available backup files for a configuration
 * @param configPath - Path to the configuration file
 * @returns Array of backup file paths sorted by date (newest first)
 */
export function listBackups(configPath: string): string[] {
  try {
    const configDir = path.dirname(configPath);
    const backupDir = path.join(configDir, 'backups');
    const configName = path.basename(configPath, path.extname(configPath));

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith(`${configName}-backup-`))
      .map(f => path.join(backupDir, f))
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    return backupFiles;
  } catch {
    return [];
  }
}

/**
 * Restores a configuration from a backup file
 * @param backupPath - Path to the backup file
 * @param configPath - Path to the configuration file
 * @returns Success status
 */
export function restoreBackup(backupPath: string, configPath: string): BackupResult {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: 'Backup file does not exist',
      };
    }

    // Create a backup of current config before restoring
    const currentBackup = backup(configPath);
    if (!currentBackup.success) {
      console.warn('Could not backup current config before restore:', currentBackup.error);
    }

    fs.copyFileSync(backupPath, configPath);

    return {
      success: true,
      backupPath: currentBackup.backupPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during restore',
    };
  }
}

// ============================================================================
// Migration System
// ============================================================================

/**
 * Migration result containing migration details
 */
export interface MigrationResult {
  success: boolean;
  /** Original version before migration */
  fromVersion?: number;
  /** Final version after migration */
  toVersion?: number;
  /** Path to backup file created before migration */
  backupPath?: string;
  /** Number of migrations applied */
  migrationsApplied: number;
  /** Migrated configuration data (if successful) */
  config?: AppConfig;
  /** Error message (if failed) */
  error?: string;
  /** Whether any migration was needed */
  migrationNeeded: boolean;
}

/**
 * Detects the version of a configuration
 * @param config - Configuration data
 * @returns Version number or 0 if not detectable
 */
export function detectVersion(config: unknown): number {
  if (config === null || typeof config !== 'object') {
    return 0;
  }

  const cfg = config as Record<string, unknown>;

  // Check for explicit version field
  if ('version' in cfg && typeof cfg.version === 'number') {
    return cfg.version;
  }

  // If no version field but has profiles array, assume version 1
  if ('profiles' in cfg && Array.isArray(cfg.profiles)) {
    return 1;
  }

  return 0;
}

/**
 * Checks if migration is needed
 * @param currentVersion - Current config version
 * @returns True if migration is needed
 */
export function needsMigration(currentVersion: number): boolean {
  return currentVersion > 0 && currentVersion < CURRENT_VERSION;
}

/**
 * Gets the migration path from current version to target version
 * @param fromVersion - Starting version
 * @param toVersion - Target version
 * @returns Array of version numbers representing the migration path
 */
export function getMigrationPath(fromVersion: number, toVersion: number): number[] {
  if (fromVersion >= toVersion) {
    return [];
  }

  const path: number[] = [fromVersion];
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    if (VERSION_HISTORY.includes(v)) {
      path.push(v);
    }
  }

  return path;
}

/**
 * Migrates configuration from current version to target version
 * Creates a backup before migration
 * @param config - Configuration data to migrate
 * @param configPath - Optional path to config file for backup
 * @returns MigrationResult with migrated config and details
 */
export function migrate(
  config: unknown,
  configPath?: string
): MigrationResult {
  const fromVersion = detectVersion(config);

  // Check if migration is needed
  if (fromVersion === 0) {
    return {
      success: false,
      migrationsApplied: 0,
      migrationNeeded: false,
      error: 'Cannot detect configuration version',
    };
  }

  if (fromVersion === CURRENT_VERSION) {
    return {
      success: true,
      fromVersion,
      toVersion: CURRENT_VERSION,
      migrationsApplied: 0,
      config: config as AppConfig,
      migrationNeeded: false,
    };
  }

  if (fromVersion > CURRENT_VERSION) {
    return {
      success: false,
      fromVersion,
      migrationsApplied: 0,
      migrationNeeded: false,
      error: `Configuration version ${fromVersion} is newer than supported version ${CURRENT_VERSION}`,
    };
  }

  // Create backup before migration
  let backupPath: string | undefined;
  if (configPath) {
    const backupResult = backup(configPath);
    if (backupResult.success) {
      backupPath = backupResult.backupPath;
    } else {
      console.warn('Could not create backup before migration:', backupResult.error);
    }
  }

  // Get migration path
  const migrationPath = getMigrationPath(fromVersion, CURRENT_VERSION);

  if (migrationPath.length < 2) {
    // No migrations needed, but version needs to be updated
    const updatedConfig = {
      ...(config as object),
      version: CURRENT_VERSION,
    };

    // Validate the updated config
    const result = configSchema.safeParse(updatedConfig);
    if (result.success) {
      return {
        success: true,
        fromVersion,
        toVersion: CURRENT_VERSION,
        backupPath,
        migrationsApplied: 0,
        config: result.data as AppConfig,
        migrationNeeded: true,
      };
    }

    return {
      success: false,
      fromVersion,
      backupPath,
      migrationsApplied: 0,
      migrationNeeded: true,
      error: `Validation failed after version update: ${result.error.message}`,
    };
  }

  // Apply migrations step by step
  let currentConfig: unknown = config;
  let migrationsApplied = 0;

  for (let i = 0; i < migrationPath.length - 1; i++) {
    const from = migrationPath[i];
    const to = migrationPath[i + 1];
    const migration = getMigration(from, to);

    if (migration) {
      try {
        currentConfig = migration.migrate(currentConfig);
        migrationsApplied++;
      } catch (error) {
        return {
          success: false,
          fromVersion,
          backupPath,
          migrationsApplied,
          migrationNeeded: true,
          error: `Migration ${from}->${to} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
  }

  // Ensure final version is set
  if (typeof currentConfig === 'object' && currentConfig !== null) {
    (currentConfig as Record<string, unknown>).version = CURRENT_VERSION;
  }

  // Validate final configuration
  const result = configSchema.safeParse(currentConfig);
  if (!result.success) {
    return {
      success: false,
      fromVersion,
      toVersion: CURRENT_VERSION,
      backupPath,
      migrationsApplied,
      migrationNeeded: true,
      error: `Validation failed after migration: ${result.error.message}`,
    };
  }

  return {
    success: true,
    fromVersion,
    toVersion: CURRENT_VERSION,
    backupPath,
    migrationsApplied,
    config: result.data as AppConfig,
    migrationNeeded: true,
  };
}

// ============================================================================
// ConfigMigrator Class
// ============================================================================

/**
 * ConfigMigrator class for managing configuration migrations
 * Provides a high-level API for migration operations
 */
export class ConfigMigrator {
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Gets the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Creates a backup of the current configuration
   * @returns BackupResult with backup details
   */
  backup(): BackupResult {
    return backup(this.configPath);
  }

  /**
   * Lists all available backups
   * @returns Array of backup file paths
   */
  listBackups(): string[] {
    return listBackups(this.configPath);
  }

  /**
   * Restores configuration from a backup
   * @param backupPath - Path to the backup file
   * @returns BackupResult with restore details
   */
  restore(backupPath: string): BackupResult {
    return restoreBackup(backupPath, this.configPath);
  }

  /**
   * Checks if the configuration file needs migration
   * @returns True if migration is needed
   */
  needsMigration(): boolean {
    try {
      const configData = this.readConfig();
      if (!configData) {
        return false;
      }

      const version = detectVersion(configData);
      return needsMigration(version);
    } catch {
      return false;
    }
  }

  /**
   * Gets the current version of the configuration
   * @returns Version number or 0 if not detectable
   */
  getCurrentVersion(): number {
    try {
      const configData = this.readConfig();
      if (!configData) {
        return 0;
      }
      return detectVersion(configData);
    } catch {
      return 0;
    }
  }

  /**
   * Migrates the configuration to the current version
   * Creates a backup before migration
   * @returns MigrationResult with migration details
   */
  migrate(): MigrationResult {
    try {
      const configData = this.readConfig();
      if (!configData) {
        return {
          success: false,
          migrationsApplied: 0,
          migrationNeeded: false,
          error: 'Could not read configuration file',
        };
      }

      const result = migrate(configData, this.configPath);

      // Write migrated config if successful
      if (result.success && result.config && result.migrationNeeded) {
        this.writeConfig(result.config);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        migrationsApplied: 0,
        migrationNeeded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reads the configuration file
   * @private
   */
  private readConfig(): unknown | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Writes the configuration file
   * @private
   */
  private writeConfig(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Factory function to create a ConfigMigrator instance
 * @param configPath - Path to the configuration file
 * @returns ConfigMigrator instance
 */
export function createConfigMigrator(configPath: string): ConfigMigrator {
  return new ConfigMigrator(configPath);
}

// ============================================================================
// Migration Check for ConfigManager Integration
// ============================================================================

/**
 * Checks and applies migrations for a configuration
 * Intended to be called during ConfigManager initialization
 * @param config - Configuration data
 * @param configPath - Path to configuration file for backup
 * @returns Migrated configuration or original if no migration needed
 */
export function checkAndMigrate(
  config: unknown,
  configPath?: string
): { config: AppConfig; migrated: boolean; backupPath?: string } {
  const result = migrate(config, configPath);

  if (result.success && result.config) {
    return {
      config: result.config,
      migrated: result.migrationNeeded,
      backupPath: result.backupPath,
    };
  }

  // If migration failed or wasn't needed, validate and return original
  const validation = configSchema.safeParse(config);
  if (validation.success) {
    return {
      config: validation.data as AppConfig,
      migrated: false,
    };
  }

  // Config is invalid and couldn't be migrated
  throw new Error(
    result.error ?? `Invalid configuration: ${validation.error.message}`
  );
}
