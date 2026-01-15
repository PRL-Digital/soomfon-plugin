import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Include test files
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Exclude node_modules and dist
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/main/**', // Main process code (requires Electron)
        'src/renderer/**', // Renderer code (requires React/DOM)
        'src/preload/**', // Preload scripts (requires Electron)
      ],
    },

    // Timeout for tests
    testTimeout: 10000,

    // Global test setup
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
