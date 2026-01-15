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
