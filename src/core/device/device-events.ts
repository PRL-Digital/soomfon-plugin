/**
 * Device Events Parser
 * Parses raw HID input reports into structured button and encoder events
 */

import { EventEmitter } from 'events';
import {
  ButtonEvent,
  ButtonEventType,
  ButtonType,
  EncoderEvent,
  EncoderEventType,
  ReportType,
  LCD_BUTTON_COUNT,
  ENCODER_COUNT,
} from '../../shared/types/device';

/** Long press detection threshold in milliseconds */
const LONG_PRESS_THRESHOLD = 500;

/** Debounce interval in milliseconds */
const DEBOUNCE_INTERVAL = 50;

/** Event types emitted by DeviceEventParser */
export type DeviceEventParserEvents = {
  button: (event: ButtonEvent) => void;
  encoder: (event: EncoderEvent) => void;
};

/** Device event parser for button and encoder inputs */
export class DeviceEventParser extends EventEmitter {
  private buttonStates: Map<number, boolean> = new Map();
  private buttonPressTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private lastEventTimes: Map<string, number> = new Map();
  private longPressThreshold: number = LONG_PRESS_THRESHOLD;
  private debounceInterval: number = DEBOUNCE_INTERVAL;

  constructor() {
    super();
  }

  /** Configure long press threshold */
  setLongPressThreshold(ms: number): void {
    this.longPressThreshold = ms;
  }

  /** Configure debounce interval */
  setDebounceInterval(ms: number): void {
    this.debounceInterval = ms;
  }

  /** Parse raw HID data */
  parseData(data: Buffer): void {
    if (!data || data.length < 2) {
      return;
    }

    const reportType = data[0];

    switch (reportType) {
      case ReportType.BUTTON:
        this.parseButtonReport(data);
        break;
      case ReportType.ENCODER:
        this.parseEncoderReport(data);
        break;
      default:
        // Unknown report type, try to parse as button/encoder based on data patterns
        this.parseGenericReport(data);
        break;
    }
  }

  /** Parse button input report */
  private parseButtonReport(data: Buffer): void {
    // Expected format: [ReportType.BUTTON, buttonIndex, isPressed]
    if (data.length < 3) {
      return;
    }

    const buttonIndex = data[1];
    const isPressed = data[2] !== 0;

    this.handleButtonState(buttonIndex, isPressed);
  }

  /** Parse encoder input report */
  private parseEncoderReport(data: Buffer): void {
    // Expected format: [ReportType.ENCODER, encoderIndex, direction, delta?]
    if (data.length < 3) {
      return;
    }

    const encoderIndex = data[1];
    const direction = data[2]; // 0 = CCW, 1 = CW, 2 = press, 3 = release
    const delta = data.length > 3 ? data[3] : 1;

    this.handleEncoderInput(encoderIndex, direction, delta);
  }

  /** Parse generic report (when report type is unknown) */
  private parseGenericReport(data: Buffer): void {
    // Try to detect report type from data patterns
    // This handles devices that don't use standard report IDs

    if (data.length >= 2) {
      // Check if first byte could be a button mask
      const possibleButtonMask = data[0];

      // Parse as button bitmap if it looks like button data
      for (let i = 0; i < 8; i++) {
        const isPressed = (possibleButtonMask & (1 << i)) !== 0;
        const wasPressed = this.buttonStates.get(i) || false;

        if (isPressed !== wasPressed) {
          this.handleButtonState(i, isPressed);
        }
      }

      // Check for encoder data in remaining bytes
      if (data.length >= 4) {
        for (let i = 0; i < ENCODER_COUNT; i++) {
          const encoderByte = data[1 + i];
          if (encoderByte !== 0 && encoderByte !== 0x80) {
            // Convert signed byte to direction
            const delta = encoderByte > 127 ? encoderByte - 256 : encoderByte;
            if (delta !== 0) {
              const direction = delta > 0 ? 1 : 0; // 1 = CW, 0 = CCW
              this.handleEncoderInput(i, direction, Math.abs(delta));
            }
          }
        }
      }
    }
  }

  /** Handle button state change */
  private handleButtonState(buttonIndex: number, isPressed: boolean): void {
    const eventKey = `button_${buttonIndex}`;
    const now = Date.now();

    // Debounce check
    const lastTime = this.lastEventTimes.get(eventKey) || 0;
    if (now - lastTime < this.debounceInterval) {
      return;
    }
    this.lastEventTimes.set(eventKey, now);

    const wasPressed = this.buttonStates.get(buttonIndex) || false;
    if (isPressed === wasPressed) {
      return; // No change
    }

    this.buttonStates.set(buttonIndex, isPressed);
    const buttonType = buttonIndex < LCD_BUTTON_COUNT ? ButtonType.LCD : ButtonType.NORMAL;

    if (isPressed) {
      // Button pressed - emit press event and start long press timer
      const event: ButtonEvent = {
        type: ButtonEventType.PRESS,
        buttonIndex,
        buttonType,
        timestamp: now,
      };
      this.emit('button', event);

      // Start long press timer
      const timer = setTimeout(() => {
        if (this.buttonStates.get(buttonIndex)) {
          const longPressEvent: ButtonEvent = {
            type: ButtonEventType.LONG_PRESS,
            buttonIndex,
            buttonType,
            timestamp: Date.now(),
          };
          this.emit('button', longPressEvent);
        }
        this.buttonPressTimers.delete(buttonIndex);
      }, this.longPressThreshold);

      this.buttonPressTimers.set(buttonIndex, timer);
    } else {
      // Button released - clear long press timer and emit release event
      const timer = this.buttonPressTimers.get(buttonIndex);
      if (timer) {
        clearTimeout(timer);
        this.buttonPressTimers.delete(buttonIndex);
      }

      const event: ButtonEvent = {
        type: ButtonEventType.RELEASE,
        buttonIndex,
        buttonType,
        timestamp: now,
      };
      this.emit('button', event);
    }
  }

  /** Handle encoder input */
  private handleEncoderInput(encoderIndex: number, direction: number, delta: number): void {
    const eventKey = `encoder_${encoderIndex}`;
    const now = Date.now();

    // Debounce check (shorter for encoders)
    const lastTime = this.lastEventTimes.get(eventKey) || 0;
    if (now - lastTime < this.debounceInterval / 2) {
      return;
    }
    this.lastEventTimes.set(eventKey, now);

    let eventType: EncoderEventType;

    switch (direction) {
      case 0:
        eventType = EncoderEventType.ROTATE_CCW;
        break;
      case 1:
        eventType = EncoderEventType.ROTATE_CW;
        break;
      case 2:
        eventType = EncoderEventType.PRESS;
        break;
      case 3:
        eventType = EncoderEventType.RELEASE;
        break;
      default:
        return; // Unknown direction
    }

    const event: EncoderEvent = {
      type: eventType,
      encoderIndex,
      delta: eventType === EncoderEventType.ROTATE_CW || eventType === EncoderEventType.ROTATE_CCW ? delta : undefined,
      timestamp: now,
    };

    this.emit('encoder', event);
  }

  /** Reset all states */
  reset(): void {
    // Clear all timers
    for (const timer of this.buttonPressTimers.values()) {
      clearTimeout(timer);
    }
    this.buttonPressTimers.clear();
    this.buttonStates.clear();
    this.lastEventTimes.clear();
  }

  /** Type-safe event emitter methods */
  override on<K extends keyof DeviceEventParserEvents>(
    event: K,
    listener: DeviceEventParserEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof DeviceEventParserEvents>(
    event: K,
    ...args: Parameters<DeviceEventParserEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
