/**
 * TextHandler Tests
 *
 * Tests for the text typing action handler that enables:
 * - Typing text strings via button press
 * - Configurable delay between characters
 * - Text macro functionality
 *
 * Why these tests matter:
 * TextHandler allows users to type predefined text macros (signatures,
 * commands, snippets) with a button press. Bugs here could cause
 * incorrect text or failed typing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextHandler, createTextHandler } from './text-handler';
import { TextAction } from '../../../shared/types/actions';

// Mock nut-js keyboard module
vi.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    type: vi.fn().mockResolvedValue(undefined),
    pressKey: vi.fn().mockResolvedValue(undefined),
    releaseKey: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocking
import { keyboard } from '@nut-tree-fork/nut-js';

// Helper to create a mock TextAction
const createMockTextAction = (overrides?: Partial<TextAction>): TextAction => ({
  id: 'action-1',
  type: 'text',
  name: 'Type Text',
  enabled: true,
  text: 'Hello World',
  ...overrides,
});

describe('TextHandler', () => {
  let handler: TextHandler;

  beforeEach(() => {
    handler = new TextHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "text"', () => {
      expect(handler.actionType).toBe('text');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createTextHandler();
      expect(factoryHandler).toBeInstanceOf(TextHandler);
      expect(factoryHandler.actionType).toBe('text');
    });
  });

  describe('execute', () => {
    it('should successfully type text', async () => {
      const action = createMockTextAction({ text: 'Hello World' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(keyboard.type).toHaveBeenCalledWith('Hello World');
      expect(result.data).toEqual({ textLength: 11 });
    });

    it('should type each character with delay when typeDelay is set', async () => {
      const action = createMockTextAction({
        text: 'abc',
        typeDelay: 10,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Should have called type 3 times (once per character)
      expect(keyboard.type).toHaveBeenCalledTimes(3);
      expect(keyboard.type).toHaveBeenNthCalledWith(1, 'a');
      expect(keyboard.type).toHaveBeenNthCalledWith(2, 'b');
      expect(keyboard.type).toHaveBeenNthCalledWith(3, 'c');
    });

    it('should type all at once when typeDelay is 0 or undefined', async () => {
      const action = createMockTextAction({
        text: 'Hello',
        typeDelay: 0,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.type).toHaveBeenCalledTimes(1);
      expect(keyboard.type).toHaveBeenCalledWith('Hello');
    });

    it('should fail when action is disabled', async () => {
      const action = createMockTextAction({ enabled: false });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Action is disabled');
      expect(keyboard.type).not.toHaveBeenCalled();
    });

    it('should fail when text is empty', async () => {
      const action = createMockTextAction({ text: '' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('No text to type');
      expect(keyboard.type).not.toHaveBeenCalled();
    });

    it('should handle special characters', async () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const action = createMockTextAction({ text: specialText });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.type).toHaveBeenCalledWith(specialText);
    });

    it('should handle unicode characters', async () => {
      const unicodeText = 'Hello 世界 🌍';
      const action = createMockTextAction({ text: unicodeText });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.type).toHaveBeenCalledWith(unicodeText);
    });

    it('should handle multiline text', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const action = createMockTextAction({ text: multilineText });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.type).toHaveBeenCalledWith(multilineText);
    });

    it('should handle keyboard.type errors', async () => {
      vi.mocked(keyboard.type).mockRejectedValueOnce(new Error('Keyboard error'));
      const action = createMockTextAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Keyboard error');
    });

    it('should include accurate timing information', async () => {
      const action = createMockTextAction();
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockTextAction({ id: 'custom-action-id' });

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should type long text efficiently', async () => {
      const longText = 'a'.repeat(1000);
      const action = createMockTextAction({ text: longText });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.type).toHaveBeenCalledWith(longText);
      expect(result.data).toEqual({ textLength: 1000 });
    });
  });
});
