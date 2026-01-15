import React, { useState, useCallback, useEffect } from 'react';
import { Selection } from '../DeviceView';
import { ActionTypeSelect, ActionTypeOption } from './ActionTypeSelect';
import { KeyboardActionForm } from './KeyboardAction';
import { LaunchActionForm } from './LaunchAction';
import { ScriptActionForm } from './ScriptAction';
import { HttpActionForm } from './HttpAction';
import { MediaActionForm } from './MediaAction';
import { SystemActionForm } from './SystemAction';
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

/** Encoder action type identifiers */
export type EncoderActionType = 'press' | 'longPress' | 'rotateClockwise' | 'rotateCounterClockwise';

/** Configuration for a single encoder action */
export interface EncoderActionConfig {
  enabled: boolean;
  actionType: ActionTypeOption | null;
  action: Partial<Action>;
}

/** Full encoder configuration with all 4 actions */
export interface EncoderConfig {
  press: EncoderActionConfig;
  longPress: EncoderActionConfig;
  rotateClockwise: EncoderActionConfig;
  rotateCounterClockwise: EncoderActionConfig;
}

/** Section metadata */
interface SectionInfo {
  id: EncoderActionType;
  title: string;
  description: string;
  icon: string;
}

const SECTIONS: SectionInfo[] = [
  {
    id: 'press',
    title: 'Press Action',
    description: 'Triggered on short press',
    icon: '👆',
  },
  {
    id: 'longPress',
    title: 'Long Press Action',
    description: 'Triggered when held for 500ms+',
    icon: '✋',
  },
  {
    id: 'rotateClockwise',
    title: 'Clockwise Rotation',
    description: 'Triggered when turned right',
    icon: '↻',
  },
  {
    id: 'rotateCounterClockwise',
    title: 'Counter-Clockwise Rotation',
    description: 'Triggered when turned left',
    icon: '↺',
  },
];

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

/** Default encoder config with all actions empty */
const createDefaultEncoderConfig = (): EncoderConfig => ({
  press: { enabled: true, actionType: null, action: {} },
  longPress: { enabled: true, actionType: null, action: {} },
  rotateClockwise: { enabled: true, actionType: null, action: {} },
  rotateCounterClockwise: { enabled: true, actionType: null, action: {} },
});

export interface EncoderEditorProps {
  /** Currently selected encoder */
  selection: Selection | null;
  /** Current encoder configuration */
  currentConfig?: Partial<EncoderConfig> | null;
  /** Callback when encoder config is saved */
  onSave?: (config: EncoderConfig) => void;
  /** Callback when encoder config is cleared */
  onClear?: () => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
}

