/**
 * Workspace Action Handler
 * Handles workspace navigation actions within the current profile
 */

import {
  ActionHandler,
  ActionExecutionResult,
  WorkspaceAction,
} from '../../../shared/types/actions';
import { ProfileManager } from '../../config/profile-manager';

/**
 * WorkspaceHandler - Handles workspace navigation action execution
 *
 * Features:
 * - Navigate to next/previous workspace via button press
 * - Navigate to specific workspace by index
 * - Wraps around at workspace boundaries (circular navigation)
 */
export class WorkspaceHandler implements ActionHandler<WorkspaceAction> {
  readonly actionType = 'workspace' as const;
  private profileManager: ProfileManager;

  /**
   * Creates a new WorkspaceHandler instance
   * @param profileManager - The ProfileManager instance for profile operations
   */
  constructor(profileManager: ProfileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Execute a workspace navigation action
   * @param action The workspace action to execute
   */
  async execute(action: WorkspaceAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if action is enabled
      if (action.enabled === false) {
        throw new Error('Action is disabled');
      }

      // Get the active profile
      const profile = this.profileManager.getActive();
      if (!profile) {
        throw new Error('No active profile');
      }

      const workspaceCount = profile.workspaces.length;
      if (workspaceCount === 0) {
        throw new Error('Profile has no workspaces');
      }

      const currentIndex = profile.activeWorkspaceIndex;
      let newIndex: number;

      switch (action.direction) {
        case 'next':
          // Wrap around to first workspace
          newIndex = (currentIndex + 1) % workspaceCount;
          break;
        case 'previous':
          // Wrap around to last workspace
          newIndex = (currentIndex - 1 + workspaceCount) % workspaceCount;
          break;
        case 'specific':
          if (action.workspaceIndex === undefined) {
            throw new Error('workspaceIndex required for specific direction');
          }
          if (action.workspaceIndex < 0 || action.workspaceIndex >= workspaceCount) {
            throw new Error(`Invalid workspace index: ${action.workspaceIndex}. Valid range: 0-${workspaceCount - 1}`);
          }
          newIndex = action.workspaceIndex;
          break;
        default:
          throw new Error(`Unknown direction: ${action.direction}`);
      }

      // Check if already on target workspace
      if (newIndex === currentIndex) {
        const endTime = Date.now();
        return {
          status: 'success',
          actionId: action.id,
          startTime,
          endTime,
          duration: endTime - startTime,
          data: {
            alreadyActive: true,
            workspaceIndex: currentIndex,
            workspaceName: profile.workspaces[currentIndex]?.name,
          },
        };
      }

      // Update the profile with new workspace index
      this.profileManager.update(profile.id, {
        activeWorkspaceIndex: newIndex,
      });

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        data: {
          previousIndex: currentIndex,
          previousWorkspace: profile.workspaces[currentIndex]?.name,
          newIndex,
          newWorkspace: profile.workspaces[newIndex]?.name,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        status: 'failure',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Factory function to create a WorkspaceHandler instance
 * @param profileManager - The ProfileManager instance for profile operations
 */
export function createWorkspaceHandler(profileManager: ProfileManager): WorkspaceHandler {
  return new WorkspaceHandler(profileManager);
}
