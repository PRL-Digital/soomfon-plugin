/**
 * Global type declarations for the renderer process
 * This file extends the Window interface to include the electronAPI
 * exposed by the preload script via contextBridge.
 */

import type { ElectronAPI } from '../shared/types/ipc';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// This export is required to make this a module and allow the global augmentation
export {};
