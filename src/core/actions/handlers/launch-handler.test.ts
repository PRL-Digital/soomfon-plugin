/**
 * LaunchHandler Tests
 *
 * Tests for the launch action handler that enables:
 * - Launching executables with arguments
 * - Opening files with default applications
 * - Working directory specification
 *
 * Why these tests matter:
 * LaunchHandler allows users to start applications via stream deck buttons.
 * Bugs could cause application launch failures or security issues from
 * path injection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LaunchHandler, escapeWindowsPath, getOpenCommand } from './launch-handler';
import { LaunchAction } from '../../../shared/types/actions';
import { EventEmitter } from 'events';

// Store original platform
const originalPlatform = process.platform;

// Mock child process
class MockChildProcess extends EventEmitter {
  pid = 12345;
  unref = vi.fn();
}

let mockChildProcess: MockChildProcess;
const spawnedProcesses: Array<{ command: string; args: string[]; options: unknown }> = [];

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: vi.fn((command: string, args: string[], options: unknown) => {
    spawnedProcesses.push({ command, args, options });
    return mockChildProcess;
  }),
}));

// Import after mocking
import { spawn } from 'child_process';

// Helper to create a mock LaunchAction
const createMockLaunchAction = (overrides?: Partial<LaunchAction>): LaunchAction => ({
  id: 'action-1',
  type: 'launch',
  name: 'Launch Action',
  enabled: true,
  path: '/usr/bin/app',
  ...overrides,
});

// Helper to set platform for testing
function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

describe('LaunchHandler', () => {
  let handler: LaunchHandler;

  beforeEach(() => {
    handler = new LaunchHandler();
    spawnedProcesses.length = 0;
    mockChildProcess = new MockChildProcess();
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset platform to original
    setPlatform(originalPlatform);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    setPlatform(originalPlatform);
  });

  describe('constructor and actionType', () => {
    it('should have actionType "launch"', () => {
      expect(handler.actionType).toBe('launch');
    });
  });

  describe('escapeWindowsPath', () => {
    it('should return path unchanged on non-Windows', () => {
      setPlatform('linux');
      // Need to re-import due to module caching
      // For now test with the current platform behavior
      const result = escapeWindowsPath('/path with spaces/file');
      // On non-Windows, should not modify
      if (process.platform !== 'win32') {
        expect(result).toBe('/path with spaces/file');
      }
    });

    it('should not modify paths without spaces', () => {
      const result = escapeWindowsPath('/path/to/file');
      expect(result).toBe('/path/to/file');
    });

    it('should not double-quote already quoted paths', () => {
      const result = escapeWindowsPath('"/path/to/file"');
      expect(result).toBe('"/path/to/file"');
    });
  });

  describe('getOpenCommand', () => {
    it('should return correct command for current platform', () => {
      const result = getOpenCommand();
      // This tests the actual platform
      const expected = {
        win32: 'start',
        darwin: 'open',
      }[process.platform as string] ?? 'xdg-open';
      expect(result).toBe(expected);
    });
  });

  describe('execute', () => {
    it('should successfully launch executable', async () => {
      const action = createMockLaunchAction({ path: '/usr/bin/myapp' });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      const result = await executePromise;

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(spawn).toHaveBeenCalled();
      expect(mockChildProcess.unref).toHaveBeenCalled();
    });

    it('should launch with arguments', async () => {
      const action = createMockLaunchAction({
        path: '/usr/bin/myapp',
        args: ['--flag', 'value'],
      });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].args).toEqual(['--flag', 'value']);
    });

    it('should launch with empty args array', async () => {
      const action = createMockLaunchAction({
        path: '/usr/bin/myapp',
        args: [],
      });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].args).toEqual([]);
    });

    it('should set working directory when specified', async () => {
      const action = createMockLaunchAction({
        path: '/usr/bin/myapp',
        workingDirectory: '/home/user',
      });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].options).toMatchObject({
        cwd: '/home/user',
      });
    });

    it('should use shell mode when useShell is true', async () => {
      const action = createMockLaunchAction({
        path: '/path/to/document.pdf',
        useShell: true,
      });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].options).toMatchObject({
        shell: true,
      });
    });

    it('should use detached mode and stdio ignore', async () => {
      const action = createMockLaunchAction();

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].options).toMatchObject({
        detached: true,
        stdio: 'ignore',
      });
    });

    it('should handle spawn errors', async () => {
      const action = createMockLaunchAction({ path: '/nonexistent/app' });

      const executePromise = handler.execute(action);

      // Emit error before the timeout
      mockChildProcess.emit('error', new Error('ENOENT: no such file or directory'));

      const result = await executePromise;

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Failed to launch: ENOENT: no such file or directory');
    });

    it('should include accurate timing information', async () => {
      const action = createMockLaunchAction();
      const beforeExec = Date.now();

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      const result = await executePromise;

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockLaunchAction({ id: 'custom-action-id' });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      const result = await executePromise;

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should call unref on child process', async () => {
      const action = createMockLaunchAction();

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(mockChildProcess.unref).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      const action = createMockLaunchAction();

      const executePromise = handler.execute(action);
      mockChildProcess.emit('error', 'String error');
      const result = await executePromise;

      // The handler wraps it in an Error, but the message extraction handles strings
      expect(result.status).toBe('failure');
    });

    it('should launch without args when none provided', async () => {
      const action = createMockLaunchAction({
        path: '/usr/bin/myapp',
        args: undefined,
      });

      const executePromise = handler.execute(action);
      vi.advanceTimersByTime(100);
      await executePromise;

      expect(spawnedProcesses[0].args).toEqual([]);
    });

    describe('platform-specific behavior', () => {
      it('should use xdg-open on Linux with useShell', async () => {
        setPlatform('linux');
        // Re-create handler to pick up platform change
        // Note: The handler captures isWindows at module load, so this tests
        // the getOpenCommand logic paths
        const action = createMockLaunchAction({
          path: '/path/to/file.pdf',
          useShell: true,
        });

        const executePromise = handler.execute(action);
        vi.advanceTimersByTime(100);
        await executePromise;

        // On Linux (current platform), should use xdg-open
        if (process.platform === 'linux') {
          expect(spawnedProcesses[0].command).toBe('xdg-open');
        }
      });
    });
  });
});
