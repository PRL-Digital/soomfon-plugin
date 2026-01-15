/**
 * Keyboard Action Handler
 * Handles keyboard simulation using nut-tree-fork/nut-js
 */

import { keyboard, Key } from '@nut-tree-fork/nut-js';
import {
  ActionHandler,
  ActionExecutionResult,
  KeyboardAction,
} from '../../../shared/types/actions';

/** Modifier key type */
type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'win';

/**
 * Map of string key names to nut-js Key enum values
 * Supports lowercase key names and common aliases
 */
const KEY_MAP: Record<string, Key> = {
  // Letters
  a: Key.A,
  b: Key.B,
  c: Key.C,
  d: Key.D,
  e: Key.E,
  f: Key.F,
  g: Key.G,
  h: Key.H,
  i: Key.I,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  m: Key.M,
  n: Key.N,
  o: Key.O,
  p: Key.P,
  q: Key.Q,
  r: Key.R,
  s: Key.S,
  t: Key.T,
  u: Key.U,
  v: Key.V,
  w: Key.W,
  x: Key.X,
  y: Key.Y,
  z: Key.Z,

  // Numbers
  '0': Key.Num0,
  '1': Key.Num1,
  '2': Key.Num2,
  '3': Key.Num3,
  '4': Key.Num4,
  '5': Key.Num5,
  '6': Key.Num6,
  '7': Key.Num7,
  '8': Key.Num8,
  '9': Key.Num9,

  // Function keys
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
  f13: Key.F13,
  f14: Key.F14,
  f15: Key.F15,
  f16: Key.F16,
  f17: Key.F17,
  f18: Key.F18,
  f19: Key.F19,
  f20: Key.F20,
  f21: Key.F21,
  f22: Key.F22,
  f23: Key.F23,
  f24: Key.F24,

  // Navigation
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
  pgup: Key.PageUp,
  pgdn: Key.PageDown,

  // Editing keys
  enter: Key.Enter,
  return: Key.Return,
  tab: Key.Tab,
  space: Key.Space,
  backspace: Key.Backspace,
  delete: Key.Delete,
  del: Key.Delete,
  insert: Key.Insert,
  ins: Key.Insert,
  escape: Key.Escape,
  esc: Key.Escape,

  // Modifiers (can also be used as regular keys)
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  lctrl: Key.LeftControl,
  rctrl: Key.RightControl,
  alt: Key.LeftAlt,
  lalt: Key.LeftAlt,
  ralt: Key.RightAlt,
  shift: Key.LeftShift,
  lshift: Key.LeftShift,
  rshift: Key.RightShift,
  win: Key.LeftWin,
  windows: Key.LeftWin,
  lwin: Key.LeftWin,
  rwin: Key.RightWin,
  super: Key.LeftSuper,
  cmd: Key.LeftCmd,
  meta: Key.LeftMeta,

  // Special keys
  capslock: Key.CapsLock,
  caps: Key.CapsLock,
  numlock: Key.NumLock,
  scrolllock: Key.ScrollLock,
  pause: Key.Pause,
  print: Key.Print,
  printscreen: Key.Print,
  menu: Key.Menu,
  fn: Key.Fn,

  // Punctuation
  grave: Key.Grave,
  '`': Key.Grave,
  minus: Key.Minus,
  '-': Key.Minus,
  equal: Key.Equal,
  '=': Key.Equal,
  leftbracket: Key.LeftBracket,
  '[': Key.LeftBracket,
  rightbracket: Key.RightBracket,
  ']': Key.RightBracket,
  backslash: Key.Backslash,
  '\\': Key.Backslash,
  semicolon: Key.Semicolon,
  ';': Key.Semicolon,
  quote: Key.Quote,
  "'": Key.Quote,
  comma: Key.Comma,
  ',': Key.Comma,
  period: Key.Period,
  '.': Key.Period,
  slash: Key.Slash,
  '/': Key.Slash,

  // Numpad
  numpad0: Key.NumPad0,
  numpad1: Key.NumPad1,
  numpad2: Key.NumPad2,
  numpad3: Key.NumPad3,
  numpad4: Key.NumPad4,
  numpad5: Key.NumPad5,
  numpad6: Key.NumPad6,
  numpad7: Key.NumPad7,
  numpad8: Key.NumPad8,
  numpad9: Key.NumPad9,
  add: Key.Add,
  subtract: Key.Subtract,
  multiply: Key.Multiply,
  divide: Key.Divide,
  decimal: Key.Decimal,
  numpadenter: Key.Enter,

  // Media keys
  audiomute: Key.AudioMute,
  mute: Key.AudioMute,
  audiovoldown: Key.AudioVolDown,
  voldown: Key.AudioVolDown,
  volumedown: Key.AudioVolDown,
  audiovolup: Key.AudioVolUp,
  volup: Key.AudioVolUp,
  volumeup: Key.AudioVolUp,
  audioplay: Key.AudioPlay,
  play: Key.AudioPlay,
  audiostop: Key.AudioStop,
  stop: Key.AudioStop,
  audiopause: Key.AudioPause,
  audioprev: Key.AudioPrev,
  prev: Key.AudioPrev,
  previous: Key.AudioPrev,
  audionext: Key.AudioNext,
  next: Key.AudioNext,
};

