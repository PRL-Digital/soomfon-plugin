import React, { useEffect, useState, useCallback } from 'react';
import { useDevice, useProfiles, useConfig } from './hooks';
import { Header, TabNav, TabId } from './components/Layout';
import { DeviceView, Selection } from './components/DeviceView';
import { ActionEditor, EncoderEditor, EncoderConfig, ActionTypeOption, ButtonTriggerMode, ButtonActions } from './components/ActionEditor';
import { ProfileSelector, ProfileList, ProfileEditor, ProfileDialogMode } from './components/ProfileManager';
import { SettingsPanel } from './components/Settings';
import { useToast, Spinner } from './components/common';
import { ConnectionState } from '@shared/types/device';
import type {
  Action,
  KeyboardAction,
  LaunchAction,
  ScriptAction,
  HttpAction,
  MediaAction,
  SystemAction,
  ProfileAction,
  TextAction,
  HomeAssistantAction,
  NodeRedAction,
} from '@shared/types/actions';
import type { Profile } from '@shared/types/config';

/** Generate a descriptive name for an action based on its type and config */
const generateActionName = (action: Partial<Action>): string => {
  switch (action.type) {
    case 'keyboard': {
      const kb = action as Partial<KeyboardAction>;
      const mods = kb.modifiers?.join('+') || '';
      return mods ? `${mods}+${kb.keys || 'Key'}` : kb.keys || 'Keyboard Action';
    }
    case 'launch':
      return `Launch: ${(action as Partial<LaunchAction>).path?.split(/[/\\]/).pop() || 'App'}`;
    case 'media':
      return `Media: ${(action as Partial<MediaAction>).action || 'Control'}`;
    case 'system':
      return `System: ${(action as Partial<SystemAction>).action || 'Action'}`;
    case 'http':
      return `HTTP ${(action as Partial<HttpAction>).method || 'Request'}`;
    case 'script':
      return `Script: ${(action as Partial<ScriptAction>).scriptType || 'Run'}`;
    case 'profile':
      return `Profile: ${(action as Partial<ProfileAction>).profileId || 'Switch'}`;
    case 'text':
      return 'Type Text';
    case 'home_assistant':
      return `HA: ${(action as Partial<HomeAssistantAction>).operation || 'Action'}`;
    case 'node_red':
      return `Node-RED: ${(action as Partial<NodeRedAction>).operation || 'Trigger'}`;
    default:
      return 'Action';
  }
};

interface AppInfo {
  name: string;
  version: string;
}

