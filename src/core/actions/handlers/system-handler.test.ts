/**
 * SystemHandler Tests
 *
 * Tests for the system action handler that enables:
 * - Virtual desktop switching
 * - Show desktop, lock screen, screenshot
 * - Start menu and task view
 *
 * Why these tests matter:
 * SystemHandler allows users to trigger Windows system actions via stream deck
 * buttons. Bugs could cause incorrect shortcuts, stuck keys, or system
 * instability.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SystemHandler,
  createSystemHandler,
  SYSTEM_SHORTCUTS,
  executeShortcut,
} from './system-handler';
import { SystemAction, SystemActionType } from '../../../shared/types/actions';

// Mock nut-js keyboard module
vi.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: vi.fn().mockResolvedValue(undefined),
    releaseKey: vi.fn().mockResolvedValue(undefined),
  },
  Key: {
    LeftWin: 'LeftWin',
    LeftControl: 'LeftControl',
    LeftShift: 'LeftShift',
    Left: 'Left',
    Right: 'Right',
    D: 'D',
    L: 'L',
    S: 'S',
    Tab: 'Tab',
  },
}));

// Import after mocking
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Helper to create a mock SystemAction
const createMockSystemAction = (overrides?: Partial<SystemAction>): SystemAction => ({
  id: 'action-1',
  type: 'system',
  name: 'System Action',
  enabled: true,
  action: 'show_desktop',
  ...overrides,
});

describe('SystemHandler', () => {
  let handler: SystemHandler;

  beforeEach(() => {
    handler = new SystemHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "system"', () => {
      expect(handler.actionType).toBe('system');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createSystemHandler();
      expect(factoryHandler).toBeInstanceOf(SystemHandler);
      expect(factoryHandler.actionType).toBe('system');
    });
  });

  describe('SYSTEM_SHORTCUTS', () => {
    it('should define switch_desktop_left shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.switch_desktop_left;
      expect(shortcut.modifiers).toContain(Key.LeftWin);
      expect(shortcut.modifiers).toContain(Key.LeftControl);
      expect(shortcut.key).toBe(Key.Left);
    });

    it('should define switch_desktop_right shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.switch_desktop_right;
      expect(shortcut.modifiers).toContain(Key.LeftWin);
      expect(shortcut.modifiers).toContain(Key.LeftControl);
      expect(shortcut.key).toBe(Key.Right);
    });

    it('should define show_desktop shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.show_desktop;
      expect(shortcut.modifiers).toEqual([Key.LeftWin]);
      expect(shortcut.key).toBe(Key.D);
    });

    it('should define lock_screen shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.lock_screen;
      expect(shortcut.modifiers).toEqual([Key.LeftWin]);
      expect(shortcut.key).toBe(Key.L);
    });

    it('should define screenshot shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.screenshot;
      expect(shortcut.modifiers).toContain(Key.LeftWin);
      expect(shortcut.modifiers).toContain(Key.LeftShift);
      expect(shortcut.key).toBe(Key.S);
    });

    it('should define start_menu shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.start_menu;
      expect(shortcut.modifiers).toEqual([]);
      expect(shortcut.key).toBe(Key.LeftWin);
    });

    it('should define task_view shortcut', () => {
      const shortcut = SYSTEM_SHORTCUTS.task_view;
      expect(shortcut.modifiers).toEqual([Key.LeftWin]);
      expect(shortcut.key).toBe(Key.Tab);
    });

    it('should have all 7 system action types defined', () => {
      const actionTypes: SystemActionType[] = [
        'switch_desktop_left',
        'switch_desktop_right',
        'show_desktop',
        'lock_screen',
        'screenshot',
        'start_menu',
        'task_view',
      ];

      for (const type of actionTypes) {
        expect(SYSTEM_SHORTCUTS[type]).toBeDefined();
      }
    });
  });

  describe('executeShortcut', () => {
    it('should execute shortcut with modifiers', async () => {
      const shortcut = {
        modifiers: [Key.LeftWin, Key.LeftControl] as unknown as typeof Key[],
        key: Key.Left,
      };

      await executeShortcut(shortcut);

      // Press modifiers first
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(1, Key.LeftWin);
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(2, Key.LeftControl);
      // Press and release main key
      expect(keyboard.pressKey).toHaveBeenNthCalledWith(3, Key.Left);
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(1, Key.Left);
      // Release modifiers in reverse order
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(2, Key.LeftControl);
      expect(keyboard.releaseKey).toHaveBeenNthCalledWith(3, Key.LeftWin);
    });

    it('should execute shortcut without modifiers', async () => {
      const shortcut = {
        modifiers: [] as unknown as typeof Key[],
        key: Key.LeftWin,
      };

      await executeShortcut(shortcut);

      // Should only press and release the key
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftWin);
      expect(keyboard.releaseKey).toHaveBeenCalledTimes(1);
      expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.LeftWin);
    });
  });

  describe('execute', () => {
    it('should execute show_desktop action', async () => {
      const action = createMockSystemAction({ action: 'show_desktop' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftWin);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.D);
    });

    it('should execute lock_screen action', async () => {
      const action = createMockSystemAction({ action: 'lock_screen' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.L);
    });

    it('should execute screenshot action', async () => {
      const action = createMockSystemAction({ action: 'screenshot' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftShift);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.S);
    });

    it('should execute start_menu action', async () => {
      const action = createMockSystemAction({ action: 'start_menu' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      // Only Win key, no modifiers
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.LeftWin);
    });

    it('should execute task_view action', async () => {
      const action = createMockSystemAction({ action: 'task_view' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Tab);
    });

    it('should execute switch_desktop_left action', async () => {
      const action = createMockSystemAction({ action: 'switch_desktop_left' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Left);
    });

    it('should execute switch_desktop_right action', async () => {
      const action = createMockSystemAction({ action: 'switch_desktop_right' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Right);
    });

    it('should fail for unknown action type', async () => {
      const action = createMockSystemAction({ action: 'unknown_action' as SystemActionType });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Unknown system action: unknown_action');
    });

    it('should handle keyboard.pressKey errors', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce(new Error('Keyboard error'));
      const action = createMockSystemAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Keyboard error');
    });

    it('should handle keyboard.releaseKey errors', async () => {
      // First call succeeds, second (release) fails
      vi.mocked(keyboard.pressKey).mockResolvedValue(undefined);
      vi.mocked(keyboard.releaseKey).mockRejectedValueOnce(new Error('Release error'));
      const action = createMockSystemAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Release error');
    });

    it('should include accurate timing information', async () => {
      const action = createMockSystemAction();
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockSystemAction({ id: 'custom-action-id' });

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce('String error');
      const action = createMockSystemAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });
  });
});
