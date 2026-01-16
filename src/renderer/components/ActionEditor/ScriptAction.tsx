import React, { useCallback, useState } from 'react';
import type { ScriptAction, ScriptType } from '@shared/types/actions';

/** Available script types */
const SCRIPT_TYPES: { value: ScriptType; label: string; extension: string }[] = [
  { value: 'powershell', label: 'PowerShell', extension: '.ps1' },
  { value: 'cmd', label: 'Command Prompt', extension: '.bat/.cmd' },
  { value: 'bash', label: 'Bash (WSL)', extension: '.sh' },
];

/** Script templates for quick start */
const SCRIPT_TEMPLATES: Record<ScriptType, { name: string; code: string }[]> = {
  powershell: [
    { name: 'Show notification', code: '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null\n$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText01)\n$text = $template.GetElementsByTagName("text")[0]\n$text.AppendChild($template.CreateTextNode("Hello from StreamDeck!")) | Out-Null' },
    { name: 'Get clipboard', code: 'Get-Clipboard' },
    { name: 'Set clipboard', code: 'Set-Clipboard -Value "Hello World"' },
  ],
  cmd: [
    { name: 'Echo message', code: '@echo off\necho Hello from StreamDeck!' },
    { name: 'Open folder', code: '@echo off\nstart explorer "%USERPROFILE%\\Desktop"' },
  ],
  bash: [
    { name: 'Echo message', code: '#!/bin/bash\necho "Hello from StreamDeck!"' },
    { name: 'Date', code: '#!/bin/bash\ndate' },
  ],
};

export interface ScriptActionFormProps {
  /** Current configuration */
  config: Partial<ScriptAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<ScriptAction>) => void;
}

export const ScriptActionForm: React.FC<ScriptActionFormProps> = ({
  config,
  onChange,
}) => {
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Handle script type change
  const handleScriptTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        ...config,
        scriptType: e.target.value as ScriptType,
        script: '', // Clear script when changing type
        scriptPath: undefined,
      });
    },
    [config, onChange]
  );

  // Handle script content change
  const handleScriptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...config, script: e.target.value, scriptPath: undefined });
    },
    [config, onChange]
  );

  // Handle script path change
  const handleScriptPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, scriptPath: e.target.value, script: undefined });
    },
    [config, onChange]
  );

  // Handle timeout change
  const handleTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, timeout: isNaN(value) ? undefined : value });
    },
    [config, onChange]
  );

  // Handle browse for script file
  const handleBrowse = useCallback(async () => {
    setBrowseError(null);
    try {
      const api = window.electronAPI as { openFileDialog?: (options: unknown) => Promise<string[]> };
      if (api?.openFileDialog) {
        const scriptType = config.scriptType || 'powershell';
        const extensions: Record<ScriptType, string[]> = {
          powershell: ['ps1'],
          cmd: ['bat', 'cmd'],
          bash: ['sh'],
        };

        const result = await api.openFileDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Script Files', extensions: extensions[scriptType] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (result && result.length > 0) {
          onChange({ ...config, scriptPath: result[0], script: undefined });
        }
      } else {
        setBrowseError('File dialog not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open file dialog';
      setBrowseError(errorMessage);
      console.error('Failed to open file dialog:', error);
    }
  }, [config, onChange]);

  // Apply template
  const handleApplyTemplate = useCallback(
    (code: string) => {
      onChange({ ...config, script: code, scriptPath: undefined });
    },
    [config, onChange]
  );

  const currentScriptType = config.scriptType || 'powershell';
  const templates = SCRIPT_TEMPLATES[currentScriptType] || [];
  const isUsingFile = !!config.scriptPath;

  return (
    <div className="action-form action-form--script" data-testid="script-action-form">
      {/* Script Type */}
      <div className="action-form__row">
        <label className="action-form__label">Script Type</label>
        <select
          className="action-form__select"
          value={currentScriptType}
          onChange={handleScriptTypeChange}
          data-testid="script-type-select"
        >
          {SCRIPT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} ({type.extension})
            </option>
          ))}
        </select>
      </div>

      {/* Script source toggle */}
      <div className="action-form__row">
        <label className="action-form__label">Script Source</label>
        <div className="script-source-toggle">
          <button
            type="button"
            className={`script-source-btn ${!isUsingFile ? 'script-source-btn--active' : ''}`}
            onClick={() => onChange({ ...config, scriptPath: undefined })}
            data-testid="script-source-inline"
          >
            Inline Script
          </button>
          <button
            type="button"
            className={`script-source-btn ${isUsingFile ? 'script-source-btn--active' : ''}`}
            onClick={() => onChange({ ...config, script: undefined, scriptPath: '' })}
            data-testid="script-source-file"
          >
            Script File
          </button>
        </div>
      </div>

      {/* Inline script editor */}
      {!isUsingFile && (
        <>
          <div className="action-form__row">
            <label className="action-form__label">Script Code</label>
            <textarea
              className="action-form__textarea action-form__textarea--code"
              value={config.script || ''}
              onChange={handleScriptChange}
              placeholder={`Enter ${currentScriptType} script here...`}
              rows={8}
              spellCheck={false}
              data-testid="script-code-input"
            />
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="action-form__row">
              <label className="action-form__label">Templates</label>
              <div className="script-templates">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleApplyTemplate(template.code)}
                    data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Script file path */}
      {isUsingFile && (
        <div className="action-form__row">
          <label className="action-form__label">Script File</label>
          <div className="script-path-input">
            <input
              type="text"
              className="action-form__input"
              value={config.scriptPath || ''}
              onChange={handleScriptPathChange}
              placeholder="C:\Scripts\myscript.ps1"
              data-testid="script-path-input"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleBrowse}
              data-testid="script-browse-btn"
            >
              Browse
            </button>
          </div>
          {browseError && (
            <span className="action-form__error" data-testid="script-browse-error">
              {browseError}
            </span>
          )}
        </div>
      )}

      {/* Timeout */}
      <div className="action-form__row">
        <label className="action-form__label">Timeout (ms)</label>
        <input
          type="number"
          className="action-form__input action-form__input--small"
          value={config.timeout || ''}
          onChange={handleTimeoutChange}
          placeholder="30000"
          min="0"
          max="300000"
          step="1000"
          data-testid="script-timeout-input"
        />
        <span className="action-form__hint">
          Maximum execution time (default: 30 seconds)
        </span>
      </div>
    </div>
  );
};

export default ScriptActionForm;
