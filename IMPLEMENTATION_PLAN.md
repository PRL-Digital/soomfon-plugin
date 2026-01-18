# Implementation Plan

## Completed Work

### Electron to Tauri Migration Cleanup (Completed)
- Removed `/release/` directory containing old Electron build artifacts
- Updated `tsconfig.json` to remove stale excludes (`src/main`, `src/preload` - directories don't exist)
- Fixed 3 failing tauri-api tests (test mocks didn't match implementation behavior)

### Electron Store Removal (Completed)
- Removed `electron-store` from package.json devDependencies
- Refactored ConfigManager (`src/core/config/config-manager.ts`) to be an in-memory store
- ConfigManager is now used for testing and shared business logic only
- Production config is handled by Tauri Rust backend (`src-tauri/src/config/`)
- Updated `config-manager.test.ts` to work without electron-store mocks
- All 1026 tests pass

### Image Transfer Protocol (Completed)
Implemented image transfer protocol based on mirajazz library reverse engineering.

**Protocol details (from https://github.com/4ndv/mirajazz):**
- Device expects JPEG images at **60x60 pixels** (not 72x72 as previously assumed)
- Images use JPEG compression at 90% quality
- Protocol v2/v3 devices use 1024-byte packets

**Implementation locations:**
- `src-tauri/src/image/processor.rs` - Updated to output JPEG at 60x60 (was RGB565 at 72x72)
- `src-tauri/src/hid/packets.rs` - Added `build_image_bat_packet()` and `build_image_data_packet()`
- `src-tauri/src/hid/protocol.rs` - Implemented `set_button_image()` with BAT/STP protocol
- `src-tauri/src/hid/types.rs` - Updated LCD dimensions to 60x60

**Image transfer flow:**
1. Send BAT (batch) header packet: `CRT..BAT` + size (2 bytes big-endian) + button_index+1
2. Send image data in 1024-byte chunks
3. Send STP (stop/commit) packet: `CRT..STP`

### TypeScript Type Fixes (Completed)
Fixed TypeScript errors and type mismatches to ensure full type safety:

**Mock type casting in integration tests:**
- `src/core/integrations/node-red.test.ts` - Changed `(axios.isAxiosError as ReturnType<typeof vi.fn>)` to `vi.mocked(axios.isAxiosError)` for proper mock typing (11 occurrences)
- `src/core/integrations/home-assistant.test.ts` - Same fix (10 occurrences)

**Tauri API adapter type alignment:**
- `src/lib/tauri-api.ts` - Updated to match frontend type definitions in `src/shared/types/config.ts`:
  - `DeviceSettings`: Added `sleepTimeout` and `screensaverEnabled` with default values
  - `AppSettings`: Changed from `startMinimized` to `launchOnStartup`, added `closeToTray`, `language`
  - `HomeAssistantSettings`: Changed from `token` to `accessToken`
- `src/lib/tauri-api.test.ts` - Updated test to use correct `AppSettings` type

### Architecture Notes
- **Rust backend** (`src-tauri/`) is the production runtime for device communication and config
- **TypeScript `src/core/`** is legacy backend code used only for tests and shared business logic
- **React frontend** (`src/renderer/`) uses `tauri-api.ts` adapter to communicate with Rust backend

## Remaining Work

None at this time. All major features are implemented.

## Notes for Future Development

1. **Config Types Divergence**: Backend (`src-tauri/src/config/types.rs`) uses snake_case, frontend types use camelCase. The `tauri-api.ts` adapter handles mapping.

2. **Test Infrastructure**: Tests in `src/core/` use in-memory ConfigManager for TypeScript business logic. This is separate from the Rust backend tests in `src-tauri/src/`. Rust tests require `cargo test` in the `src-tauri/` directory with the Rust toolchain installed.

3. **USB Protocol**: Device communication uses USB interrupt transfers on Interface 0 (0xFFA0 vendor protocol) with 512-byte ACK packets for button/encoder events.

4. **Image Protocol Reference**: The mirajazz library (https://github.com/4ndv/mirajazz) is the authoritative reference for the image transfer protocol. Key differences from Stream Deck:
   - 60x60 pixel JPEG images (not BMP)
   - BAT/STP command sequence for image transfer
   - Buttons are 1-indexed in protocol (button 0 sends as key=1)
