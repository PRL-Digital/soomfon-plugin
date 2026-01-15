import React, { useState, useRef, useEffect } from 'react';

/** Available action types for selection */
export type ActionTypeOption = 'keyboard' | 'launch' | 'script' | 'http' | 'media' | 'system' | 'profile' | 'text' | 'home_assistant' | 'node_red';

/** Action type metadata */
interface ActionTypeInfo {
  value: ActionTypeOption;
  label: string;
  icon: string;
  description: string;
}

/** All available action types */
const ACTION_TYPES: ActionTypeInfo[] = [
  {
    value: 'keyboard',
    label: 'Keyboard',
    icon: '⌨️',
    description: 'Send keyboard shortcuts',
  },
  {
    value: 'launch',
    label: 'Launch',
    icon: '🚀',
    description: 'Open applications or files',
  },
  {
    value: 'script',
    label: 'Script',
    icon: '📜',
    description: 'Run PowerShell or scripts',
  },
  {
    value: 'http',
    label: 'HTTP',
    icon: '🌐',
    description: 'Make HTTP requests',
  },
  {
    value: 'media',
    label: 'Media',
    icon: '🎵',
    description: 'Control media playback',
  },
  {
    value: 'system',
    label: 'System',
    icon: '💻',
    description: 'System commands',
  },
  {
    value: 'profile',
    label: 'Profile',
    icon: '📋',
    description: 'Switch to another profile',
  },
  {
    value: 'text',
    label: 'Text',
    icon: '📝',
    description: 'Type text macros',
  },
  {
    value: 'home_assistant',
    label: 'Home Assistant',
    icon: '🏠',
    description: 'Control Home Assistant',
  },
  {
    value: 'node_red',
    label: 'Node-RED',
    icon: '🔗',
    description: 'Trigger Node-RED flows',
  },
];

export interface ActionTypeSelectProps {
  /** Currently selected action type */
  value: ActionTypeOption | null;
  /** Callback when action type changes */
  onChange: (type: ActionTypeOption | null) => void;
  /** Whether the select is disabled */
  disabled?: boolean;
}

export const ActionTypeSelect: React.FC<ActionTypeSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedType = value ? ACTION_TYPES.find((t) => t.value === value) : null;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (type: ActionTypeOption) => {
    onChange(type);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`action-type-select ${disabled ? 'action-type-select--disabled' : ''}`}
      data-testid="action-type-select"
    >
      {/* Trigger button */}
      <button
        type="button"
        className={`action-type-select__trigger ${isOpen ? 'action-type-select__trigger--open' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        data-testid="action-type-select-trigger"
      >
        {selectedType ? (
          <span className="action-type-select__selected">
            <span className="action-type-select__icon">{selectedType.icon}</span>
            <span className="action-type-select__label">{selectedType.label}</span>
          </span>
        ) : (
          <span className="action-type-select__placeholder">Select action type...</span>
        )}
        <span className={`action-type-select__arrow ${isOpen ? 'action-type-select__arrow--open' : ''}`}>
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="action-type-select__dropdown" data-testid="action-type-dropdown">
          {ACTION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`action-type-select__option ${
                value === type.value ? 'action-type-select__option--selected' : ''
              }`}
              onClick={() => handleSelect(type.value)}
              data-testid={`action-type-option-${type.value}`}
            >
              <span className="action-type-select__option-icon">{type.icon}</span>
              <span className="action-type-select__option-info">
                <span className="action-type-select__option-label">{type.label}</span>
                <span className="action-type-select__option-desc">{type.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionTypeSelect;
