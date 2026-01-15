/**
 * Launch Action Handler
 * Handles launching applications and opening files using child_process
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';
import {
  ActionHandler,
  ActionExecutionResult,
  LaunchAction,
} from '../../../shared/types/actions';

/**
 * Determine if we're running on Windows
 */
const isWindows = process.platform === 'win32';

/**
 * Escape a path for shell execution on Windows
 * Windows paths with spaces need to be quoted properly
 * @param filePath The path to escape
 */
function escapeWindowsPath(filePath: string): string {
  if (!isWindows) {
    return filePath;
  }
  // If path contains spaces and isn't already quoted, wrap in quotes
  if (filePath.includes(' ') && !filePath.startsWith('"')) {
    return `"${filePath}"`;
  }
  return filePath;
}

/**
 * Get the shell command for opening files with default application
 * Different platforms use different commands
 */
function getOpenCommand(): string {
  switch (process.platform) {
    case 'win32':
      return 'start';
    case 'darwin':
      return 'open';
    default:
      // Linux and others
      return 'xdg-open';
  }
}

/**
 * LaunchHandler - Handles launch action execution
 *
 * Features:
 * - Launches executables with spawn
 * - Supports command-line arguments
 * - Supports working directory specification
 * - Opens files with default application (shell: true)
 * - Handles Windows path escaping
 */
export class LaunchHandler implements ActionHandler<LaunchAction> {
  readonly actionType = 'launch' as const;

  /**
   * Execute a launch action
   * @param action The launch action to execute
   */
  async execute(action: LaunchAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      await this.launchProcess(action);

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
   * Launch a process based on the action configuration
   */
  private launchProcess(action: LaunchAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: SpawnOptions = {
        detached: true,
        stdio: 'ignore',
      };

      // Set working directory if specified
      if (action.workingDirectory) {
        options.cwd = action.workingDirectory;
      }

      let command: string;
      let args: string[];

      if (action.useShell) {
        // Open with default application using shell
        options.shell = true;

        if (isWindows) {
          // Windows: use 'start' command
          // 'start ""' uses empty title, then the path
          command = 'start';
          args = ['""', escapeWindowsPath(action.path)];
          if (action.args && action.args.length > 0) {
            args.push(...action.args.map(escapeWindowsPath));
          }
        } else if (process.platform === 'darwin') {
          // macOS: use 'open' command
          command = 'open';
          args = [action.path];
          if (action.args && action.args.length > 0) {
            args.push('--args', ...action.args);
          }
        } else {
          // Linux: use 'xdg-open'
          command = 'xdg-open';
          args = [action.path];
          // xdg-open doesn't support additional args for the opened app
        }
      } else {
        // Direct execution of executable
        command = action.path;
        args = action.args || [];

        // On Windows with shell:false, we need to handle paths differently
        if (isWindows) {
          // If the path contains spaces, we should use shell mode
          // But since shell is false, the path is passed directly to spawn
          // which handles it correctly on Windows
          command = action.path;
        }
      }

      const child = spawn(command, args, options);

      // Handle spawn errors
      child.on('error', (error) => {
        reject(new Error(`Failed to launch: ${error.message}`));
      });

      // For detached processes, we don't wait for them to complete
      // Unref the child so it can run independently
      child.unref();

      // Give a small delay to catch immediate spawn errors
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }
}

export { escapeWindowsPath, getOpenCommand };
