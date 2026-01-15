import React, { useCallback, useEffect, useState } from 'react';
import type { ProfileAction } from '@shared/types/actions';

interface ProfileInfo {
  id: string;
  name: string;
}

/** Error state for profile loading failures */
interface ProfileLoadError {
  message: string;
}

export interface ProfileActionFormProps {
  /** Current configuration */
  config: Partial<ProfileAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<ProfileAction>) => void;
}

export const ProfileActionForm: React.FC<ProfileActionFormProps> = ({
  config,
  onChange,
}) => {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ProfileLoadError | null>(null);

  // Load available profiles
  useEffect(() => {
    const loadProfiles = async () => {
      setLoadError(null);
      try {
        // Access the electronAPI through window
        const api = (window as unknown as { electronAPI?: { profiles?: { list: () => Promise<ProfileInfo[]> } } }).electronAPI;
        if (api?.profiles?.list) {
          const profileList = await api.profiles.list();
          setProfiles(profileList);
        } else {
          setLoadError({ message: 'Profile API not available' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load profiles';
        setLoadError({ message: errorMessage });
        console.error('Failed to load profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  // Handle profile selection change
  const handleProfileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...config, profileId: e.target.value });
    },
    [config, onChange]
  );

  return (
    <div className="action-form action-form--profile" data-testid="profile-action-form">
      <div className="action-form__row">
        <label className="action-form__label">Target Profile</label>
        {loading ? (
          <span className="action-form__loading">Loading profiles...</span>
        ) : loadError ? (
          <span className="action-form__error" data-testid="profile-load-error">
            {loadError.message}
          </span>
        ) : (
          <select
            className="action-form__select"
            value={config.profileId || ''}
            onChange={handleProfileChange}
            data-testid="profile-select"
          >
            <option value="">Select a profile...</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        )}
        <span className="action-form__hint">
          Profile to switch to when this action is triggered
        </span>
      </div>
    </div>
  );
};

export default ProfileActionForm;
