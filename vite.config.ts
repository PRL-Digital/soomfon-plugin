import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base path for built assets
  base: './',

  // Build configuration for renderer process
  root: path.join(__dirname, 'src/renderer'),

  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'src/renderer/index.html'),
      },
    },
  },

  // Development server configuration
  server: {
    port: 5173,
    strictPort: true,
    // Watch for changes in the renderer directory
    watch: {
      usePolling: true,
    },
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src/renderer'),
      '@shared': path.join(__dirname, 'src/shared'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
