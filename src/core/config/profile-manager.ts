/**
 * Profile Manager
 * Provides CRUD operations for managing button layout profiles
 */

import { v4 as uuidv4 } from 'uuid';
import type { Profile, ButtonConfig, EncoderConfig, Workspace } from '../../shared/types/config';
import { ConfigManager } from './config-manager';
import { profileSchema } from './validation';

/**
 * Profile creation options
 */
export interface CreateProfileOptions {
  /** Optional description for the profile */
  description?: string;
  /** Initial workspaces (if not provided, a default workspace is created) */
  workspaces?: Workspace[];
  /** Initial button configurations (for first workspace if workspaces not provided) */
  buttons?: ButtonConfig[];
  /** Initial encoder configurations (for first workspace if workspaces not provided) */
  encoders?: EncoderConfig[];
  /** Whether this profile should be the default */
  isDefault?: boolean;
}

/**
 * Profile update data (partial profile without id and timestamps)
 */
export type ProfileUpdateData = Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Profile manager event types
 */
export type ProfileManagerEventType =
  | 'profile:created'
  | 'profile:updated'
  | 'profile:deleted'
  | 'profile:duplicated'
  | 'profile:activated';

/**
 * Profile manager event listener
 */
export type ProfileManagerListener = (
  event: ProfileManagerEventType,
  profile: Profile,
  metadata?: { sourceProfileId?: string }
) => void;

/**
 * ProfileManager class
 * Manages profile CRUD operations through ConfigManager
 */
export class ProfileManager {
  private configManager: ConfigManager;
  private listeners: Set<ProfileManagerListener> = new Set();

  /**
   * Creates a new ProfileManager instance
   * @param configManager - The ConfigManager instance to use for persistence
   */
  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  // ============================================================================
  // Create Operations
  // ============================================================================

