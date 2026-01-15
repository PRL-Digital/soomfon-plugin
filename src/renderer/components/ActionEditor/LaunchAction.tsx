import React, { useCallback } from 'react';
import type { LaunchAction } from '@shared/types/actions';

export interface LaunchActionFormProps {
  /** Current configuration */
  config: Partial<LaunchAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<LaunchAction>) => void;
}

export const LaunchActionForm: React.FC<LaunchActionFormProps> = ({
  config,
  onChange,
}) => {
  // Handle path change
  const handlePathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, path: e.target.value });
    },
    [config, onChange]
  );

  // Handle arguments change
  const handleArgsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const args = e.target.value
        .split(' ')
        .filter((arg) => arg.trim() !== '');
      onChange({ ...config, args });
    },
    [config, onChange]
  );

  // Handle working directory change
  const handleWorkingDirChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, workingDirectory: e.target.value || undefined });
    },
    [config, onChange]
  );

  // Handle use shell toggle
  const handleUseShellChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, useShell: e.target.checked });
    },
    [config, onChange]
  );

  // Handle browse button
  const handleBrowse = useCallback(async () => {
    try {
      // Use Electron's dialog via IPC if available
      if (window.electronAPI?.openFileDialog) {
        const result = await window.electronAPI.openFileDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'ps1', 'lnk'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (result && result.length > 0) {
          onChange({ ...config, path: result[0] });
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  }, [config, onChange]);

  return (
    <div className="action-form action-form--launch" data-testid="launch-action-form">
      {/* Path input */}
      <div className="action-form__row">
        <label className="action-form__label">Path</label>
        <div className="launch-path-input">
          <input
            type="text"
            className="action-form__input"
            value={config.path || ''}
            onChange={handlePathChange}
            placeholder="C:\Program Files\App\app.exe"
            data-testid="launch-path-input"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleBrowse}
            data-testid="launch-browse-btn"
          >
            Browse
          </button>
        </div>
        <span className="action-form__hint">
          Path to executable, file, or URL to open
        </span>
      </div>

      {/* Arguments */}
      <div className="action-form__row">
        <label className="action-form__label">Arguments</label>
        <input
          type="text"
          className="action-form__input"
          value={config.args?.join(' ') || ''}
          onChange={handleArgsChange}
          placeholder="--flag value"
          data-testid="launch-args-input"
        />
        <span className="action-form__hint">
          Command-line arguments (space-separated)
        </span>
      </div>

      {/* Working Directory */}
      <div className="action-form__row">
        <label className="action-form__label">Working Directory</label>
        <input
          type="text"
          className="action-form__input"
          value={config.workingDirectory || ''}
          onChange={handleWorkingDirChange}
          placeholder="C:\Projects"
          data-testid="launch-workdir-input"
        />
        <span className="action-form__hint">
          Optional: Directory to run the application from
        </span>
      </div>

      {/* Use Shell */}
      <div className="action-form__row action-form__row--checkbox">
        <label className="action-form__checkbox-label">
          <input
            type="checkbox"
            checked={config.useShell || false}
            onChange={handleUseShellChange}
            data-testid="launch-useshell-checkbox"
          />
          <span className="action-form__checkbox-text">
            Open with default application
          </span>
        </label>
        <span className="action-form__hint">
          Enable to open files with their associated application
        </span>
      </div>

      {/* Common examples */}
      <div className="action-form__row action-form__row--examples">
        <label className="action-form__label">Examples</label>
        <div className="launch-examples">
          <div className="launch-example">
            <span className="launch-example__label">Open URL:</span>
            <code className="launch-example__code">https://google.com</code>
            <span className="launch-example__note">(with shell option)</span>
          </div>
          <div className="launch-example">
            <span className="launch-example__label">Open folder:</span>
            <code className="launch-example__code">C:\Users\Desktop</code>
            <span className="launch-example__note">(with shell option)</span>
          </div>
          <div className="launch-example">
            <span className="launch-example__label">Run app:</span>
            <code className="launch-example__code">notepad.exe</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchActionForm;
