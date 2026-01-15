/**
 * Profile Action Handler
 * Handles profile switching actions
 */

import {
  ActionHandler,
  ActionExecutionResult,
  ProfileAction,
} from '../../../shared/types/actions';
import { ProfileManager } from '../../config/profile-manager';

/**
 * ProfileHandler - Handles profile switch action execution
 *
 * Features:
 * - Switch between configuration profiles via button press
 * - Validates target profile exists before switching
 * - Skips switch if already on target profile
 */
export class ProfileHandler implements ActionHandler<ProfileAction> {
  readonly actionType = 'profile' as const;
  private profileManager: ProfileManager;

  /**
   * Creates a new ProfileHandler instance
   * @param profileManager - The ProfileManager instance for profile operations
   */
  constructor(profileManager: ProfileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Execute a profile switch action
   * @param action The profile action to execute
   */
  async execute(action: ProfileAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if action is enabled
      if (!action.enabled) {
        throw new Error('Action is disabled');
      }

      // Validate the target profile exists
      const targetProfile = this.profileManager.getById(action.profileId);
      if (!targetProfile) {
        throw new Error(`Profile not found: ${action.profileId}`);
      }

      // Check if already on the target profile
      const activeProfile = this.profileManager.getActive();
      if (activeProfile.id === action.profileId) {
        // Already on target profile - still success but with info
        const endTime = Date.now();
        return {
          status: 'success',
          actionId: action.id,
          startTime,
          endTime,
          duration: endTime - startTime,
          data: { alreadyActive: true, profileName: targetProfile.name },
        };
      }

      // Switch to the target profile
      this.profileManager.setActive(action.profileId);

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        data: {
          previousProfile: activeProfile.name,
          newProfile: targetProfile.name,
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
 * Factory function to create a ProfileHandler instance
 * @param profileManager - The ProfileManager instance for profile operations
 */
export function createProfileHandler(profileManager: ProfileManager): ProfileHandler {
  return new ProfileHandler(profileManager);
}