/** Map modifier names to nut-js Key values */
const MODIFIER_KEY_MAP: Record<ModifierKey, Key> = {
  ctrl: Key.LeftControl,
  alt: Key.LeftAlt,
  shift: Key.LeftShift,
  win: Key.LeftWin,
};

/**
 * Parse a key string to a nut-js Key
 * @param keyString The key string to parse (e.g., 'a', 'enter', 'f1')
 * @returns The nut-js Key or undefined if not found
 */
function parseKey(keyString: string): Key | undefined {
  const normalized = keyString.toLowerCase().trim();
  return KEY_MAP[normalized];
}

/**
 * Parse a key combination string into modifiers and keys
 * Supports formats like 'ctrl+c', 'alt+shift+del', 'a'
 * @param keysString The key combination string
 * @returns Object with modifiers array and keys array
 */
function parseKeyCombination(keysString: string): {
  modifiers: Key[];
  keys: Key[];
} {
  const parts = keysString.toLowerCase().split('+').map(p => p.trim());
  const modifiers: Key[] = [];
  const keys: Key[] = [];

  for (const part of parts) {
    // Check if it's a modifier
    if (part === 'ctrl' || part === 'control') {
      modifiers.push(Key.LeftControl);
    } else if (part === 'alt') {
      modifiers.push(Key.LeftAlt);
    } else if (part === 'shift') {
      modifiers.push(Key.LeftShift);
    } else if (part === 'win' || part === 'windows' || part === 'super' || part === 'meta' || part === 'cmd') {
      modifiers.push(Key.LeftWin);
    } else {
      // Regular key
      const key = parseKey(part);
      if (key !== undefined) {
        keys.push(key);
      }
    }
  }

  return { modifiers, keys };
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * KeyboardHandler - Handles keyboard action execution
 *
 * Features:
 * - Maps string key names to nut-js Key enum
 * - Supports modifier combinations (Ctrl, Alt, Shift, Win)
 * - Supports single keys and key combinations (e.g., 'ctrl+c')
 * - Handles holdDuration for hold-to-press actions
 */
export class KeyboardHandler implements ActionHandler<KeyboardAction> {
  readonly actionType = 'keyboard' as const;

  /**
   * Execute a keyboard action
   * @param action The keyboard action to execute
   */
  async execute(action: KeyboardAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Parse the key combination from the keys string
      const { modifiers: parsedModifiers, keys } = parseKeyCombination(action.keys);

      // Add explicit modifiers from action config
      const allModifiers = [...parsedModifiers];
      if (action.modifiers) {
        for (const mod of action.modifiers) {
          const modKey = MODIFIER_KEY_MAP[mod];
          if (modKey && !allModifiers.includes(modKey)) {
            allModifiers.push(modKey);
          }
        }
      }

      // Validate we have at least one key to press
      if (keys.length === 0) {
        throw new Error(`No valid keys found in key string: ${action.keys}`);
      }

      // Execute the key press
      if (action.holdDuration && action.holdDuration > 0) {
        // Hold-to-press: hold modifiers, press key, wait, release
        await this.executeHoldPress(allModifiers, keys, action.holdDuration);
      } else {
        // Normal key press
        await this.executeKeyPress(allModifiers, keys);
      }

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        status: 'failure',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a normal key press with optional modifiers
   */
  private async executeKeyPress(modifiers: Key[], keys: Key[]): Promise<void> {
    if (modifiers.length > 0) {
      // Use keyboard.type with all keys combined (modifiers + keys)
      // nut-js handles the modifier holding automatically when using pressKey/releaseKey

      // Press modifiers
      for (const mod of modifiers) {
        await keyboard.pressKey(mod);
      }

      // Press and release keys
      for (const key of keys) {
        await keyboard.pressKey(key);
        await keyboard.releaseKey(key);
      }

      // Release modifiers in reverse order
      for (let i = modifiers.length - 1; i >= 0; i--) {
        await keyboard.releaseKey(modifiers[i]);
      }
    } else {
      // Simple key press without modifiers
      for (const key of keys) {
        await keyboard.pressKey(key);
        await keyboard.releaseKey(key);
      }
    }
  }

  /**
   * Execute a hold-to-press action
   * Holds the keys for a specified duration
   */
  private async executeHoldPress(
    modifiers: Key[],
    keys: Key[],
    holdDuration: number
  ): Promise<void> {
    // Press modifiers
    for (const mod of modifiers) {
      await keyboard.pressKey(mod);
    }

    // Press keys
    for (const key of keys) {
      await keyboard.pressKey(key);
    }

    // Hold for duration
    await sleep(holdDuration);

    // Release keys in reverse order
    for (let i = keys.length - 1; i >= 0; i--) {
      await keyboard.releaseKey(keys[i]);
    }

    // Release modifiers in reverse order
    for (let i = modifiers.length - 1; i >= 0; i--) {
      await keyboard.releaseKey(modifiers[i]);
    }
  }
}

/** Export helper functions for testing */
export { parseKey, parseKeyCombination, KEY_MAP, MODIFIER_KEY_MAP };