  /**
   * Creates a new profile with default values and a generated UUID
   * @param name - The name for the new profile
   * @param options - Optional profile configuration
   * @returns The created profile
   */
  create(name: string, options: CreateProfileOptions = {}): Profile {
    const now = new Date().toISOString();

    // Create default workspace if workspaces not provided
    const workspaces: Workspace[] = options.workspaces ?? [{
      id: uuidv4(),
      name: 'Workspace 1',
      buttons: options.buttons ?? [],
      encoders: options.encoders ?? [],
    }];

    const newProfile: Profile = {
      id: uuidv4(),
      name,
      description: options.description,
      isDefault: options.isDefault ?? false,
      workspaces,
      activeWorkspaceIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Validate the profile before adding
    const result = profileSchema.safeParse(newProfile);
    if (!result.success) {
      throw new Error(`Invalid profile data: ${result.error.message}`);
    }

    // Get current profiles and add the new one
    const profiles = this.configManager.getProfiles();

    // If this profile is to be the default, unset existing default
    if (newProfile.isDefault) {
      profiles.forEach(p => {
        p.isDefault = false;
      });
    }

    profiles.push(newProfile);

    // Update config with new profiles array
    const config = this.configManager.getConfig();
    config.profiles = profiles;
    this.configManager.setConfig(config);

    this.notifyListeners('profile:created', newProfile);
    return newProfile;
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  /**
   * Gets a profile by its ID
   * @param id - The profile ID to look up
   * @returns The profile or undefined if not found
   */
  getById(id: string): Profile | undefined {
    return this.configManager.getProfile(id);
  }

  /**
   * Gets all profiles
   * @returns Array of all profiles
   */
  list(): Profile[] {
    return this.configManager.getProfiles();
  }

  /**
   * Gets the currently active profile
   * @returns The active profile
   */
  getActive(): Profile {
    return this.configManager.getActiveProfile();
  }

  /**
   * Gets the active profile ID
   * @returns The active profile ID
   */
  getActiveId(): string {
    return this.configManager.getActiveProfileId();
  }

  /**
   * Gets the default profile
   * @returns The default profile or undefined if none is marked as default
   */
  getDefault(): Profile | undefined {
    const profiles = this.configManager.getProfiles();
    return profiles.find(p => p.isDefault);
  }

  /**
   * Checks if a profile with the given ID exists
   * @param id - The profile ID to check
   * @returns True if the profile exists
   */
  exists(id: string): boolean {
    return this.configManager.hasProfile(id);
  }

  /**
   * Gets the total number of profiles
   * @returns The profile count
   */
  count(): number {
    return this.configManager.getProfileCount();
  }

  // ============================================================================
  // Update Operations
  // ============================================================================

  /**
   * Updates a profile with partial data
   * Merges the updates with the existing profile and updates the updatedAt timestamp
   * @param id - The profile ID to update
   * @param updates - Partial profile data to merge
   * @returns The updated profile
   * @throws Error if profile doesn't exist
   */
  update(id: string, updates: ProfileUpdateData): Profile {
    const existingProfile = this.configManager.getProfile(id);
    if (!existingProfile) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    const updatedProfile: Profile = {
      ...existingProfile,
      ...updates,
      id: existingProfile.id, // Preserve ID
      createdAt: existingProfile.createdAt, // Preserve creation timestamp
      updatedAt: new Date().toISOString(),
    };

    // Validate the updated profile
    const result = profileSchema.safeParse(updatedProfile);
    if (!result.success) {
      throw new Error(`Invalid profile update: ${result.error.message}`);
    }

    // Get all profiles and replace the updated one
    const profiles = this.configManager.getProfiles();

    // If this profile is being set as default, unset other defaults
    if (updates.isDefault === true) {
      profiles.forEach(p => {
        if (p.id !== id) {
          p.isDefault = false;
        }
      });
    }

    const index = profiles.findIndex(p => p.id === id);
    profiles[index] = updatedProfile;

    // Update config
    const config = this.configManager.getConfig();
    config.profiles = profiles;
    this.configManager.setConfig(config);

    this.notifyListeners('profile:updated', updatedProfile);
    return updatedProfile;
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Deletes a profile by ID
   * Prevents deleting the last remaining profile
   * @param id - The profile ID to delete
   * @returns True if deleted successfully
   * @throws Error if trying to delete the last profile or profile doesn't exist
   */
  delete(id: string): boolean {
    const profiles = this.configManager.getProfiles();

    // Prevent deleting the last profile
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the last remaining profile');
    }

    const profileToDelete = profiles.find(p => p.id === id);
    if (!profileToDelete) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    // Filter out the deleted profile
    const remainingProfiles = profiles.filter(p => p.id !== id);

    // If we're deleting the default profile, assign default to another profile
    if (profileToDelete.isDefault && remainingProfiles.length > 0) {
      remainingProfiles[0].isDefault = true;
    }

    // If we're deleting the active profile, switch to the default or first profile
    const config = this.configManager.getConfig();
    if (config.activeProfileId === id) {
      const defaultProfile = remainingProfiles.find(p => p.isDefault);
      config.activeProfileId = defaultProfile?.id ?? remainingProfiles[0].id;
    }

    config.profiles = remainingProfiles;
    this.configManager.setConfig(config);

    this.notifyListeners('profile:deleted', profileToDelete);
    return true;
  }

  // ============================================================================
  // Active Profile Operations
  // ============================================================================

  /**
   * Sets the active profile by ID
   * @param id - The profile ID to activate
   * @throws Error if profile doesn't exist
   */
  setActive(id: string): void {
    const profile = this.configManager.getProfile(id);
    if (!profile) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    this.configManager.setActiveProfileId(id);
    this.notifyListeners('profile:activated', profile);
  }

  // ============================================================================
  // Duplication Operations
  // ============================================================================

  /**
   * Duplicates an existing profile with a new name and ID
   * @param id - The source profile ID to duplicate
   * @param newName - The name for the duplicated profile
   * @returns The duplicated profile
   * @throws Error if source profile doesn't exist
   */
  duplicate(id: string, newName: string): Profile {
    const sourceProfile = this.configManager.getProfile(id);
    if (!sourceProfile) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    const now = new Date().toISOString();

    // Deep clone workspaces with new IDs
    const clonedWorkspaces: Workspace[] = sourceProfile.workspaces.map(w => ({
      id: uuidv4(),
      name: w.name,
      buttons: w.buttons.map(b => ({
        ...b,
        action: b.action ? { ...b.action } : undefined,
        longPressAction: b.longPressAction ? { ...b.longPressAction } : undefined,
        shiftAction: b.shiftAction ? { ...b.shiftAction } : undefined,
        shiftLongPressAction: b.shiftLongPressAction ? { ...b.shiftLongPressAction } : undefined,
      })),
      encoders: w.encoders.map(e => ({
        ...e,
        pressAction: e.pressAction ? { ...e.pressAction } : undefined,
        longPressAction: e.longPressAction ? { ...e.longPressAction } : undefined,
        clockwiseAction: e.clockwiseAction ? { ...e.clockwiseAction } : undefined,
        counterClockwiseAction: e.counterClockwiseAction ? { ...e.counterClockwiseAction } : undefined,
        shiftPressAction: e.shiftPressAction ? { ...e.shiftPressAction } : undefined,
        shiftLongPressAction: e.shiftLongPressAction ? { ...e.shiftLongPressAction } : undefined,
        shiftClockwiseAction: e.shiftClockwiseAction ? { ...e.shiftClockwiseAction } : undefined,
        shiftCounterClockwiseAction: e.shiftCounterClockwiseAction ? { ...e.shiftCounterClockwiseAction } : undefined,
      })),
    }));

    const duplicatedProfile: Profile = {
      ...sourceProfile,
      id: uuidv4(),
      name: newName,
      isDefault: false, // Duplicates are never default
      workspaces: clonedWorkspaces,
      activeWorkspaceIndex: sourceProfile.activeWorkspaceIndex,
      createdAt: now,
      updatedAt: now,
    };

    // Add to profiles
    const profiles = this.configManager.getProfiles();
    profiles.push(duplicatedProfile);

    const config = this.configManager.getConfig();
    config.profiles = profiles;
    this.configManager.setConfig(config);

    this.notifyListeners('profile:duplicated', duplicatedProfile, { sourceProfileId: id });
    return duplicatedProfile;
  }

  // ============================================================================
  // Default Profile Operations
  // ============================================================================

  /**
   * Sets a profile as the default profile
   * @param id - The profile ID to set as default
   * @throws Error if profile doesn't exist
   */
  setDefault(id: string): void {
    const profile = this.configManager.getProfile(id);
    if (!profile) {
      throw new Error(`Profile with ID "${id}" not found`);
    }

    // Update this profile to be default, others to non-default
    const profiles = this.configManager.getProfiles();
    profiles.forEach(p => {
      p.isDefault = p.id === id;
      p.updatedAt = new Date().toISOString();
    });

    const config = this.configManager.getConfig();
    config.profiles = profiles;
    this.configManager.setConfig(config);
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * Adds a listener for profile manager events
   * @param listener - The callback function to invoke on events
   * @returns A function to remove the listener
   */
  onEvent(listener: ProfileManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Removes a profile manager event listener
   * @param listener - The listener to remove
   */
  offEvent(listener: ProfileManagerListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notifies all listeners of a profile event
   * @private
   */
  private notifyListeners(
    event: ProfileManagerEventType,
    profile: Profile,
    metadata?: { sourceProfileId?: string }
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event, profile, metadata);
      } catch (error) {
        console.error('Profile manager listener error:', error);
      }
    }
  }
}

/**
 * Factory function to create a ProfileManager instance
 * @param configManager - The ConfigManager instance to use
 * @returns A new ProfileManager instance
 */
export function createProfileManager(configManager: ConfigManager): ProfileManager {
  return new ProfileManager(configManager);
}
