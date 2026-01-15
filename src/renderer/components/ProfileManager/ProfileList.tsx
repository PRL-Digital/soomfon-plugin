/**
 * ProfileList Component
 * Full list view of profiles with CRUD actions
 */

import React from 'react';
import type { Profile } from '@shared/types/config';

export interface ProfileListProps {
  profiles: Profile[];
  activeProfileId?: string;
  onProfileSelect: (profileId: string) => void;
  onProfileCreate: () => void;
  onProfileEdit: (profile: Profile) => void;
  onProfileDuplicate: (profile: Profile) => void;
  onProfileDelete: (profile: Profile) => void;
  onProfileExport: (profile: Profile) => void;
  onImport: () => void;
  isLoading?: boolean;
}

const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  activeProfileId,
  onProfileSelect,
  onProfileCreate,
  onProfileEdit,
  onProfileDuplicate,
  onProfileDelete,
  onProfileExport,
  onImport,
  isLoading = false,
}) => {
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-list" data-testid="profile-list">
      {/* Header with actions */}
      <div className="profile-list__header">
        <h2 className="profile-list__title">Profiles</h2>
        <div className="profile-list__actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={onImport}
            disabled={isLoading}
            data-testid="import-profile-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={onProfileCreate}
            disabled={isLoading}
            data-testid="create-profile-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Profile
          </button>
        </div>
      </div>

      {/* Profile list */}
      <div className="profile-list__content">
        {isLoading ? (
          <div className="profile-list__loading">Loading profiles...</div>
        ) : profiles.length === 0 ? (
          <div className="profile-list__empty">
            <div className="profile-list__empty-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="profile-list__empty-text">No profiles yet</p>
            <button
              className="btn btn-primary"
              onClick={onProfileCreate}
            >
              Create Your First Profile
            </button>
          </div>
        ) : (
          <div className="profile-list__items">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`profile-list__item ${
                  profile.id === activeProfileId
                    ? 'profile-list__item--active'
                    : ''
                }`}
                data-testid={`profile-item-${profile.id}`}
              >
                <button
                  className="profile-list__item-main"
                  onClick={() => onProfileSelect(profile.id)}
                >
                  <div className="profile-list__item-info">
                    <div className="profile-list__item-name">
                      {profile.name}
                      {profile.isDefault && (
                        <span className="profile-list__item-badge profile-list__item-badge--default">
                          Default
                        </span>
                      )}
                      {profile.id === activeProfileId && (
                        <span className="profile-list__item-badge profile-list__item-badge--active">
                          Active
                        </span>
                      )}
                    </div>
                    {profile.description && (
                      <div className="profile-list__item-desc">
                        {profile.description}
                      </div>
                    )}
                    <div className="profile-list__item-meta">
                      <span>
                        {profile.buttons.filter((b) => b.action).length} buttons
                      </span>
                      <span className="profile-list__item-separator" />
                      <span>
                        {profile.encoders.filter(
                          (e) =>
                            e.pressAction ||
                            e.clockwiseAction ||
                            e.counterClockwiseAction
                        ).length}{' '}
                        encoders
                      </span>
                      <span className="profile-list__item-separator" />
                      <span>Updated {formatDate(profile.updatedAt)}</span>
                    </div>
                  </div>

                  {profile.id === activeProfileId && (
                    <div className="profile-list__item-check">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </button>

                <div className="profile-list__item-actions">
                  <button
                    className="profile-list__action-btn"
                    onClick={() => onProfileEdit(profile)}
                    title="Rename profile"
                    data-testid={`edit-profile-${profile.id}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    className="profile-list__action-btn"
                    onClick={() => onProfileDuplicate(profile)}
                    title="Duplicate profile"
                    data-testid={`duplicate-profile-${profile.id}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button
                    className="profile-list__action-btn"
                    onClick={() => onProfileExport(profile)}
                    title="Export profile"
                    data-testid={`export-profile-${profile.id}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button
                    className="profile-list__action-btn profile-list__action-btn--danger"
                    onClick={() => onProfileDelete(profile)}
                    title="Delete profile"
                    disabled={profile.isDefault}
                    data-testid={`delete-profile-${profile.id}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileList;
