/**
 * Renderer Process Entry Point
 *
 * React application entry point for the Electron renderer process.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider, ToastContainer, ErrorBoundary } from './components/common';
import './styles/global.css';

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