const DeviceTab: React.FC<{
  device: ReturnType<typeof useDevice>;
  profiles: ReturnType<typeof useProfiles>;
  selection: Selection | null;
  onSelectionChange: (selection: Selection | null) => void;
  onActionSave: (action: Partial<Action>, triggerMode: ButtonTriggerMode, imageUrl?: string) => void;
  onActionClear: (triggerMode: ButtonTriggerMode) => void;
  onEncoderSave: (config: EncoderConfig) => void;
  onEncoderClear: () => void;
  isSaving?: boolean;
}> = ({ device, profiles, selection, onSelectionChange, onActionSave, onActionClear, onEncoderSave, onEncoderClear, isSaving }) => {
  // Determine if we should show the encoder editor
  const isEncoderSelected = selection?.type === 'encoder';

  // Get all actions and image for the selected button from active profile
  const getCurrentButtonConfig = (): { buttonActions: ButtonActions | undefined; image: string | undefined } => {
    if (!selection || !profiles.activeProfile) return { buttonActions: undefined, image: undefined };

    // Map selection to button index in profile
    // LCD buttons: index 0-5, Normal buttons: index 6-8
    const buttonIndex = selection.type === 'lcd'
      ? selection.index
      : selection.type === 'normal'
        ? 6 + selection.index
        : -1;

    if (buttonIndex < 0) return { buttonActions: undefined, image: undefined };

    const buttonConfig = profiles.activeProfile.buttons.find(b => b.index === buttonIndex);
    return {
      buttonActions: buttonConfig ? {
        action: buttonConfig.action,
        longPressAction: buttonConfig.longPressAction,
        shiftAction: buttonConfig.shiftAction,
        shiftLongPressAction: buttonConfig.shiftLongPressAction,
      } : undefined,
      image: buttonConfig?.image,
    };
  };

  const { buttonActions, image: currentImage } = getCurrentButtonConfig();

  // Get current encoder config for the selected encoder from active profile
  const getCurrentEncoderConfig = (): Partial<EncoderConfig> | undefined => {
    if (!selection || selection.type !== 'encoder' || !profiles.activeProfile) return undefined;

    const encoderConfig = profiles.activeProfile.encoders.find(e => e.index === selection.index);
    if (!encoderConfig) return undefined;

    // Convert Profile's EncoderConfig to EncoderEditor's EncoderConfig format
    const mapActionToEditorConfig = (action: Action | undefined): { enabled: boolean; actionType: ActionTypeOption | null; action: Partial<Action> } => {
      if (!action) return { enabled: false, actionType: null, action: {} };
      return { enabled: true, actionType: action.type as ActionTypeOption, action };
    };

    return {
      press: mapActionToEditorConfig(encoderConfig.pressAction),
      longPress: mapActionToEditorConfig(encoderConfig.longPressAction),
      rotateClockwise: mapActionToEditorConfig(encoderConfig.clockwiseAction),
      rotateCounterClockwise: mapActionToEditorConfig(encoderConfig.counterClockwiseAction),
      shiftPress: mapActionToEditorConfig(encoderConfig.shiftPressAction),
      shiftLongPress: mapActionToEditorConfig(encoderConfig.shiftLongPressAction),
      shiftRotateClockwise: mapActionToEditorConfig(encoderConfig.shiftClockwiseAction),
      shiftRotateCounterClockwise: mapActionToEditorConfig(encoderConfig.shiftCounterClockwiseAction),
    };
  };

  const currentEncoderConfig = getCurrentEncoderConfig();

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
            isShiftActive={device.isShiftActive}
          />
        </section>
      </div>

      {/* Middle: Action Editor Panel (switches between ActionEditor and EncoderEditor) */}
      <div className="w-80 flex-shrink-0">
        {isEncoderSelected ? (
          <EncoderEditor
            selection={selection}
            currentConfig={currentEncoderConfig}
            onSave={onEncoderSave}
            onClear={onEncoderClear}
          />
        ) : (
          <ActionEditor
            selection={selection}
            buttonActions={buttonActions}
            currentImage={currentImage}
            onSave={onActionSave}
            onClear={onActionClear}
            isSaving={isSaving}
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
                device.status.connectionState === ConnectionState.CONNECTED || device.status.connectionState === ConnectionState.INITIALIZED
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
                  device.status.connectionState === ConnectionState.CONNECTED || device.status.connectionState === ConnectionState.INITIALIZED
                    ? 'status-dot--connected'
                    : device.status.connectionState === ConnectionState.CONNECTING
                      ? 'status-dot--connecting'
                      : device.status.connectionState === ConnectionState.ERROR
                        ? 'status-dot--error'
                        : 'status-dot--disconnected'
                }`}
              />
              {device.status.connectionState === ConnectionState.CONNECTED || device.status.connectionState === ConnectionState.INITIALIZED
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
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" text="Loading..." />
            </div>
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
        // Note: This component doesn't have toast context, error is shown via alert
        // In a future refactor, this could be lifted to App.tsx or use a toast hook
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
  const [isActionSaving, setIsActionSaving] = useState(false);

  // Toast notifications
  const toast = useToast();

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
  const handleActionSave = useCallback(async (action: Partial<Action>, triggerMode: ButtonTriggerMode, imageUrl?: string) => {
    if (!selection || !profiles.activeProfile) return;

    // Map selection to button index in profile
    // LCD buttons: index 0-5, Normal buttons: index 6-8
    const buttonIndex = selection.type === 'lcd'
      ? selection.index
      : selection.type === 'normal'
        ? 6 + selection.index
        : -1;

    if (buttonIndex < 0) return; // Not a button

    // Generate id and name if not provided
    const completeAction: Action = {
      ...action,
      id: action.id || crypto.randomUUID(),
      name: action.name || generateActionName(action),
    } as Action;

    setIsActionSaving(true);
    try {
      // Clone the buttons array
      const updatedButtons = [...profiles.activeProfile.buttons];

      // Find existing button config or create new one
      let buttonConfigIndex = updatedButtons.findIndex(b => b.index === buttonIndex);

      // Map trigger mode to the appropriate action field
      const actionFieldMap: Record<ButtonTriggerMode, string> = {
        press: 'action',
        longPress: 'longPressAction',
        shiftPress: 'shiftAction',
        shiftLongPress: 'shiftLongPressAction',
      };
      const actionField = actionFieldMap[triggerMode];

      if (buttonConfigIndex === -1) {
        // Create new button config
        const newConfig: import('@shared/types/config').ButtonConfig = {
          index: buttonIndex,
          [actionField]: completeAction,
        };
        // Only add image for press trigger mode
        if (triggerMode === 'press' && imageUrl) {
          newConfig.image = imageUrl;
        }
        updatedButtons.push(newConfig);
      } else {
        // Update existing config
        updatedButtons[buttonConfigIndex] = {
          ...updatedButtons[buttonConfigIndex],
          [actionField]: completeAction,
          // Only update image for press trigger mode
          ...(triggerMode === 'press' && imageUrl !== undefined && { image: imageUrl }),
        };
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { buttons: updatedButtons });

      // For LCD buttons (0-5), upload image to device if provided (only for press trigger)
      if (selection.type === 'lcd' && triggerMode === 'press' && imageUrl && window.electronAPI?.device?.setButtonImage) {
        try {
          await window.electronAPI.device.setButtonImage(selection.index, imageUrl);
        } catch (err) {
          console.error('Failed to upload button image:', err);
          toast.warning('Action saved but image upload failed');
        }
      }
      toast.success('Action saved successfully');
    } catch (err) {
      console.error('Failed to save action:', err);
      toast.error('Failed to save action');
    } finally {
      setIsActionSaving(false);
    }
  }, [selection, profiles, toast]);

  // Handle action clear from ActionEditor
  const handleActionClear = useCallback(async (triggerMode: ButtonTriggerMode) => {
    if (!selection || !profiles.activeProfile) return;

    // Map selection to button index in profile
    const buttonIndex = selection.type === 'lcd'
      ? selection.index
      : selection.type === 'normal'
        ? 6 + selection.index
        : -1;

    if (buttonIndex < 0) return; // Not a button

    // Map trigger mode to the appropriate action field
    const actionFieldMap: Record<ButtonTriggerMode, string> = {
      press: 'action',
      longPress: 'longPressAction',
      shiftPress: 'shiftAction',
      shiftLongPress: 'shiftLongPressAction',
    };
    const actionField = actionFieldMap[triggerMode];

    try {
      // Clone the buttons array and clear the specific action for this button
      const updatedButtons = profiles.activeProfile.buttons
        .map(b => {
          if (b.index === buttonIndex) {
            // Clear the specific action field, and image only for press trigger
            const updated = { ...b, [actionField]: undefined };
            if (triggerMode === 'press') {
              updated.image = undefined;
            }
            return updated;
          }
          return b;
        })
        // Filter out buttons that have no meaningful config left
        .filter(b => b.action || b.longPressAction || b.shiftAction || b.shiftLongPressAction || b.image || b.label);

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { buttons: updatedButtons });
      toast.success('Action cleared');
    } catch (err) {
      console.error('Failed to clear action:', err);
      toast.error('Failed to clear action');
    }
  }, [selection, profiles, toast]);

  // Handle encoder config save from EncoderEditor
  const handleEncoderSave = useCallback(async (encoderConfig: EncoderConfig) => {
    if (!selection || selection.type !== 'encoder' || !profiles.activeProfile) return;

    // Helper to complete an action with id and name
    const completeEncoderAction = (action: Partial<Action> | undefined): Action | undefined => {
      if (!action) return undefined;
      return {
        ...action,
        id: action.id || crypto.randomUUID(),
        name: action.name || generateActionName(action),
      } as Action;
    };

    try {
      // Convert EncoderEditor's EncoderConfig to Profile's EncoderConfig format
      // EncoderEditor has: { press, longPress, rotateClockwise, rotateCounterClockwise, shift* }
      // Profile has: { index, pressAction, longPressAction, clockwiseAction, counterClockwiseAction, shift* }
      const profileEncoderConfig: import('@shared/types/config').EncoderConfig = {
        index: selection.index,
        // Normal actions
        pressAction: encoderConfig.press.enabled && encoderConfig.press.actionType
          ? completeEncoderAction(encoderConfig.press.action)
          : undefined,
        longPressAction: encoderConfig.longPress.enabled && encoderConfig.longPress.actionType
          ? completeEncoderAction(encoderConfig.longPress.action)
          : undefined,
        clockwiseAction: encoderConfig.rotateClockwise.enabled && encoderConfig.rotateClockwise.actionType
          ? completeEncoderAction(encoderConfig.rotateClockwise.action)
          : undefined,
        counterClockwiseAction: encoderConfig.rotateCounterClockwise.enabled && encoderConfig.rotateCounterClockwise.actionType
          ? completeEncoderAction(encoderConfig.rotateCounterClockwise.action)
          : undefined,
        // Shift actions
        shiftPressAction: encoderConfig.shiftPress.enabled && encoderConfig.shiftPress.actionType
          ? completeEncoderAction(encoderConfig.shiftPress.action)
          : undefined,
        shiftLongPressAction: encoderConfig.shiftLongPress.enabled && encoderConfig.shiftLongPress.actionType
          ? completeEncoderAction(encoderConfig.shiftLongPress.action)
          : undefined,
        shiftClockwiseAction: encoderConfig.shiftRotateClockwise.enabled && encoderConfig.shiftRotateClockwise.actionType
          ? completeEncoderAction(encoderConfig.shiftRotateClockwise.action)
          : undefined,
        shiftCounterClockwiseAction: encoderConfig.shiftRotateCounterClockwise.enabled && encoderConfig.shiftRotateCounterClockwise.actionType
          ? completeEncoderAction(encoderConfig.shiftRotateCounterClockwise.action)
          : undefined,
      };

      // Clone the encoders array
      const updatedEncoders = [...profiles.activeProfile.encoders];

      // Find existing encoder config or add new one
      const existingIndex = updatedEncoders.findIndex(e => e.index === selection.index);

      if (existingIndex === -1) {
        updatedEncoders.push(profileEncoderConfig);
      } else {
        updatedEncoders[existingIndex] = profileEncoderConfig;
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { encoders: updatedEncoders });
      toast.success('Encoder configuration saved');
    } catch (err) {
      console.error('Failed to save encoder config:', err);
      toast.error('Failed to save encoder configuration');
    }
  }, [selection, profiles, toast]);

  // Handle encoder config clear from EncoderEditor
  const handleEncoderClear = useCallback(async () => {
    if (!selection || selection.type !== 'encoder' || !profiles.activeProfile) return;

    try {
      // Filter out the encoder config for this index, or keep only those with at least one action
      const updatedEncoders = profiles.activeProfile.encoders
        .filter(e => e.index !== selection.index);

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { encoders: updatedEncoders });
      toast.success('Encoder configuration cleared');
    } catch (err) {
      console.error('Failed to clear encoder config:', err);
      toast.error('Failed to clear encoder configuration');
    }
  }, [selection, profiles, toast]);

  // Handle brightness change from Settings panel - live update to device
  const handleBrightnessChange = useCallback(async (brightness: number) => {
    if (window.electronAPI?.device?.setBrightness) {
      try {
        await window.electronAPI.device.setBrightness(brightness);
      } catch (err) {
        console.error('Failed to set brightness:', err);
        toast.error('Failed to set device brightness');
      }
    }
  }, [toast]);

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
          toast.success(`Profile "${imported.name}" imported successfully`);
        }
      } catch (err) {
        console.error('Failed to import profile:', err);
        toast.error('Failed to import profile. Please check the file format.');
      }
    };
    input.click();
  }, [profiles, toast]);

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
                device.status.connectionState === ConnectionState.CONNECTED || device.status.connectionState === ConnectionState.INITIALIZED
                  ? 'status-dot--connected'
                  : device.status.connectionState === ConnectionState.CONNECTING
                    ? 'status-dot--connecting'
                    : device.status.connectionState === ConnectionState.ERROR
                      ? 'status-dot--error'
                      : 'status-dot--disconnected'
              }`}
            />
            <span className="text-sm text-text-secondary">
              {device.status.connectionState === ConnectionState.CONNECTED || device.status.connectionState === ConnectionState.INITIALIZED
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
            isSaving={isActionSaving}
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
