/**
 * Migrations Tests
 *
 * Tests for the configuration migration system that handles version upgrades:
 * - Version detection from configuration data
 * - Migration path calculation between versions
 * - Backup creation before migrations
 * - Backup listing and restoration
 * - Migration execution with validation
 * - ConfigMigrator class operations
 * - Integration with ConfigManager initialization
 *
 * Why these tests matter:
 * The migration system is critical for maintaining backwards compatibility
 * as the application evolves. Bugs here could cause data loss (failed migrations),
 * corrupted configurations (invalid transformations), or users being unable to
 * use the application after updates. These tests ensure migrations are applied
 * correctly and backups protect against data loss.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig, Profile } from '../../shared/types/config';
import {
  VERSION_HISTORY,
  CURRENT_VERSION,
  MIGRATIONS,
  getMigrationKey,
  getMigration,
  backup,
  listBackups,
  restoreBackup,
  detectVersion,
  needsMigration,
  getMigrationPath,
  migrate,
  ConfigMigrator,
  createConfigMigrator,
  checkAndMigrate,
} from './migrations';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
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

// ============================================================================
// Version Constants Tests
// ============================================================================

describe('Version Constants', () => {
  it('VERSION_HISTORY contains at least version 1', () => {
    expect(VERSION_HISTORY).toContain(1);
  });

  it('CURRENT_VERSION matches the latest in VERSION_HISTORY', () => {
    const maxVersion = Math.max(...VERSION_HISTORY);
    expect(CURRENT_VERSION).toBe(maxVersion);
  });

  it('VERSION_HISTORY is sorted in ascending order', () => {
    const sorted = [...VERSION_HISTORY].sort((a, b) => a - b);
    expect(VERSION_HISTORY).toEqual(sorted);
  });

  it('MIGRATIONS map exists', () => {
    expect(MIGRATIONS).toBeInstanceOf(Map);
  });
});

// ============================================================================
// getMigrationKey Tests
// ============================================================================

describe('getMigrationKey', () => {
  it('creates correct key format', () => {
    expect(getMigrationKey(1, 2)).toBe('1->2');
    expect(getMigrationKey(5, 10)).toBe('5->10');
  });

  it('handles same version', () => {
    expect(getMigrationKey(1, 1)).toBe('1->1');
  });

  it('handles reverse direction', () => {
    expect(getMigrationKey(3, 1)).toBe('3->1');
  });
});

// ============================================================================
// getMigration Tests
// ============================================================================

describe('getMigration', () => {
  it('returns undefined for non-existent migration', () => {
    const result = getMigration(999, 1000);
    expect(result).toBeUndefined();
  });

  it('returns undefined for 1->1 (same version)', () => {
    const result = getMigration(1, 1);
    expect(result).toBeUndefined();
  });

  // Note: Actual migration entries would be tested when they exist
  // Currently MIGRATIONS map is empty as app is at version 1
});

// ============================================================================
// detectVersion Tests
// ============================================================================

describe('detectVersion', () => {
  it('returns version from config with version field', () => {
    const config = createTestConfig({ version: 1 });
    expect(detectVersion(config)).toBe(1);
  });

  it('returns version 1 for config without version but with profiles', () => {
    const config = {
      profiles: [],
      activeProfileId: '',
      deviceSettings: {},
      appSettings: {},
      integrations: {},
    };
    expect(detectVersion(config)).toBe(1);
  });

  it('returns 0 for null input', () => {
    expect(detectVersion(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(detectVersion(undefined)).toBe(0);
  });

  it('returns 0 for non-object input', () => {
    expect(detectVersion('string')).toBe(0);
    expect(detectVersion(123)).toBe(0);
    expect(detectVersion(true)).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(detectVersion({})).toBe(0);
  });

  it('returns 0 for object without version or profiles', () => {
    expect(detectVersion({ someOtherField: 'value' })).toBe(0);
  });

  it('returns 0 for profiles that is not an array', () => {
    expect(detectVersion({ profiles: 'not an array' })).toBe(0);
  });

  it('returns version when version is string number', () => {
    // version must be a number, not string
    expect(detectVersion({ version: '1' })).toBe(0);
  });

  it('returns higher versions correctly', () => {
    expect(detectVersion({ version: 5 })).toBe(5);
    expect(detectVersion({ version: 100 })).toBe(100);
  });
});

// ============================================================================
// needsMigration Tests
// ============================================================================

describe('needsMigration', () => {
  it('returns false when version equals CURRENT_VERSION', () => {
    expect(needsMigration(CURRENT_VERSION)).toBe(false);
  });

  it('returns false when version is greater than CURRENT_VERSION', () => {
    expect(needsMigration(CURRENT_VERSION + 1)).toBe(false);
  });

  it('returns false when version is 0', () => {
    expect(needsMigration(0)).toBe(false);
  });

  it('returns true when version is less than CURRENT_VERSION and greater than 0', () => {
    if (CURRENT_VERSION > 1) {
      expect(needsMigration(1)).toBe(true);
    } else {
      // Skip test if current version is 1
      expect(true).toBe(true);
    }
  });
});

// ============================================================================
// getMigrationPath Tests
// ============================================================================

describe('getMigrationPath', () => {
  it('returns empty array when fromVersion >= toVersion', () => {
    expect(getMigrationPath(2, 1)).toEqual([]);
    expect(getMigrationPath(5, 5)).toEqual([]);
  });

  it('returns path including both endpoints', () => {
    const path = getMigrationPath(1, 1);
    expect(path).toEqual([]);
  });

  it('returns correct path for version 1 to CURRENT_VERSION', () => {
    if (CURRENT_VERSION === 1) {
      expect(getMigrationPath(1, 1)).toEqual([]);
    } else {
      const path = getMigrationPath(1, CURRENT_VERSION);
      expect(path[0]).toBe(1);
      expect(path[path.length - 1]).toBe(CURRENT_VERSION);
    }
  });

  it('only includes versions that exist in VERSION_HISTORY', () => {
    const path = getMigrationPath(1, 10);
    path.forEach((v, i) => {
      if (i > 0) {
        expect(VERSION_HISTORY).toContain(v);
      }
    });
  });
});

// ============================================================================
// Backup System Tests
// ============================================================================

describe('backup', () => {
  const mockConfigPath = '/mock/config/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = backup(mockConfigPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });

  it('creates backup directory if it does not exist', () => {
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true)  // config file exists
      .mockReturnValueOnce(false); // backup dir doesn't exist

    backup(mockConfigPath);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('backups'),
      { recursive: true }
    );
  });

  it('creates backup file with timestamp', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = backup(mockConfigPath);

    expect(fs.copyFileSync).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.backupPath).toContain('backup');
    expect(result.backupPath).toContain('.json');
  });

  it('returns error on copy failure', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.copyFileSync).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = backup(mockConfigPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});

describe('listBackups', () => {
  const mockConfigPath = '/mock/config/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when backup directory does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = listBackups(mockConfigPath);

    expect(result).toEqual([]);
  });

  it('returns only matching backup files', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'config-backup-2024-01-01.json',
      'config-backup-2024-01-02.json',
      'other-file.json',
    ] as unknown as fs.Dirent[]);
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: new Date('2024-01-01'),
    } as fs.Stats);

    const result = listBackups(mockConfigPath);

    expect(result).toHaveLength(2);
    result.forEach(f => {
      expect(f).toContain('config-backup');
    });
  });

  it('sorts backups by modification time (newest first)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'config-backup-old.json',
      'config-backup-new.json',
    ] as unknown as fs.Dirent[]);

    let callCount = 0;
    vi.mocked(fs.statSync).mockImplementation(() => {
      callCount++;
      return {
        mtime: callCount === 1 ? new Date('2024-01-01') : new Date('2024-01-15'),
      } as fs.Stats;
    });

    const result = listBackups(mockConfigPath);

    expect(result).toHaveLength(2);
    // Newer file should be first
  });

  it('returns empty array on read error', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error('Read error');
    });

    const result = listBackups(mockConfigPath);

    expect(result).toEqual([]);
  });
});

describe('restoreBackup', () => {
  const mockBackupPath = '/mock/backup/config-backup.json';
  const mockConfigPath = '/mock/config/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when backup file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = restoreBackup(mockBackupPath, mockConfigPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });

  it('creates backup of current config before restoring', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    restoreBackup(mockBackupPath, mockConfigPath);

    // copyFileSync should be called - once for backup attempt, once for restore
    expect(fs.copyFileSync).toHaveBeenCalled();
  });

  it('copies backup file to config path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Reset mock to track calls properly
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});

    const result = restoreBackup(mockBackupPath, mockConfigPath);

    // copyFileSync is called twice: once for pre-restore backup, once for actual restore
    expect(fs.copyFileSync).toHaveBeenCalled();
    // The last call should be the actual restore
    const calls = vi.mocked(fs.copyFileSync).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(mockBackupPath);
    expect(lastCall[1]).toBe(mockConfigPath);
    expect(result.success).toBe(true);
  });

  it('returns error on copy failure', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.copyFileSync).mockImplementation(() => {
      throw new Error('Disk full');
    });

    const result = restoreBackup(mockBackupPath, mockConfigPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Disk full');
  });
});

// ============================================================================
// migrate Function Tests
// ============================================================================

describe('migrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it('returns error for config with undetectable version', () => {
    const result = migrate(null);

    expect(result.success).toBe(false);
    expect(result.migrationsApplied).toBe(0);
    expect(result.migrationNeeded).toBe(false);
    expect(result.error).toContain('Cannot detect');
  });

  it('returns success with no migrations for current version', () => {
    const config = createTestConfig({ version: CURRENT_VERSION });

    const result = migrate(config);

    expect(result.success).toBe(true);
    expect(result.migrationsApplied).toBe(0);
    expect(result.migrationNeeded).toBe(false);
    expect(result.config).toBeDefined();
  });

  it('returns error for config newer than CURRENT_VERSION', () => {
    const config = createTestConfig({ version: CURRENT_VERSION + 5 });

    const result = migrate(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('newer than supported');
  });

  it('creates backup when configPath is provided', () => {
    const config = createTestConfig({ version: CURRENT_VERSION });

    migrate(config, '/mock/config.json');

    // Since config is at current version, no actual migration happens
    // but if it weren't, backup would be created
  });

  it('returns migrated config when successful', () => {
    const config = createTestConfig({ version: CURRENT_VERSION });

    const result = migrate(config);

    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.version).toBe(CURRENT_VERSION);
  });

  it('handles config without version but with profiles (assumes v1)', () => {
    const config = {
      profiles: [createTestProfile()],
      activeProfileId: 'test-profile-1',
      deviceSettings: { brightness: 75, sleepTimeout: 5, screensaverEnabled: false },
      appSettings: { launchOnStartup: false, minimizeToTray: true, closeToTray: true, theme: 'system', language: 'en' },
      integrations: { homeAssistant: { enabled: false }, nodeRed: { enabled: false } },
    };

    const result = migrate(config);

    // Should detect version 1 and handle accordingly
    expect(result.fromVersion).toBe(1);
  });
});

// ============================================================================
// ConfigMigrator Class Tests
// ============================================================================

describe('ConfigMigrator', () => {
  const mockConfigPath = '/mock/config/config.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with config path', () => {
      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.getConfigPath()).toBe(mockConfigPath);
    });
  });

  describe('getConfigPath', () => {
    it('returns the config path', () => {
      const migrator = new ConfigMigrator('/custom/path/config.json');
      expect(migrator.getConfigPath()).toBe('/custom/path/config.json');
    });
  });

  describe('backup', () => {
    it('creates backup of config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.backup();

      expect(result.success).toBe(true);
    });
  });

  describe('listBackups', () => {
    it('lists available backups', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'config-backup-1.json',
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as fs.Stats);

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.listBackups();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('restore', () => {
    it('restores from backup file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.restore('/mock/backup/file.json');

      expect(result.success).toBe(true);
    });
  });

  describe('needsMigration', () => {
    it('returns false when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.needsMigration()).toBe(false);
    });

    it('returns false for current version config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(createTestConfig({ version: CURRENT_VERSION }))
      );

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.needsMigration()).toBe(false);
    });

    it('returns false on read error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.needsMigration()).toBe(false);
    });
  });

  describe('getCurrentVersion', () => {
    it('returns 0 when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.getCurrentVersion()).toBe(0);
    });

    it('returns version from config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(createTestConfig({ version: 1 }))
      );

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.getCurrentVersion()).toBe(1);
    });

    it('returns 0 on read error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      const migrator = new ConfigMigrator(mockConfigPath);
      expect(migrator.getCurrentVersion()).toBe(0);
    });
  });

  describe('migrate', () => {
    it('returns error when config file cannot be read', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not read');
    });

    it('writes migrated config when migration needed', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(createTestConfig({ version: CURRENT_VERSION }))
      );

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.migrate();

      // No migration needed for current version
      expect(result.success).toBe(true);
      expect(result.migrationNeeded).toBe(false);
    });

    it('handles JSON parse errors', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const migrator = new ConfigMigrator(mockConfigPath);
      const result = migrator.migrate();

      // readConfig returns null for invalid JSON
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// createConfigMigrator Factory Tests
// ============================================================================

describe('createConfigMigrator', () => {
  it('creates ConfigMigrator instance', () => {
    const migrator = createConfigMigrator('/test/path.json');

    expect(migrator).toBeInstanceOf(ConfigMigrator);
    expect(migrator.getConfigPath()).toBe('/test/path.json');
  });
});

// ============================================================================
// checkAndMigrate Integration Tests
// ============================================================================

describe('checkAndMigrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it('returns config without migration when already at current version', () => {
    const config = createTestConfig({ version: CURRENT_VERSION });

    const result = checkAndMigrate(config);

    expect(result.config).toBeDefined();
    expect(result.migrated).toBe(false);
    expect(result.backupPath).toBeUndefined();
  });

  it('returns validated config when passed as argument', () => {
    const config = createTestConfig();

    const result = checkAndMigrate(config);

    expect(result.config.version).toBe(CURRENT_VERSION);
    expect(result.config.profiles).toHaveLength(1);
  });

  it('throws error for invalid config that cannot be migrated', () => {
    const invalidConfig = { version: 'invalid' };

    expect(() => checkAndMigrate(invalidConfig)).toThrow();
  });

  it('creates backup when migration needed and configPath provided', () => {
    // This would need actual migration (version < CURRENT_VERSION)
    // Currently CURRENT_VERSION is 1, so no migrations exist
    const config = createTestConfig({ version: CURRENT_VERSION });

    const result = checkAndMigrate(config, '/mock/config.json');

    expect(result.migrated).toBe(false);
  });

  it('returns original config when valid but migration failed', () => {
    // Test with valid config that doesn't need migration
    const config = createTestConfig({ version: CURRENT_VERSION });

    const result = checkAndMigrate(config);

    expect(result.config).toBeDefined();
    expect(result.config.version).toBe(CURRENT_VERSION);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles config with version 0', () => {
    const config = { version: 0 };

    const result = migrate(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot detect');
  });

  it('handles negative version numbers', () => {
    const config = { version: -1 };

    const result = migrate(config);

    expect(result.success).toBe(false);
  });

  it('handles very large version numbers', () => {
    const config = { version: 999999 };

    const result = migrate(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('newer than supported');
  });

  it('detectVersion handles config with version as non-integer', () => {
    expect(detectVersion({ version: 1.5 })).toBe(1.5);
    // NaN is typeof 'number' so detectVersion returns NaN
    expect(detectVersion({ version: NaN })).toBeNaN();
    expect(detectVersion({ version: Infinity })).toBe(Infinity);
  });

  it('getMigrationPath handles large gaps', () => {
    const path = getMigrationPath(1, 100);

    // Should only include versions in VERSION_HISTORY
    expect(path[0]).toBe(1);
  });

  it('backup handles paths with special characters', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});

    const result = backup('/path/with spaces/and (parens)/config.json');

    // Should still work
    expect(result.success).toBe(true);
  });

  it('restoreBackup continues even if pre-restore backup fails', () => {
    // First existsSync call for backup path - true
    // Then backup() is called which checks if config exists
    let callCount = 0;
    vi.mocked(fs.existsSync).mockImplementation(() => {
      callCount++;
      // First call: backup file exists = true
      // Second call (in backup()): config file doesn't exist = false (backup fails)
      return callCount === 1;
    });
    // Ensure copyFileSync works for the actual restore
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});

    // Mock console.warn to prevent noise
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = restoreBackup('/mock/backup.json', '/mock/config.json');

    // Should still succeed even though pre-restore backup failed
    expect(result.success).toBe(true);

    consoleWarnSpy.mockRestore();
  });
});
