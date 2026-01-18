# Implementation Plan

## Completed Work

### Electron to Tauri Migration Cleanup (Completed)
- ✅ Removed `/release/` directory containing old Electron build artifacts
- ✅ Updated `tsconfig.json` to remove stale excludes (`src/main`, `src/preload` - directories don't exist)
- ✅ Fixed 3 failing tauri-api tests (test mocks didn't match implementation behavior)

### Electron Store Removal (Completed)
- ✅ Removed `electron-store` from package.json devDependencies
- ✅ Refactored ConfigManager (`src/core/config/config-manager.ts`) to be an in-memory store
- ✅ ConfigManager is now used for testing and shared business logic only
- ✅ Production config is handled by Tauri Rust backend (`src-tauri/src/config/`)
- ✅ Updated `config-manager.test.ts` to work without electron-store mocks
- ✅ All 1026 tests pass

### Architecture Notes
- **Rust backend** (`src-tauri/`) is the production runtime for device communication and config
- **TypeScript `src/core/`** is legacy backend code used only for tests and shared business logic
- **React frontend** (`src/renderer/`) uses `tauri-api.ts` adapter to communicate with Rust backend

## Remaining Work

### Image Transfer Protocol (Requires Hardware/USB Capture)
The image transfer protocol for setting button images is not yet implemented.

**Location:** `src-tauri/src/hid/protocol.rs:93-99` and `src-tauri/src/hid/packets.rs:216-225`

**Status:** Placeholder implementation exists. The device accepts JPEG images with `FF D8 FF E0` magic bytes, but the exact command format needs USB capture verification.

Use https://github.com/4ndv/opendeck-akp03 to see how they hand this.

## Notes for Future Development

1. **Config Types Divergence**: Backend (`src-tauri/src/config/types.rs`) uses snake_case, frontend types use camelCase. The `tauri-api.ts` adapter handles mapping.

2. **Test Infrastructure**: Tests in `src/core/` use in-memory ConfigManager for TypeScript business logic. This is separate from the Rust backend tests in `src-tauri/src/`.

3. **USB Protocol**: Device communication uses USB interrupt transfers on Interface 0 (0xFFA0 vendor protocol) with 512-byte ACK packets for button/encoder events.

4. **Rust Environment**: The Rust toolchain may not be available in all development environments. TypeScript tests (`npm test`) can be run independently. Rust tests require `cargo test` in the `src-tauri/` directory with the Rust toolchain installed.

