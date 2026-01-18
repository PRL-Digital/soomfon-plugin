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
  /** Size variant: 'default' for side encoders, 'large' for main encoder */
  size?: 'default' | 'large';
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  index,
  isSelected = false,
  isPressed = false,
  rotationAngle = 0,
  label,
  onClick,
  size = 'default',
}) => {
  const sizeClass = size === 'large' ? 'rotary-knob--large' : '';

  return (
    <button
      type="button"
      data-testid={`encoder-${index}`}
      className={`rotary-knob ${sizeClass} ${isSelected ? 'rotary-knob--selected' : ''} ${isPressed ? 'rotary-knob--pressed' : ''}`}
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
