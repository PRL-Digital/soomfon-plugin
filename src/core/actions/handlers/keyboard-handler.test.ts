/**
 * KeyboardHandler Tests
 *
 * Tests for the keyboard action handler that enables:
 * - Keyboard key presses and combinations
 * - Modifier key support (Ctrl, Alt, Shift, Win)
 * - Hold duration for key holds
 *
 * Why these tests matter:
 * KeyboardHandler allows users to trigger keyboard shortcuts via stream deck
 * buttons. Bugs here could cause incorrect key presses, stuck keys, or
 * failed automation workflows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KeyboardHandler,
  parseKey,
  parseKeyCombination,
  KEY_MAP,
  MODIFIER_KEY_MAP,
} from './keyboard-handler';
import { KeyboardAction } from '../../../shared/types/actions';

// Mock nut-js keyboard module
vi.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: vi.fn().mockResolvedValue(undefined),
    releaseKey: vi.fn().mockResolvedValue(undefined),
  },
  Key: {
    // Letters
    A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H', I: 'I',
    J: 'J', K: 'K', L: 'L', M: 'M', N: 'N', O: 'O', P: 'P', Q: 'Q', R: 'R',
    S: 'S', T: 'T', U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y', Z: 'Z',
    // Numbers
    Num0: 'Num0', Num1: 'Num1', Num2: 'Num2', Num3: 'Num3', Num4: 'Num4',
    Num5: 'Num5', Num6: 'Num6', Num7: 'Num7', Num8: 'Num8', Num9: 'Num9',
    // Function keys
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6', F7: 'F7',
    F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12', F13: 'F13',
    F14: 'F14', F15: 'F15', F16: 'F16', F17: 'F17', F18: 'F18', F19: 'F19',
    F20: 'F20', F21: 'F21', F22: 'F22', F23: 'F23', F24: 'F24',
    // Navigation
    Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
    // Editing keys
    Enter: 'Enter', Return: 'Return', Tab: 'Tab', Space: 'Space',
    Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert', Escape: 'Escape',
    // Modifiers
    LeftControl: 'LeftControl', RightControl: 'RightControl',
    LeftAlt: 'LeftAlt', RightAlt: 'RightAlt',
    LeftShift: 'LeftShift', RightShift: 'RightShift',
    LeftWin: 'LeftWin', RightWin: 'RightWin',
    LeftSuper: 'LeftSuper', LeftCmd: 'LeftCmd', LeftMeta: 'LeftMeta',
    // Special keys
    CapsLock: 'CapsLock', NumLock: 'NumLock', ScrollLock: 'ScrollLock',
    Pause: 'Pause', Print: 'Print', Menu: 'Menu', Fn: 'Fn',
    // Punctuation
    Grave: 'Grave', Minus: 'Minus', Equal: 'Equal',
    LeftBracket: 'LeftBracket', RightBracket: 'RightBracket',
    Backslash: 'Backslash', Semicolon: 'Semicolon', Quote: 'Quote',
    Comma: 'Comma', Period: 'Period', Slash: 'Slash',
    // Numpad
    NumPad0: 'NumPad0', NumPad1: 'NumPad1', NumPad2: 'NumPad2', NumPad3: 'NumPad3',
    NumPad4: 'NumPad4', NumPad5: 'NumPad5', NumPad6: 'NumPad6', NumPad7: 'NumPad7',
    NumPad8: 'NumPad8', NumPad9: 'NumPad9',
    Add: 'Add', Subtract: 'Subtract', Multiply: 'Multiply', Divide: 'Divide', Decimal: 'Decimal',
    // Media keys
    AudioMute: 'AudioMute', AudioVolDown: 'AudioVolDown', AudioVolUp: 'AudioVolUp',
    AudioPlay: 'AudioPlay', AudioStop: 'AudioStop', AudioPause: 'AudioPause',
    AudioPrev: 'AudioPrev', AudioNext: 'AudioNext',
  },
}));

// Import after mocking
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Helper to create a mock KeyboardAction
const createMockKeyboardAction = (overrides?: Partial<KeyboardAction>): KeyboardAction => ({
  id: 'action-1',
  type: 'keyboard',
  name: 'Keyboard Action',
  enabled: true,
  keys: 'a',
  ...overrides,
});

describe('KeyboardHandler', () => {
  let handler: KeyboardHandler;

  beforeEach(() => {
    handler = new KeyboardHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "keyboard"', () => {
      expect(handler.actionType).toBe('keyboard');
    });
  });

  describe('parseKey', () => {
    it('should parse lowercase letters', () => {
      expect(parseKey('a')).toBe(Key.A);
      expect(parseKey('z')).toBe(Key.Z);
    });

    it('should parse uppercase letters (case insensitive)', () => {
      expect(parseKey('A')).toBe(Key.A);
      expect(parseKey('Z')).toBe(Key.Z);
    });

    it('should parse numbers', () => {
      expect(parseKey('0')).toBe(Key.Num0);
      expect(parseKey('9')).toBe(Key.Num9);
    });

    it('should parse function keys', () => {
      expect(parseKey('f1')).toBe(Key.F1);
      expect(parseKey('F12')).toBe(Key.F12);
    });

    it('should parse navigation keys', () => {
      expect(parseKey('up')).toBe(Key.Up);
      expect(parseKey('down')).toBe(Key.Down);
      expect(parseKey('left')).toBe(Key.Left);
      expect(parseKey('right')).toBe(Key.Right);
      expect(parseKey('home')).toBe(Key.Home);
      expect(parseKey('end')).toBe(Key.End);
    });

    it('should parse editing keys', () => {
      expect(parseKey('enter')).toBe(Key.Enter);
      expect(parseKey('tab')).toBe(Key.Tab);
      expect(parseKey('space')).toBe(Key.Space);
      expect(parseKey('backspace')).toBe(Key.Backspace);
      expect(parseKey('delete')).toBe(Key.Delete);
      expect(parseKey('escape')).toBe(Key.Escape);
    });

    it('should parse key aliases', () => {
      expect(parseKey('del')).toBe(Key.Delete);
      expect(parseKey('esc')).toBe(Key.Escape);
      expect(parseKey('return')).toBe(Key.Return);
      expect(parseKey('pgup')).toBe(Key.PageUp);
      expect(parseKey('pgdn')).toBe(Key.PageDown);
    });

    it('should parse modifier keys', () => {
      expect(parseKey('ctrl')).toBe(Key.LeftControl);
      expect(parseKey('alt')).toBe(Key.LeftAlt);
      expect(parseKey('shift')).toBe(Key.LeftShift);
      expect(parseKey('win')).toBe(Key.LeftWin);
    });

    it('should parse punctuation keys', () => {
      expect(parseKey('-')).toBe(Key.Minus);
      expect(parseKey('=')).toBe(Key.Equal);
      expect(parseKey('[')).toBe(Key.LeftBracket);
      expect(parseKey(']')).toBe(Key.RightBracket);
    });

    it('should return undefined for unknown keys', () => {
      expect(parseKey('unknown')).toBeUndefined();
      expect(parseKey('xyz123')).toBeUndefined();
    });

    it('should trim whitespace from input', () => {
      expect(parseKey('  a  ')).toBe(Key.A);
      expect(parseKey('\tenter\n')).toBe(Key.Enter);
    });
  });

  describe('parseKeyCombination', () => {
    it('should parse single key', () => {
      const result = parseKeyCombination('a');
      expect(result.modifiers).toHaveLength(0);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.A);
    });

    it('should parse ctrl+key combination', () => {
      const result = parseKeyCombination('ctrl+c');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftControl);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.C);
    });

    it('should parse alt+key combination', () => {
      const result = parseKeyCombination('alt+f4');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftAlt);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.F4);
    });

    it('should parse shift+key combination', () => {
      const result = parseKeyCombination('shift+a');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftShift);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.A);
    });

    it('should parse win+key combination', () => {
      const result = parseKeyCombination('win+d');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftWin);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.D);
    });

    it('should parse multiple modifiers', () => {
      const result = parseKeyCombination('ctrl+alt+del');
      expect(result.modifiers).toHaveLength(2);
      expect(result.modifiers).toContain(Key.LeftControl);
      expect(result.modifiers).toContain(Key.LeftAlt);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.Delete);
    });

    it('should parse ctrl+shift+key combination', () => {
      const result = parseKeyCombination('ctrl+shift+s');
      expect(result.modifiers).toHaveLength(2);
      expect(result.modifiers).toContain(Key.LeftControl);
      expect(result.modifiers).toContain(Key.LeftShift);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]).toBe(Key.S);
    });

    it('should handle "control" as alias for "ctrl"', () => {
      const result = parseKeyCombination('control+v');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftControl);
      expect(result.keys[0]).toBe(Key.V);
    });

    it('should handle "windows" as alias for "win"', () => {
      const result = parseKeyCombination('windows+e');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftWin);
      expect(result.keys[0]).toBe(Key.E);
    });

    it('should handle "super" as alias for "win"', () => {
      const result = parseKeyCombination('super+l');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftWin);
    });

    it('should handle "meta" and "cmd" as aliases for "win"', () => {
      expect(parseKeyCombination('meta+a').modifiers[0]).toBe(Key.LeftWin);
      expect(parseKeyCombination('cmd+a').modifiers[0]).toBe(Key.LeftWin);
    });

    it('should ignore invalid keys in combination', () => {
      const result = parseKeyCombination('ctrl+invalidkey');
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toBe(Key.LeftControl);
      expect(result.keys).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const result = parseKeyCombination('CTRL+SHIFT+A');
      expect(result.modifiers).toHaveLength(2);
      expect(result.keys[0]).toBe(Key.A);
    });

    it('should trim whitespace around parts', () => {
      const result = parseKeyCombination('ctrl + shift + s');
      expect(result.modifiers).toHaveLength(2);
      expect(result.keys[0]).toBe(Key.S);
    });
  });

  describe('KEY_MAP', () => {
    it('should contain all letters a-z', () => {
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      for (const letter of letters) {
        expect(KEY_MAP[letter]).toBeDefined();
      }
    });

    it('should contain numbers 0-9', () => {
      for (let i = 0; i <= 9; i++) {
        expect(KEY_MAP[String(i)]).toBeDefined();
      }
    });

    it('should contain function keys f1-f12', () => {
      for (let i = 1; i <= 12; i++) {
        expect(KEY_MAP[`f${i}`]).toBeDefined();
      }
    });
  });

  describe('MODIFIER_KEY_MAP', () => {
    it('should map ctrl to LeftControl', () => {
      expect(MODIFIER_KEY_MAP.ctrl).toBe(Key.LeftControl);
    });

    it('should map alt to LeftAlt', () => {
      expect(MODIFIER_KEY_MAP.alt).toBe(Key.LeftAlt);
    });

    it('should map shift to LeftShift', () => {
      expect(MODIFIER_KEY_MAP.shift).toBe(Key.LeftShift);
    });

    it('should map win to LeftWin', () => {
      expect(MODIFIER_KEY_MAP.win).toBe(Key.LeftWin);
    });
  });

  describe('execute', () => {
    it('should successfully execute a single key press', async () => {
      const action = createMockKeyboardAction({ keys: 'a' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.A);
      expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.A);
    });

    it('should execute key combination with modifier', async () => {
      const action = createMockKeyboardAction({ keys: 'ctrl+c' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Should press modifier first
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(1, Key.LeftControl);
      // Then press and release the key
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(2, Key.C);
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(1, Key.C);
      // Then release modifier
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(2, Key.LeftControl);
    });

    it('should execute key combination with multiple modifiers', async () => {
      const action = createMockKeyboardAction({ keys: 'ctrl+alt+del' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Press order: modifiers first (ctrl, alt), then del
      expect(keyboard.pressKey).toHaveBeenCalledTimes(3);
      expect(keyboard.releaseKey).toHaveBeenCalledTimes(3);
    });

    it('should merge explicit modifiers with parsed modifiers', async () => {
      const action = createMockKeyboardAction({
        keys: 'ctrl+c',
        modifiers: ['shift'],
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Should have ctrl (from keys) and shift (from modifiers)
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftControl);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftShift);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.C);
    });

    it('should not duplicate modifiers', async () => {
      const action = createMockKeyboardAction({
        keys: 'ctrl+a',
        modifiers: ['ctrl'], // duplicate
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Should only have one ctrl press
      const ctrlPresses = vi.mocked(keyboard.pressKey).mock.calls.filter(
        (call) => call[0] === Key.LeftControl
      );
      expect(ctrlPresses).toHaveLength(1);
    });

    it('should fail when no valid keys found', async () => {
      const action = createMockKeyboardAction({ keys: 'invalidkey' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('No valid keys found in key string: invalidkey');
      expect(keyboard.pressKey).not.toHaveBeenCalled();
    });

    it('should fail when keys string only contains modifiers', async () => {
      const action = createMockKeyboardAction({ keys: 'ctrl+shift' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('No valid keys found in key string: ctrl+shift');
    });

    it('should execute with holdDuration', async () => {
      const action = createMockKeyboardAction({
        keys: 'a',
        holdDuration: 100,
      });

      const startTime = Date.now();
      const result = await handler.execute(action);
      const endTime = Date.now();

      expect(result.status).toBe('success');
      // Should have held for approximately 100ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Allow some margin
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.A);
      expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.A);
    });

    it('should execute holdDuration with modifiers', async () => {
      const action = createMockKeyboardAction({
        keys: 'ctrl+a',
        holdDuration: 50,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Press order: modifier, then key
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(1, Key.LeftControl);
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(2, Key.A);
      // Release order: key first (reverse), then modifier (reverse)
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(1, Key.A);
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(2, Key.LeftControl);
    });

    it('should skip holdDuration when value is 0', async () => {
      const action = createMockKeyboardAction({
        keys: 'a',
        holdDuration: 0,
      });

      const startTime = Date.now();
      const result = await handler.execute(action);
      const endTime = Date.now();

      expect(result.status).toBe('success');
      // Should execute quickly without delay
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle keyboard.pressKey errors', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce(new Error('Keyboard error'));
      const action = createMockKeyboardAction({ keys: 'a' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Keyboard error');
    });

    it('should handle keyboard.releaseKey errors', async () => {
      vi.mocked(keyboard.releaseKey).mockRejectedValueOnce(new Error('Release error'));
      const action = createMockKeyboardAction({ keys: 'a' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Release error');
    });

    it('should include accurate timing information', async () => {
      const action = createMockKeyboardAction();
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockKeyboardAction({ id: 'custom-action-id' });

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should handle function keys', async () => {
      const action = createMockKeyboardAction({ keys: 'f5' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.F5);
    });

    it('should handle special key combinations like alt+f4', async () => {
      const action = createMockKeyboardAction({ keys: 'alt+f4' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftAlt);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.F4);
    });

    it('should handle Windows shortcuts like win+d', async () => {
      const action = createMockKeyboardAction({ keys: 'win+d' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftWin);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.D);
    });

    it('should release modifiers in reverse order', async () => {
      const action = createMockKeyboardAction({ keys: 'ctrl+alt+a' });

      await handler.execute(action);

      // Check release order (should be reverse of press)
      const releaseCalls = vi.mocked(keyboard.releaseKey).mock.calls;
      // First release A, then Alt (last pressed modifier), then Ctrl (first pressed modifier)
      expect(releaseCalls[0][0]).toBe(Key.A);
      expect(releaseCalls[1][0]).toBe(Key.LeftAlt);
      expect(releaseCalls[2][0]).toBe(Key.LeftControl);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce('String error');
      const action = createMockKeyboardAction({ keys: 'a' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });
  });
});
