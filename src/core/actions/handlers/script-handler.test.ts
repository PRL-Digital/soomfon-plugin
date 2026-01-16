/**
 * ScriptHandler Tests
 *
 * Tests for the script action handler that enables:
 * - Executing PowerShell, CMD, and Bash scripts
 * - Running inline scripts or script files
 * - Capturing stdout/stderr output
 * - Timeout enforcement and process cancellation
 *
 * Why these tests matter:
 * ScriptHandler allows users to automate system tasks via stream deck buttons.
 * Bugs could cause script failures, hung processes, or security issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScriptHandler, getShellCommand, getFileExecutionCommand, ScriptExecutionData } from './script-handler';
import { ScriptAction } from '../../../shared/types/actions';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Create mock event emitter for child process
class MockChildProcess extends EventEmitter {
  pid = 12345;
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();

  kill = vi.fn((signal?: string) => {
    this.killed = true;
    return true;
  });
}

// Track spawned processes for assertions
const spawnedProcesses: Array<{ command: string; args: string[]; options: unknown }> = [];
let mockChildProcess: MockChildProcess;

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: vi.fn((command: string, args: string[], options: unknown) => {
    spawnedProcesses.push({ command, args, options });
    return mockChildProcess;
  }),
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Import after mocking
import { spawn } from 'child_process';
import * as fs from 'fs';

// Helper to create a mock ScriptAction
const createMockScriptAction = (overrides?: Partial<ScriptAction>): ScriptAction => ({
  id: 'action-1',
  type: 'script',
  name: 'Script Action',
  enabled: true,
  scriptType: 'bash',
  script: 'echo "Hello"',
  ...overrides,
});

describe('ScriptHandler', () => {
  let handler: ScriptHandler;

  beforeEach(() => {
    handler = new ScriptHandler();
    spawnedProcesses.length = 0;
    mockChildProcess = new MockChildProcess();
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "script"', () => {
      expect(handler.actionType).toBe('script');
    });
  });

  describe('getShellCommand', () => {
    it('should return powershell command with args for powershell type', () => {
      const result = getShellCommand('powershell');
      expect(result.command).toBe('powershell.exe');
      expect(result.args).toContain('-NoProfile');
      expect(result.args).toContain('-NonInteractive');
      expect(result.args).toContain('-ExecutionPolicy');
      expect(result.args).toContain('Bypass');
      expect(result.args).toContain('-Command');
    });

    it('should return cmd command with args for cmd type', () => {
      const result = getShellCommand('cmd');
      expect(result.command).toBe('cmd.exe');
      expect(result.args).toEqual(['/C']);
    });

    it('should return bash command with args for bash type', () => {
      const result = getShellCommand('bash');
      expect(result.command).toBe('/bin/bash');
      expect(result.args).toEqual(['-c']);
    });

    it('should throw error for unsupported script type', () => {
      expect(() => getShellCommand('unsupported' as never)).toThrow(
        'Unsupported script type: unsupported'
      );
    });
  });

  describe('getFileExecutionCommand', () => {
    it('should return powershell file execution command', () => {
      const result = getFileExecutionCommand('powershell', '/path/to/script.ps1');
      expect(result.command).toBe('powershell.exe');
      expect(result.args).toContain('-File');
      expect(result.args).toContain('/path/to/script.ps1');
    });

    it('should return cmd file execution command', () => {
      const result = getFileExecutionCommand('cmd', '/path/to/script.bat');
      expect(result.command).toBe('cmd.exe');
      expect(result.args).toEqual(['/C', '/path/to/script.bat']);
    });

    it('should return bash file execution command', () => {
      const result = getFileExecutionCommand('bash', '/path/to/script.sh');
      expect(result.command).toBe('/bin/bash');
      expect(result.args).toEqual(['/path/to/script.sh']);
    });

    it('should throw error for unsupported script type', () => {
      expect(() => getFileExecutionCommand('unsupported' as never, '/path')).toThrow(
        'Unsupported script type: unsupported'
      );
    });
  });

  describe('execute', () => {
    it('should successfully execute inline bash script', async () => {
      const action = createMockScriptAction({
        scriptType: 'bash',
        script: 'echo "test"',
      });

      // Simulate successful process completion
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('test output'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect((result.data as ScriptExecutionData).stdout).toBe('test output');
      expect((result.data as ScriptExecutionData).exitCode).toBe(0);
    });

    it('should execute inline powershell script', async () => {
      const action = createMockScriptAction({
        scriptType: 'powershell',
        script: 'Write-Host "Hello"',
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(spawnedProcesses[0].command).toBe('powershell.exe');
      expect(spawnedProcesses[0].args).toContain('-Command');
      expect(spawnedProcesses[0].args).toContain('Write-Host "Hello"');
    });

    it('should execute inline cmd script', async () => {
      const action = createMockScriptAction({
        scriptType: 'cmd',
        script: 'echo Hello',
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(spawnedProcesses[0].command).toBe('cmd.exe');
      expect(spawnedProcesses[0].args).toContain('/C');
    });

    it('should execute script from file', async () => {
      const action = createMockScriptAction({
        scriptType: 'bash',
        script: undefined,
        scriptPath: '/path/to/script.sh',
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should fail when neither script nor scriptPath provided', async () => {
      const action = createMockScriptAction({
        script: undefined,
        scriptPath: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Either script or scriptPath must be provided');
    });

    it('should fail when both script and scriptPath provided', async () => {
      const action = createMockScriptAction({
        script: 'echo test',
        scriptPath: '/path/to/script.sh',
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Cannot specify both script and scriptPath');
    });

    it('should fail when script file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const action = createMockScriptAction({
        script: undefined,
        scriptPath: '/nonexistent/script.sh',
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toContain('Script file not found');
    });

    it('should return failure when script exits with non-zero code', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        mockChildProcess.stderr.emit('data', Buffer.from('error message'));
        mockChildProcess.emit('close', 1);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Script exited with code 1');
      expect((result.data as ScriptExecutionData).exitCode).toBe(1);
      expect((result.data as ScriptExecutionData).stderr).toBe('error message');
    });

    it('should capture stdout and stderr', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('stdout content'));
        mockChildProcess.stderr.emit('data', Buffer.from('stderr content'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect((result.data as ScriptExecutionData).stdout).toBe('stdout content');
      expect((result.data as ScriptExecutionData).stderr).toBe('stderr content');
    });

    it('should handle process spawn errors', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Command not found'));
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Failed to execute script: Command not found');
    });

    it('should timeout and kill long-running scripts', async () => {
      const action = createMockScriptAction({
        timeout: 50,
      });

      // Don't emit close - simulate hanging script
      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Script execution timed out after 50ms');
    });

    it('should use default timeout when not specified', async () => {
      const action = createMockScriptAction({
        timeout: undefined,
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      // Script completes before default 30s timeout
      expect(result.status).toBe('success');
    });

    it('should include accurate timing information', async () => {
      const action = createMockScriptAction();
      const beforeExec = Date.now();

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockScriptAction({ id: 'custom-action-id' });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should trim stdout and stderr', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('  output with spaces  \n'));
        mockChildProcess.stderr.emit('data', Buffer.from('\n  error with spaces  \n'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect((result.data as ScriptExecutionData).stdout).toBe('output with spaces');
      expect((result.data as ScriptExecutionData).stderr).toBe('error with spaces');
    });

    it('should handle multiple stdout chunks', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('chunk1'));
        mockChildProcess.stdout.emit('data', Buffer.from('chunk2'));
        mockChildProcess.stdout.emit('data', Buffer.from('chunk3'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await handler.execute(action);

      expect((result.data as ScriptExecutionData).stdout).toBe('chunk1chunk2chunk3');
    });

    it('should handle non-Error exceptions', async () => {
      const action = createMockScriptAction();

      setTimeout(() => {
        // When a non-Error object is passed to 'error' event,
        // the handler tries to access .message which is undefined
        mockChildProcess.emit('error', { message: 'Custom error object' });
      }, 10);

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Failed to execute script: Custom error object');
    });
  });

  describe('cancel', () => {
    it('should cancel running script', async () => {
      const action = createMockScriptAction({
        timeout: 5000,
      });

      // Start execution but don't complete it
      const executePromise = handler.execute(action);

      // Wait a tick for the process to be assigned
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Record spawn count before cancel (for Windows taskkill detection)
      const spawnCountBefore = spawnedProcesses.length;

      // Mock process.kill for Unix platforms
      const originalProcessKill = process.kill;
      const processKillMock = vi.fn();
      (process as { kill: typeof process.kill }).kill = processKillMock;

      try {
        // Cancel the script
        await handler.cancel();

        // Verify cancellation happened via one of these methods:
        // - On Windows: taskkill spawned (additional spawn call)
        // - On Unix: process.kill called with negative PID
        // - Fallback: child.kill called
        const wasKillAttempted =
          spawnedProcesses.length > spawnCountBefore || // taskkill on Windows
          processKillMock.mock.calls.length > 0 || // process.kill on Unix
          mockChildProcess.kill.mock.calls.length > 0; // fallback

        expect(wasKillAttempted).toBe(true);
      } finally {
        // Restore process.kill
        (process as { kill: typeof process.kill }).kill = originalProcessKill;
      }
    });

    it('should do nothing when no script is running', async () => {
      // Should not throw
      await handler.cancel();
    });

    it('should do nothing when script already killed', async () => {
      const action = createMockScriptAction({
        timeout: 5000,
      });

      // Start execution
      const executePromise = handler.execute(action);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Manually set killed flag
      mockChildProcess.killed = true;

      // Should not throw or call kill again
      await handler.cancel();
    });
  });
});
