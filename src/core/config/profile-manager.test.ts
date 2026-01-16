/**
 * ProfileManager Tests
 *
 * Tests for the ProfileManager class that manages profile CRUD operations:
 * - Creating profiles with validation
 * - Reading profiles (by ID, list, active, default)
 * - Updating profiles with partial data
 * - Deleting profiles (with last-profile protection)
 * - Duplicating profiles
 * - Setting active/default profiles
 * - Event listeners for profile changes
 *
 * Why these tests matter:
 * Profiles contain all button and encoder configurations. Bugs in profile
 * management could cause data loss (deleted profiles) or corrupted state
 * (invalid profiles, broken active profile references). These tests ensure
 * CRUD operations work correctly and the profile system remains consistent.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppConfig, Profile, ButtonConfig, EncoderConfig } from '../../shared/types/config';
import {
  ProfileManager,
  createProfileManager,
  type ProfileManagerEventType,
  type ProfileManagerListener,
} from './profile-manager';
import { ConfigManager } from './config-manager';

// Mock uuid to return predictable IDs
let mockUuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter}`),
}));

// Mock ConfigManager
vi.mock('./config-manager', () => {
  return {
    ConfigManager: vi.fn(),
  };
});

// Helper to create valid test profiles
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

// Helper to create a mock ConfigManager
const createMockConfigManager = (initialProfiles: Profile[] = []) => {
  let profiles = [...initialProfiles];
  let activeProfileId = profiles.length > 0 ? profiles[0].id : '';
  let config: AppConfig = {
    version: 1,
    profiles,
    activeProfileId,
    deviceSettings: { brightness: 75, sleepTimeout: 5, screensaverEnabled: false },
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
  };

  return {
    getProfiles: vi.fn(() => profiles.map(p => ({ ...p }))),
    getProfile: vi.fn((id: string) => {
      const profile = profiles.find(p => p.id === id);
      return profile ? { ...profile } : undefined;
    }),
    getConfig: vi.fn(() => ({ ...config, profiles: [...profiles] })),
    setConfig: vi.fn((newConfig: AppConfig) => {
      config = newConfig;
      profiles = newConfig.profiles;
      activeProfileId = newConfig.activeProfileId;
    }),
    getActiveProfile: vi.fn(() => {
      const profile = profiles.find(p => p.id === activeProfileId);
      return profile ? { ...profile } : profiles[0];
    }),
    getActiveProfileId: vi.fn(() => activeProfileId),
    setActiveProfileId: vi.fn((id: string) => {
      activeProfileId = id;
    }),
    hasProfile: vi.fn((id: string) => profiles.some(p => p.id === id)),
    getProfileCount: vi.fn(() => profiles.length),
  } as unknown as ConfigManager;
};

describe('ProfileManager', () => {
  let mockConfigManager: ReturnType<typeof createMockConfigManager>;
  let profileManager: ProfileManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUuidCounter = 0;
    // Create with one default profile
    mockConfigManager = createMockConfigManager([
      createTestProfile({ id: 'profile-1', name: 'Profile 1', isDefault: true }),
      createTestProfile({ id: 'profile-2', name: 'Profile 2', isDefault: false }),
    ]);
    profileManager = new ProfileManager(mockConfigManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create a ProfileManager instance', () => {
      expect(profileManager).toBeInstanceOf(ProfileManager);
    });

    it('should store reference to ConfigManager', () => {
      const pm = new ProfileManager(mockConfigManager);
      // Verify it can access configManager by calling a method
      pm.list();
      expect(mockConfigManager.getProfiles).toHaveBeenCalled();
    });
  });

  describe('Create Operations', () => {
    it('should create a new profile with name', () => {
      const profile = profileManager.create('New Profile');

      expect(profile.id).toBe('mock-uuid-1');
      expect(profile.name).toBe('New Profile');
      expect(profile.buttons).toEqual([]);
      expect(profile.encoders).toEqual([]);
      expect(profile.isDefault).toBe(false);
    });

    it('should create profile with optional description', () => {
      const profile = profileManager.create('New Profile', {
        description: 'My custom profile',
      });

      expect(profile.description).toBe('My custom profile');
    });

    it('should create profile with initial buttons', () => {
      const buttons: ButtonConfig[] = [{ index: 0 }, { index: 1 }];
      const profile = profileManager.create('New Profile', { buttons });

      expect(profile.buttons).toEqual(buttons);
    });

    it('should create profile with initial encoders', () => {
      const encoders: EncoderConfig[] = [{ index: 0 }, { index: 1 }];
      const profile = profileManager.create('New Profile', { encoders });

      expect(profile.encoders).toEqual(encoders);
    });

    it('should create profile as default when specified', () => {
      const profile = profileManager.create('New Profile', { isDefault: true });

      expect(profile.isDefault).toBe(true);
      // Should unset other defaults
      expect(mockConfigManager.setConfig).toHaveBeenCalled();
    });

    it('should set timestamps on creation', () => {
      const before = new Date().toISOString();
      const profile = profileManager.create('New Profile');
      const after = new Date().toISOString();

      expect(profile.createdAt >= before).toBe(true);
      expect(profile.createdAt <= after).toBe(true);
      expect(profile.updatedAt).toBe(profile.createdAt);
    });

    it('should emit profile:created event', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);

      const profile = profileManager.create('New Profile');

      expect(listener).toHaveBeenCalledWith('profile:created', profile, undefined);
    });

    it('should add profile to config', () => {
      profileManager.create('New Profile');

      expect(mockConfigManager.setConfig).toHaveBeenCalled();
      const setConfigArg = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setConfigArg.profiles).toHaveLength(3);
    });
  });

  describe('Read Operations', () => {
    describe('getById', () => {
      it('should return profile by ID', () => {
        const profile = profileManager.getById('profile-1');
        expect(profile).toBeDefined();
        expect(profile?.name).toBe('Profile 1');
      });

      it('should return undefined for non-existent ID', () => {
        const profile = profileManager.getById('non-existent');
        expect(profile).toBeUndefined();
      });
    });

    describe('list', () => {
      it('should return all profiles', () => {
        const profiles = profileManager.list();
        expect(profiles).toHaveLength(2);
      });

      it('should delegate to ConfigManager', () => {
        profileManager.list();
        expect(mockConfigManager.getProfiles).toHaveBeenCalled();
      });
    });

    describe('getActive', () => {
      it('should return active profile', () => {
        const active = profileManager.getActive();
        expect(active.id).toBe('profile-1');
      });
    });

    describe('getActiveId', () => {
      it('should return active profile ID', () => {
        const activeId = profileManager.getActiveId();
        expect(activeId).toBe('profile-1');
      });
    });

    describe('getDefault', () => {
      it('should return default profile', () => {
        const defaultProfile = profileManager.getDefault();
        expect(defaultProfile?.isDefault).toBe(true);
        expect(defaultProfile?.id).toBe('profile-1');
      });

      it('should return undefined if no default profile', () => {
        mockConfigManager.getProfiles = vi.fn(() => [
          createTestProfile({ id: 'p1', isDefault: false }),
        ]);
        const defaultProfile = profileManager.getDefault();
        expect(defaultProfile).toBeUndefined();
      });
    });

    describe('exists', () => {
      it('should return true for existing profile', () => {
        expect(profileManager.exists('profile-1')).toBe(true);
      });

      it('should return false for non-existent profile', () => {
        expect(profileManager.exists('non-existent')).toBe(false);
      });
    });

    describe('count', () => {
      it('should return profile count', () => {
        expect(profileManager.count()).toBe(2);
      });
    });
  });

  describe('Update Operations', () => {
    it('should update profile name', () => {
      const updated = profileManager.update('profile-1', { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(mockConfigManager.setConfig).toHaveBeenCalled();
    });

    it('should update profile description', () => {
      const updated = profileManager.update('profile-1', { description: 'New description' });

      expect(updated.description).toBe('New description');
    });

    it('should update profile buttons', () => {
      const newButtons: ButtonConfig[] = [{ index: 0 }, { index: 1 }, { index: 2 }];
      const updated = profileManager.update('profile-1', { buttons: newButtons });

      expect(updated.buttons).toEqual(newButtons);
    });

    it('should preserve profile ID', () => {
      const updated = profileManager.update('profile-1', { name: 'Updated' });

      expect(updated.id).toBe('profile-1');
    });

    it('should preserve createdAt timestamp', () => {
      const original = profileManager.getById('profile-1');
      const updated = profileManager.update('profile-1', { name: 'Updated' });

      expect(updated.createdAt).toBe(original?.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const original = profileManager.getById('profile-1');
      const updated = profileManager.update('profile-1', { name: 'Updated' });

      expect(updated.updatedAt).not.toBe(original?.updatedAt);
    });

    it('should throw error for non-existent profile', () => {
      expect(() => profileManager.update('non-existent', { name: 'Test' })).toThrow('not found');
    });

    it('should emit profile:updated event', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);

      const updated = profileManager.update('profile-1', { name: 'Updated' });

      expect(listener).toHaveBeenCalledWith('profile:updated', updated, undefined);
    });

    it('should unset other defaults when setting profile as default', () => {
      profileManager.update('profile-2', { isDefault: true });

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const profile1InConfig = setConfigCall.profiles.find((p: Profile) => p.id === 'profile-1');
      expect(profile1InConfig.isDefault).toBe(false);
    });
  });

  describe('Delete Operations', () => {
    it('should delete a profile', () => {
      const result = profileManager.delete('profile-2');

      expect(result).toBe(true);
      expect(mockConfigManager.setConfig).toHaveBeenCalled();
    });

    it('should throw error when deleting non-existent profile', () => {
      expect(() => profileManager.delete('non-existent')).toThrow('not found');
    });

    it('should throw error when deleting last profile', () => {
      const singleProfileManager = new ProfileManager(
        createMockConfigManager([createTestProfile({ id: 'only-profile' })])
      );

      expect(() => singleProfileManager.delete('only-profile')).toThrow(
        'Cannot delete the last remaining profile'
      );
    });

    it('should emit profile:deleted event', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);

      profileManager.delete('profile-2');

      expect(listener).toHaveBeenCalledWith(
        'profile:deleted',
        expect.objectContaining({ id: 'profile-2' }),
        undefined
      );
    });

    it('should assign default to another profile when deleting default', () => {
      profileManager.delete('profile-1');

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const remainingProfiles = setConfigCall.profiles;
      expect(remainingProfiles[0].isDefault).toBe(true);
    });

    it('should switch active profile when deleting active', () => {
      profileManager.delete('profile-1');

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setConfigCall.activeProfileId).toBe('profile-2');
    });
  });

  describe('Active Profile Operations', () => {
    it('should set active profile', () => {
      profileManager.setActive('profile-2');

      expect(mockConfigManager.setActiveProfileId).toHaveBeenCalledWith('profile-2');
    });

    it('should throw error when setting non-existent profile as active', () => {
      mockConfigManager.getProfile = vi.fn(() => undefined);

      expect(() => profileManager.setActive('non-existent')).toThrow('not found');
    });

    it('should emit profile:activated event', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);

      profileManager.setActive('profile-2');

      expect(listener).toHaveBeenCalledWith(
        'profile:activated',
        expect.objectContaining({ id: 'profile-2' }),
        undefined
      );
    });
  });

  describe('Duplication Operations', () => {
    it('should duplicate a profile with new name', () => {
      const duplicate = profileManager.duplicate('profile-1', 'Duplicated Profile');

      expect(duplicate.name).toBe('Duplicated Profile');
      expect(duplicate.id).not.toBe('profile-1');
    });

    it('should generate new ID for duplicate', () => {
      const duplicate = profileManager.duplicate('profile-1', 'Duplicate');

      expect(duplicate.id).toBe('mock-uuid-1');
    });

    it('should copy buttons from source profile', () => {
      const sourceWithButtons = createMockConfigManager([
        createTestProfile({
          id: 'source',
          buttons: [{ index: 0, label: 'Button 1' }],
        }),
      ]);
      const pm = new ProfileManager(sourceWithButtons);

      const duplicate = pm.duplicate('source', 'Duplicate');

      expect(duplicate.buttons).toHaveLength(1);
      expect(duplicate.buttons[0].label).toBe('Button 1');
    });

    it('should copy encoders from source profile', () => {
      const sourceWithEncoders = createMockConfigManager([
        createTestProfile({
          id: 'source',
          encoders: [{ index: 0 }],
        }),
      ]);
      const pm = new ProfileManager(sourceWithEncoders);

      const duplicate = pm.duplicate('source', 'Duplicate');

      expect(duplicate.encoders).toHaveLength(1);
    });

    it('should set duplicate as non-default', () => {
      const duplicate = profileManager.duplicate('profile-1', 'Duplicate');

      expect(duplicate.isDefault).toBe(false);
    });

    it('should set new timestamps', () => {
      const duplicate = profileManager.duplicate('profile-1', 'Duplicate');

      expect(duplicate.createdAt).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('should throw error for non-existent source profile', () => {
      expect(() => profileManager.duplicate('non-existent', 'Duplicate')).toThrow('not found');
    });

    it('should emit profile:duplicated event with source ID', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);

      const duplicate = profileManager.duplicate('profile-1', 'Duplicate');

      expect(listener).toHaveBeenCalledWith('profile:duplicated', duplicate, {
        sourceProfileId: 'profile-1',
      });
    });

    it('should deep clone buttons (no shared references)', () => {
      const sourceWithButtons = createMockConfigManager([
        createTestProfile({
          id: 'source',
          buttons: [{ index: 0, action: { id: 'a1', type: 'keyboard', name: 'Test', keys: 'a', enabled: true } }],
        }),
      ]);
      const pm = new ProfileManager(sourceWithButtons);

      const duplicate = pm.duplicate('source', 'Duplicate');

      // Modify duplicate's button action
      if (duplicate.buttons[0].action) {
        duplicate.buttons[0].action.name = 'Modified';
      }

      // Source should not be affected
      const source = sourceWithButtons.getProfile('source');
      expect(source?.buttons[0].action?.name).toBe('Test');
    });
  });

  describe('Default Profile Operations', () => {
    it('should set profile as default', () => {
      profileManager.setDefault('profile-2');

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const profile2 = setConfigCall.profiles.find((p: Profile) => p.id === 'profile-2');
      expect(profile2.isDefault).toBe(true);
    });

    it('should unset other profiles as default', () => {
      profileManager.setDefault('profile-2');

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const profile1 = setConfigCall.profiles.find((p: Profile) => p.id === 'profile-1');
      expect(profile1.isDefault).toBe(false);
    });

    it('should throw error for non-existent profile', () => {
      mockConfigManager.getProfile = vi.fn(() => undefined);

      expect(() => profileManager.setDefault('non-existent')).toThrow('not found');
    });

    it('should update timestamps for all affected profiles', () => {
      profileManager.setDefault('profile-2');

      const setConfigCall = (mockConfigManager.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const profile1 = setConfigCall.profiles.find((p: Profile) => p.id === 'profile-1');
      const profile2 = setConfigCall.profiles.find((p: Profile) => p.id === 'profile-2');

      expect(profile1.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
      expect(profile2.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener', () => {
      const listener = vi.fn();
      const unsubscribe = profileManager.onEvent(listener);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should remove listener using returned function', () => {
      const listener = vi.fn();
      const unsubscribe = profileManager.onEvent(listener);

      unsubscribe();
      profileManager.create('Test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove listener using offEvent', () => {
      const listener = vi.fn();
      profileManager.onEvent(listener);
      profileManager.offEvent(listener);

      profileManager.create('Test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      profileManager.onEvent(errorListener);
      profileManager.onEvent(normalListener);

      // Should not throw
      expect(() => profileManager.create('Test')).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
    });

    it('should call all listeners for each event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      profileManager.onEvent(listener1);
      profileManager.onEvent(listener2);

      profileManager.create('Test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create ProfileManager via factory function', () => {
      const pm = createProfileManager(mockConfigManager);
      expect(pm).toBeInstanceOf(ProfileManager);
    });
  });
});
