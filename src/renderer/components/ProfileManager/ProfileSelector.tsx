/**
 * ProfileSelector Component
 * Dropdown selector for quick profile switching with "Manage Profiles" option
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Profile } from '@shared/types/config';

export interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfileId?: string;
  onProfileChange: (profileId: string) => void;
  onManageProfiles: () => void;
  disabled?: boolean;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfileId,
  onProfileChange,
  onManageProfiles,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const handleProfileSelect = (profileId: string) => {
    onProfileChange(profileId);
    setIsOpen(false);
  };

  const handleManageClick = () => {
    onManageProfiles();
    setIsOpen(false);
  };

  return (
    <div
      className={`profile-selector ${disabled ? 'profile-selector--disabled' : ''}`}
      ref={dropdownRef}
    >
      <button
        className={`profile-selector__trigger ${isOpen ? 'profile-selector__trigger--open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        data-testid="profile-selector"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="profile-selector__selected">
          <svg
            className="profile-selector__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="profile-selector__name">
            {activeProfile?.name || 'No Profile'}
          </span>
          {activeProfile?.isDefault && (
            <span className="profile-selector__default-badge">Default</span>
          )}
        </div>
        <svg
          className={`profile-selector__arrow ${isOpen ? 'profile-selector__arrow--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="profile-selector__dropdown"
          role="listbox"
          aria-label="Select profile"
          data-testid="profile-dropdown"
        >
          <div className="profile-selector__list">
            {profiles.length === 0 ? (
              <div className="profile-selector__empty">
                No profiles available
              </div>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`profile-selector__option ${
                    profile.id === activeProfileId
                      ? 'profile-selector__option--active'
                      : ''
                  }`}
                  onClick={() => handleProfileSelect(profile.id)}
                  role="option"
                  aria-selected={profile.id === activeProfileId}
                  data-testid={`profile-option-${profile.id}`}
                >
                  <div className="profile-selector__option-info">
                    <span className="profile-selector__option-name">
                      {profile.name}
                    </span>
                    {profile.description && (
                      <span className="profile-selector__option-desc">
                        {profile.description}
                      </span>
                    )}
                  </div>
                  <div className="profile-selector__option-badges">
                    {profile.isDefault && (
                      <span className="profile-selector__option-badge">Default</span>
                    )}
                    {profile.id === activeProfileId && (
                      <svg
                        className="profile-selector__check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="profile-selector__divider" />

          <button
            className="profile-selector__manage-btn"
            onClick={handleManageClick}
            data-testid="manage-profiles-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Manage Profiles...
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
