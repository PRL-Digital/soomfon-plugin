# Implementation Plan

## Completed Work

### Image Upload from File Paths (Completed)
The backend now supports uploading images from file paths, not just base64 data. The `set_button_image` command accepts:
- File URLs: `file:///path/to/image.png`
- Absolute paths: `/path/to/image.png` or `C:\path\to\image.png`
- Data URLs: `data:image/png;base64,...`
- Raw base64 data

Images are automatically resized to 60x60 pixels and converted to JPEG at 90% quality.

**Files Changed**:
- `src-tauri/src/image/processor.rs` - Added `process_image_source()`, `process_file_image()`, URL decoding, path detection
- `src-tauri/src/commands/device.rs` - Updated `set_button_image` to use `process_image_source()`

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

### Shift Button Core Implementation (Completed)
Implemented shift button functionality where small button 0 (left) acts as a modifier key.

**How it works:**
- When the shift button (index 6, small button 0) is held down, other button/encoder events trigger their shift actions
- Events include `isShiftActive` flag so consumers know the shift state at event time
- EventBinder looks up shift-prefixed triggers first, then falls back to normal triggers if no shift binding exists
- Long press shift state is captured at press time, so releasing shift mid-long-press won't change the action

**Type Changes:**
- `ButtonConfig` (TS & Rust): Added `shiftAction` and `shiftLongPressAction` fields
- `EncoderConfig` (TS & Rust): Added `shiftPressAction`, `shiftLongPressAction`, `shiftClockwiseAction`, `shiftCounterClockwiseAction` fields
- `ButtonEvent` & `EncoderEvent`: Added `isShiftActive?: boolean` field
- `ButtonTrigger`: Added `'shiftPress'` and `'shiftLongPress'` values
- `EncoderTrigger`: Added `'shiftRotateCW'`, `'shiftRotateCCW'`, `'shiftPress'`, `'shiftLongPress'` values
- Added `SHIFT_BUTTON_INDEX` constant (value: 6)

**Files Changed:**
- `src/shared/types/config.ts` - ButtonConfig and EncoderConfig shift action fields
- `src/shared/types/device.ts` - Event interfaces with isShiftActive, SHIFT_BUTTON_INDEX constant
- `src/shared/types/actions.ts` - ButtonTrigger and EncoderTrigger shift variants
- `src/core/device/device-events.ts` - DeviceEventParser.isShiftPressed(), shift state tracking in events
- `src/core/actions/event-binder.ts` - Shift-aware trigger mapping and fallback logic
- `src/core/actions/schemas.ts` - Zod schemas updated with shift trigger values
- `src-tauri/src/config/types.rs` - Rust ButtonConfig and EncoderConfig shift action fields

### Shift Button UI Implementation (Completed)
Implemented comprehensive UI for shift button configuration and shift state visualization.

**Features Implemented:**

1. **ActionEditor Trigger Mode Selector** - Added a 4-button selector (Press, Long Press, Shift+Press, Shift+Long Press) that lets users edit different action trigger modes for buttons

2. **EncoderEditor Shift Actions** - Added 4 new sections for shift variants (Shift+Press, Shift+Long Press, Shift+CW, Shift+CCW) with visual grouping of normal vs shift sections

3. **Shift State Visual Indicator** - Added a "⇧ SHIFT" badge that appears when the shift button is held, plus a subtle glow on the device frame

**Files Changed:**
- `src/renderer/components/ActionEditor/ActionEditor.tsx` - Added ButtonTriggerMode type, trigger mode selector UI, updated props to use buttonActions instead of currentAction
- `src/renderer/components/ActionEditor/EncoderEditor.tsx` - Extended EncoderConfig and EncoderActionType to include shift variants, added section grouping
- `src/renderer/components/ActionEditor/index.ts` - Exported new types
- `src/renderer/components/DeviceView/DeviceView.tsx` - Added isShiftActive prop and shift indicator component
- `src/renderer/hooks/useDevice.ts` - Added isShiftActive state tracking based on shift button press/release
- `src/renderer/styles/global.css` - Added styles for trigger mode selector, encoder section groups, and shift indicator
- `src/renderer/App.tsx` - Updated to use new ActionEditor props and pass shift actions to EncoderEditor

---

## Remaining Work

### Navigate "Workspaces"
Middle and right small buttons navigate between "workspaces". A workspace is a complete set of button/dial configurations.

**Design:**
- Small button 1 (middle) = previous workspace
- Small button 2 (right) = next workspace
- Each workspace has its own set of LCD button images, actions, and encoder configurations
- Workspaces are contained within a Profile

**Implementation Tasks:**
1. Add `Workspace` type with buttons/encoders arrays
2. Extend `Profile` to have `workspaces: Workspace[]` and `activeWorkspaceIndex`
3. Create workspace navigation action handlers
4. Add UI for workspace management (add/remove/duplicate workspaces)
5. Display current workspace indicator in DeviceView
6. Update LCD images when workspace changes

**Current State:**
- Profile system exists with single button/encoder configuration
- No workspace concept or navigation logic

### Image Upload Enhancements
- Frontend preview of processed result before upload
- Progress indicator during image upload
- Image cropping/editing UI
- Validation feedback (file size, format errors)

---

## Known Issues

### Rust Test Compilation
Pre-existing test compilation errors in `src-tauri/src/actions/` tests. The test code uses old struct initialization patterns that don't match the current types (missing required fields like `id`, `name`, `icon`, `enabled`). The library compiles correctly - only tests fail to compile.

**Files with test errors:**
- `src/actions/types.rs` (tests)
- `src/actions/engine.rs` (tests)
- `src/actions/event_binder.rs` (tests)
- `src/config/profiles.rs` (tests)

**Fix:** Update test code to use `Default::default()` for optional fields or add the required fields.

### Development Environment
- Rust tests require Tauri platform libraries (GTK, WebKit, etc.) for linking
- TypeScript tests pass (1026 tests)
- Use `cargo check --lib` to verify library compilation without linking

---

## Architecture Notes
- **Rust backend** (`src-tauri/`) is the production runtime for device communication and config
- **TypeScript `src/core/`** is legacy backend code used only for tests and shared business logic
- **React frontend** (`src/renderer/`) uses `tauri-api.ts` adapter to communicate with Rust backend

## Notes for Future Development

1. **Config Types Divergence**: Backend (`src-tauri/src/config/types.rs`) uses snake_case, frontend types use camelCase. The `tauri-api.ts` adapter handles mapping.

2. **Test Infrastructure**: Tests in `src/core/` use in-memory ConfigManager for TypeScript business logic. This is separate from the Rust backend tests in `src-tauri/src/`. Rust tests require `cargo test` in the `src-tauri/` directory with the Rust toolchain installed.

3. **USB Protocol**: Device communication uses USB interrupt transfers on Interface 0 (0xFFA0 vendor protocol) with 512-byte ACK packets for button/encoder events.

4. **Image Protocol Reference**: The mirajazz library (https://github.com/4ndv/mirajazz) is the authoritative reference for the image transfer protocol. Key differences from Stream Deck:
   - 60x60 pixel JPEG images (not BMP)
   - BAT/STP command sequence for image transfer
   - Buttons are 1-indexed in protocol (button 0 sends as key=1)
