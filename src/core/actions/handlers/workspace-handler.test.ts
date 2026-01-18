/**
 * WorkspaceHandler Tests
 *
 * Tests for the workspace navigation action handler that enables:
 * - Workspace navigation via button press (next/previous)
 * - Direct workspace selection by index
 * - Circular navigation at boundaries
 *
 * Why these tests matter:
 * WorkspaceHandler allows users to quickly switch between different button
 * configurations within a profile. Bugs here could prevent workspace switching
 * or cause incorrect workspace selection, breaking the user's workflow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceHandler, createWorkspaceHandler } from './workspace-handler';
import { WorkspaceAction } from '../../../shared/types/actions';
import { ProfileManager } from '../../config/profile-manager';
import type { Profile, Workspace } from '../../../shared/types/config';

// Helper to create a mock workspace
const createMockWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  id: 'workspace-1',
  name: 'Workspace 1',
  buttons: [],
  encoders: [],
  ...overrides,
});

// Helper to create a mock profile
const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  isDefault: false,
  workspaces: [
    createMockWorkspace({ id: 'ws-1', name: 'Workspace 1' }),
    createMockWorkspace({ id: 'ws-2', name: 'Workspace 2' }),
    createMockWorkspace({ id: 'ws-3', name: 'Workspace 3' }),
  ],
  activeWorkspaceIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Helper to create a mock WorkspaceAction
const createMockWorkspaceAction = (overrides?: Partial<WorkspaceAction>): WorkspaceAction => ({
  id: 'action-1',
  type: 'workspace',
  name: 'Navigate Workspace',
  enabled: true,
  direction: 'next',
  ...overrides,
});

// Helper to create a mock ProfileManager
const createMockProfileManager = (profile: Profile = createMockProfile()): ProfileManager => {
  let currentProfile = { ...profile };

  return {
    getById: vi.fn().mockImplementation((id: string) =>
      id === currentProfile.id ? currentProfile : undefined
    ),
    getActive: vi.fn().mockImplementation(() => currentProfile),
    setActive: vi.fn(),
    list: vi.fn().mockReturnValue([currentProfile]),
    create: vi.fn(),
    update: vi.fn().mockImplementation((_id: string, updates: Partial<Profile>) => {
      currentProfile = { ...currentProfile, ...updates };
      return currentProfile;
    }),
    delete: vi.fn(),
    duplicate: vi.fn(),
    onEvent: vi.fn().mockReturnValue(() => {}),
  } as unknown as ProfileManager;
};

describe('WorkspaceHandler', () => {
  let handler: WorkspaceHandler;
  let mockProfileManager: ProfileManager;

  beforeEach(() => {
    mockProfileManager = createMockProfileManager();
    handler = new WorkspaceHandler(mockProfileManager);
  });

  describe('constructor and actionType', () => {
    it('should have actionType "workspace"', () => {
      expect(handler.actionType).toBe('workspace');
    });
  });

  describe('execute - next direction', () => {
    it('should navigate to next workspace', async () => {
      const action = createMockWorkspaceAction({ direction: 'next' });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.update).toHaveBeenCalledWith('profile-1', {
        activeWorkspaceIndex: 1,
      });
      expect(result.data).toEqual({
        previousIndex: 0,
        previousWorkspace: 'Workspace 1',
        newIndex: 1,
        newWorkspace: 'Workspace 2',
      });
    });

    it('should wrap to first workspace when at last', async () => {
      mockProfileManager = createMockProfileManager(createMockProfile({
        activeWorkspaceIndex: 2, // Last workspace
      }));
      handler = new WorkspaceHandler(mockProfileManager);

      const action = createMockWorkspaceAction({ direction: 'next' });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.update).toHaveBeenCalledWith('profile-1', {
        activeWorkspaceIndex: 0,
      });
    });
  });

  describe('execute - previous direction', () => {
    it('should navigate to previous workspace', async () => {
      mockProfileManager = createMockProfileManager(createMockProfile({
        activeWorkspaceIndex: 1,
      }));
      handler = new WorkspaceHandler(mockProfileManager);

      const action = createMockWorkspaceAction({ direction: 'previous' });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.update).toHaveBeenCalledWith('profile-1', {
        activeWorkspaceIndex: 0,
      });
    });

    it('should wrap to last workspace when at first', async () => {
      const action = createMockWorkspaceAction({ direction: 'previous' });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.update).toHaveBeenCalledWith('profile-1', {
        activeWorkspaceIndex: 2, // Wraps to last
      });
    });
  });

  describe('execute - specific direction', () => {
    it('should navigate to specific workspace', async () => {
      const action = createMockWorkspaceAction({
        direction: 'specific',
        workspaceIndex: 2,
      });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockProfileManager.update).toHaveBeenCalledWith('profile-1', {
        activeWorkspaceIndex: 2,
      });
    });

    it('should fail when workspaceIndex missing for specific', async () => {
      const action = createMockWorkspaceAction({
        direction: 'specific',
        workspaceIndex: undefined,
      });
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('workspaceIndex required');
    });

    it('should fail for out of range workspaceIndex', async () => {
      const action = createMockWorkspaceAction({
        direction: 'specific',
        workspaceIndex: 10,
      });
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('Invalid workspace index');
    });

    it('should fail for negative workspaceIndex', async () => {
      const action = createMockWorkspaceAction({
        direction: 'specific',
        workspaceIndex: -1,
      });
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('Invalid workspace index');
    });
  });

  describe('execute - edge cases', () => {
    it('should return success with alreadyActive when at target', async () => {
      const action = createMockWorkspaceAction({
        direction: 'specific',
        workspaceIndex: 0,
      });
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        alreadyActive: true,
        workspaceIndex: 0,
        workspaceName: 'Workspace 1',
      });
      expect(mockProfileManager.update).not.toHaveBeenCalled();
    });

    it('should fail when action is disabled', async () => {
      const action = createMockWorkspaceAction({ enabled: false });
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('disabled');
    });

    it('should fail when no active profile', async () => {
      mockProfileManager.getActive = vi.fn().mockReturnValue(null);

      const action = createMockWorkspaceAction();
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('No active profile');
    });

    it('should fail when profile has no workspaces', async () => {
      mockProfileManager = createMockProfileManager(createMockProfile({
        workspaces: [],
      }));
      handler = new WorkspaceHandler(mockProfileManager);

      const action = createMockWorkspaceAction();
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('no workspaces');
    });
  });

  describe('execute - timing', () => {
    it('should track execution timing', async () => {
      const action = createMockWorkspaceAction();
      const result = await handler.execute(action);

      expect(result.startTime).toBeLessThanOrEqual(result.endTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });
  });

  describe('factory function', () => {
    it('should create WorkspaceHandler via factory', () => {
      const handler = createWorkspaceHandler(mockProfileManager);
      expect(handler).toBeInstanceOf(WorkspaceHandler);
      expect(handler.actionType).toBe('workspace');
    });
  });
});
