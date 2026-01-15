# Agent Operational Notes

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Full build (core + main + preload + renderer)
- `npm run typecheck` - TypeScript type checking only
- `npm run test` - Run Vitest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Test Locations
Tests are located alongside their source files:
- `src/core/actions/*.test.ts` - Action system tests
- `src/core/device/*.test.ts` - Device communication tests
- `src/core/config/*.test.ts` - Configuration validation tests

## Key Directories
- `src/core/` - Business logic (testable without Electron)
- `src/main/` - Electron main process
- `src/renderer/` - React UI components
- `src/preload/` - Electron preload scripts
- `src/shared/types/` - TypeScript type definitions
