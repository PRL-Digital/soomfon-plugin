/**
 * System Action Handler
 * Handles system operations using Windows keyboard shortcuts via nut-tree-fork/nut-js
 */

import { keyboard, Key } from '@nut-tree-fork/nut-js';
import {
  ActionHandler,
  ActionExecutionResult,
  SystemAction,
  SystemActionType,
} from '../../../shared/types/actions';

/**
 * System action shortcut configuration
 * Defines the key combinations for each system action
 */
interface SystemShortcut {
  modifiers: Key[];
  key: Key;
}

/**
 * Map of system action types to their keyboard shortcuts
 * Windows shortcuts:
 * - switch_desktop_left: Win+Ctrl+Left
 * - switch_desktop_right: Win+Ctrl+Right
 * - show_desktop: Win+D
 * - lock_screen: Win+L
 * - screenshot: Win+Shift+S
 * - start_menu: Win
 * - task_view: Win+Tab
 */
const SYSTEM_SHORTCUTS: Record<SystemActionType, SystemShortcut> = {
  switch_desktop_left: {
    modifiers: [Key.LeftWin, Key.LeftControl],
    key: Key.Left,
  },
  switch_desktop_right: {
    modifiers: [Key.LeftWin, Key.LeftControl],
    key: Key.Right,
  },
  show_desktop: {
    modifiers: [Key.LeftWin],
    key: Key.D,
  },
  lock_screen: {
    modifiers: [Key.LeftWin],
    key: Key.L,
  },
  screenshot: {
    modifiers: [Key.LeftWin, Key.LeftShift],
    key: Key.S,
  },
  start_menu: {
    modifiers: [],
    key: Key.LeftWin,
  },
  task_view: {
    modifiers: [Key.LeftWin],
    key: Key.Tab,
  },
};

/**
 * Execute a keyboard shortcut
 * @param shortcut The shortcut configuration with modifiers and key
 */
async function executeShortcut(shortcut: SystemShortcut): Promise<void> {
  const { modifiers, key } = shortcut;

  // Press all modifiers first
  for (const mod of modifiers) {
    await keyboard.pressKey(mod);
  }

  // Press and release the main key
  await keyboard.pressKey(key);
  await keyboard.releaseKey(key);

  // Release modifiers in reverse order
  for (let i = modifiers.length - 1; i >= 0; i--) {
    await keyboard.releaseKey(modifiers[i]);
  }
}

/**
 * SystemHandler - Handles system action execution
 *
 * Features:
 * - Switch desktop left/right (Win+Ctrl+Left/Right)
 * - Show desktop (Win+D)
 * - Lock screen (Win+L)
 * - Screenshot with Snipping Tool (Win+Shift+S)
 * - Start menu (Win)
 * - Task view (Win+Tab)
 */
export class SystemHandler implements ActionHandler<SystemAction> {
  readonly actionType = 'system' as const;

  /**
   * Execute a system action
   * @param action The system action to execute
   */
  async execute(action: SystemAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      const shortcut = SYSTEM_SHORTCUTS[action.action];

      if (!shortcut) {
        throw new Error(`Unknown system action: ${action.action}`);
      }

      await executeShortcut(shortcut);

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
}

/**
 * Factory function to create a SystemHandler instance
 */
export function createSystemHandler(): SystemHandler {
  return new SystemHandler();
}

/** Export constants and helpers for testing */
export { SYSTEM_SHORTCUTS, executeShortcut };
