import React, { useCallback } from 'react';
import type { SystemAction, SystemActionType } from '@shared/types/actions';

/** Available system actions */
const SYSTEM_ACTIONS: { value: SystemActionType; label: string; icon: string; description: string }[] = [
  {
    value: 'show_desktop',
    label: 'Show Desktop',
    icon: '🖥️',
    description: 'Minimize all windows (Win+D)',
  },
  {
    value: 'task_view',
    label: 'Task View',
    icon: '📋',
    description: 'Open Windows task view (Win+Tab)',
  },
  {
    value: 'switch_desktop_left',
    label: 'Desktop Left',
    icon: '◀️',
    description: 'Switch to left virtual desktop',
  },
  {
    value: 'switch_desktop_right',
    label: 'Desktop Right',
    icon: '▶️',
    description: 'Switch to right virtual desktop',
  },
  {
    value: 'lock_screen',
    label: 'Lock Screen',
    icon: '🔒',
    description: 'Lock your computer (Win+L)',
  },
  {
    value: 'screenshot',
    label: 'Screenshot',
    icon: '📸',
    description: 'Take screenshot (Win+Shift+S)',
  },
  {
    value: 'start_menu',
    label: 'Start Menu',
    icon: '🪟',
    description: 'Open Windows Start menu',
  },
];

export interface SystemActionFormProps {
  /** Current configuration */
  config: Partial<SystemAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<SystemAction>) => void;
}

export const SystemActionForm: React.FC<SystemActionFormProps> = ({
  config,
  onChange,
}) => {
  // Handle action change
  const handleActionChange = useCallback(
    (action: SystemActionType) => {
      onChange({ ...config, action });
    },
    [config, onChange]
  );

  return (
    <div className="action-form action-form--system" data-testid="system-action-form">
      {/* System action selector */}
      <div className="action-form__row">
        <label className="action-form__label">System Command</label>
        <div className="system-action-grid">
          {SYSTEM_ACTIONS.map(({ value, label, icon, description }) => (
            <button
              key={value}
              type="button"
              className={`system-action-btn ${
                config.action === value ? 'system-action-btn--active' : ''
              }`}
              onClick={() => handleActionChange(value)}
              title={description}
              data-testid={`system-action-${value}`}
            >
              <span className="system-action-btn__icon">{icon}</span>
              <span className="system-action-btn__label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description for selected action */}
      {config.action && (
        <div className="action-form__row action-form__row--info">
          <div className="system-action-description">
            <span className="system-action-description__icon">
              {SYSTEM_ACTIONS.find((a) => a.value === config.action)?.icon || ''}
            </span>
            <span className="system-action-description__text">
              {SYSTEM_ACTIONS.find((a) => a.value === config.action)?.description || ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemActionForm;
