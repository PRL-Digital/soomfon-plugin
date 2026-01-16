/**
 * Renderer Process Entry Point
 *
 * React application entry point for both Electron and Tauri renderer processes.
 * Automatically detects and initializes the appropriate backend API.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider, ToastContainer, ErrorBoundary } from './components/common';
import { isTauri, tauriAPI } from '../lib/tauri-api';
import './styles/global.css';

// Initialize the API bridge for Tauri environment
// This ensures window.electronAPI is available regardless of backend
if (isTauri()) {
  // In Tauri, set window.electronAPI to point to our Tauri adapter
  // This allows all existing hooks and components to work unchanged
  (window as Window & { electronAPI: typeof tauriAPI }).electronAPI = tauriAPI;
}

// Get root element
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

// Create React root and render app
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
