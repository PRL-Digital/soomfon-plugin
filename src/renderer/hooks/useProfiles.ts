/**
 * useProfiles Hook
 * React hook for profile management
 */

import { useState, useEffect, useCallback } from 'react';
import type { Profile } from '../../shared/types/config';
import type { ProfileChangeEvent } from '../../shared/types/ipc';

export interface UseProfilesReturn {
  /** All profiles */
  profiles: Profile[];
  /** Currently active profile */
  activeProfile: Profile | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Set active profile by ID */
  setActive: (id: string) => Promise<void>;
  /** Create a new profile */
  create: (name: string, description?: string) => Promise<Profile | null>;
  /** Update a profile */
  update: (id: string, updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Profile | null>;
  /** Delete a profile */
  deleteProfile: (id: string) => Promise<boolean>;
  /** Duplicate a profile */
  duplicate: (id: string, newName: string) => Promise<Profile | null>;
  /** Reload profiles */
  reload: () => Promise<void>;
}

/**
 * Hook for managing profiles
 */
export function useProfiles(): UseProfilesReturn {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [allProfiles, active] = await Promise.all([
        window.electronAPI.profile.getAll(),
        window.electronAPI.profile.getActive(),
      ]);
      setProfiles(allProfiles);
      setActiveProfile(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!window.electronAPI?.profile) {
      return;
    }

    const unsubscribe = window.electronAPI.profile.onChanged((event: ProfileChangeEvent) => {
      // Reload profiles on any change
      loadProfiles();
    });

    return unsubscribe;
  }, [loadProfiles]);

  const setActive = useCallback(async (id: string) => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      return;
    }

    try {
      setError(null);
      await window.electronAPI.profile.setActive(id);
      // Profile will be updated by the change event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active profile');
    }
  }, []);

  const create = useCallback(async (name: string, description?: string): Promise<Profile | null> => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      return null;
    }

    try {
      setError(null);
      const newProfile = await window.electronAPI.profile.create(name, description);
      // Profiles will be updated by the change event
      return newProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      return null;
    }
  }, []);

  const update = useCallback(async (
    id: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Profile | null> => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      return null;
    }

    try {
      setError(null);
      const updatedProfile = await window.electronAPI.profile.update(id, updates);
      // Profiles will be updated by the change event
      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return null;
    }
  }, []);

  const deleteProfile = useCallback(async (id: string): Promise<boolean> => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      return false;
    }

    try {
      setError(null);
      await window.electronAPI.profile.delete(id);
      // Profiles will be updated by the change event
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
      return false;
    }
  }, []);

  const duplicate = useCallback(async (id: string, newName: string): Promise<Profile | null> => {
    if (!window.electronAPI?.profile) {
      setError('Profile API not available');
      return null;
    }

    try {
      setError(null);
      const duplicatedProfile = await window.electronAPI.profile.duplicate(id, newName);
      // Profiles will be updated by the change event
      return duplicatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate profile');
      return null;
    }
  }, []);

  return {
    profiles,
    activeProfile,
    isLoading,
    error,
    setActive,
    create,
    update,
    deleteProfile,
    duplicate,
    reload: loadProfiles,
  };
}

export default useProfiles;
