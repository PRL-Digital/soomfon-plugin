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

### Workspace Core Implementation (Completed)
Implemented workspace data structures for organizing multiple button/encoder configurations within a profile.

**Key Concepts:**
- **Workspace**: A complete set of button and encoder configurations (replaces direct buttons/encoders arrays on Profile)
- **Profile**: Now contains `workspaces: Workspace[]` and `activeWorkspaceIndex` instead of flat buttons/encoders
- **Navigation**: Small button 1 (middle) = previous, Small button 2 (right) = next workspace

**Type Changes:**

**TypeScript (`src/shared/types/config.ts`):**
```typescript
interface Workspace {
  id: string;
  name: string;
  buttons: ButtonConfig[];
  encoders: EncoderConfig[];
}

interface Profile {
  // ... existing fields
  workspaces: Workspace[];          // NEW: replaces buttons/encoders
  activeWorkspaceIndex: number;     // NEW: 0-based index
  buttons?: ButtonConfig[];         // DEPRECATED: for migration
  encoders?: EncoderConfig[];       // DEPRECATED: for migration
}
```

**Rust (`src-tauri/src/config/types.rs`):**
- Added `Workspace` struct with `id`, `name`, `buttons`, `encoders`
- Updated `Profile` with `workspaces: Vec<Workspace>`, `active_workspace_index: usize`
- Added `active_workspace()` and `active_workspace_mut()` helper methods
- Added `migrate_legacy_config()` for backward compatibility
- Updated `ProfileUpdate` with `workspaces` and `active_workspace_index` fields

**Workspace Action System:**

**TypeScript (`src/shared/types/actions.ts`):**
```typescript
type WorkspaceDirection = 'next' | 'previous' | 'specific';

interface WorkspaceAction extends BaseAction {
  type: 'workspace';
  direction: WorkspaceDirection;
  workspaceIndex?: number;  // Required when direction='specific'
}
```

**Handler (`src/core/actions/handlers/workspace-handler.ts`):**
- `WorkspaceHandler` class implements workspace navigation
- Supports `next`, `previous`, and `specific` directions
- Circular navigation (wraps around at boundaries)
- Returns `alreadyActive` data when already at target workspace

**Files Changed:**
- `src/shared/types/config.ts` - Added `Workspace` interface, updated `Profile`
- `src/shared/types/actions.ts` - Added `WorkspaceAction`, `WorkspaceDirection`, updated `Action` union
- `src/core/actions/schemas.ts` - Added `workspaceDirectionSchema`, `workspaceActionSchema`
- `src/core/config/validation.ts` - Added `workspaceSchema`, updated `profileSchema`
- `src/core/config/profile-manager.ts` - Updated `create()` and `duplicate()` to use workspaces
- `src/core/actions/handlers/workspace-handler.ts` - NEW: WorkspaceHandler implementation
- `src/core/actions/handlers/workspace-handler.test.ts` - NEW: 15 tests for workspace navigation
- `src-tauri/src/config/types.rs` - Added Rust `Workspace`, updated `Profile`, `ProfileUpdate`
- `src-tauri/src/actions/types.rs` - Added `WorkspaceDirection`, `WorkspaceAction`, updated `Action` enum

**Test Updates:**
Updated all test fixtures to use new workspace structure:
- `src/core/config/config-manager.test.ts`
- `src/core/config/profile-manager.test.ts`
- `src/core/config/validation.test.ts`
- `src/core/config/import-export.test.ts`
- `src/core/actions/handlers/profile-handler.test.ts`

All 1030 tests pass.

### Test Fixture Updates (Completed)
Comprehensive test fixture updates for workspace-based Profile structure:

- **TypeScript test fixtures**: Updated to use workspace-based Profile structure across all test files
- **Rust test fixtures**: Updated with correct action type fields and struct initializers in `src-tauri/src/actions/` tests
- All 1041 TypeScript tests pass
- Rust library compiles successfully (linker errors in test environment due to missing GTK/WebKit libraries, not code issues)

### Workspace UI Implementation (Completed)
Complete UI implementation for workspace navigation and management.

**Workspace Navigation Button Bindings:**
- Added `WORKSPACE_PREV_BUTTON_INDEX` (7) and `WORKSPACE_NEXT_BUTTON_INDEX` (8) constants to `src/shared/types/device.ts`
- Added useEffect in App.tsx that listens for button presses on buttons 7/8 and triggers workspace navigation
- Button 7 (middle small button) = previous workspace
- Button 8 (right small button) = next workspace

**Image Sync on Workspace Change:**
- Added `syncWorkspaceImages()` function in App.tsx that syncs all LCD button images to the device
- Image sync happens automatically when:
  - Workspace is navigated via buttons 7/8
  - Workspace is selected from the workspace list UI
  - Workspace is deleted (images sync to the new active workspace)

**Workspace Management UI:**
- Created new components in `src/renderer/components/WorkspaceManager/`:
  - `WorkspaceEditor.tsx` - Modal dialogs for create/rename/duplicate/delete operations
  - `WorkspaceList.tsx` - List component showing all workspaces with management buttons
  - `index.ts` - Module exports
