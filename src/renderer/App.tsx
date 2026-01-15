import React, { useEffect, useState, useCallback } from 'react';
import { useDevice, useProfiles, useConfig } from './hooks';
import { Header, TabNav, TabId } from './components/Layout';
import { DeviceView, Selection } from './components/DeviceView';
import { ActionEditor, EncoderEditor, EncoderConfig } from './components/ActionEditor';
import { ProfileSelector, ProfileList, ProfileEditor, ProfileDialogMode } from './components/ProfileManager';
import { SettingsPanel } from './components/Settings';
import { ConnectionState } from '@shared/types/device';
import type { Action } from '@shared/types/actions';
import type { Profile } from '@shared/types/config';

interface AppInfo {
  name: string;
  version: string;
}

const DeviceTab: React.FC<{
  device: ReturnType<typeof useDevice>;
  profiles: ReturnType<typeof useProfiles>;
  selection: Selection | null;
  onSelectionChange: (selection: Selection | null) => void;
  onActionSave: (action: Partial<Action>, imageUrl?: string) => void;
  onActionClear: () => void;
  onEncoderSave: (config: EncoderConfig) => void;
  onEncoderClear: () => void;
}> = ({ device, profiles, selection, onSelectionChange, onActionSave, onActionClear, onEncoderSave, onEncoderClear }) => {
  // Determine if we should show the encoder editor
  const isEncoderSelected = selection?.type === 'encoder';

  return (
    <div className="flex gap-lg h-full">
      {/* Left: Device Visualization */}
      <div className="flex-shrink-0">
        <section className="panel">
          <h2 className="panel-header">Device</h2>
          <DeviceView
            connectionState={device.status.connectionState}
            selection={selection}
            onSelectionChange={onSelectionChange}
            lastButtonEvent={device.lastButtonEvent}
            lastEncoderEvent={device.lastEncoderEvent}
          />
        </section>
      </div>

      {/* Middle: Action Editor Panel (switches between ActionEditor and EncoderEditor) */}
      <div className="w-80 flex-shrink-0">
        {isEncoderSelected ? (
          <EncoderEditor
            selection={selection}
            onSave={onEncoderSave}
            onClear={onEncoderClear}
          />
        ) : (
          <ActionEditor
            selection={selection}
            onSave={onActionSave}
            onClear={onActionClear}
          />
        )}
      </div>

      {/* Right: Info Panels */}
      <div className="flex-1 space-y-md min-w-0">
      {/* Device Status Panel */}
      <section className="panel">
        <h2 className="panel-header">Device Status</h2>
        <div className="panel-content">
          <div className="flex items-center justify-between py-2 border-b border-bg-tertiary">
            <span className="text-text-muted text-sm">Connection</span>
            <div
              className={`status-badge ${
                device.status.connectionState === ConnectionState.CONNECTED
                  ? 'status-badge--connected'
                  : device.status.connectionState === ConnectionState.CONNECTING
                    ? 'status-badge--connecting'
                    : device.status.connectionState === ConnectionState.ERROR
                      ? 'status-badge--error'
                      : 'status-badge--disconnected'
              }`}
            >
              <span
                className={`status-dot ${
                  device.status.connectionState === ConnectionState.CONNECTED
                    ? 'status-dot--connected'
                    : device.status.connectionState === ConnectionState.CONNECTING
                      ? 'status-dot--connecting'
                      : device.status.connectionState === ConnectionState.ERROR
                        ? 'status-dot--error'
                        : 'status-dot--disconnected'
                }`}
              />
              {device.status.connectionState === ConnectionState.CONNECTED
                ? 'Connected'
                : device.status.connectionState === ConnectionState.CONNECTING
                  ? 'Connecting...'
                  : device.status.connectionState === ConnectionState.ERROR
                    ? 'Error'
                    : 'Disconnected'}
            </div>
          </div>

          {device.status.deviceInfo && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-bg-tertiary">
                <span className="text-text-muted text-sm">Product</span>
                <span className="text-text-primary">
                  {device.status.deviceInfo.product || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-bg-tertiary">
                <span className="text-text-muted text-sm">Serial</span>
                <span className="text-text-primary">
                  {device.status.deviceInfo.serialNumber || 'N/A'}
                </span>
              </div>
            </>
          )}

          <div className="mt-md">
            {!device.isConnected ? (
              <button
                className="btn btn-primary"
                onClick={device.connect}
                disabled={device.isConnecting}
              >
                {device.isConnecting ? 'Connecting...' : 'Connect Device'}
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={device.disconnect}>
                Disconnect
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Profile Status Panel */}
      <section className="panel">
        <h2 className="panel-header">Active Profile</h2>
        <div className="panel-content">
          {profiles.isLoading ? (
            <p className="text-text-muted italic">Loading profiles...</p>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b border-bg-tertiary">
                <span className="text-text-muted text-sm">Profile</span>
                <span className="text-text-primary">
                  {profiles.activeProfile?.name || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted text-sm">Total Profiles</span>
                <span className="text-text-primary">
                  {profiles.profiles.length}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Last Events Panel */}
      {(device.lastButtonEvent || device.lastEncoderEvent) && (
        <section className="panel">
          <h2 className="panel-header">Last Events</h2>
          <div className="panel-content">
            {device.lastButtonEvent && (
              <div className="flex items-center justify-between py-2 border-b border-bg-tertiary">
                <span className="text-text-muted text-sm">Button</span>
                <span className="text-text-primary">
                  {device.lastButtonEvent.buttonType} #
                  {device.lastButtonEvent.buttonIndex} -{' '}
                  {device.lastButtonEvent.type}
                </span>
              </div>
            )}
            {device.lastEncoderEvent && (
              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted text-sm">Encoder</span>
                <span className="text-text-primary">
                  Encoder #{device.lastEncoderEvent.encoderIndex} -{' '}
                  {device.lastEncoderEvent.type}
                </span>
              </div>
            )}
          </div>
        </section>
      )}
      </div>
    </div>
  );
};

// ProfilesTab component for managing profiles
const ProfilesTab: React.FC<{
  profiles: ReturnType<typeof useProfiles>;
}> = ({ profiles }) => {
  const [dialogMode, setDialogMode] = useState<ProfileDialogMode>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const handleProfileCreate = () => {
    setSelectedProfile(null);
    setDialogMode('create');
  };

  const handleProfileEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setDialogMode('rename');
  };

  const handleProfileDuplicate = (profile: Profile) => {
    setSelectedProfile(profile);
    setDialogMode('duplicate');
  };

  const handleProfileDelete = (profile: Profile) => {
    setSelectedProfile(profile);
    setDialogMode('delete');
  };

  const handleProfileExport = async (profile: Profile) => {
    // Export profile to JSON file
    const profileData = JSON.stringify(profile, null, 2);
    const blob = new Blob([profileData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    // Create file input for import
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Profile;

        // Create profile with imported data
        const newProfile = await profiles.create(
          `${imported.name} (Imported)`,
          imported.description
        );

        if (newProfile) {
          // Update the new profile with imported buttons and encoders
          await profiles.update(newProfile.id, {
            buttons: imported.buttons,
            encoders: imported.encoders,
          });
        }
      } catch (err) {
        console.error('Failed to import profile:', err);
        alert('Failed to import profile. Please check the file format.');
      }
    };
    input.click();
  };

  const handleDialogClose = () => {
    setDialogMode(null);
    setSelectedProfile(null);
  };

  const handleCreate = async (name: string, description?: string) => {
    await profiles.create(name, description);
  };

  const handleRename = async (profileId: string, name: string, description?: string) => {
    await profiles.update(profileId, { name, description });
  };

  const handleDuplicate = async (profileId: string, newName: string) => {
    await profiles.duplicate(profileId, newName);
  };

  const handleDelete = async (profileId: string) => {
    await profiles.deleteProfile(profileId);
  };

  return (
    <div className="h-full">
      <ProfileList
        profiles={profiles.profiles}
        activeProfileId={profiles.activeProfile?.id}
        onProfileSelect={(id) => profiles.setActive(id)}
        onProfileCreate={handleProfileCreate}
        onProfileEdit={handleProfileEdit}
        onProfileDuplicate={handleProfileDuplicate}
        onProfileDelete={handleProfileDelete}
        onProfileExport={handleProfileExport}
        onImport={handleImport}
        isLoading={profiles.isLoading}
      />

      <ProfileEditor
        mode={dialogMode}
        profile={selectedProfile}
        onClose={handleDialogClose}
        onCreate={handleCreate}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('device');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showProfileManager, setShowProfileManager] = useState(false);

  // IPC Hooks
  const device = useDevice();
  const profiles = useProfiles();
  const config = useConfig();

  // Profile dialog state
  const [profileDialogMode, setProfileDialogMode] = useState<ProfileDialogMode>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Load app info
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        if (window.electronAPI) {
          const [name, version] = await Promise.all([
            window.electronAPI.getName(),
            window.electronAPI.getVersion(),
          ]);
          setAppInfo({ name, version });
        } else {
          setAppInfo({ name: 'SOOMFON Controller', version: 'dev' });
        }
      } catch (err) {
        setAppError(
          err instanceof Error ? err.message : 'Failed to load app info'
        );
      }
    };

    loadAppInfo();
  }, []);

  // Combined error state
  const error = appError || device.error || profiles.error || config.error;

  const handleProfileChange = useCallback((profileId: string) => {
    profiles.setActive(profileId);
  }, [profiles]);

  const handleManageProfiles = useCallback(() => {
    setShowProfileManager(true);
  }, []);

  // Handle action save from ActionEditor
  const handleActionSave = useCallback((action: Partial<Action>, imageUrl?: string) => {
    if (!selection) return;

    // TODO: Save action to configuration via IPC
    console.log('Saving action for selection:', selection, 'Action:', action, 'Image:', imageUrl);

    // In the future, this will call config IPC to save the action binding
    // window.electronAPI?.config?.setButtonAction?.(selection, action, imageUrl);
  }, [selection]);

  // Handle action clear from ActionEditor
  const handleActionClear = useCallback(() => {
    if (!selection) return;

    // TODO: Clear action from configuration via IPC
    console.log('Clearing action for selection:', selection);

    // In the future, this will call config IPC to clear the action binding
    // window.electronAPI?.config?.clearButtonAction?.(selection);
  }, [selection]);

  // Handle encoder config save from EncoderEditor
  const handleEncoderSave = useCallback((encoderConfig: EncoderConfig) => {
    if (!selection || selection.type !== 'encoder') return;

    // TODO: Save encoder config to configuration via IPC
    console.log('Saving encoder config for selection:', selection, 'Config:', encoderConfig);

    // In the future, this will call config IPC to save the encoder binding
    // window.electronAPI?.config?.setEncoderConfig?.(selection.index, encoderConfig);
  }, [selection]);

  // Handle encoder config clear from EncoderEditor
  const handleEncoderClear = useCallback(() => {
    if (!selection || selection.type !== 'encoder') return;

    // TODO: Clear encoder config from configuration via IPC
    console.log('Clearing encoder config for selection:', selection);

    // In the future, this will call config IPC to clear the encoder binding
    // window.electronAPI?.config?.clearEncoderConfig?.(selection.index);
  }, [selection]);

  // Handle brightness change from Settings panel - live update to device
  const handleBrightnessChange = useCallback(async (brightness: number) => {
    if (window.electronAPI?.device?.setBrightness) {
      try {
        await window.electronAPI.device.setBrightness(brightness);
      } catch (err) {
        console.error('Failed to set brightness:', err);
      }
    }
  }, []);

  // Profile dialog handlers
  const handleProfileDialogClose = useCallback(() => {
    setProfileDialogMode(null);
    setSelectedProfile(null);
    setShowProfileManager(false);
  }, []);

  const handleProfileCreate = useCallback(async (name: string, description?: string) => {
    await profiles.create(name, description);
  }, [profiles]);

  const handleProfileRename = useCallback(async (profileId: string, name: string, description?: string) => {
    await profiles.update(profileId, { name, description });
  }, [profiles]);

  const handleProfileDuplicate = useCallback(async (profileId: string, newName: string) => {
    await profiles.duplicate(profileId, newName);
  }, [profiles]);

  const handleProfileDelete = useCallback(async (profileId: string) => {
    await profiles.deleteProfile(profileId);
  }, [profiles]);

  // Profile list handlers for the manage profiles overlay
  const handleProfileListSelect = useCallback((profileId: string) => {
    profiles.setActive(profileId);
  }, [profiles]);

  const handleProfileListCreate = useCallback(() => {
    setSelectedProfile(null);
    setProfileDialogMode('create');
  }, []);

  const handleProfileListEdit = useCallback((profile: Profile) => {
    setSelectedProfile(profile);
    setProfileDialogMode('rename');
  }, []);

  const handleProfileListDuplicate = useCallback((profile: Profile) => {
    setSelectedProfile(profile);
    setProfileDialogMode('duplicate');
  }, []);

  const handleProfileListDelete = useCallback((profile: Profile) => {
    setSelectedProfile(profile);
    setProfileDialogMode('delete');
  }, []);

  const handleProfileExport = useCallback(async (profile: Profile) => {
    const profileData = JSON.stringify(profile, null, 2);
    const blob = new Blob([profileData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleProfileImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Profile;

        const newProfile = await profiles.create(
          `${imported.name} (Imported)`,
          imported.description
        );

        if (newProfile) {
          await profiles.update(newProfile.id, {
            buttons: imported.buttons,
            encoders: imported.encoders,
          });
        }
      } catch (err) {
        console.error('Failed to import profile:', err);
      }
    };
    input.click();
  }, [profiles]);

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between px-md py-sm bg-bg-secondary border-b border-border drag-region">
        <div className="flex items-center gap-md no-drag">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-text-primary">
              {appInfo?.name || 'SOOMFON Controller'}
            </h1>
            {appInfo?.version && (
              <span className="text-sm text-text-muted">v{appInfo.version}</span>
            )}
          </div>
          <div className="flex items-center gap-2" data-testid="connection-status">
            <span
              className={`status-dot ${
                device.status.connectionState === ConnectionState.CONNECTED
                  ? 'status-dot--connected'
                  : device.status.connectionState === ConnectionState.CONNECTING
                    ? 'status-dot--connecting'
                    : device.status.connectionState === ConnectionState.ERROR
                      ? 'status-dot--error'
                      : 'status-dot--disconnected'
              }`}
            />
            <span className="text-sm text-text-secondary">
              {device.status.connectionState === ConnectionState.CONNECTED
                ? 'Connected'
                : device.status.connectionState === ConnectionState.CONNECTING
                  ? 'Connecting...'
                  : device.status.connectionState === ConnectionState.ERROR
                    ? 'Error'
                    : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-md no-drag">
          <ProfileSelector
            profiles={profiles.profiles}
            activeProfileId={profiles.activeProfile?.id}
            onProfileChange={handleProfileChange}
            onManageProfiles={handleManageProfiles}
            disabled={profiles.isLoading}
          />
        </div>
      </header>

      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {error && (
        <div className="mx-md mt-md p-md bg-error/10 border border-error rounded-md text-error">
          {error}
        </div>
      )}

      <main className="flex-1 overflow-auto p-lg" data-testid="main-content">
        {activeTab === 'device' && (
          <DeviceTab
            device={device}
            profiles={profiles}
            selection={selection}
            onSelectionChange={setSelection}
            onActionSave={handleActionSave}
            onActionClear={handleActionClear}
            onEncoderSave={handleEncoderSave}
            onEncoderClear={handleEncoderClear}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            config={config}
            connectionState={device.status.connectionState}
            onBrightnessChange={handleBrightnessChange}
          />
        )}
      </main>

      <footer className="px-md py-sm bg-bg-secondary border-t border-border text-center text-text-muted text-xs">
        SOOMFON Controller - Ready
      </footer>

      {/* Profile Manager Overlay */}
      {showProfileManager && (
        <div
          className="profile-editor-overlay"
          onClick={handleProfileDialogClose}
        >
          <div
            className="profile-editor"
            style={{ maxWidth: '600px', height: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileList
              profiles={profiles.profiles}
              activeProfileId={profiles.activeProfile?.id}
              onProfileSelect={handleProfileListSelect}
              onProfileCreate={handleProfileListCreate}
              onProfileEdit={handleProfileListEdit}
              onProfileDuplicate={handleProfileListDuplicate}
              onProfileDelete={handleProfileListDelete}
              onProfileExport={handleProfileExport}
              onImport={handleProfileImport}
              isLoading={profiles.isLoading}
            />
          </div>
        </div>
      )}

      {/* Profile Editor Dialog */}
      <ProfileEditor
        mode={profileDialogMode}
        profile={selectedProfile}
        onClose={() => setProfileDialogMode(null)}
        onCreate={handleProfileCreate}
        onRename={handleProfileRename}
        onDuplicate={handleProfileDuplicate}
        onDelete={handleProfileDelete}
      />
    </div>
  );
};

export default App;
