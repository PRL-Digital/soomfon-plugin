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
import { createLogger } from '@shared/utils/logger';

const log = createLogger('DEVICEVIEW');

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

    log.debug('[DEVICEVIEW] Processing button event:', lastButtonEvent);
    const key = `${lastButtonEvent.buttonType}-${lastButtonEvent.buttonIndex}`;

    if (lastButtonEvent.type === 'press' || lastButtonEvent.type === 'longPress') {
      setPressedButtons((prev) => new Set(prev).add(key));
      log.debug('[DEVICEVIEW] Added pressed button:', key);
    } else if (lastButtonEvent.type === 'release') {
      setPressedButtons((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      log.debug('[DEVICEVIEW] Removed pressed button:', key);
    }
  }, [lastButtonEvent]);

  // Handle encoder rotation for animation
  useEffect(() => {
    if (!lastEncoderEvent) return;

    log.debug('[DEVICEVIEW] Processing encoder event:', lastEncoderEvent);
    const { encoderIndex, type } = lastEncoderEvent;

    if (type === 'rotateCW') {
      setEncoderRotations((prev) => ({
        ...prev,
        [encoderIndex]: prev[encoderIndex] + 15,
      }));
      log.debug('[DEVICEVIEW] Encoder rotated CW:', encoderIndex);
    } else if (type === 'rotateCCW') {
      setEncoderRotations((prev) => ({
        ...prev,
        [encoderIndex]: prev[encoderIndex] - 15,
      }));
      log.debug('[DEVICEVIEW] Encoder rotated CCW:', encoderIndex);
    } else if (type === 'press') {
      const key = `encoder-press-${encoderIndex}`;
      setPressedButtons((prev) => new Set(prev).add(key));
      log.debug('[DEVICEVIEW] Encoder pressed:', encoderIndex);
    } else if (type === 'release') {
      const key = `encoder-press-${encoderIndex}`;
      setPressedButtons((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      log.debug('[DEVICEVIEW] Encoder released:', encoderIndex);
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

  const isDisconnected = connectionState !== ConnectionState.CONNECTED && connectionState !== ConnectionState.INITIALIZED;

  return (
    <div
      className={`device-view ${isDisconnected ? 'device-view--disconnected' : ''}`}
      data-testid="device-view"
    >
      {/* Device frame */}
      <div className="device-frame">
        {/* Main section: LCD buttons + main dial */}
        <div className="device-main-section">
          {/* Left column: LCD buttons (2 rows of 3) */}
          <div className="device-lcd-section">
            {/* Top row: 3 LCD buttons */}
            <div className="device-row device-row--lcd">
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

            {/* Bottom row: 3 LCD buttons */}
            <div className="device-row device-row--lcd">
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
          </div>

          {/* Right column: Main dial (encoder 0) */}
          <div className="device-main-dial">
            <RotaryKnob
              index={0}
              size="large"
              isSelected={isSelected('encoder', 0)}
              isPressed={isEncoderPressed(0)}
              rotationAngle={encoderRotations[0]}
              label={encoderLabels[0]}
              onClick={() => handleSelect('encoder', 0)}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="device-separator" />

        {/* Bottom section: Workspace buttons + side dials */}
        <div className="device-controls-section">
          {/* Left: Workspace toggle buttons */}
          <div className="device-workspace-buttons">
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

          {/* Right: Side dials (encoders 1 and 2) */}
          <div className="device-side-dials">
            <RotaryKnob
              index={1}
              isSelected={isSelected('encoder', 1)}
              isPressed={isEncoderPressed(1)}
              rotationAngle={encoderRotations[1]}
              label={encoderLabels[1]}
              onClick={() => handleSelect('encoder', 1)}
            />
            <RotaryKnob
              index={2}
              isSelected={isSelected('encoder', 2)}
              isPressed={isEncoderPressed(2)}
              rotationAngle={encoderRotations[2]}
              label={encoderLabels[2]}
              onClick={() => handleSelect('encoder', 2)}
            />
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