- Added CSS styles for workspace list in `src/renderer/styles/global.css`
- Integrated into App.tsx with state management and handlers for:
  - `handleWorkspaceSelect` - Switch to a workspace by index
  - `handleWorkspaceCreate` - Create new workspace
  - `handleWorkspaceRename` - Rename existing workspace
  - `handleWorkspaceDuplicate` - Duplicate a workspace with its buttons/encoders
  - `handleWorkspaceDelete` - Delete a workspace (with image sync to new active)

**Files Changed:**
- `src/shared/types/device.ts` - Added workspace button index constants
- `src/renderer/App.tsx` - Added workspace management state, handlers, UI integration
- `src/renderer/components/WorkspaceManager/WorkspaceEditor.tsx` - NEW
- `src/renderer/components/WorkspaceManager/WorkspaceList.tsx` - NEW
- `src/renderer/components/WorkspaceManager/index.ts` - NEW
- `src/renderer/styles/global.css` - Added workspace list styles

All 1041 tests pass.

### Image Upload Validation & Progress Indicator (Completed)
Implemented comprehensive image validation feedback and upload progress indicator in ImagePicker component.

**Features Implemented:**

1. **Image Dimension Display**: Shows current image dimensions (e.g., "480x320px") below the preview

2. **Validation Feedback**:
   - File extension validation for supported formats (PNG, JPG, JPEG, GIF, BMP, ICO, SVG)
   - Dimension warnings for:
     - Small images (<60px) that may appear pixelated
     - Large images (>512px) that will be resized
     - Non-square images that may be cropped
   - URL/path format validation with warnings for invalid patterns

3. **Upload Progress Indicator**:
   - Overlay spinner on preview area during upload
   - Progress percentage display (when provided)
   - Disabled state for inputs/buttons during upload

4. **Visual Feedback**:
   - Error state (red border) for invalid inputs
   - Warning state (orange border) for potential issues
   - Info messages with helpful suggestions

5. **Corrected Image Size Hint**: Updated from "72x72px" to "60x60px" to match actual backend processing

**Files Changed:**
- `src/renderer/components/ActionEditor/ImagePicker.tsx` - Added validation logic, dimension tracking, progress overlay
- `src/renderer/components/ActionEditor/ActionEditor.tsx` - Pass `isUploading` prop to ImagePicker
- `src/renderer/styles/global.css` - Added styles for feedback messages, upload overlay, input states

All 1041 tests pass.

### Workspace Action UI Integration (Completed)
Added UI support for configuring workspace navigation actions in the ActionEditor.

**Features Implemented:**

1. **WorkspaceActionForm Component**: New form component for configuring workspace actions
   - Direction selector: Next, Previous, or Specific workspace
   - Target workspace dropdown (only shown when direction is "specific")
   - Loads workspaces from current profile via API
   - Handles API unavailability gracefully

2. **ActionTypeSelect Integration**: Added 'workspace' option to action type dropdown
   - Icon: 📁
   - Description: "Navigate between workspaces"

3. **ActionEditor Integration**: Full rendering and state management for workspace actions
   - Added WorkspaceAction type import
   - Added default action creation (type: 'workspace', direction: 'next')
   - Added WorkspaceActionForm rendering case

**Files Changed:**
- `src/renderer/components/ActionEditor/WorkspaceAction.tsx` - NEW: WorkspaceActionForm component
- `src/renderer/components/ActionEditor/ActionTypeSelect.tsx` - Added 'workspace' to ActionTypeOption and ACTION_TYPES
- `src/renderer/components/ActionEditor/ActionEditor.tsx` - Import, default action, and rendering for workspace
- `src/renderer/components/ActionEditor/index.ts` - Export WorkspaceActionForm

All 1041 tests pass.

### Workspace Component Tests (Completed)
Added comprehensive test coverage for the new workspace-related React components.

**Test Files Added:**
- `src/renderer/components/ActionEditor/WorkspaceAction.test.tsx` - 19 tests covering WorkspaceActionForm
- `src/renderer/components/WorkspaceManager/WorkspaceEditor.test.tsx` - 34 tests covering modal dialogs
- `src/renderer/components/WorkspaceManager/WorkspaceList.test.tsx` - 30 tests covering workspace list UI

**Test Coverage:**
- WorkspaceActionForm: Direction selection, workspace loading, error handling, config changes
- WorkspaceEditor: Create/rename/duplicate/delete modes, validation, error handling, keyboard navigation
- WorkspaceList: Rendering, selection, action buttons, loading/empty states, pluralization

All 1124 tests pass.

---

## Remaining Work

### Image Upload Enhancements (Partially Complete)
- ~~Validation feedback (file size, format errors)~~ ✓ Completed
- ~~Progress indicator during image upload~~ ✓ Completed
- Frontend preview of processed result before upload (would require backend round-trip)
- Image cropping/editing UI (complex feature, lower priority)

---

## Known Issues

### Rust Test Compilation
**FIXED**: Test compilation errors in `src-tauri/src/actions/` tests have been resolved. Test fixtures now use correct struct initialization patterns with all required fields.

**Note**: Linker errors may still occur in environments without GTK/WebKit libraries installed. Use `cargo check --lib` to verify library compilation without linking.

### Development Environment
- Rust tests require Tauri platform libraries (GTK, WebKit, etc.) for linking
- TypeScript tests pass (1041 tests)
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
