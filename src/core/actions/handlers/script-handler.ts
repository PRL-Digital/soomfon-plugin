/**
 * Script Action Handler
 * Handles executing PowerShell, CMD, and Bash scripts with timeout and output capture
 */

import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  ActionHandler,
  ActionExecutionResult,
  ScriptAction,
  ScriptType,
} from '../../../shared/types/actions';

/** Default timeout for script execution (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Result data from script execution */
export interface ScriptExecutionData {
  /** Standard output from the script */
  stdout: string;
  /** Standard error from the script */
  stderr: string;
  /** Exit code from the script */
  exitCode: number | null;
}

/**
 * Get the shell command and arguments for a script type
 */
function getShellCommand(scriptType: ScriptType): { command: string; args: string[] } {
  switch (scriptType) {
    case 'powershell':
      return {
        command: 'powershell.exe',
        args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command'],
      };
    case 'cmd':
      return {
        command: 'cmd.exe',
        args: ['/C'],
      };
    case 'bash':
      return {
        command: '/bin/bash',
        args: ['-c'],
      };
    default:
      throw new Error(`Unsupported script type: ${scriptType}`);
  }
}

/**
 * Get the shell command and arguments for executing a script file
 */
function getFileExecutionCommand(
  scriptType: ScriptType,
  filePath: string
): { command: string; args: string[] } {
  switch (scriptType) {
    case 'powershell':
      return {
        command: 'powershell.exe',
        args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', filePath],
      };
    case 'cmd':
      // For CMD, we execute the batch file directly
      return {
        command: 'cmd.exe',
        args: ['/C', filePath],
      };
    case 'bash':
      return {
        command: '/bin/bash',
        args: [filePath],
      };
    default:
      throw new Error(`Unsupported script type: ${scriptType}`);
  }
}

/**
 * ScriptHandler - Handles script action execution
 *
 * Features:
 * - Supports PowerShell, CMD, and Bash script types
 * - Executes inline scripts or script files
 * - Captures stdout and stderr output
 * - Implements execution timeout with process kill
 * - Graceful error handling with detailed messages
 */
export class ScriptHandler implements ActionHandler<ScriptAction> {
  readonly actionType = 'script' as const;
  private currentProcess: ChildProcess | null = null;

  /**
   * Execute a script action
   * @param action The script action to execute
   */
  async execute(action: ScriptAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate that we have either script or scriptPath
      if (!action.script && !action.scriptPath) {
        throw new Error('Either script or scriptPath must be provided');
      }

      if (action.script && action.scriptPath) {
        throw new Error('Cannot specify both script and scriptPath');
      }

      // If using a script file, verify it exists
      if (action.scriptPath) {
        const resolvedPath = path.resolve(action.scriptPath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Script file not found: ${resolvedPath}`);
        }
      }

      const result = await this.executeScript(action);

      const endTime = Date.now();
      const success = result.exitCode === 0;

      return {
        status: success ? 'success' : 'failure',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: success ? undefined : `Script exited with code ${result.exitCode}`,
        data: result,
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
   * Cancel the currently running script
   */
  async cancel(): Promise<void> {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.killProcess(this.currentProcess);
      this.currentProcess = null;
    }
  }

  /**
   * Execute a script and capture its output
   */
  private executeScript(action: ScriptAction): Promise<ScriptExecutionData> {
    return new Promise((resolve, reject) => {
      const timeout = action.timeout ?? DEFAULT_TIMEOUT;
      let stdout = '';
      let stderr = '';
      let resolved = false;

      // Get the command and args based on script type and source
      let command: string;
      let args: string[];

      if (action.scriptPath) {
        // Execute script file
        const fileCmdInfo = getFileExecutionCommand(
          action.scriptType,
          path.resolve(action.scriptPath)
        );
        command = fileCmdInfo.command;
        args = fileCmdInfo.args;
      } else {
        // Execute inline script
        const cmdInfo = getShellCommand(action.scriptType);
        command = cmdInfo.command;
        args = [...cmdInfo.args, action.script!];
      }

      const options: SpawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        // On Windows, we need shell:false to properly handle PowerShell/CMD
        // On Linux/Mac, we also use shell:false since we're calling the shell explicitly
        shell: false,
      };

      // Spawn the process
      const child = spawn(command, args, options);
      this.currentProcess = child;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.killProcess(child);
          reject(new Error(`Script execution timed out after ${timeout}ms`));
        }
      }, timeout);

      // Capture stdout
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process errors (e.g., command not found)
      child.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          this.currentProcess = null;
          reject(new Error(`Failed to execute script: ${error.message}`));
        }
      });

      // Handle process completion
      child.on('close', (exitCode) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          this.currentProcess = null;
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
          });
        }
      });
    });
  }

  /**
   * Kill a process and all its children
   * On Windows, we need to use taskkill to kill the process tree
   */
  private killProcess(child: ChildProcess): void {
    if (child.killed) {
      return;
    }

    try {
      if (process.platform === 'win32') {
        // On Windows, use taskkill to kill the process tree
        // This ensures child processes spawned by scripts are also killed
        if (child.pid) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F'], {
            stdio: 'ignore',
          });
        }
      } else {
        // On Unix-like systems, send SIGTERM to the process group
        // Using negative PID kills the entire process group
        if (child.pid) {
          try {
            process.kill(-child.pid, 'SIGTERM');
          } catch {
            // If killing the process group fails, kill just the process
            child.kill('SIGTERM');
          }
        }
      }
    } catch {
      // Fallback: try to kill the main process directly
      try {
        child.kill('SIGKILL');
      } catch {
        // Process may have already exited
      }
    }
  }
}

export { getShellCommand, getFileExecutionCommand };
