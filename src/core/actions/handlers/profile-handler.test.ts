/**
 * ProfileHandler Tests
 *
 * Tests for the profile switching action handler that enables:
 * - Profile switching via button press
 * - Validation of target profile existence
 * - Detection of already-active profile
 *
 * Why these tests matter:
 * ProfileHandler allows users to configure buttons to switch between
 * different configurations. Bugs here could lock users into a profile
 * or cause unexpected behavior during profile transitions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileHandler, createProfileHandler } from './profile-handler';
import { ProfileAction } from '../../../shared/types/actions';
import { ProfileManager } from '../../config/profile-manager';
import type { Profile } from '../../../shared/types/config';

// Helper to create a mock profile
const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  isDefault: false,
  workspaces: [{
    id: 'workspace-1',
    name: 'Workspace 1',
    buttons: [],
    encoders: [],
  }],
  activeWorkspaceIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Helper to create a mock ProfileAction
const createMockProfileAction = (overrides?: Partial<ProfileAction>): ProfileAction => ({
  id: 'action-1',
  type: 'profile',
  name: 'Switch to Profile',
  enabled: true,
  profileId: 'profile-2',
  ...overrides,
});

// Helper to create a mock ProfileManager
const createMockProfileManager = (overrides?: Partial<ProfileManager>): ProfileManager => {
  const mockProfiles: Profile[] = [
    createMockProfile({ id: 'profile-1', name: 'Profile One' }),
    createMockProfile({ id: 'profile-2', name: 'Profile Two' }),
    createMockProfile({ id: 'profile-3', name: 'Profile Three' }),
  ];

  const activeProfileId = 'profile-1';

  return {
    getById: vi.fn().mockImplementation((id: string) =>
      mockProfiles.find((p) => p.id === id)
    ),
    getActive: vi.fn().mockReturnValue(mockProfiles.find((p) => p.id === activeProfileId)),
    setActive: vi.fn(),
    list: vi.fn().mockReturnValue(mockProfiles),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
    onEvent: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  } as unknown as ProfileManager;
};

describe('ProfileHandler', () => {
  let handler: ProfileHandler;
  let mockProfileManager: ProfileManager;

  beforeEach(() => {
    mockProfileManager = createMockProfileManager();
    handler = new ProfileHandler(mockProfileManager);
  });

  describe('constructor and actionType', () => {
    it('should have actionType "profile"', () => {
      expect(handler.actionType).toBe('profile');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createProfileHandler(mockProfileManager);
      expect(factoryHandler).toBeInstanceOf(ProfileHandler);
      expect(factoryHandler.actionType).toBe('profile');
    });
  });

  describe('execute', () => {
    it('should successfully switch to a different profile', async () => {
      const action = createMockProfileAction({ profileId: 'profile-2' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockProfileManager.setActive).toHaveBeenCalledWith('profile-2');
      expect(result.data).toEqual({
        previousProfile: 'Profile One',
        newProfile: 'Profile Two',
      });
    });

    it('should succeed without switching when already on target profile', async () => {
      const action = createMockProfileAction({ profileId: 'profile-1' }); // Already active

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(mockProfileManager.setActive).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        alreadyActive: true,
        profileName: 'Profile One',
      });
    });

    it('should fail when action is disabled', async () => {
      const action = createMockProfileAction({ enabled: false });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Action is disabled');
      expect(mockProfileManager.setActive).not.toHaveBeenCalled();
    });

    it('should fail when target profile does not exist', async () => {
      const action = createMockProfileAction({ profileId: 'nonexistent-profile' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Profile not found: nonexistent-profile');
      expect(mockProfileManager.setActive).not.toHaveBeenCalled();
    });

    it('should handle errors thrown by ProfileManager.setActive', async () => {
      const mockManager = createMockProfileManager({
        setActive: vi.fn().mockImplementation(() => {
          throw new Error('Failed to save profile state');
        }),
      } as Partial<ProfileManager>);
      const errorHandler = new ProfileHandler(mockManager);
      const action = createMockProfileAction({ profileId: 'profile-2' });

      const result = await errorHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Failed to save profile state');
    });

    it('should include accurate timing information', async () => {
      const action = createMockProfileAction({ profileId: 'profile-2' });
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should handle profile switch to third profile', async () => {
      const action = createMockProfileAction({ profileId: 'profile-3' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.setActive).toHaveBeenCalledWith('profile-3');
      expect(result.data).toEqual({
        previousProfile: 'Profile One',
        newProfile: 'Profile Three',
      });
    });

    it('should preserve action id in result', async () => {
      const action = createMockProfileAction({ id: 'custom-action-id' });

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string profile id gracefully', async () => {
      const action = createMockProfileAction({ profileId: '' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('not found');
    });

    it('should handle getById returning undefined correctly', async () => {
      const mockManager = createMockProfileManager({
        getById: vi.fn().mockReturnValue(undefined),
      } as Partial<ProfileManager>);
      const testHandler = new ProfileHandler(mockManager);
      const action = createMockProfileAction({ profileId: 'any-id' });

      const result = await testHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Profile not found: any-id');
    });
  });
});