/** Action Section Component - Collapsible section for each encoder action */
const ActionSection: React.FC<{
  section: SectionInfo;
  config: EncoderActionConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (config: EncoderActionConfig) => void;
}> = ({ section, config, isExpanded, onToggleExpand, onChange }) => {
  const handleEnabledChange = useCallback((enabled: boolean) => {
    onChange({ ...config, enabled });
  }, [config, onChange]);

  const handleTypeChange = useCallback((type: ActionTypeOption | null) => {
    if (type) {
      onChange({ ...config, actionType: type, action: createDefaultAction(type) });
    } else {
      onChange({ ...config, actionType: null, action: {} });
    }
  }, [config, onChange]);

  const handleConfigChange = useCallback((action: Partial<Action>) => {
    onChange({ ...config, action: { ...config.action, ...action } });
  }, [config, onChange]);

  const handleClear = useCallback(() => {
    onChange({ enabled: true, actionType: null, action: {} });
  }, [onChange]);

  const hasAction = config.actionType !== null;

  return (
    <div
      className={`encoder-section ${isExpanded ? 'encoder-section--expanded' : ''}`}
      data-testid={`encoder-section-${section.id}`}
    >
      {/* Section Header */}
      <button
        type="button"
        className="encoder-section__header"
        onClick={onToggleExpand}
        data-testid={`encoder-section-header-${section.id}`}
      >
        <div className="encoder-section__header-left">
          <span className="encoder-section__icon">{section.icon}</span>
          <div className="encoder-section__header-info">
            <span className="encoder-section__title">{section.title}</span>
            <span className="encoder-section__description">{section.description}</span>
          </div>
        </div>
        <div className="encoder-section__header-right">
          {hasAction && (
            <span className="encoder-section__action-badge">
              {config.actionType}
            </span>
          )}
          {!config.enabled && (
            <span className="encoder-section__disabled-badge">Disabled</span>
          )}
          <span className={`encoder-section__arrow ${isExpanded ? 'encoder-section__arrow--open' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="encoder-section__content" data-testid={`encoder-section-content-${section.id}`}>
          {/* Enable/Disable Toggle */}
          <div className="encoder-section__row">
            <label className="action-form__checkbox-label">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleEnabledChange(e.target.checked)}
              />
              <span className="action-form__checkbox-text">Enable this action</span>
            </label>
          </div>

          {/* Action Type Selector */}
          <div className="encoder-section__row">
            <label className="action-editor__label">Action Type</label>
            <ActionTypeSelect
              value={config.actionType}
              onChange={handleTypeChange}
              disabled={!config.enabled}
            />
          </div>

          {/* Action-specific form */}
          {config.actionType && (
            <div className="encoder-section__form">
              {config.actionType === 'keyboard' && (
                <KeyboardActionForm
                  config={config.action as Partial<KeyboardAction>}
                  onChange={handleConfigChange}
                />
              )}
              {config.actionType === 'launch' && (
                <LaunchActionForm
                  config={config.action as Partial<LaunchAction>}
                  onChange={handleConfigChange}
                />
              )}
              {config.actionType === 'script' && (
                <ScriptActionForm
                  config={config.action as Partial<ScriptAction>}
                  onChange={handleConfigChange}
                />
              )}
              {config.actionType === 'http' && (
                <HttpActionForm
                  config={config.action as Partial<HttpAction>}
                  onChange={handleConfigChange}
                />
              )}
              {config.actionType === 'media' && (
                <MediaActionForm
                  config={config.action as Partial<MediaAction>}
                  onChange={handleConfigChange}
                />
              )}
              {config.actionType === 'system' && (
                <SystemActionForm
                  config={config.action as Partial<SystemAction>}
                  onChange={handleConfigChange}
                />
              )}
            </div>
          )}

          {/* Clear Button */}
          {hasAction && (
            <div className="encoder-section__footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClear}
                data-testid={`encoder-section-clear-${section.id}`}
              >
                Clear Action
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EncoderEditor: React.FC<EncoderEditorProps> = ({
  selection,
  currentConfig,
  onSave,
  onClear,
  onCancel,
}) => {
  // State for the encoder config being edited
  const [config, setConfig] = useState<EncoderConfig>(createDefaultEncoderConfig());
  const [expandedSections, setExpandedSections] = useState<Set<EncoderActionType>>(new Set(['press']));
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when selection changes
  useEffect(() => {
    if (selection?.type === 'encoder') {
      if (currentConfig) {
        setConfig({
          press: currentConfig.press ?? { enabled: true, actionType: null, action: {} },
          longPress: currentConfig.longPress ?? { enabled: true, actionType: null, action: {} },
          rotateClockwise: currentConfig.rotateClockwise ?? { enabled: true, actionType: null, action: {} },
          rotateCounterClockwise: currentConfig.rotateCounterClockwise ?? { enabled: true, actionType: null, action: {} },
        });
      } else {
        setConfig(createDefaultEncoderConfig());
      }
      setHasChanges(false);
      // Expand the first section by default
      setExpandedSections(new Set(['press']));
    }
  }, [selection, currentConfig]);

  // Handle section toggle
  const handleToggleSection = useCallback((sectionId: EncoderActionType) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Handle section config change
  const handleSectionChange = useCallback((sectionId: EncoderActionType, sectionConfig: EncoderActionConfig) => {
    setConfig((prev) => ({
      ...prev,
      [sectionId]: sectionConfig,
    }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(config);
      setHasChanges(false);
    }
  }, [onSave, config]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setConfig(createDefaultEncoderConfig());
    setHasChanges(true);
    onClear?.();
  }, [onClear]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (currentConfig) {
      setConfig({
        press: currentConfig.press ?? { enabled: true, actionType: null, action: {} },
        longPress: currentConfig.longPress ?? { enabled: true, actionType: null, action: {} },
        rotateClockwise: currentConfig.rotateClockwise ?? { enabled: true, actionType: null, action: {} },
        rotateCounterClockwise: currentConfig.rotateCounterClockwise ?? { enabled: true, actionType: null, action: {} },
      });
    } else {
      setConfig(createDefaultEncoderConfig());
    }
    setHasChanges(false);
    onCancel?.();
  }, [currentConfig, onCancel]);

  // Only render for encoder selections
  if (!selection || selection.type !== 'encoder') {
    return null;
  }

  const encoderName = `Encoder ${selection.index + 1}`;

  return (
    <div className="encoder-editor" data-testid="encoder-editor">
      {/* Header */}
      <div className="action-editor__header">
        <h3 className="action-editor__title">{encoderName}</h3>
        {hasChanges && (
          <span className="action-editor__unsaved-badge">Unsaved changes</span>
        )}
      </div>

      {/* Content - Four Action Sections */}
      <div className="encoder-editor__content">
        {SECTIONS.map((section) => (
          <ActionSection
            key={section.id}
            section={section}
            config={config[section.id]}
            isExpanded={expandedSections.has(section.id)}
            onToggleExpand={() => handleToggleSection(section.id)}
            onChange={(sectionConfig) => handleSectionChange(section.id, sectionConfig)}
          />
        ))}
      </div>

      {/* Footer with buttons */}
      <div className="action-editor__footer">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClearAll}
          data-testid="encoder-editor-clear"
        >
          Clear All
        </button>
        <div className="action-editor__footer-right">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={!hasChanges}
            data-testid="encoder-editor-cancel"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!hasChanges}
            data-testid="encoder-editor-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncoderEditor;
