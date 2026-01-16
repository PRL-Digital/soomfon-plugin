import React, { useState, useCallback, useEffect } from 'react';
import { LCDButton } from './LCDButton';
import { NormalButton } from './NormalButton';
import { RotaryKnob } from './RotaryKnob';
import {
  ConnectionState,
  ButtonEvent,
  EncoderEvent,
  ButtonType,
  LCD_BUTTON_COUNT,
  NORMAL_BUTTON_COUNT,
  ENCODER_COUNT,
} from '@shared/types/device';

/** Selection types for identifying what element is selected */
export type SelectionType = 'lcd' | 'normal' | 'encoder';

export interface Selection {
  type: SelectionType;
  index: number;
}

export interface DeviceViewProps {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Currently selected element */
  selection?: Selection | null;
  /** Callback when an element is selected */
  onSelectionChange?: (selection: Selection | null) => void;
  /** Last button event for press animation */
  lastButtonEvent?: ButtonEvent | null;
  /** Last encoder event for rotation animation */
  lastEncoderEvent?: EncoderEvent | null;
  /** Image URLs for LCD buttons (indexed by button index) */
  lcdImages?: Record<number, string>;
  /** Labels for LCD buttons (indexed by button index) */
  lcdLabels?: Record<number, string>;
  /** Labels for normal buttons (indexed by button index) */
  normalLabels?: Record<number, string>;
  /** Labels for encoders (indexed by encoder index) */
  encoderLabels?: Record<number, string>;
}

export const DeviceView: React.FC<DeviceViewProps> = ({
  connectionState,
  selection,
  onSelectionChange,
  lastButtonEvent,
  lastEncoderEvent,
  lcdImages = {},
  lcdLabels = {},
  normalLabels = {},
  encoderLabels = {},
}) => {
  // Track pressed states for animation
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  const [encoderRotations, setEncoderRotations] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
  });

  // Handle button press/release for animation
  useEffect(() => {
    if (!lastButtonEvent) return;

    console.log('[DEVICEVIEW] Processing button event:', lastButtonEvent);
    const key = `${lastButtonEvent.buttonType}-${lastButtonEvent.buttonIndex}`;

    if (lastButtonEvent.type === 'press' || lastButtonEvent.type === 'longPress') {
      setPressedButtons((prev) => new Set(prev).add(key));
      console.log('[DEVICEVIEW] Added pressed button:', key);
    } else if (lastButtonEvent.type === 'release') {
      setPressedButtons((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      console.log('[DEVICEVIEW] Removed pressed button:', key);
    }
  }, [lastButtonEvent]);

  // Handle encoder rotation for animation
  useEffect(() => {
    if (!lastEncoderEvent) return;

    console.log('[DEVICEVIEW] Processing encoder event:', lastEncoderEvent);
    const { encoderIndex, type } = lastEncoderEvent;

    if (type === 'rotateCW') {
      setEncoderRotations((prev) => ({
        ...prev,
        [encoderIndex]: prev[encoderIndex] + 15,
      }));
      console.log('[DEVICEVIEW] Encoder rotated CW:', encoderIndex);
    } else if (type === 'rotateCCW') {
      setEncoderRotations((prev) => ({
        ...prev,
        [encoderIndex]: prev[encoderIndex] - 15,
      }));
      console.log('[DEVICEVIEW] Encoder rotated CCW:', encoderIndex);
    } else if (type === 'press') {
      const key = `encoder-press-${encoderIndex}`;
      setPressedButtons((prev) => new Set(prev).add(key));
      console.log('[DEVICEVIEW] Encoder pressed:', encoderIndex);
    } else if (type === 'release') {
      const key = `encoder-press-${encoderIndex}`;
      setPressedButtons((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      console.log('[DEVICEVIEW] Encoder released:', encoderIndex);
    }
  }, [lastEncoderEvent]);

  const handleSelect = useCallback(
    (type: SelectionType, index: number) => {
      if (!onSelectionChange) return;

      // Toggle selection if clicking the same element
      if (selection?.type === type && selection?.index === index) {
        onSelectionChange(null);
      } else {
        onSelectionChange({ type, index });
      }
    },
    [selection, onSelectionChange]
  );

  const isSelected = (type: SelectionType, index: number) =>
    selection?.type === type && selection?.index === index;

  const isButtonPressed = (type: ButtonType, index: number) =>
    pressedButtons.has(`${type}-${index}`);

  const isEncoderPressed = (index: number) =>
    pressedButtons.has(`encoder-press-${index}`);

  const isDisconnected = connectionState !== ConnectionState.CONNECTED;

  return (
    <div
      className={`device-view ${isDisconnected ? 'device-view--disconnected' : ''}`}
      data-testid="device-view"
    >
      {/* Device frame */}
      <div className="device-frame">
        {/* Top row: 3 LCD buttons */}
        <div className="device-row device-row--lcd-top">
          {Array.from({ length: 3 }, (_, i) => (
            <LCDButton
              key={`lcd-${i}`}
              index={i}
              isSelected={isSelected('lcd', i)}
              isPressed={isButtonPressed(ButtonType.LCD, i)}
              imageUrl={lcdImages[i]}
              label={lcdLabels[i]}
              onClick={() => handleSelect('lcd', i)}
            />
          ))}
        </div>

        {/* Middle row: 3 LCD buttons */}
        <div className="device-row device-row--lcd-bottom">
          {Array.from({ length: 3 }, (_, i) => (
            <LCDButton
              key={`lcd-${i + 3}`}
              index={i + 3}
              isSelected={isSelected('lcd', i + 3)}
              isPressed={isButtonPressed(ButtonType.LCD, i + 3)}
              imageUrl={lcdImages[i + 3]}
              label={lcdLabels[i + 3]}
              onClick={() => handleSelect('lcd', i + 3)}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="device-separator" />

        {/* Bottom section: Normal buttons and encoders */}
        <div className="device-row device-row--controls">
          {/* Normal buttons */}
          <div className="device-controls-group">
            {Array.from({ length: NORMAL_BUTTON_COUNT }, (_, i) => (
              <NormalButton
                key={`normal-${i}`}
                index={i}
                isSelected={isSelected('normal', i)}
                isPressed={isButtonPressed(ButtonType.NORMAL, i)}
                label={normalLabels[i]}
                onClick={() => handleSelect('normal', i)}
              />
            ))}
          </div>

          {/* Rotary encoders */}
          <div className="device-controls-group">
            {Array.from({ length: ENCODER_COUNT }, (_, i) => (
              <RotaryKnob
                key={`encoder-${i}`}
                index={i}
                isSelected={isSelected('encoder', i)}
                isPressed={isEncoderPressed(i)}
                rotationAngle={encoderRotations[i]}
                label={encoderLabels[i]}
                onClick={() => handleSelect('encoder', i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Disconnected overlay */}
      {isDisconnected && (
        <div className="device-view__overlay">
          <span className="device-view__overlay-text">
            {connectionState === ConnectionState.CONNECTING
              ? 'Connecting...'
              : connectionState === ConnectionState.ERROR
                ? 'Connection Error'
                : 'Device Disconnected'}
          </span>
        </div>
      )}
    </div>
  );
};

export default DeviceView;
