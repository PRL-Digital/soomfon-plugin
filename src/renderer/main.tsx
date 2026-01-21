/**
 * Renderer Process Entry Point
 *
 * React application entry point for the Tauri renderer process.
 * Initializes the Tauri API bridge for frontend-backend communication.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider, ToastContainer, ErrorBoundary } from './components/common';
import { isTauri, tauriAPI } from '../lib/tauri-api';
import './styles/global.css';

// Initialize the API bridge for Tauri environment
if (isTauri()) {
  // Set window.tauriAPI to point to our Tauri adapter
  (window as Window & { tauriAPI: typeof tauriAPI }).tauriAPI = tauriAPI;
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
