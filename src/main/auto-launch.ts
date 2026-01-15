/**
 * Auto-Launch Manager
 * Handles Windows startup integration for the application.
 * Uses Electron's built-in app.setLoginItemSettings API.
 */

import { app } from 'electron';

/**
 * Auto-launch configuration options
 */
export interface AutoLaunchOptions {
  /** Whether to start the app minimized to tray */
  startMinimized?: boolean;
}

/**
 * Auto-launch status information
 */
export interface AutoLaunchStatus {
  /** Whether auto-launch is currently enabled */
  enabled: boolean;
  /** Whether the app will start minimized */
  startMinimized: boolean;
  /** Any error that occurred while checking status */
  error?: string;
}

/**
 * AutoLaunchManager handles enabling/disabling application startup on Windows login.
 *
 * Uses Electron's setLoginItemSettings which:
 * - On Windows: Uses Registry (HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run)
 * - On macOS: Uses Login Items
 * - On Linux: Uses XDG autostart
 */
export class AutoLaunchManager {
  private readonly appPath: string;
  private readonly appName: string;
  private readonly isDevelopment: boolean;

  constructor() {
    this.appPath = app.getPath('exe');
    this.appName = app.getName() || 'SOOMFON Controller';
    this.isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  /**
   * Check if auto-launch is currently enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      const settings = app.getLoginItemSettings();
      return settings.openAtLogin;
    } catch (error) {
      console.error('Failed to get auto-launch status:', error);
      return false;
    }
  }

  /**
   * Get full auto-launch status including minimized setting
   */
  async getStatus(): Promise<AutoLaunchStatus> {
    try {
      const settings = app.getLoginItemSettings();
      return {
        enabled: settings.openAtLogin,
        startMinimized: settings.openAsHidden ?? false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get auto-launch status:', error);
      return {
        enabled: false,
        startMinimized: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Enable auto-launch on Windows startup
   * @param options Configuration options for auto-launch
   */
  async enable(options: AutoLaunchOptions = {}): Promise<void> {
    // Warn if in development mode
    if (this.isDevelopment) {
      console.warn(
        'Auto-launch enabled in development mode. ' +
        'This will register the development executable path, ' +
        'which may not work as expected after building.'
      );
    }

    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: options.startMinimized ?? false,
        // On Windows, we can pass additional args
        args: options.startMinimized ? ['--hidden'] : [],
      });

      console.log('Auto-launch enabled successfully');
    } catch (error) {
      console.error('Failed to enable auto-launch:', error);
      throw new Error(
        `Failed to enable auto-launch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disable auto-launch on Windows startup
   */
  async disable(): Promise<void> {
    try {
      app.setLoginItemSettings({
        openAtLogin: false,
        openAsHidden: false,
        args: [],
      });

      console.log('Auto-launch disabled successfully');
    } catch (error) {
      console.error('Failed to disable auto-launch:', error);
      throw new Error(
        `Failed to disable auto-launch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Set auto-launch enabled state
   * @param enabled Whether to enable or disable auto-launch
   * @param options Additional options when enabling
   */
  async setEnabled(enabled: boolean, options: AutoLaunchOptions = {}): Promise<void> {
    if (enabled) {
      await this.enable(options);
    } else {
      await this.disable();
    }
  }

  /**
   * Check if the app was started with the --hidden flag (minimized to tray)
   */
  wasStartedHidden(): boolean {
    return process.argv.includes('--hidden');
  }

  /**
   * Get the path that will be registered for auto-launch
   */
  getAppPath(): string {
    return this.appPath;
  }

  /**
   * Get the app name used for auto-launch registration
   */
  getAppName(): string {
    return this.appName;
  }

  /**
   * Check if running in development mode
   */
  isInDevelopment(): boolean {
    return this.isDevelopment;
  }
}

// Singleton instance
let autoLaunchManager: AutoLaunchManager | null = null;

/**
 * Get the auto-launch manager singleton instance
 */
export function getAutoLaunchManager(): AutoLaunchManager {
  if (!autoLaunchManager) {
    autoLaunchManager = new AutoLaunchManager();
  }
  return autoLaunchManager;
}

/**
 * Create and initialize the auto-launch manager
 */
export function createAutoLaunchManager(): AutoLaunchManager {
  return getAutoLaunchManager();
}

/**
 * Destroy the auto-launch manager instance
 */
export function destroyAutoLaunchManager(): void {
  autoLaunchManager = null;
}

export default AutoLaunchManager;
