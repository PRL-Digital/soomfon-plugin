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
import type {
  Action,
  ActionType,
  KeyboardAction,
  LaunchAction,
  ScriptAction,
  HttpAction,
  MediaAction,
  SystemAction,
} from '@shared/types/actions';

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
    default:
      return base;
  }
};

export interface ActionEditorProps {
  /** Currently selected element */
  selection: Selection | null;
  /** Current action configuration for the selection */
  currentAction?: Partial<Action> | null;
  /** Current image URL for the selection (LCD buttons only) */
  currentImage?: string;
  /** Callback when action is saved */
  onSave?: (action: Partial<Action>, imageUrl?: string) => void;
  /** Callback when action is cleared */
  onClear?: () => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  selection,
  currentAction,
  currentImage,
  onSave,
  onClear,
  onCancel,
}) => {
  // State for the current action being edited
  const [actionType, setActionType] = useState<ActionTypeOption | null>(null);
  const [actionConfig, setActionConfig] = useState<Partial<Action>>({});
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when selection changes
  useEffect(() => {
    if (selection) {
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
  }, [selection, currentAction, currentImage]);

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
      onSave(actionConfig, imageUrl);
      setHasChanges(false);
    }
  }, [onSave, actionType, actionConfig, imageUrl]);

  // Handle clear
  const handleClear = useCallback(() => {
    setActionType(null);
    setActionConfig({});
    setImageUrl(undefined);
    setHasChanges(true);
    onClear?.();
  }, [onClear]);

  // Handle cancel
  const handleCancel = useCallback(() => {
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
  }, [currentAction, currentImage, onCancel]);

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
        {/* Image Picker (LCD buttons only) */}
        {showImagePicker && (
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
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="action-editor__footer">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClear}
          data-testid="action-editor-clear"
        >
          Clear
        </button>
        <div className="action-editor__footer-right">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={!hasChanges}
            data-testid="action-editor-cancel"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!hasChanges || !actionType}
            data-testid="action-editor-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionEditor;
