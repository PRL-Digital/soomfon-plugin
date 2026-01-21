/**
 * Global type declarations for the renderer process
 * This file extends the Window interface to include the tauriAPI
 * provided by the Tauri adapter.
 */

import type { TauriAPI } from '../shared/types/ipc';

declare global {
  interface Window {
    tauriAPI: TauriAPI;
  }
}

// This export is required to make this a module and allow the global augmentation
export {};
