/**
 * ActionEngine Tests
 *
 * Tests for the core action execution engine that handles:
 * - Handler registration and lookup
 * - Action execution with timeout
 * - Cancellation support
 * - Execution history tracking
 * - Event emissions
 *
 * Why these tests matter:
 * The ActionEngine is the central hub for executing user-configured actions.
 * Bugs here would cause buttons/encoders to not work, making the device useless.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionEngine, ExecutionHistoryEntry } from './action-engine';
import {
  Action,
  ActionHandler,
  ActionExecutionResult,
  KeyboardAction,
} from '../../shared/types/actions';

// Mock action for testing
const createMockKeyboardAction = (overrides?: Partial<KeyboardAction>): KeyboardAction => ({
  id: 'test-action-1',
  type: 'keyboard',
  name: 'Test Keyboard Action',
  keys: 'a',
  enabled: true,
  ...overrides,
});

// Mock handler that succeeds
const createSuccessHandler = (): ActionHandler<KeyboardAction> => ({
  actionType: 'keyboard',
  execute: vi.fn().mockImplementation((action: KeyboardAction) =>
    Promise.resolve({
      status: 'success',
      actionId: action.id,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 10,
    })
  ),
});

// Mock handler that fails
const createFailureHandler = (error: string = 'Test error'): ActionHandler<KeyboardAction> => ({
  actionType: 'keyboard',
  execute: vi.fn().mockRejectedValue(new Error(error)),
});

// Mock handler that takes time (for timeout/cancellation tests)
const createSlowHandler = (delay: number): ActionHandler<KeyboardAction> => ({
  actionType: 'keyboard',
  execute: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 'success',
              actionId: 'test-action-1',
              startTime: Date.now() - delay,
              endTime: Date.now(),
              duration: delay,
            }),
          delay
        )
      )
  ),
  cancel: vi.fn(),
});

describe('ActionEngine', () => {
  let engine: ActionEngine;

  beforeEach(() => {
    engine = new ActionEngine();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Handler Registration', () => {
    it('should register a handler successfully', () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      expect(engine.hasHandler('keyboard')).toBe(true);
      expect(engine.getRegisteredTypes()).toContain('keyboard');
    });

    it('should throw when registering duplicate handler', () => {
      const handler1 = createSuccessHandler();
      const handler2 = createSuccessHandler();

      engine.registerHandler(handler1);

      expect(() => engine.registerHandler(handler2)).toThrow(
        'Handler already registered for action type: keyboard'
      );
    });

    it('should emit handler:registered event', () => {
      const handler = createSuccessHandler();
      const listener = vi.fn();

      engine.on('handler:registered', listener);
      engine.registerHandler(handler);

      expect(listener).toHaveBeenCalledWith('keyboard');
    });

    it('should unregister a handler successfully', () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const result = engine.unregisterHandler('keyboard');

      expect(result).toBe(true);
      expect(engine.hasHandler('keyboard')).toBe(false);
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = engine.unregisterHandler('keyboard');
      expect(result).toBe(false);
    });

    it('should emit handler:unregistered event', () => {
      const handler = createSuccessHandler();
      const listener = vi.fn();

      engine.registerHandler(handler);
      engine.on('handler:unregistered', listener);
      engine.unregisterHandler('keyboard');

      expect(listener).toHaveBeenCalledWith('keyboard');
    });
  });

  describe('Action Execution', () => {
    it('should execute action and return success result', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const action = createMockKeyboardAction();

      // Use real timers for this async test
      vi.useRealTimers();
      const result = await engine.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe(action.id);
      expect(handler.execute).toHaveBeenCalledWith(action);
    });

    it('should return failure when no handler registered', async () => {
      const action = createMockKeyboardAction();

      vi.useRealTimers();
      const result = await engine.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('No handler registered');
    });

    it('should return cancelled when action is disabled', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const action = createMockKeyboardAction({ enabled: false });

      vi.useRealTimers();
      const result = await engine.execute(action);

      expect(result.status).toBe('cancelled');
      expect(result.error).toBe('Action is disabled');
      expect(handler.execute).not.toHaveBeenCalled();
    });

    it('should return failure when handler throws error', async () => {
      const handler = createFailureHandler('Keyboard simulation failed');
      engine.registerHandler(handler);

      const action = createMockKeyboardAction();

      vi.useRealTimers();
      const result = await engine.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Keyboard simulation failed');
    });

    it('should emit execution:start event', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const listener = vi.fn();
      engine.on('execution:start', listener);

      const action = createMockKeyboardAction();

      vi.useRealTimers();
      await engine.execute(action);

      expect(listener).toHaveBeenCalledWith(action);
    });

    it('should emit execution:complete event on success', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const listener = vi.fn();
      engine.on('execution:complete', listener);

      const action = createMockKeyboardAction();

      vi.useRealTimers();
      await engine.execute(action);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          status: 'success',
        })
      );
    });

    it('should emit execution:error event on failure', async () => {
      const handler = createFailureHandler('Test error');
      engine.registerHandler(handler);

      const listener = vi.fn();
      engine.on('execution:error', listener);

      const action = createMockKeyboardAction();

      vi.useRealTimers();
      await engine.execute(action);

      expect(listener).toHaveBeenCalledWith(action, expect.any(Error));
    });
  });

  describe('Execution State', () => {
    it('should track executing state correctly', async () => {
      const handler = createSlowHandler(100);
      engine.registerHandler(handler);

      const action = createMockKeyboardAction();

      vi.useRealTimers();

      expect(engine.isExecuting()).toBe(false);
      expect(engine.getCurrentAction()).toBe(null);

      const executePromise = engine.execute(action);

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(engine.isExecuting()).toBe(true);
      expect(engine.getCurrentAction()).toEqual(action);

      await executePromise;

      expect(engine.isExecuting()).toBe(false);
      expect(engine.getCurrentAction()).toBe(null);
    });
  });

  describe('Execution History', () => {
    it('should track execution history', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      const action = createMockKeyboardAction();

      vi.useRealTimers();
      await engine.execute(action);

      const history = engine.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].actionId).toBe(action.id);
      expect(history[0].action).toEqual(action);
    });

    it('should limit history size', async () => {
      const engine = new ActionEngine({ maxHistorySize: 3, defaultTimeout: 30000 });
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      vi.useRealTimers();

      // Execute 5 actions
      for (let i = 0; i < 5; i++) {
        const action = createMockKeyboardAction({ id: `action-${i}` });
        await engine.execute(action);
      }

      const history = engine.getHistory();

      expect(history).toHaveLength(3);
      // Should keep the 3 most recent
      expect(history[0].actionId).toBe('action-2');
      expect(history[1].actionId).toBe('action-3');
      expect(history[2].actionId).toBe('action-4');
    });

    it('should filter history by action ID', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      vi.useRealTimers();

      const action1 = createMockKeyboardAction({ id: 'action-1' });
      const action2 = createMockKeyboardAction({ id: 'action-2' });

      await engine.execute(action1);
      await engine.execute(action2);
      await engine.execute(action1);

      const filteredHistory = engine.getHistoryByActionId('action-1');

      expect(filteredHistory).toHaveLength(2);
      expect(filteredHistory.every((e) => e.actionId === 'action-1')).toBe(true);
    });

    it('should clear history', async () => {
      const handler = createSuccessHandler();
      engine.registerHandler(handler);

      vi.useRealTimers();
      await engine.execute(createMockKeyboardAction());

      engine.clearHistory();

      expect(engine.getHistory()).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should track execution statistics', async () => {
      const successHandler: ActionHandler<KeyboardAction> = {
        actionType: 'keyboard',
        execute: vi.fn().mockImplementation((action) =>
          Promise.resolve({
            status: action.id.startsWith('success') ? 'success' : 'failure',
            actionId: action.id,
            startTime: 0,
            endTime: 100,
            duration: 100,
          })
        ),
      };

      engine.registerHandler(successHandler);

      vi.useRealTimers();

      // Execute mix of actions
      await engine.execute(createMockKeyboardAction({ id: 'success-1' }));
      await engine.execute(createMockKeyboardAction({ id: 'success-2' }));
      await engine.execute(createMockKeyboardAction({ id: 'failure-1' }));

      const stats = engine.getStats();

      // Note: disabled actions return early without adding to history
      expect(stats.total).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.failure).toBe(1);
      expect(stats.cancelled).toBe(0);
    });

    it('should return zero stats when no history', () => {
      const stats = engine.getStats();

      expect(stats).toEqual({
        total: 0,
        success: 0,
        failure: 0,
        cancelled: 0,
        averageDuration: 0,
      });
    });
  });
});
