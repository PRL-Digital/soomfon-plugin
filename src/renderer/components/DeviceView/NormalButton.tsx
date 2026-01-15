import React from 'react';

export interface NormalButtonProps {
  /** Button index (0-2) */
  index: number;
  /** Whether this button is currently selected for editing */
  isSelected?: boolean;
  /** Whether the physical button is currently pressed */
  isPressed?: boolean;
  /** Label to display */
  label?: string;
  /** Click handler for selection */
  onClick?: () => void;
}

export const NormalButton: React.FC<NormalButtonProps> = ({
  index,
  isSelected = false,
  isPressed = false,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`normal-button-${index}`}
      className={`normal-button ${isSelected ? 'normal-button--selected' : ''} ${isPressed ? 'normal-button--pressed' : ''}`}
      onClick={onClick}
      aria-label={`Button ${index + 1}`}
      aria-pressed={isPressed}
    >
      <span className="normal-button__label">
        {label || `BTN ${index + 1}`}
      </span>
    </button>
  );
};

export default NormalButton;
