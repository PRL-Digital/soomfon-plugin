/**
 * DeviceEventParser Tests
 *
 * Tests for parsing raw HID input reports into structured events:
 * - Button press/release/longPress detection
 * - Encoder rotation and press detection
 * - Debouncing to filter noise
 * - Long press timing
 *
 * Why these tests matter:
 * The parser converts raw USB HID data into meaningful events. Incorrect
 * parsing would cause button presses to be missed or misinterpreted.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeviceEventParser } from './device-events';
import {
  ReportType,
  ButtonEventType,
  ButtonType,
  EncoderEventType,
} from '../../shared/types/device';

describe('DeviceEventParser', () => {
  let parser: DeviceEventParser;

  beforeEach(() => {
    parser = new DeviceEventParser();
    vi.useFakeTimers();
  });

  afterEach(() => {
    parser.reset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Button Event Parsing', () => {
    it('should emit button press event', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Format: [ReportType.BUTTON, buttonIndex, isPressed]
      const data = Buffer.from([ReportType.BUTTON, 0, 1]);
      parser.parseData(data);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ButtonEventType.PRESS,
          buttonIndex: 0,
          buttonType: ButtonType.LCD,
        })
      );
    });

    it('should emit button release event', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // First press the button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));
      listener.mockClear();

      // Advance time past debounce
      vi.advanceTimersByTime(100);

      // Then release it
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 0]));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ButtonEventType.RELEASE,
          buttonIndex: 0,
        })
      );
    });

    it('should emit long press event after threshold', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Press button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Initial press event
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: ButtonEventType.PRESS })
      );
      listener.mockClear();

      // Advance time past long press threshold (default 500ms)
      vi.advanceTimersByTime(600);

      // Should have emitted long press
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ButtonEventType.LONG_PRESS,
          buttonIndex: 0,
        })
      );
    });

    it('should not emit long press if released before threshold', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Press button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Wait half the threshold
      vi.advanceTimersByTime(200);

      // Release button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 0]));

      // Check no long press was emitted
      const calls = listener.mock.calls;
      const longPressCalls = calls.filter(
        (call) => call[0].type === ButtonEventType.LONG_PRESS
      );
      expect(longPressCalls).toHaveLength(0);
    });

    it('should identify LCD buttons correctly (index 0-5)', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Test LCD button (index < 6)
      parser.parseData(Buffer.from([ReportType.BUTTON, 5, 1]));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonIndex: 5,
          buttonType: ButtonType.LCD,
        })
      );
    });

    it('should identify normal buttons correctly (index >= 6)', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Test normal button (index >= 6)
      parser.parseData(Buffer.from([ReportType.BUTTON, 6, 1]));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonIndex: 6,
          buttonType: ButtonType.NORMAL,
        })
      );
    });

    it('should debounce rapid button events', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Rapid button presses within debounce window
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Should only emit once due to debouncing
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Encoder Event Parsing', () => {
    it('should emit clockwise rotation event', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      // Format: [ReportType.ENCODER, encoderIndex, direction, delta]
      // direction: 0 = CCW, 1 = CW, 2 = press, 3 = release
      const data = Buffer.from([ReportType.ENCODER, 0, 1, 1]);
      parser.parseData(data);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EncoderEventType.ROTATE_CW,
          encoderIndex: 0,
          delta: 1,
        })
      );
    });

    it('should emit counter-clockwise rotation event', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      const data = Buffer.from([ReportType.ENCODER, 1, 0, 2]);
      parser.parseData(data);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EncoderEventType.ROTATE_CCW,
          encoderIndex: 1,
          delta: 2,
        })
      );
    });

    it('should emit encoder press event', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      const data = Buffer.from([ReportType.ENCODER, 0, 2, 0]);
      parser.parseData(data);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EncoderEventType.PRESS,
          encoderIndex: 0,
        })
      );
    });

    it('should emit encoder release event', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      const data = Buffer.from([ReportType.ENCODER, 0, 3, 0]);
      parser.parseData(data);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EncoderEventType.RELEASE,
          encoderIndex: 0,
        })
      );
    });

    it('should handle all three encoders', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      // Test all three encoder indices with debounce time between
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(100);
        parser.parseData(Buffer.from([ReportType.ENCODER, i, 1, 1]));
      }

      expect(listener).toHaveBeenCalledTimes(3);

      const indices = listener.mock.calls.map((call) => call[0].encoderIndex);
      expect(indices).toEqual([0, 1, 2]);
    });
  });

  describe('Configuration', () => {
    it('should allow configuring long press threshold', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Set custom threshold
      parser.setLongPressThreshold(1000);

      // Press button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));
      listener.mockClear();

      // Default threshold (500ms) passes - should NOT trigger
      vi.advanceTimersByTime(600);
      expect(listener).not.toHaveBeenCalled();

      // Custom threshold (1000ms) passes - should trigger
      vi.advanceTimersByTime(500);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: ButtonEventType.LONG_PRESS })
      );
    });

    it('should allow configuring debounce interval', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Set short debounce
      parser.setDebounceInterval(10);

      // First press
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Quick release after 15ms (past debounce)
      vi.advanceTimersByTime(15);
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 0]));

      // Should get both press and release
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Management', () => {
    it('should reset all states', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Press a button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Reset
      parser.reset();

      // Press again - should work since state was reset
      vi.advanceTimersByTime(100);
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should cancel long press timer on reset', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Press button (starts long press timer)
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));
      listener.mockClear();

      // Reset (should cancel timer)
      parser.reset();

      // Advance past long press threshold
      vi.advanceTimersByTime(600);

      // Should NOT have emitted long press
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const listener = vi.fn();
      parser.on('button', listener);
      parser.on('encoder', listener);

      // Empty buffer
      parser.parseData(Buffer.from([]));

      // Single byte
      parser.parseData(Buffer.from([0x01]));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should ignore duplicate state changes', () => {
      const listener = vi.fn();
      parser.on('button', listener);

      // Press button
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Advance past debounce
      vi.advanceTimersByTime(100);

      // Press same button again (no state change)
      parser.parseData(Buffer.from([ReportType.BUTTON, 0, 1]));

      // Should only have one press event
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown encoder direction', () => {
      const listener = vi.fn();
      parser.on('encoder', listener);

      // Unknown direction (4)
      parser.parseData(Buffer.from([ReportType.ENCODER, 0, 4, 1]));

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
