/**
 * EventBinder Tests
 *
 * Tests for the event-action binding system that:
 * - Maps device events to configured actions
 * - Handles button press/release/longPress triggers
 * - Handles encoder CW/CCW/press/release triggers
 * - Integrates with ActionEngine for execution
 *
 * Why these tests matter:
 * The EventBinder connects hardware events to user-configured actions.
 * If bindings don't work correctly, pressing a button won't trigger the expected action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBinder, createBinding, createEventBinder } from './event-binder';
import { ActionEngine } from './action-engine';
import {
  ButtonEvent,
  ButtonEventType,
  ButtonType,
  EncoderEvent,
  EncoderEventType,
  LCD_BUTTON_COUNT,
} from '../../shared/types/device';
import { ActionBinding, KeyboardAction } from '../../shared/types/actions';

// Helper to create a mock keyboard action
const createMockAction = (id: string = 'test-action'): KeyboardAction => ({
  id,
  type: 'keyboard',
  name: 'Test Action',
  keys: 'a',
  enabled: true,
});

// Helper to create a button event
const createButtonEvent = (
  buttonIndex: number,
  type: ButtonEventType,
  buttonType: ButtonType = ButtonType.LCD
): ButtonEvent => ({
  type,
  buttonIndex,
  buttonType,
  timestamp: Date.now(),
});

// Helper to create an encoder event
const createEncoderEvent = (
  encoderIndex: number,
  type: EncoderEventType,
  delta?: number
): EncoderEvent => ({
  type,
  encoderIndex,
  delta,
  timestamp: Date.now(),
});

describe('EventBinder', () => {
  let actionEngine: ActionEngine;
  let eventBinder: EventBinder;

  beforeEach(() => {
    actionEngine = new ActionEngine();
    eventBinder = createEventBinder(actionEngine);

    // Register a mock handler that always succeeds
    actionEngine.registerHandler({
      actionType: 'keyboard',
      execute: vi.fn().mockResolvedValue({
        status: 'success',
        actionId: 'test-action',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 10,
      }),
    });
  });

  describe('Binding Management', () => {
    it('should add a binding', () => {
      const binding = createBinding('binding-1', 'lcdButton', 0, 'press', createMockAction());

      eventBinder.addBinding(binding);

      expect(eventBinder.getBinding('binding-1')).toEqual(binding);
    });

    it('should remove a binding by ID', () => {
      const binding = createBinding('binding-1', 'lcdButton', 0, 'press', createMockAction());
      eventBinder.addBinding(binding);

      const result = eventBinder.removeBinding('binding-1');

      expect(result).toBe(true);
      expect(eventBinder.getBinding('binding-1')).toBeUndefined();
    });

    it('should return false when removing non-existent binding', () => {
      const result = eventBinder.removeBinding('non-existent');
      expect(result).toBe(false);
    });

    it('should get binding for element and trigger', () => {
      const binding = createBinding('binding-1', 'lcdButton', 2, 'longPress', createMockAction());
      eventBinder.addBinding(binding);

      const found = eventBinder.getBindingForElement('lcdButton', 2, 'longPress');

      expect(found).toEqual(binding);
    });

    it('should return undefined when no binding exists for element', () => {
      const found = eventBinder.getBindingForElement('lcdButton', 5, 'press');
      expect(found).toBeUndefined();
    });

    it('should get all bindings', () => {
      const binding1 = createBinding('b1', 'lcdButton', 0, 'press', createMockAction('a1'));
      const binding2 = createBinding('b2', 'encoder', 1, 'rotateCW', createMockAction('a2'));

      eventBinder.addBinding(binding1);
      eventBinder.addBinding(binding2);

      const all = eventBinder.getAllBindings();

      expect(all).toHaveLength(2);
      expect(all).toContainEqual(binding1);
      expect(all).toContainEqual(binding2);
    });

    it('should get bindings for specific element', () => {
      const binding1 = createBinding('b1', 'lcdButton', 0, 'press', createMockAction('a1'));
      const binding2 = createBinding('b2', 'lcdButton', 0, 'longPress', createMockAction('a2'));
      const binding3 = createBinding('b3', 'lcdButton', 1, 'press', createMockAction('a3'));

      eventBinder.addBinding(binding1);
      eventBinder.addBinding(binding2);
      eventBinder.addBinding(binding3);

      const forButton0 = eventBinder.getBindingsForElement('lcdButton', 0);

      expect(forButton0).toHaveLength(2);
      expect(forButton0).toContainEqual(binding1);
      expect(forButton0).toContainEqual(binding2);
    });

    it('should clear all bindings', () => {
      eventBinder.addBinding(createBinding('b1', 'lcdButton', 0, 'press', createMockAction()));
      eventBinder.addBinding(createBinding('b2', 'encoder', 1, 'rotateCW', createMockAction()));

      eventBinder.clearBindings();

      expect(eventBinder.getAllBindings()).toHaveLength(0);
    });

    it('should load bindings from array', () => {
      const bindings: ActionBinding[] = [
        createBinding('b1', 'lcdButton', 0, 'press', createMockAction('a1')),
        createBinding('b2', 'normalButton', 0, 'press', createMockAction('a2')),
        createBinding('b3', 'encoder', 0, 'rotateCW', createMockAction('a3')),
      ];

      eventBinder.loadBindings(bindings);

      expect(eventBinder.getAllBindings()).toHaveLength(3);
    });

    it('should replace bindings when loading', () => {
      eventBinder.addBinding(createBinding('old', 'lcdButton', 5, 'press', createMockAction()));

      const newBindings: ActionBinding[] = [
        createBinding('new', 'encoder', 0, 'press', createMockAction()),
      ];

      eventBinder.loadBindings(newBindings);

      expect(eventBinder.getBinding('old')).toBeUndefined();
      expect(eventBinder.getBinding('new')).toBeDefined();
    });
  });

  describe('Button Event Handling', () => {
    it('should execute action for LCD button press', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'lcdButton', 2, 'press', action);
      eventBinder.addBinding(binding);

      const event = createButtonEvent(2, ButtonEventType.PRESS, ButtonType.LCD);

      const result = await eventBinder.handleButtonEvent(event);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('success');
    });

    it('should execute action for LCD button long press', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'lcdButton', 3, 'longPress', action);
      eventBinder.addBinding(binding);

      const event = createButtonEvent(3, ButtonEventType.LONG_PRESS, ButtonType.LCD);

      const result = await eventBinder.handleButtonEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should execute action for normal button press', async () => {
      const action = createMockAction();
      // Normal buttons are indexed after LCD buttons
      // Button index 6 in events = normal button 0
      const binding = createBinding('b1', 'normalButton', 0, 'press', action);
      eventBinder.addBinding(binding);

      const event = createButtonEvent(LCD_BUTTON_COUNT, ButtonEventType.PRESS, ButtonType.NORMAL);

      const result = await eventBinder.handleButtonEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should return null when no binding exists', async () => {
      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);

      const result = await eventBinder.handleButtonEvent(event);

      expect(result).toBeNull();
    });

    it('should emit binding:matched event', async () => {
      const listener = vi.fn();
      eventBinder.on('binding:matched', listener);

      const binding = createBinding('b1', 'lcdButton', 0, 'press', createMockAction());
      eventBinder.addBinding(binding);

      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      await eventBinder.handleButtonEvent(event);

      expect(listener).toHaveBeenCalledWith(binding, event);
    });

    it('should emit binding:executed event', async () => {
      const listener = vi.fn();
      eventBinder.on('binding:executed', listener);

      const binding = createBinding('b1', 'lcdButton', 0, 'press', createMockAction());
      eventBinder.addBinding(binding);

      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      await eventBinder.handleButtonEvent(event);

      expect(listener).toHaveBeenCalledWith(
        binding,
        expect.objectContaining({ status: 'success' })
      );
    });

    it('should emit binding:notFound when no binding exists', async () => {
      const listener = vi.fn();
      eventBinder.on('binding:notFound', listener);

      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      await eventBinder.handleButtonEvent(event);

      expect(listener).toHaveBeenCalledWith(event);
    });
  });

  describe('Encoder Event Handling', () => {
    it('should execute action for encoder clockwise rotation', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'encoder', 0, 'rotateCW', action);
      eventBinder.addBinding(binding);

      const event = createEncoderEvent(0, EncoderEventType.ROTATE_CW, 1);

      const result = await eventBinder.handleEncoderEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should execute action for encoder counter-clockwise rotation', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'encoder', 1, 'rotateCCW', action);
      eventBinder.addBinding(binding);

      const event = createEncoderEvent(1, EncoderEventType.ROTATE_CCW, 2);

      const result = await eventBinder.handleEncoderEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should execute action for encoder press', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'encoder', 2, 'press', action);
      eventBinder.addBinding(binding);

      const event = createEncoderEvent(2, EncoderEventType.PRESS);

      const result = await eventBinder.handleEncoderEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should execute action for encoder release', async () => {
      const action = createMockAction();
      const binding = createBinding('b1', 'encoder', 0, 'release', action);
      eventBinder.addBinding(binding);

      const event = createEncoderEvent(0, EncoderEventType.RELEASE);

      const result = await eventBinder.handleEncoderEvent(event);

      expect(result?.status).toBe('success');
    });
  });

  describe('Generic Event Handling', () => {
    it('should route button events correctly via handleEvent', async () => {
      const binding = createBinding('b1', 'lcdButton', 0, 'press', createMockAction());
      eventBinder.addBinding(binding);

      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);

      const result = await eventBinder.handleEvent(event);

      expect(result?.status).toBe('success');
    });

    it('should route encoder events correctly via handleEvent', async () => {
      const binding = createBinding('b1', 'encoder', 0, 'rotateCW', createMockAction());
      eventBinder.addBinding(binding);

      const event = createEncoderEvent(0, EncoderEventType.ROTATE_CW);

      const result = await eventBinder.handleEvent(event);

      expect(result?.status).toBe('success');
    });
  });

  describe('Error Handling', () => {
    it('should return failure result when action execution fails', async () => {
      // Create a new engine with a failing handler
      const failingEngine = new ActionEngine();
      const failingBinder = createEventBinder(failingEngine);

      failingEngine.registerHandler({
        actionType: 'keyboard',
        execute: vi.fn().mockRejectedValue(new Error('Execution failed')),
      });

      const executedListener = vi.fn();
      failingBinder.on('binding:executed', executedListener);

      const binding = createBinding('b1', 'lcdButton', 0, 'press', createMockAction());
      failingBinder.addBinding(binding);

      const event = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);

      // ActionEngine catches errors and returns failure results (doesn't throw)
      const result = await failingBinder.handleButtonEvent(event);

      expect(result?.status).toBe('failure');
      expect(result?.error).toBe('Execution failed');

      // binding:executed is emitted with failure result (not binding:error)
      expect(executedListener).toHaveBeenCalledWith(
        binding,
        expect.objectContaining({ status: 'failure', error: 'Execution failed' })
      );
    });
  });

  describe('Action Engine Access', () => {
    it('should provide access to the action engine', () => {
      expect(eventBinder.getActionEngine()).toBe(actionEngine);
    });
  });
});

describe('createBinding helper', () => {
  it('should create a binding with correct structure', () => {
    const action = createMockAction('test');
    const binding = createBinding('my-binding', 'encoder', 2, 'rotateCW', action);

    expect(binding).toEqual({
      id: 'my-binding',
      elementType: 'encoder',
      elementIndex: 2,
      trigger: 'rotateCW',
      action,
    });
  });
});

describe('Deferred Press Behavior', () => {
  let actionEngine: ActionEngine;
  let eventBinder: EventBinder;
  let executeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    actionEngine = new ActionEngine();
    eventBinder = createEventBinder(actionEngine);

    executeMock = vi.fn().mockResolvedValue({
      status: 'success',
      actionId: 'test-action',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 10,
    });

    actionEngine.registerHandler({
      actionType: 'keyboard',
      execute: executeMock,
    });
  });

  describe('when both press and longPress bindings exist', () => {
    beforeEach(() => {
      const pressBinding = createBinding('press-b', 'lcdButton', 0, 'press', createMockAction('press-action'));
      const longPressBinding = createBinding('longpress-b', 'lcdButton', 0, 'longPress', createMockAction('longpress-action'));
      eventBinder.addBinding(pressBinding);
      eventBinder.addBinding(longPressBinding);
    });

    it('should defer press execution when longPress binding exists', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);

      const result = await eventBinder.handleButtonEvent(pressEvent);

      // Press should be deferred, not executed immediately
      expect(result).toBeNull();
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('should execute deferred press on RELEASE (quick tap)', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      const releaseEvent = createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD);

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(releaseEvent);

      // Press action should execute on release
      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledTimes(1);
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'press-action' })
      );
    });

    it('should cancel deferred press and execute longPress on LONG_PRESS', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      const longPressEvent = createButtonEvent(0, ButtonEventType.LONG_PRESS, ButtonType.LCD);

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(longPressEvent);

      // LongPress action should execute, not press
      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledTimes(1);
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'longpress-action' })
      );
    });

    it('should not execute deferred press after LONG_PRESS on subsequent RELEASE', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      const longPressEvent = createButtonEvent(0, ButtonEventType.LONG_PRESS, ButtonType.LCD);
      const releaseEvent = createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD);

      await eventBinder.handleButtonEvent(pressEvent);
      await eventBinder.handleButtonEvent(longPressEvent);
      executeMock.mockClear();

      const result = await eventBinder.handleButtonEvent(releaseEvent);

      // Release should not trigger press action (it was cancelled by longPress)
      expect(result).toBeNull(); // No release binding configured
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  describe('when only press binding exists (no longPress)', () => {
    beforeEach(() => {
      const pressBinding = createBinding('press-b', 'lcdButton', 0, 'press', createMockAction('press-action'));
      eventBinder.addBinding(pressBinding);
    });

    it('should execute press immediately (existing behavior)', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);

      const result = await eventBinder.handleButtonEvent(pressEvent);

      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledTimes(1);
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'press-action' })
      );
    });

    it('should not re-execute press on RELEASE', async () => {
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      const releaseEvent = createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD);

      await eventBinder.handleButtonEvent(pressEvent);
      executeMock.mockClear();

      const result = await eventBinder.handleButtonEvent(releaseEvent);

      expect(result).toBeNull(); // No release binding
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  describe('shift variants', () => {
    beforeEach(() => {
      const shiftPressBinding = createBinding('shift-press', 'lcdButton', 0, 'shiftPress', createMockAction('shift-press-action'));
      const shiftLongPressBinding = createBinding('shift-longpress', 'lcdButton', 0, 'shiftLongPress', createMockAction('shift-longpress-action'));
      eventBinder.addBinding(shiftPressBinding);
      eventBinder.addBinding(shiftLongPressBinding);
    });

    it('should defer shiftPress when shiftLongPress exists', async () => {
      const pressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD),
        isShiftActive: true,
      };

      const result = await eventBinder.handleButtonEvent(pressEvent);

      expect(result).toBeNull();
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('should execute shiftPress on RELEASE (quick tap with shift)', async () => {
      const pressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD),
        isShiftActive: true,
      };
      const releaseEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD),
        isShiftActive: true,
      };

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(releaseEvent);

      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'shift-press-action' })
      );
    });

    it('should execute shiftLongPress on LONG_PRESS with shift', async () => {
      const pressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD),
        isShiftActive: true,
      };
      const longPressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.LONG_PRESS, ButtonType.LCD),
        isShiftActive: true,
      };

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(longPressEvent);

      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'shift-longpress-action' })
      );
    });
  });

  describe('shift fallback', () => {
    beforeEach(() => {
      // Only non-shift bindings
      const pressBinding = createBinding('press-b', 'lcdButton', 0, 'press', createMockAction('press-action'));
      const longPressBinding = createBinding('longpress-b', 'lcdButton', 0, 'longPress', createMockAction('longpress-action'));
      eventBinder.addBinding(pressBinding);
      eventBinder.addBinding(longPressBinding);
    });

    it('should fall back to non-shift press when shift is active but no shiftPress exists', async () => {
      const pressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD),
        isShiftActive: true,
      };
      const releaseEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD),
        isShiftActive: true,
      };

      // Should defer since longPress exists
      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(releaseEvent);

      // Should fall back to non-shift press binding
      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'press-action' })
      );
    });

    it('should fall back to non-shift longPress when shift is active but no shiftLongPress exists', async () => {
      const pressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD),
        isShiftActive: true,
      };
      const longPressEvent: ButtonEvent = {
        ...createButtonEvent(0, ButtonEventType.LONG_PRESS, ButtonType.LCD),
        isShiftActive: true,
      };

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(longPressEvent);

      // Should fall back to non-shift longPress binding
      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'longpress-action' })
      );
    });
  });

  describe('multiple buttons tracked independently', () => {
    beforeEach(() => {
      // Button 0 has press + longPress
      eventBinder.addBinding(createBinding('b0-press', 'lcdButton', 0, 'press', createMockAction('b0-press')));
      eventBinder.addBinding(createBinding('b0-longpress', 'lcdButton', 0, 'longPress', createMockAction('b0-longpress')));
      // Button 1 has press + longPress
      eventBinder.addBinding(createBinding('b1-press', 'lcdButton', 1, 'press', createMockAction('b1-press')));
      eventBinder.addBinding(createBinding('b1-longpress', 'lcdButton', 1, 'longPress', createMockAction('b1-longpress')));
    });

    it('should track pending presses for different buttons independently', async () => {
      // Press both buttons
      const press0 = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      const press1 = createButtonEvent(1, ButtonEventType.PRESS, ButtonType.LCD);

      await eventBinder.handleButtonEvent(press0);
      await eventBinder.handleButtonEvent(press1);

      // Both should be deferred
      expect(executeMock).not.toHaveBeenCalled();

      // LongPress button 0, release button 1
      const longPress0 = createButtonEvent(0, ButtonEventType.LONG_PRESS, ButtonType.LCD);
      const release1 = createButtonEvent(1, ButtonEventType.RELEASE, ButtonType.LCD);

      await eventBinder.handleButtonEvent(longPress0);
      await eventBinder.handleButtonEvent(release1);

      // Button 0 should have executed longPress
      // Button 1 should have executed press
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b0-longpress' })
      );
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b1-press' })
      );
    });
  });

  describe('clearBindings clears pending presses', () => {
    it('should clear pending presses when clearBindings is called', async () => {
      const pressBinding = createBinding('press-b', 'lcdButton', 0, 'press', createMockAction('press-action'));
      const longPressBinding = createBinding('longpress-b', 'lcdButton', 0, 'longPress', createMockAction('longpress-action'));
      eventBinder.addBinding(pressBinding);
      eventBinder.addBinding(longPressBinding);

      // Create a pending press
      const pressEvent = createButtonEvent(0, ButtonEventType.PRESS, ButtonType.LCD);
      await eventBinder.handleButtonEvent(pressEvent);

      // Clear bindings
      eventBinder.clearBindings();

      // Re-add bindings (otherwise release would have no binding to match)
      eventBinder.addBinding(pressBinding);
      eventBinder.addBinding(longPressBinding);

      // Release should NOT execute the old pending press
      const releaseEvent = createButtonEvent(0, ButtonEventType.RELEASE, ButtonType.LCD);
      executeMock.mockClear();
      const result = await eventBinder.handleButtonEvent(releaseEvent);

      expect(result).toBeNull(); // No release binding, and old pending was cleared
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  describe('normal buttons', () => {
    beforeEach(() => {
      // Normal button (index 0 in bindings = button 6 in events)
      eventBinder.addBinding(createBinding('nb0-press', 'normalButton', 0, 'press', createMockAction('nb0-press')));
      eventBinder.addBinding(createBinding('nb0-longpress', 'normalButton', 0, 'longPress', createMockAction('nb0-longpress')));
    });

    it('should work with normal button index adjustment', async () => {
      // Normal button events come with buttonIndex = LCD_BUTTON_COUNT + normalIndex
      const pressEvent = createButtonEvent(LCD_BUTTON_COUNT, ButtonEventType.PRESS, ButtonType.NORMAL);
      const releaseEvent = createButtonEvent(LCD_BUTTON_COUNT, ButtonEventType.RELEASE, ButtonType.NORMAL);

      await eventBinder.handleButtonEvent(pressEvent);
      expect(executeMock).not.toHaveBeenCalled(); // Deferred

      const result = await eventBinder.handleButtonEvent(releaseEvent);

      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'nb0-press' })
      );
    });

    it('should execute longPress for normal buttons', async () => {
      const pressEvent = createButtonEvent(LCD_BUTTON_COUNT, ButtonEventType.PRESS, ButtonType.NORMAL);
      const longPressEvent = createButtonEvent(LCD_BUTTON_COUNT, ButtonEventType.LONG_PRESS, ButtonType.NORMAL);

      await eventBinder.handleButtonEvent(pressEvent);
      const result = await eventBinder.handleButtonEvent(longPressEvent);

      expect(result?.status).toBe('success');
      expect(executeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'nb0-longpress' })
      );
    });
  });
});
