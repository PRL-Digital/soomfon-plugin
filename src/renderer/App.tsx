import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDevice, useProfiles, useConfig, useActionBinding } from './hooks';
import { Header, TabNav, TabId, DeviceStatusDropdown } from './components/Layout';
import { DeviceView, Selection, WorkspaceInfo, LayerToggle, LayerType } from './components/DeviceView';
import { ActionEditor, EncoderEditor, EncoderConfig, ActionTypeOption, ButtonTriggerMode, ButtonActions } from './components/ActionEditor';
import { ProfileSelector, ProfileList, ProfileEditor, ProfileDialogMode } from './components/ProfileManager';
import { WorkspaceEditor, WorkspaceDialogMode, WorkspaceTabs } from './components/WorkspaceManager';
import { SettingsPanel } from './components/Settings';
import { useToast } from './components/common';
import { WORKSPACE_PREV_BUTTON_INDEX, WORKSPACE_NEXT_BUTTON_INDEX, ButtonEventType, LCD_BUTTON_COUNT, ENCODER_COUNT } from '@shared/types/device';
import { getActionLabel } from '@shared/utils/action-labels';
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
import type { Profile, Workspace } from '@shared/types/config';
import { getActiveWorkspace, getActiveWorkspaceButtons, getActiveWorkspaceEncoders, getWorkspaceCount } from '@shared/types/config';

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
  onWorkspaceChange: (direction: 'next' | 'previous') => void;
  onWorkspaceSelect: (index: number) => void;
  onWorkspaceCreate: () => void;
  onWorkspaceRename: (workspace: Workspace) => void;
  onWorkspaceDuplicate: (workspace: Workspace) => void;
  onWorkspaceDelete: (workspace: Workspace) => void;
  onPreviewImage: (buttonIndex: number, imageUrl: string) => Promise<void>;
  isSaving?: boolean;
}> = ({ device, profiles, selection, onSelectionChange, onActionSave, onActionClear, onEncoderSave, onEncoderClear, onWorkspaceChange, onWorkspaceSelect, onWorkspaceCreate, onWorkspaceRename, onWorkspaceDuplicate, onWorkspaceDelete, onPreviewImage, isSaving }) => {
  // Determine if we should show the encoder editor
  const isEncoderSelected = selection?.type === 'encoder';

  // Layer toggle state - controls which actions are shown (primary vs shift)
  const [selectedLayer, setSelectedLayer] = useState<LayerType>('primary');

  // Get all actions and images for the selected button from active workspace
  const getCurrentButtonConfig = (): { buttonActions: ButtonActions | undefined; image: string | undefined; shiftImage: string | undefined } => {
    if (!selection || !profiles.activeProfile) return { buttonActions: undefined, image: undefined, shiftImage: undefined };

    // Map selection to button index in profile
    // LCD buttons: index 0-5, Normal buttons: index 6-8
    const buttonIndex = selection.type === 'lcd'
      ? selection.index
      : selection.type === 'normal'
        ? 6 + selection.index
        : -1;

    if (buttonIndex < 0) return { buttonActions: undefined, image: undefined, shiftImage: undefined };

    // Use helper to get buttons from active workspace
    const buttons = getActiveWorkspaceButtons(profiles.activeProfile);
    const buttonConfig = buttons.find(b => b.index === buttonIndex);
    return {
      buttonActions: buttonConfig ? {
        action: buttonConfig.action,
        longPressAction: buttonConfig.longPressAction,
        shiftAction: buttonConfig.shiftAction,
        shiftLongPressAction: buttonConfig.shiftLongPressAction,
      } : undefined,
      image: buttonConfig?.image,
      shiftImage: buttonConfig?.shiftImage,
    };
  };

  const { buttonActions, image: currentImage, shiftImage: currentShiftImage } = getCurrentButtonConfig();

  // Get current encoder config for the selected encoder from active workspace
  const getCurrentEncoderConfig = (): Partial<EncoderConfig> | undefined => {
    if (!selection || selection.type !== 'encoder' || !profiles.activeProfile) return undefined;

    // Use helper to get encoders from active workspace
    const encoders = getActiveWorkspaceEncoders(profiles.activeProfile);
    const encoderConfig = encoders.find(e => e.index === selection.index);
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

  // Get workspace info for the indicator
  const workspaceInfo: WorkspaceInfo | undefined = profiles.activeProfile
    ? {
        name: getActiveWorkspace(profiles.activeProfile).name,
        index: profiles.activeProfile.activeWorkspaceIndex || 0,
        total: getWorkspaceCount(profiles.activeProfile),
      }
    : undefined;

  // Compute action labels for LCD buttons based on selected layer
  const lcdActionLabels = useMemo((): Record<number, string> => {
    if (!profiles.activeProfile) return {};

    const buttons = getActiveWorkspaceButtons(profiles.activeProfile);
    const labels: Record<number, string> = {};

    for (let i = 0; i < LCD_BUTTON_COUNT; i++) {
      const buttonConfig = buttons.find(b => b.index === i);
      if (selectedLayer === 'primary') {
        // Show primary action (press action)
        labels[i] = getActionLabel(buttonConfig?.action);
      } else {
        // Show shift action
        labels[i] = getActionLabel(buttonConfig?.shiftAction);
      }
    }

    return labels;
  }, [profiles.activeProfile, selectedLayer]);

  // Compute images for LCD buttons based on selected layer
  const lcdImages = useMemo((): Record<number, string> => {
    if (!profiles.activeProfile) return {};

    const buttons = getActiveWorkspaceButtons(profiles.activeProfile);
    const images: Record<number, string> = {};

    for (let i = 0; i < LCD_BUTTON_COUNT; i++) {
      const buttonConfig = buttons.find(b => b.index === i);
      const image = selectedLayer === 'primary'
        ? buttonConfig?.image
        : buttonConfig?.shiftImage;
      if (image) {
        images[i] = image;
      }
    }

    return images;
  }, [profiles.activeProfile, selectedLayer]);

  // Compute action labels for encoders based on selected layer
  const encoderActionLabels = useMemo((): Record<number, string> => {
    if (!profiles.activeProfile) return {};

    const encoders = getActiveWorkspaceEncoders(profiles.activeProfile);
    const labels: Record<number, string> = {};

    for (let i = 0; i < ENCODER_COUNT; i++) {
      const encoderConfig = encoders.find(e => e.index === i);
      if (selectedLayer === 'primary') {
        // Show primary press action
        labels[i] = getActionLabel(encoderConfig?.pressAction);
      } else {
        // Show shift press action
        labels[i] = getActionLabel(encoderConfig?.shiftPressAction);
      }
    }

    return labels;
  }, [profiles.activeProfile, selectedLayer]);

  // Determine preferred trigger mode based on selected layer
  const preferredTriggerMode: ButtonTriggerMode = selectedLayer === 'primary' ? 'press' : 'shiftPress';

  return (
    <div className="flex gap-lg h-full">
      {/* Left: Device Visualization */}
      <div className="flex-shrink-0">
        {/* Workspace Tabs - quick navigation */}
        {profiles.activeProfile && profiles.activeProfile.workspaces && profiles.activeProfile.workspaces.length > 0 && (
          <div className="mb-sm">
            <WorkspaceTabs
              workspaces={profiles.activeProfile.workspaces}
              activeIndex={profiles.activeProfile.activeWorkspaceIndex || 0}
              onSelect={onWorkspaceSelect}
              onCreate={onWorkspaceCreate}
            />
          </div>
        )}

        <section className="panel">
          {/* Panel header with Layer Toggle */}
          <div className="panel-header flex items-center justify-between">
            <h2 className="m-0">Device</h2>
            <LayerToggle
              selected={selectedLayer}
              onChange={setSelectedLayer}
            />
          </div>
          <DeviceView
            connectionState={device.status.connectionState}
            selection={selection}
            onSelectionChange={onSelectionChange}
            lastButtonEvent={device.lastButtonEvent}
            lastEncoderEvent={device.lastEncoderEvent}
            isShiftActive={device.isShiftActive}
            workspaceInfo={workspaceInfo}
            onWorkspaceChange={onWorkspaceChange}
            lcdImages={lcdImages}
            lcdActionLabels={lcdActionLabels}
            encoderActionLabels={encoderActionLabels}
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
            currentShiftImage={currentShiftImage}
            onSave={onActionSave}
            onClear={onActionClear}
            isSaving={isSaving}
            onPreviewImage={onPreviewImage}
            preferredTriggerMode={preferredTriggerMode}
          />
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

  // Connect device events to action execution
  useActionBinding({
    profile: profiles.activeProfile,
    lastButtonEvent: device.lastButtonEvent,
    lastEncoderEvent: device.lastEncoderEvent,
    isShiftActive: device.isShiftActive,
  });

  // Profile dialog state
  const [profileDialogMode, setProfileDialogMode] = useState<ProfileDialogMode>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Workspace dialog state
  const [workspaceDialogMode, setWorkspaceDialogMode] = useState<WorkspaceDialogMode>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Load app info
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        if (window.tauriAPI) {
          const [name, version] = await Promise.all([
            window.tauriAPI.getName(),
            window.tauriAPI.getVersion(),
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
      // Get the active workspace and update its buttons
      const activeWorkspace = getActiveWorkspace(profiles.activeProfile);
      const updatedButtons = [...activeWorkspace.buttons];

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
        // Add image for press mode, shiftImage for shiftPress mode
        if (triggerMode === 'press' && imageUrl) {
          newConfig.image = imageUrl;
        } else if (triggerMode === 'shiftPress' && imageUrl) {
          newConfig.shiftImage = imageUrl;
        }
        updatedButtons.push(newConfig);
      } else {
        // Update existing config
        updatedButtons[buttonConfigIndex] = {
          ...updatedButtons[buttonConfigIndex],
          [actionField]: completeAction,
          // Update image for press mode, shiftImage for shiftPress mode
          ...(triggerMode === 'press' && imageUrl !== undefined && { image: imageUrl }),
          ...(triggerMode === 'shiftPress' && imageUrl !== undefined && { shiftImage: imageUrl }),
        };
      }

      // Update the workspace with the modified buttons
      const workspaceIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
      const updatedWorkspaces = [...(profiles.activeProfile.workspaces || [])];
      if (updatedWorkspaces[workspaceIndex]) {
        updatedWorkspaces[workspaceIndex] = {
          ...updatedWorkspaces[workspaceIndex],
          buttons: updatedButtons,
        };
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });

      // For LCD buttons (0-5), upload image to device if provided (only for press trigger)
      if (selection.type === 'lcd' && triggerMode === 'press' && imageUrl && window.tauriAPI?.device?.setButtonImage) {
        try {
          await window.tauriAPI.device.setButtonImage(selection.index, imageUrl);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Failed to upload button image:', err);
          toast.warning(`Action saved but image upload failed: ${errorMsg}`);
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
      // Get buttons from active workspace and clear the specific action
      const activeWorkspace = getActiveWorkspace(profiles.activeProfile);
      const updatedButtons = activeWorkspace.buttons
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

      // Update the workspace with the modified buttons
      const workspaceIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
      const updatedWorkspaces = [...(profiles.activeProfile.workspaces || [])];
      if (updatedWorkspaces[workspaceIndex]) {
        updatedWorkspaces[workspaceIndex] = {
          ...updatedWorkspaces[workspaceIndex],
          buttons: updatedButtons,
        };
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
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

      // Get encoders from active workspace and update
      const activeWorkspace = getActiveWorkspace(profiles.activeProfile);
      const updatedEncoders = [...activeWorkspace.encoders];

      // Find existing encoder config or add new one
      const existingIndex = updatedEncoders.findIndex(e => e.index === selection.index);

      if (existingIndex === -1) {
        updatedEncoders.push(profileEncoderConfig);
      } else {
        updatedEncoders[existingIndex] = profileEncoderConfig;
      }

      // Update the workspace with the modified encoders
      const workspaceIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
      const updatedWorkspaces = [...(profiles.activeProfile.workspaces || [])];
      if (updatedWorkspaces[workspaceIndex]) {
        updatedWorkspaces[workspaceIndex] = {
          ...updatedWorkspaces[workspaceIndex],
          encoders: updatedEncoders,
        };
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
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
      // Get encoders from active workspace and filter out this encoder
      const activeWorkspace = getActiveWorkspace(profiles.activeProfile);
      const updatedEncoders = activeWorkspace.encoders
        .filter(e => e.index !== selection.index);

      // Update the workspace with the modified encoders
      const workspaceIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
      const updatedWorkspaces = [...(profiles.activeProfile.workspaces || [])];
      if (updatedWorkspaces[workspaceIndex]) {
        updatedWorkspaces[workspaceIndex] = {
          ...updatedWorkspaces[workspaceIndex],
          encoders: updatedEncoders,
        };
      }

      // Save to profile - this triggers auto-reload of bindings
      await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
      toast.success('Encoder configuration cleared');
    } catch (err) {
      console.error('Failed to clear encoder config:', err);
      toast.error('Failed to clear encoder configuration');
    }
  }, [selection, profiles, toast]);

  // Handle brightness change from Settings panel - live update to device
  const handleBrightnessChange = useCallback(async (brightness: number) => {
    if (window.tauriAPI?.device?.setBrightness) {
      try {
        await window.tauriAPI.device.setBrightness(brightness);
      } catch (err) {
        console.error('Failed to set brightness:', err);
        toast.error('Failed to set device brightness');
      }
    }
  }, [toast]);

  // Handle preview image on device - sends image to device without saving the action
  const handlePreviewImage = useCallback(async (buttonIndex: number, imageUrl: string) => {
    if (!window.tauriAPI?.device?.setButtonImage) {
      throw new Error('Device image preview not available');
    }
    if (!device.isConnected) {
      throw new Error('Device not connected');
    }
    await window.tauriAPI.device.setButtonImage(buttonIndex, imageUrl);
  }, [device.isConnected]);

  // Minimal 1x1 black PNG as data URL - used to "blank" button displays
  // Rust image processor will convert to JPEG and scale to 60x60
  const BLANK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // Sync all LCD button images to the device for the given workspace
  // If shiftMode is true, use shiftImage (no fallback - clear if no shiftImage)
  const syncWorkspaceImages = useCallback(async (workspace: import('@shared/types/config').Workspace, shiftMode: boolean = false) => {
    if (!device.isConnected || !window.tauriAPI?.device?.setButtonImage) {
      console.log('[SHIFT] Cannot sync - device not connected or API not available');
      return;
    }

    console.log('[SHIFT] Starting image sync for', LCD_BUTTON_COUNT, 'buttons, shiftMode:', shiftMode);

    // Sync images for all LCD buttons (0-5)
    for (let i = 0; i < LCD_BUTTON_COUNT; i++) {
      const buttonConfig = workspace.buttons.find(b => b.index === i);
      // Use shiftImage if in shift mode, regular image otherwise (no fallback)
      const imageToUse = shiftMode ? buttonConfig?.shiftImage : buttonConfig?.image;

      const imageType = imageToUse ? (shiftMode ? 'shiftImage' : 'image') : 'CLEAR';
      console.log(`[SHIFT] Button ${i}: sending ${imageType}`);

      try {
        if (imageToUse) {
          // Send the image
          await window.tauriAPI.device.setButtonImage(i, imageToUse);
        } else {
          // Clear the button display using proper protocol command
          await window.tauriAPI.device.clearButton(i);
        }
      } catch (err) {
        console.error(`Failed to sync image for button ${i}:`, err);
      }
    }
    console.log('[SHIFT] Image sync complete');
  }, [device.isConnected]);

  // Sync button images when device connects or active profile changes
  // This ensures button images are restored from profile when app starts
  const prevConnectedRef = useRef<boolean>(false);
  const prevProfileIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profiles.activeProfile || !device.isConnected) {
      prevConnectedRef.current = device.isConnected;
      prevProfileIdRef.current = profiles.activeProfile?.id ?? null;
      return;
    }

    const justConnected = !prevConnectedRef.current && device.isConnected;
    const profileChanged = prevProfileIdRef.current !== profiles.activeProfile.id;

    prevConnectedRef.current = device.isConnected;
    prevProfileIdRef.current = profiles.activeProfile.id;

    // Sync images when device connects or profile changes
    if (justConnected || profileChanged) {
      console.log('[SYNC] Device connected or profile changed, syncing button images...');
      const workspace = getActiveWorkspace(profiles.activeProfile);
      syncWorkspaceImages(workspace, device.isShiftActive);
    }
  }, [device.isConnected, profiles.activeProfile, device.isShiftActive, syncWorkspaceImages]);

  // Sync button images when shift mode toggles
  // Track previous shift state to only sync on actual change
  const prevShiftRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!profiles.activeProfile || !device.isConnected) return;

    // Only sync if shift state actually changed (not on initial render)
    if (prevShiftRef.current === null) {
      prevShiftRef.current = device.isShiftActive;
      console.log('[SHIFT] Initial shift state:', device.isShiftActive);
      return;
    }
    if (prevShiftRef.current === device.isShiftActive) return;

    console.log('[SHIFT] Shift mode changed:', prevShiftRef.current, '->', device.isShiftActive);
    prevShiftRef.current = device.isShiftActive;

    const workspace = getActiveWorkspace(profiles.activeProfile);
    console.log('[SHIFT] Syncing images for workspace:', workspace.name, 'shiftMode:', device.isShiftActive);
    syncWorkspaceImages(workspace, device.isShiftActive);
  }, [device.isShiftActive, device.isConnected, profiles.activeProfile, syncWorkspaceImages]);

  // Handle workspace navigation
  const handleWorkspaceChange = useCallback(async (direction: 'next' | 'previous') => {
    if (!profiles.activeProfile) return;

    const total = getWorkspaceCount(profiles.activeProfile);
    if (total <= 1) return; // Nothing to navigate

    const currentIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
    let newIndex: number;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % total;
    } else {
      newIndex = (currentIndex - 1 + total) % total;
    }

    try {
      const updatedProfile = await profiles.update(profiles.activeProfile.id, { activeWorkspaceIndex: newIndex });
      // Use updated profile to get the workspace (avoids stale state)
      const workspace = updatedProfile?.workspaces?.[newIndex] ?? profiles.activeProfile.workspaces?.[newIndex];
      const workspaceName = workspace?.name || `Workspace ${newIndex + 1}`;
      toast.success(`Switched to ${workspaceName}`);

      // Sync button images to the device for the new workspace
      if (workspace) {
        await syncWorkspaceImages(workspace);
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
      toast.error('Failed to switch workspace');
    }
  }, [profiles, toast, syncWorkspaceImages]);

  // Track last processed workspace navigation event to prevent double-triggering
  // (handleWorkspaceChange changing causes the effect to re-run with the same event)
  const lastProcessedWorkspaceEventRef = useRef<number | null>(null);

  // Handle workspace navigation button presses (small buttons 1 and 2)
  // Button 7 (middle) = previous workspace, Button 8 (right) = next workspace
  useEffect(() => {
    const lastEvent = device.lastButtonEvent;
    if (!lastEvent || lastEvent.type !== ButtonEventType.PRESS) return;

    // Skip if we've already processed this exact event
    if (lastEvent.timestamp === lastProcessedWorkspaceEventRef.current) return;

    // Only handle workspace navigation buttons
    if (lastEvent.buttonIndex === WORKSPACE_PREV_BUTTON_INDEX) {
      lastProcessedWorkspaceEventRef.current = lastEvent.timestamp;
      handleWorkspaceChange('previous');
    } else if (lastEvent.buttonIndex === WORKSPACE_NEXT_BUTTON_INDEX) {
      lastProcessedWorkspaceEventRef.current = lastEvent.timestamp;
      handleWorkspaceChange('next');
    }
  }, [device.lastButtonEvent, handleWorkspaceChange]);

  // Workspace management handlers
  const handleWorkspaceSelect = useCallback(async (index: number) => {
    if (!profiles.activeProfile) return;

    try {
      const updatedProfile = await profiles.update(profiles.activeProfile.id, { activeWorkspaceIndex: index });
      // Use updated profile to get the workspace (avoids stale state)
      const workspace = updatedProfile?.workspaces?.[index] ?? profiles.activeProfile.workspaces?.[index];
      const workspaceName = workspace?.name || `Workspace ${index + 1}`;
      toast.success(`Switched to ${workspaceName}`);

      // Sync button images to the device for the new workspace
      if (workspace) {
        await syncWorkspaceImages(workspace);
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
      toast.error('Failed to switch workspace');
    }
  }, [profiles, toast, syncWorkspaceImages]);

  const handleWorkspaceDialogClose = useCallback(() => {
    setWorkspaceDialogMode(null);
    setSelectedWorkspace(null);
  }, []);

  const handleWorkspaceCreateOpen = useCallback(() => {
    setSelectedWorkspace(null);
    setWorkspaceDialogMode('create');
  }, []);

  const handleWorkspaceRenameOpen = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setWorkspaceDialogMode('rename');
  }, []);

  const handleWorkspaceDuplicateOpen = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setWorkspaceDialogMode('duplicate');
  }, []);

  const handleWorkspaceDeleteOpen = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setWorkspaceDialogMode('delete');
  }, []);

  const handleWorkspaceCreate = useCallback(async (name: string) => {
    if (!profiles.activeProfile) return;

    const newWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name,
      buttons: [],
      encoders: [],
    };

    const updatedWorkspaces = [...(profiles.activeProfile.workspaces || []), newWorkspace];
    await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
    toast.success(`Workspace "${name}" created`);
  }, [profiles, toast]);

  const handleWorkspaceRename = useCallback(async (workspaceId: string, name: string) => {
    if (!profiles.activeProfile) return;

    const updatedWorkspaces = (profiles.activeProfile.workspaces || []).map(w =>
      w.id === workspaceId ? { ...w, name } : w
    );
    await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
    toast.success(`Workspace renamed to "${name}"`);
  }, [profiles, toast]);

  const handleWorkspaceDuplicate = useCallback(async (workspaceId: string, newName: string) => {
    if (!profiles.activeProfile) return;

    const sourceWorkspace = (profiles.activeProfile.workspaces || []).find(w => w.id === workspaceId);
    if (!sourceWorkspace) return;

    const duplicatedWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: newName,
      buttons: sourceWorkspace.buttons.map(b => ({ ...b })),
      encoders: sourceWorkspace.encoders.map(e => ({ ...e })),
    };

    const updatedWorkspaces = [...(profiles.activeProfile.workspaces || []), duplicatedWorkspace];
    await profiles.update(profiles.activeProfile.id, { workspaces: updatedWorkspaces });
    toast.success(`Workspace duplicated as "${newName}"`);
  }, [profiles, toast]);

  const handleWorkspaceDelete = useCallback(async (workspaceId: string) => {
    if (!profiles.activeProfile) return;

    const workspaces = profiles.activeProfile.workspaces || [];
    if (workspaces.length <= 1) {
      toast.error('Cannot delete the last workspace');
      return;
    }

    const deletedIndex = workspaces.findIndex(w => w.id === workspaceId);
    const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);

    // If deleting the active workspace, switch to the previous or first workspace
    let newActiveIndex = profiles.activeProfile.activeWorkspaceIndex || 0;
    if (deletedIndex <= newActiveIndex) {
      newActiveIndex = Math.max(0, newActiveIndex - 1);
    }
    if (newActiveIndex >= updatedWorkspaces.length) {
      newActiveIndex = updatedWorkspaces.length - 1;
    }

    await profiles.update(profiles.activeProfile.id, {
      workspaces: updatedWorkspaces,
      activeWorkspaceIndex: newActiveIndex,
    });

    // Sync images after workspace delete
    if (updatedWorkspaces[newActiveIndex]) {
      await syncWorkspaceImages(updatedWorkspaces[newActiveIndex]);
    }

    toast.success('Workspace deleted');
  }, [profiles, toast, syncWorkspaceImages]);

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
          // Check if imported profile uses new workspace structure or legacy flat arrays
          let workspacesToImport: Workspace[];
          let activeWorkspaceIndex = 0;

          if (imported.workspaces && imported.workspaces.length > 0) {
            // New format: use workspaces directly, generating new IDs
            workspacesToImport = imported.workspaces.map((w, index) => ({
              id: `workspace-${Date.now()}-${index}`,
              name: w.name,
              buttons: w.buttons || [],
              encoders: w.encoders || [],
            }));
            activeWorkspaceIndex = Math.min(
              imported.activeWorkspaceIndex || 0,
              workspacesToImport.length - 1
            );
          } else {
            // Legacy format: create a single workspace from buttons/encoders
            workspacesToImport = [{
              id: `workspace-${Date.now()}-0`,
              name: 'Workspace 1',
              buttons: imported.buttons || [],
              encoders: imported.encoders || [],
            }];
          }

          await profiles.update(newProfile.id, {
            workspaces: workspacesToImport,
            activeWorkspaceIndex,
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
          <DeviceStatusDropdown
            connectionState={device.status.connectionState}
            deviceInfo={device.status.deviceInfo ?? undefined}
            isConnected={device.isConnected}
            isConnecting={device.isConnecting}
            onConnect={device.connect}
            onDisconnect={device.disconnect}
          />
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
            onWorkspaceChange={handleWorkspaceChange}
            onWorkspaceSelect={handleWorkspaceSelect}
            onWorkspaceCreate={handleWorkspaceCreateOpen}
            onWorkspaceRename={handleWorkspaceRenameOpen}
            onWorkspaceDuplicate={handleWorkspaceDuplicateOpen}
            onWorkspaceDelete={handleWorkspaceDeleteOpen}
            onPreviewImage={handlePreviewImage}
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

      {/* Workspace Editor Dialog */}
      <WorkspaceEditor
        mode={workspaceDialogMode}
        workspace={selectedWorkspace}
        workspaceCount={profiles.activeProfile?.workspaces?.length || 0}
        onClose={handleWorkspaceDialogClose}
        onCreate={handleWorkspaceCreate}
        onRename={handleWorkspaceRename}
        onDuplicate={handleWorkspaceDuplicate}
        onDelete={handleWorkspaceDelete}
      />
    </div>
  );
};

export default App;
