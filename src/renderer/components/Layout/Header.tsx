import React from 'react';
import { ConnectionState } from '@shared/types/device';
import { Profile } from '@shared/types/config';

interface HeaderProps {
  appName: string;
  appVersion?: string;
  connectionState: ConnectionState;
  profiles: Profile[];
  activeProfileId?: string;
  onProfileChange: (profileId: string) => void;
}

const StatusIndicator: React.FC<{ connectionState: ConnectionState }> = ({
  connectionState,
}) => {
  const getStatusClass = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'status-dot--connected';
      case ConnectionState.CONNECTING:
        return 'status-dot--connecting';
      case ConnectionState.ERROR:
        return 'status-dot--error';
      default:
        return 'status-dot--disconnected';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.ERROR:
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="connection-status">
      <span className={`status-dot ${getStatusClass()}`} />
      <span className="text-sm text-text-secondary">{getStatusText()}</span>
    </div>
  );
};

const ProfileSelector: React.FC<{
  profiles: Profile[];
  activeProfileId?: string;
  onProfileChange: (profileId: string) => void;
}> = ({ profiles, activeProfileId, onProfileChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="relative no-drag" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover rounded-md transition-colors duration-fast"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="profile-selector"
      >
        <svg
          className="w-4 h-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span className="text-sm">{activeProfile?.name || 'No Profile'}</span>
        <svg
          className={`w-3 h-3 text-text-muted transition-transform duration-fast ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border rounded-md shadow-lg z-50"
          data-testid="profile-dropdown"
        >
          <div className="py-1">
            {profiles.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-muted">
                No profiles available
              </div>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-hover transition-colors duration-fast flex items-center justify-between ${
                    profile.id === activeProfileId
                      ? 'text-accent bg-bg-tertiary'
                      : 'text-text-primary'
                  }`}
                  onClick={() => {
                    onProfileChange(profile.id);
                    setIsOpen(false);
                  }}
                  data-testid={`profile-option-${profile.id}`}
                >
                  <span>{profile.name}</span>
                  {profile.isDefault && (
                    <span className="text-xs text-text-muted">(Default)</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({
  appName,
  appVersion,
  connectionState,
  profiles,
  activeProfileId,
  onProfileChange,
}) => {
  return (
    <header className="flex items-center justify-between px-md py-sm bg-bg-secondary border-b border-border drag-region">
      <div className="flex items-center gap-md no-drag">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-text-primary">{appName}</h1>
          {appVersion && (
            <span className="text-sm text-text-muted">v{appVersion}</span>
          )}
        </div>
        <StatusIndicator connectionState={connectionState} />
      </div>

      <div className="flex items-center gap-md">
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          onProfileChange={onProfileChange}
        />
      </div>
    </header>
  );
};

export default Header;
