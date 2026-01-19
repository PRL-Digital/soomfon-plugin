import React from 'react';

export interface LCDButtonProps {
  /** Button index (0-5) */
  index: number;
  /** Whether this button is currently selected for editing */
  isSelected?: boolean;
  /** Whether the physical button is currently pressed */
  isPressed?: boolean;
  /** Image URL to display on the button */
  imageUrl?: string;
  /** Label to show when no image is set */
  label?: string;
  /** Action type label badge (e.g., 'kbd', 'app', 'http') */
  actionLabel?: string;
  /** Click handler for selection */
  onClick?: () => void;
}

export const LCDButton: React.FC<LCDButtonProps> = ({
  index,
  isSelected = false,
  isPressed = false,
  imageUrl,
  label,
  actionLabel,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`lcd-button-${index}`}
      className={`lcd-button ${isSelected ? 'lcd-button--selected' : ''} ${isPressed ? 'lcd-button--pressed' : ''}`}
      onClick={onClick}
      aria-label={`LCD Button ${index + 1}`}
      aria-pressed={isPressed}
    >
      <div className="lcd-button__content">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Button ${index + 1}`}
            className="lcd-button__image"
            draggable={false}
          />
        ) : (
          <span className="lcd-button__label">
            {label || `LCD ${index + 1}`}
          </span>
        )}
      </div>
      {actionLabel !== undefined && (
        <span
          className={`lcd-button__action-label ${actionLabel === '-' ? 'lcd-button__action-label--empty' : ''}`}
          data-testid={`lcd-button-${index}-action-label`}
        >
          {actionLabel}
        </span>
      )}
    </button>
  );
};

export default LCDButton;
