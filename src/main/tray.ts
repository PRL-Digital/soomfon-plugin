/**
 * System Tray Manager
 *
 * Handles system tray icon, context menu, and tray-related behaviors.
 * Features:
 * - Tray icon with connection state (default/connected/disconnected)
 * - Context menu with Show/Hide, Profiles, Status, and Quit
 * - Close-to-tray behavior
 * - Single-click restore
 */

import {
  app,
  Tray,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  BrowserWindow,
  Notification,
} from 'electron';
import * as path from 'path';
import type { Profile } from '../shared/types/config';
import { ConnectionState } from '../shared/types/device';

/**
 * Tray icon state
 */
export type TrayIconState = 'default' | 'connected' | 'disconnected';

/**
 * Tray manager configuration
 */
export interface TrayManagerConfig {
  /** Callback to get the main window */
  getMainWindow: () => BrowserWindow | null;
  /** Callback to get all profiles */
  getProfiles: () => Profile[];
  /** Callback to get active profile ID */
  getActiveProfileId: () => string;
  /** Callback to set active profile */
  setActiveProfile: (id: string) => void;
  /** Callback to get close-to-tray setting */
  getCloseToTray: () => boolean;
  /** Callback when quit is requested */
  onQuit: () => void;
}

/**
 * System Tray Manager class
 */
export class TrayManager {
  private tray: Tray | null = null;
  private config: TrayManagerConfig;
  private iconState: TrayIconState = 'default';
  private hasShownMinimizeNotification = false;
  private isQuitting = false;

