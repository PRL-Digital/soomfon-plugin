import React from 'react';

export interface RotaryKnobProps {
  /** Encoder index (0-2) */
  index: number;
  /** Whether this encoder is currently selected for editing */
  isSelected?: boolean;
  /** Whether the encoder center button is currently pressed */
  isPressed?: boolean;
  /** Current rotation angle for visual feedback (degrees) */
  rotationAngle?: number;
  /** Label to display */
  label?: string;
  /** Click handler for selection */
  onClick?: () => void;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  index,
  isSelected = false,
  isPressed = false,
  rotationAngle = 0,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`encoder-${index}`}
      className={`rotary-knob ${isSelected ? 'rotary-knob--selected' : ''} ${isPressed ? 'rotary-knob--pressed' : ''}`}
      onClick={onClick}
      aria-label={`Rotary Encoder ${index + 1}`}
      aria-pressed={isPressed}
    >
      <div
        className="rotary-knob__dial"
        style={{ transform: `rotate(${rotationAngle}deg)` }}
      >
        <div className="rotary-knob__indicator" />
      </div>
      <span className="rotary-knob__label">
        {label || `ENC ${index + 1}`}
      </span>
    </button>
  );
};

export default RotaryKnob;
