import React, { useState, useCallback, useEffect } from 'react';
import { Selection } from '../DeviceView';
import { ActionTypeSelect, ActionTypeOption } from './ActionTypeSelect';
import { KeyboardActionForm } from './KeyboardAction';
import { LaunchActionForm } from './LaunchAction';
import { ScriptActionForm } from './ScriptAction';
import { HttpActionForm } from './HttpAction';
import { MediaActionForm } from './MediaAction';
import { SystemActionForm } from './SystemAction';
import { ImagePicker } from './ImagePicker';
import { HomeAssistantActionForm } from './HomeAssistantAction';
import { ProfileActionForm } from './ProfileAction';
import { TextActionForm } from './TextAction';
import { NodeRedActionForm } from './NodeRedAction';
import { Spinner } from '../common';
import type {
  Action,
  ActionType,
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

/**
 * Button trigger mode - determines which action field to edit
 * 'press' = action, 'longPress' = longPressAction, 'shiftPress' = shiftAction, 'shiftLongPress' = shiftLongPressAction
 */
export type ButtonTriggerMode = 'press' | 'longPress' | 'shiftPress' | 'shiftLongPress';

/** Trigger mode option for the selector */
interface TriggerModeOption {
  value: ButtonTriggerMode;
  label: string;
  description: string;
  icon: string;
}

/** Available trigger modes for buttons */
const TRIGGER_MODES: TriggerModeOption[] = [
  { value: 'press', label: 'Press', description: 'Short press', icon: '👆' },
  { value: 'longPress', label: 'Long Press', description: 'Hold 500ms+', icon: '✋' },
  { value: 'shiftPress', label: 'Shift + Press', description: 'With shift held', icon: '⇧👆' },
  { value: 'shiftLongPress', label: 'Shift + Long', description: 'Shift + hold', icon: '⇧✋' },
];

/** Get display name for selection type */
const getSelectionName = (selection: Selection): string => {
  switch (selection.type) {
    case 'lcd':
      return `LCD Button ${selection.index + 1}`;
    case 'normal':
      return `Button ${selection.index + 1}`;
    case 'encoder':
      return `Encoder ${selection.index + 1}`;
    default:
      return 'Unknown';
  }
};

/** Default action values for each type */
const createDefaultAction = (type: ActionType): Partial<Action> => {
  const base = {
    id: '',
    name: '',
    enabled: true,
    icon: undefined,
  };

  switch (type) {
    case 'keyboard':
      return { ...base, type: 'keyboard', keys: '', modifiers: [] } as Partial<KeyboardAction>;
    case 'launch':
      return { ...base, type: 'launch', path: '', args: [], useShell: false } as Partial<LaunchAction>;
    case 'script':
      return { ...base, type: 'script', scriptType: 'powershell', script: '' } as Partial<ScriptAction>;
    case 'http':
      return { ...base, type: 'http', method: 'GET', url: '', headers: {}, bodyType: 'json' } as Partial<HttpAction>;
    case 'media':
      return { ...base, type: 'media', action: 'play_pause' } as Partial<MediaAction>;
    case 'system':
      return { ...base, type: 'system', action: 'show_desktop' } as Partial<SystemAction>;
    case 'profile':
      return { ...base, type: 'profile', profileId: '' } as Partial<ProfileAction>;
    case 'text':
      return { ...base, type: 'text', text: '', typeDelay: 0 } as Partial<TextAction>;
    case 'home_assistant':
      return { ...base, type: 'home_assistant', operation: 'toggle', entityId: '' } as Partial<HomeAssistantAction>;
    case 'node_red':
      return { ...base, type: 'node_red', operation: 'trigger_flow', endpoint: '' } as Partial<NodeRedAction>;
    default:
      return base;
  }
};

/** Actions for all trigger modes of a button */
export interface ButtonActions {
  action?: Partial<Action> | null;
  longPressAction?: Partial<Action> | null;
  shiftAction?: Partial<Action> | null;
  shiftLongPressAction?: Partial<Action> | null;
}

export interface ActionEditorProps {
  /** Currently selected element */
  selection: Selection | null;
  /** All actions for the selected button (for all trigger modes) */
  buttonActions?: ButtonActions;
  /** Current image URL for the selection (LCD buttons only) */
  currentImage?: string;
  /** Callback when action is saved */
  onSave?: (action: Partial<Action>, triggerMode: ButtonTriggerMode, imageUrl?: string) => void;
  /** Callback when action is cleared */
  onClear?: (triggerMode: ButtonTriggerMode) => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** Whether a save operation is in progress (includes image upload) */
  isSaving?: boolean;
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  selection,
  buttonActions,
  currentImage,
  onSave,
  onClear,
  onCancel,
  isSaving = false,
}) => {
  // State for the current action being edited
  const [triggerMode, setTriggerMode] = useState<ButtonTriggerMode>('press');
  const [actionType, setActionType] = useState<ActionTypeOption | null>(null);
  const [actionConfig, setActionConfig] = useState<Partial<Action>>({});
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Get action for the current trigger mode
  const getActionForMode = useCallback((mode: ButtonTriggerMode, actions?: ButtonActions): Partial<Action> | null | undefined => {
    if (!actions) return undefined;
    switch (mode) {
      case 'press': return actions.action;
      case 'longPress': return actions.longPressAction;
      case 'shiftPress': return actions.shiftAction;
      case 'shiftLongPress': return actions.shiftLongPressAction;
    }
  }, []);

  // Reset state when selection changes
  useEffect(() => {
    if (selection) {
      // Reset to press mode when selection changes
      setTriggerMode('press');
      const currentAction = getActionForMode('press', buttonActions);
      if (currentAction?.type) {
        setActionType(currentAction.type as ActionTypeOption);
        setActionConfig(currentAction);
      } else {
        setActionType(null);
        setActionConfig({});
      }
      setImageUrl(currentImage);
      setHasChanges(false);
    }
  }, [selection, buttonActions, currentImage, getActionForMode]);

  // Update action config when trigger mode changes
  const handleTriggerModeChange = useCallback((mode: ButtonTriggerMode) => {
    // Save isn't needed here - user can switch modes freely and save when ready
    setTriggerMode(mode);
    const currentAction = getActionForMode(mode, buttonActions);
    if (currentAction?.type) {
      setActionType(currentAction.type as ActionTypeOption);
      setActionConfig(currentAction);
    } else {
      setActionType(null);
      setActionConfig({});
    }
    setHasChanges(false);
  }, [buttonActions, getActionForMode]);

  // Handle action type change
  const handleTypeChange = useCallback((type: ActionTypeOption | null) => {
    setActionType(type);
    if (type) {
      setActionConfig(createDefaultAction(type));
    } else {
      setActionConfig({});
    }
    setHasChanges(true);
  }, []);

  // Handle action config changes
  const handleConfigChange = useCallback((config: Partial<Action>) => {
    setActionConfig((prev) => ({ ...prev, ...config } as Partial<Action>));
    setHasChanges(true);
  }, []);

  // Handle image change
  const handleImageChange = useCallback((url: string | undefined) => {
    setImageUrl(url);
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave && actionType) {
      onSave(actionConfig, triggerMode, imageUrl);
      setHasChanges(false);
    }
  }, [onSave, actionType, actionConfig, triggerMode, imageUrl]);

  // Handle clear
  const handleClear = useCallback(() => {
    setActionType(null);
    setActionConfig({});
    // Only clear image for press mode (primary action)
    if (triggerMode === 'press') {
      setImageUrl(undefined);
    }
    setHasChanges(true);
    onClear?.(triggerMode);
  }, [onClear, triggerMode]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    const currentAction = getActionForMode(triggerMode, buttonActions);
    if (currentAction?.type) {
      setActionType(currentAction.type as ActionTypeOption);
      setActionConfig(currentAction);
    } else {
      setActionType(null);
      setActionConfig({});
    }
    setImageUrl(currentImage);
    setHasChanges(false);
    onCancel?.();
  }, [buttonActions, triggerMode, currentImage, onCancel, getActionForMode]);

  // Don't render if nothing is selected
  if (!selection) {
    return (
      <div className="action-editor action-editor--empty" data-testid="action-editor">
        <div className="action-editor__placeholder">
          <span className="action-editor__placeholder-icon">👆</span>
          <p className="action-editor__placeholder-text">
            Select a button or encoder to configure its action
          </p>
        </div>
      </div>
    );
  }

  const showImagePicker = selection.type === 'lcd';

  // Check if any mode has an action configured (for badge indicators)
  const getModeHasAction = (mode: ButtonTriggerMode): boolean => {
    const action = getActionForMode(mode, buttonActions);
    return action?.type !== undefined;
  };

  return (
    <div className="action-editor" data-testid="action-editor">
      {/* Header */}
      <div className="action-editor__header">
        <h3 className="action-editor__title">{getSelectionName(selection)}</h3>
        {hasChanges && (
          <span className="action-editor__unsaved-badge">Unsaved changes</span>
        )}
      </div>

      {/* Content */}
      <div className="action-editor__content">
        {/* Trigger Mode Selector */}
        <div className="action-editor__section">
          <label className="action-editor__label">Trigger</label>
          <div className="trigger-mode-selector" data-testid="trigger-mode-selector">
            {TRIGGER_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={`trigger-mode-btn ${triggerMode === mode.value ? 'trigger-mode-btn--active' : ''} ${getModeHasAction(mode.value) ? 'trigger-mode-btn--configured' : ''}`}
                onClick={() => handleTriggerModeChange(mode.value)}
                title={mode.description}
                data-testid={`trigger-mode-${mode.value}`}
              >
                <span className="trigger-mode-btn__icon">{mode.icon}</span>
                <span className="trigger-mode-btn__label">{mode.label}</span>
                {getModeHasAction(mode.value) && triggerMode !== mode.value && (
                  <span className="trigger-mode-btn__dot" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Image Picker (LCD buttons only, shown only for press mode) */}
        {showImagePicker && triggerMode === 'press' && (
          <div className="action-editor__section">
            <label className="action-editor__label">Button Image</label>
            <ImagePicker
              imageUrl={imageUrl}
              onChange={handleImageChange}
            />
          </div>
        )}

        {/* Action Type Selector */}
        <div className="action-editor__section">
          <label className="action-editor__label">Action Type</label>
          <ActionTypeSelect
            value={actionType}
            onChange={handleTypeChange}
          />
        </div>

        {/* Action-specific form */}
        {actionType && (
          <div className="action-editor__section action-editor__form">
            {actionType === 'keyboard' && (
              <KeyboardActionForm
                config={actionConfig as Partial<KeyboardAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'launch' && (
              <LaunchActionForm
                config={actionConfig as Partial<LaunchAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'script' && (
              <ScriptActionForm
                config={actionConfig as Partial<ScriptAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'http' && (
              <HttpActionForm
                config={actionConfig as Partial<HttpAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'media' && (
              <MediaActionForm
                config={actionConfig as Partial<MediaAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'system' && (
              <SystemActionForm
                config={actionConfig as Partial<SystemAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'profile' && (
              <ProfileActionForm
                config={actionConfig as Partial<ProfileAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'text' && (
              <TextActionForm
                config={actionConfig as Partial<TextAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'home_assistant' && (
              <HomeAssistantActionForm
                config={actionConfig as Partial<HomeAssistantAction>}
                onChange={handleConfigChange}
              />
            )}
            {actionType === 'node_red' && (
              <NodeRedActionForm
                config={actionConfig as Partial<NodeRedAction>}
                onChange={handleConfigChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="action-editor__footer">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClear}
          disabled={isSaving}
          data-testid="action-editor-clear"
        >
          Clear
        </button>
        <div className="action-editor__footer-right">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
            data-testid="action-editor-cancel"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!hasChanges || !actionType || isSaving}
            data-testid="action-editor-save"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionEditor;