  constructor(config: TrayManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize the system tray
   */
  public init(): void {
    if (this.tray) {
      return;
    }

    // Create tray with default icon
    const icon = this.createIcon('default');
    this.tray = new Tray(icon);

    // Set tooltip
    this.tray.setToolTip('SOOMFON Controller');

    // Build initial context menu
    this.updateContextMenu();

    // Handle tray click - show/restore window
    this.tray.on('click', () => {
      this.toggleWindowVisibility();
    });

    // Handle double-click as alternative
    this.tray.on('double-click', () => {
      this.showWindow();
    });
  }

  /**
   * Create a native image icon for the given state
   */
  private createIcon(state: TrayIconState): Electron.NativeImage {
    // Icon size for Windows tray (16x16 recommended, 32x32 for high DPI)
    const size = 32;
    const half = size / 2;

    // Colors for different states
    const colors = {
      default: { fill: '#6366f1', stroke: '#4f46e5' }, // Indigo
      connected: { fill: '#22c55e', stroke: '#16a34a' }, // Green
      disconnected: { fill: '#ef4444', stroke: '#dc2626' }, // Red
    };

    const { fill, stroke } = colors[state];

    // Create SVG icon - a rounded square with inner circle
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <!-- Background rounded square -->
        <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="6" ry="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <!-- Inner circle indicator -->
        <circle cx="${half}" cy="${half}" r="6" fill="white" opacity="0.9"/>
        <!-- Center dot showing state -->
        <circle cx="${half}" cy="${half}" r="3" fill="${state === 'connected' ? '#22c55e' : state === 'disconnected' ? '#ef4444' : '#6366f1'}"/>
      </svg>
    `;

    // Convert SVG to data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return nativeImage.createFromDataURL(dataUrl);
  }

  /**
   * Update the tray icon based on device connection state
   */
  public updateIcon(connectionState: ConnectionState): void {
    if (!this.tray) return;

    let newState: TrayIconState;
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        newState = 'connected';
        break;
      case ConnectionState.DISCONNECTED:
      case ConnectionState.ERROR:
        newState = 'disconnected';
        break;
      default:
        newState = 'default';
    }

    if (newState !== this.iconState) {
      this.iconState = newState;
      this.tray.setImage(this.createIcon(newState));
      this.updateTooltip();
    }
  }

  /**
   * Update the tray tooltip
   */
  private updateTooltip(): void {
    if (!this.tray) return;

    const stateText = {
      default: 'Not initialized',
      connected: 'Device connected',
      disconnected: 'Device disconnected',
    };

    this.tray.setToolTip(`SOOMFON Controller - ${stateText[this.iconState]}`);
  }

  /**
   * Update the context menu
   */
  public updateContextMenu(): void {
    if (!this.tray) return;

    const profiles = this.config.getProfiles();
    const activeProfileId = this.config.getActiveProfileId();
    const mainWindow = this.config.getMainWindow();
    const isVisible = mainWindow?.isVisible() ?? false;

    // Build profile submenu
    const profileSubmenu: MenuItemConstructorOptions[] = profiles.map((profile) => ({
      label: profile.name,
      type: 'checkbox' as const,
      checked: profile.id === activeProfileId,
      click: () => {
        this.config.setActiveProfile(profile.id);
        this.updateContextMenu();
      },
    }));

    // Connection status text
    const statusText = {
      default: '⚪ Not initialized',
      connected: '🟢 Device connected',
      disconnected: '🔴 Device disconnected',
    };

    // Build menu template
    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: isVisible ? 'Hide Window' : 'Show Window',
        click: () => this.toggleWindowVisibility(),
      },
      { type: 'separator' },
      {
        label: 'Profiles',
        submenu: profileSubmenu.length > 0 ? profileSubmenu : [{ label: 'No profiles', enabled: false }],
      },
      { type: 'separator' },
      {
        label: statusText[this.iconState],
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => this.quit(),
      },
    ];

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Toggle main window visibility
   */
  private toggleWindowVisibility(): void {
    const mainWindow = this.config.getMainWindow();
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      this.showWindow();
    }

    // Update menu to reflect new state
    this.updateContextMenu();
  }

  /**
   * Show and focus the main window
   */
  private showWindow(): void {
    const mainWindow = this.config.getMainWindow();
    if (!mainWindow) return;

    mainWindow.show();
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();

    // Update menu to reflect new state
    this.updateContextMenu();
  }

  /**
   * Handle window close event - minimize to tray if setting enabled
   * Returns true if the close should be prevented
   */
  public handleWindowClose(event: Electron.Event): boolean {
    if (this.isQuitting) {
      return false; // Allow close during quit
    }

    const closeToTray = this.config.getCloseToTray();
    if (closeToTray) {
      event.preventDefault();
      const mainWindow = this.config.getMainWindow();
      mainWindow?.hide();

      // Show notification on first minimize to tray
      if (!this.hasShownMinimizeNotification) {
        this.hasShownMinimizeNotification = true;
        this.showMinimizeNotification();
      }

      // Update menu to reflect new state
      this.updateContextMenu();
      return true;
    }

    return false;
  }

  /**
   * Show notification that app is minimized to tray
   */
  private showMinimizeNotification(): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'SOOMFON Controller',
        body: 'Application minimized to system tray. Click the tray icon to restore.',
        silent: true,
      });
      notification.show();
    }
  }

  /**
   * Quit the application
   */
  private quit(): void {
    this.isQuitting = true;
    this.config.onQuit();
  }

  /**
   * Set quitting flag (called from app before-quit)
   */
  public setQuitting(quitting: boolean): void {
    this.isQuitting = quitting;
  }

  /**
   * Check if app is quitting
   */
  public isAppQuitting(): boolean {
    return this.isQuitting;
  }

  /**
   * Destroy the tray
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

// Singleton instance
let trayManager: TrayManager | null = null;

/**
 * Create and initialize the tray manager
 */
export function createTrayManager(config: TrayManagerConfig): TrayManager {
  if (!trayManager) {
    trayManager = new TrayManager(config);
    trayManager.init();
  }
  return trayManager;
}

/**
 * Get the tray manager instance
 */
export function getTrayManager(): TrayManager | null {
  return trayManager;
}

/**
 * Destroy the tray manager
 */
export function destroyTrayManager(): void {
  if (trayManager) {
    trayManager.destroy();
    trayManager = null;
  }
}
