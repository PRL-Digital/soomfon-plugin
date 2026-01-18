# Implementation Plan

## Completed Work

### Electron to Tauri Migration Cleanup (Completed)
- ✅ Removed `/release/` directory containing old Electron build artifacts
- ✅ Updated `tsconfig.json` to remove stale excludes (`src/main`, `src/preload` - directories don't exist)
- ✅ Fixed 3 failing tauri-api tests (test mocks didn't match implementation behavior)
- ✅ Kept `electron-store` as devDependency for tests (mocked in tests, doesn't affect production build)

### Architecture Notes
- **Rust backend** (`src-tauri/`) is the production runtime for device communication and config
- **TypeScript `src/core/`** is legacy backend code used only for tests (mocks electron-store)
- **React frontend** (`src/renderer/`) uses `tauri-api.ts` adapter to communicate with Rust backend
- The `window.electronAPI` interface pattern allows code to work with both Electron and Tauri

## USB Polling Analysis

### Current Implementation (Rust - src-tauri/src/commands/device.rs)
The current Rust implementation uses **interrupt-based USB reading with timeout**, not true polling:

```rust
// Line 160 in device.rs - uses USB interrupt transfers with 100ms timeout
polling_handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(100))
```

This is efficient because:
1. The thread blocks waiting for USB interrupt data (not busy-looping)
2. The 100ms timeout allows periodic checking of the `POLLING_ACTIVE` flag
3. When data arrives, it's processed immediately

### Comparison with opendeck-akp03
The referenced project (https://github.com/4ndv/opendeck-akp03) uses:
- `reader.read(None).await` - async blocking read with no timeout
- Rust async/await pattern with tokio

### Recommendation: Keep Current Approach
The current implementation is already efficient. The key difference from "polling" (wasteful):
- **Polling**: Repeated non-blocking reads with sleeps (e.g., TypeScript `setInterval(pollData, 1ms)`)
- **Current**: Blocking USB interrupt read that suspends thread until data arrives

The 100ms timeout is necessary for clean shutdown (checking `POLLING_ACTIVE` flag). This adds minimal overhead.

The TypeScript HID manager (`src/core/device/hid-manager.ts`) does use 1ms polling for Windows compatibility, but this code is legacy and only used for Node.js testing scripts.

## Remaining Work

None identified at this time. The codebase is properly set up for Rust/Tauri.

## Notes for Future Development

1. **Config Types Divergence**: Backend (`src-tauri/src/config/types.rs`) uses snake_case, frontend types use camelCase. The `tauri-api.ts` adapter handles mapping.

2. **Test Infrastructure**: Tests in `src/core/` mock `electron-store` to test TypeScript business logic. This is separate from the Rust backend tests in `src-tauri/src/`.

3. **USB Protocol**: Device communication uses USB interrupt transfers on Interface 0 (0xFFA0 vendor protocol) with 512-byte ACK packets for button/encoder events.
