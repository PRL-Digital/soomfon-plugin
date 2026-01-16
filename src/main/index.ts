/**
 * Electron Main Process Entry Point
 *
 * Handles application lifecycle, window management, and IPC communication.
 */

import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import {
  registerIpcHandlers,
  cleanupIpcHandlers,
  wireEventPipeline,
  getHidManager,
  getProfileManager,
  getConfigManager,
  getAutoLaunchManagerInstance,
} from './ipc-handlers';
import { createTrayManager, getTrayManager, destroyTrayManager } from './tray';

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Check if app was started with --hidden flag (from auto-launch)
const startHidden = process.argv.includes('--hidden');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main browser window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SOOMFON Controller',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for some native modules
    },
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  // Unless started with --hidden flag (auto-launch to tray)
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow?.show();
    } else {
      console.log('Started with --hidden flag, minimizing to tray');
    }
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl);

    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle close event - may minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    const tray = getTrayManager();
    if (tray && tray.handleWindowClose(event)) {
      // Close was prevented, window is hidden to tray
      return;
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron app lifecycle events
app.whenReady().then(() => {
  // Register all IPC handlers before creating the window
  registerIpcHandlers();

  // Wire up the event processing pipeline (HIDManager -> EventParser -> EventBinder -> ActionEngine)
  wireEventPipeline();

  createWindow();

  // Initialize system tray after window is created
  initializeTray();

  // On macOS, re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Initialize the system tray with all required callbacks
 */
function initializeTray(): void {
  const tray = createTrayManager({
    getMainWindow: () => mainWindow,
    getProfiles: () => {
      try {
        const profileManager = getProfileManager();
        return profileManager.list();
      } catch {
        return [];
      }
    },
    getActiveProfileId: () => {
      try {
        const profileManager = getProfileManager();
        return profileManager.getActive().id;
      } catch {
        return '';
      }
    },
    setActiveProfile: (id: string) => {
      try {
        const profileManager = getProfileManager();
        profileManager.setActive(id);
      } catch (error) {
        console.error('Failed to set active profile:', error);
      }
    },
    getCloseToTray: () => {
      try {
        const configManager = getConfigManager();
        return configManager.getAppSettings().closeToTray;
      } catch {
        return true; // Default to close-to-tray
      }
    },
    onQuit: () => {
      app.quit();
    },
  });

  // Wire up HID manager events to update tray icon
  try {
    const hidManager = getHidManager();
    hidManager.on('connected', () => {
      tray.updateIcon(hidManager.getConnectionState());
      tray.updateContextMenu();
    });
    hidManager.on('disconnected', () => {
      tray.updateIcon(hidManager.getConnectionState());
      tray.updateContextMenu();
    });

    // Set initial icon state
    tray.updateIcon(hidManager.getConnectionState());
  } catch (error) {
    console.error('Failed to wire up HID manager to tray:', error);
  }

  // Wire up profile manager events to update context menu
  try {
    const profileManager = getProfileManager();
    profileManager.onEvent(() => {
      tray.updateContextMenu();
    });
  } catch (error) {
    console.error('Failed to wire up profile manager to tray:', error);
  }
}

// Quit when all windows are closed (except on macOS)
// Note: With close-to-tray, the window is hidden but not closed,
// so this only fires when app.quit() is explicitly called
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit - set quitting flag to allow window close
app.on('before-quit', () => {
  const tray = getTrayManager();
  if (tray) {
    tray.setQuitting(true);
  }
});

// Clean up on will-quit (after all windows closed)
app.on('will-quit', () => {
  // Clean up IPC handlers and resources
  cleanupIpcHandlers();
  // Destroy tray
  destroyTrayManager();
});

// Export for testing
export { createWindow, mainWindow };
