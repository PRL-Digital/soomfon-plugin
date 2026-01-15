import React, { useState, useCallback } from 'react';
import type { KeyboardAction } from '@shared/types/actions';

/** Common keyboard shortcuts for quick selection */
const COMMON_SHORTCUTS = [
  { label: 'Copy', keys: 'c', modifiers: ['ctrl'] },
  { label: 'Paste', keys: 'v', modifiers: ['ctrl'] },
  { label: 'Cut', keys: 'x', modifiers: ['ctrl'] },
  { label: 'Undo', keys: 'z', modifiers: ['ctrl'] },
  { label: 'Redo', keys: 'y', modifiers: ['ctrl'] },
  { label: 'Save', keys: 's', modifiers: ['ctrl'] },
  { label: 'Find', keys: 'f', modifiers: ['ctrl'] },
  { label: 'Select All', keys: 'a', modifiers: ['ctrl'] },
] as const;

/** Available modifier keys */
type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'win';

const MODIFIER_KEYS: { key: ModifierKey; label: string }[] = [
  { key: 'ctrl', label: 'Ctrl' },
  { key: 'alt', label: 'Alt' },
  { key: 'shift', label: 'Shift' },
  { key: 'win', label: 'Win' },
];

export interface KeyboardActionFormProps {
  /** Current configuration */
  config: Partial<KeyboardAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<KeyboardAction>) => void;
}

export const KeyboardActionForm: React.FC<KeyboardActionFormProps> = ({
  config,
  onChange,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);

  // Handle key input change
  const handleKeysChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, keys: e.target.value });
    },
    [config, onChange]
  );

  // Handle modifier toggle
  const handleModifierToggle = useCallback(
    (modifier: ModifierKey) => {
      const currentModifiers = config.modifiers || [];
      const newModifiers = currentModifiers.includes(modifier)
        ? currentModifiers.filter((m) => m !== modifier)
        : [...currentModifiers, modifier];
      onChange({ ...config, modifiers: newModifiers });
    },
    [config, onChange]
  );

  // Handle hold duration change
  const handleHoldDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, holdDuration: isNaN(value) ? undefined : value });
    },
    [config, onChange]
  );

  // Handle key capture
  const handleKeyCapture = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isCapturing) return;

      e.preventDefault();
      e.stopPropagation();

      // Get the key
      const key = e.key.toLowerCase();

      // Skip modifier-only keys
      if (['control', 'alt', 'shift', 'meta'].includes(key)) {
        return;
      }

      // Build modifiers array
      const modifiers: ModifierKey[] = [];
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');
      if (e.metaKey) modifiers.push('win');

      // Map special keys
      let finalKey = key;
      if (key === ' ') finalKey = 'space';
      if (key === 'arrowup') finalKey = 'up';
      if (key === 'arrowdown') finalKey = 'down';
      if (key === 'arrowleft') finalKey = 'left';
      if (key === 'arrowright') finalKey = 'right';

      onChange({ ...config, keys: finalKey, modifiers });
      setIsCapturing(false);
    },
    [config, onChange, isCapturing]
  );

  // Apply a common shortcut
  const applyShortcut = useCallback(
    (keys: string, modifiers: readonly ModifierKey[]) => {
      onChange({ ...config, keys, modifiers: [...modifiers] });
    },
    [config, onChange]
  );

  // Build display string for current shortcut
  const getShortcutDisplay = (): string => {
    const parts: string[] = [];
    if (config.modifiers) {
      if (config.modifiers.includes('ctrl')) parts.push('Ctrl');
      if (config.modifiers.includes('alt')) parts.push('Alt');
      if (config.modifiers.includes('shift')) parts.push('Shift');
      if (config.modifiers.includes('win')) parts.push('Win');
    }
    if (config.keys) {
      parts.push(config.keys.toUpperCase());
    }
    return parts.join(' + ') || 'None';
  };

  return (
    <div className="action-form action-form--keyboard" data-testid="keyboard-action-form">
      {/* Shortcut display */}
      <div className="action-form__row">
        <label className="action-form__label">Current Shortcut</label>
        <div className="keyboard-shortcut-display">
          {getShortcutDisplay()}
        </div>
      </div>

      {/* Key input with capture */}
      <div className="action-form__row">
        <label className="action-form__label">Key</label>
        <div className="keyboard-key-input">
          <input
            type="text"
            className={`action-form__input ${isCapturing ? 'action-form__input--capturing' : ''}`}
            value={config.keys || ''}
            onChange={handleKeysChange}
            onKeyDown={handleKeyCapture}
            placeholder={isCapturing ? 'Press a key...' : 'Enter key or click Capture'}
            data-testid="keyboard-key-input"
          />
          <button
            type="button"
            className={`btn btn-sm ${isCapturing ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsCapturing(!isCapturing)}
            data-testid="keyboard-capture-btn"
          >
            {isCapturing ? 'Stop' : 'Capture'}
          </button>
        </div>
      </div>

      {/* Modifiers */}
      <div className="action-form__row">
        <label className="action-form__label">Modifiers</label>
        <div className="keyboard-modifiers">
          {MODIFIER_KEYS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`keyboard-modifier-btn ${
                config.modifiers?.includes(key) ? 'keyboard-modifier-btn--active' : ''
              }`}
              onClick={() => handleModifierToggle(key)}
              data-testid={`modifier-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hold duration */}
      <div className="action-form__row">
        <label className="action-form__label">Hold Duration (ms)</label>
        <input
          type="number"
          className="action-form__input action-form__input--small"
          value={config.holdDuration || ''}
          onChange={handleHoldDurationChange}
          placeholder="0"
          min="0"
          max="5000"
          step="50"
          data-testid="keyboard-hold-duration"
        />
      </div>

      {/* Common shortcuts */}
      <div className="action-form__row action-form__row--shortcuts">
        <label className="action-form__label">Quick Shortcuts</label>
        <div className="keyboard-shortcuts-grid">
          {COMMON_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              className="keyboard-shortcut-btn"
              onClick={() => applyShortcut(shortcut.keys, shortcut.modifiers)}
              data-testid={`shortcut-${shortcut.label.toLowerCase()}`}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardActionForm;
