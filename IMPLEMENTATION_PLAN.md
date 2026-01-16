# SOOMFON Controller - Tauri Rewrite Implementation Plan

**Goal:** Rewrite from Electron to Rust/Tauri for minimal resource usage
**Target:** < 10 MB installer, < 25 MB RAM idle, < 500ms startup
**Last Updated:** 2026-01-16

---

## Current vs Target

| Metric | Electron (Now) | Tauri (Target) | Impact |
|--------|----------------|----------------|--------|
| Installer | 105 MB | < 10 MB | **10x smaller** |
| RAM (idle) | ~200 MB | < 25 MB | **8x less memory** |
| RAM (active) | ~400 MB | < 60 MB | **7x less memory** |
| Startup | 2-4s | < 500ms | **4-8x faster** |

---

## Migration Priority Order

The phases are prioritized by their impact on achieving migration goals:

| Priority | Phase | Goal Impact | Rationale |
|----------|-------|-------------|-----------|
| **Critical** | Phase 0 | Code Quality | Must fix before migration to ensure clean port |
| **Critical** | Phase 1 | Foundation | Required to start any Tauri work |
| **Critical** | Phase 2 | Core Function | HID is the app's primary purpose |
| **High** | Phase 5 | Core Function | Actions make the device useful |
| **High** | Phase 4 | Data Integrity | Config needed for persistence |
| **Medium** | Phase 3 | Feature | Image processing for LCD buttons |
| **Medium** | Phase 7 | UX | React frontend mostly portable |
| **Low** | Phase 6 | Polish | Tray/auto-launch are nice-to-haves |
| **Low** | Phase 8 | Quality | Testing and optimization |

---

## Phase 0: Pre-Migration Cleanup (PRIORITY: CRITICAL)

Before starting the Tauri migration, fix all known issues in the Electron codebase to ensure a clean port.

### Task 0.1: Fix Failing Tests - COMPLETED
**Status:** 433 passing (100% pass rate)

- [x] **Fix 2 failures in launch-handler.test.ts**
  - Issue: Platform-specific path handling on Linux
  - Location: `src/core/actions/handlers/__tests__/launch-handler.test.ts`
  - Root cause: Tests tried to change process.platform at runtime but module constants are evaluated at load time
  - Solution: Tests now properly handle platform-specific behavior at actual load time

- [x] **Fix 1 failure in script-handler.test.ts**
  - Issue: Cancellation mock not working correctly
  - Location: `src/core/actions/handlers/__tests__/script-handler.test.ts`
  - Root cause: Tests tried to change process.platform at runtime but module constants are evaluated at load time
  - Solution: Tests now properly handle platform-specific behavior at actual load time

**Notes:**
- No skipped or flaky tests found
- All 433 tests pass consistently

### Task 0.2: Fix Type Definitions - COMPLETED
**Priority: CRITICAL - This creates functional bugs where longPress bindings silently fail**

- [x] **Add 'longPress' to EncoderTrigger type**
  - File: `src/shared/types/actions.ts` (line 248)
  - Changed to: `export type EncoderTrigger = 'rotateCW' | 'rotateCCW' | 'press' | 'release' | 'longPress';`
  - **Impact:** EncoderConfig now properly supports longPress bindings

- [x] **Add LONG_PRESS to EncoderEventType enum**
  - File: `src/shared/types/device.ts`
  - Added `LONG_PRESS` to the `EncoderEventType` enum

- [x] **Update encoder trigger schema**
  - File: `src/core/actions/schemas.ts`
  - Added 'longPress' to encoderTriggerSchema

- [x] **Update event-to-trigger mapping**
  - File: `src/core/actions/event-binder.ts`
  - Updated mapEncoderEventToTrigger function to handle LONG_PRESS

- [x] **Fix workaround in ipc-handlers.ts**
  - File: `src/main/ipc-handlers.ts` (line 294)
  - Changed workaround to use 'longPress' instead of 'press' trigger

### Task 0.2b: Fix Encoder Trigger Naming Inconsistency - NEW
**Priority: HIGH - Confusing mapping between layers**

- [ ] **Standardize encoder trigger names across codebase**
  - Action system uses: `'rotateCW'` / `'rotateCCW'`
  - IPC layer uses: `'clockwise'` / `'counterClockwise'`
  - Manual mapping exists at: `src/main/ipc-handlers.ts` (lines 640-648)
  - Decision needed: Pick one convention and use it everywhere
  - Recommendation: Use `'rotateCW'` / `'rotateCCW'` (matches config schema)

### Task 0.3: Remove Outdated Comments - COMPLETED
**Status:** All 3 outdated comments removed

The `openFileDialog` IS implemented at:
- `src/main/ipc-handlers.ts` (lines 712-734)
- `src/preload/index.ts` (lines 292-294)

Comments removed from:
- [x] `src/renderer/components/ActionEditor/ScriptAction.tsx` - Browse button works via `window.electronAPI.openFileDialog()`
- [x] `src/renderer/components/ActionEditor/LaunchAction.tsx` - Browse button works via `window.electronAPI.openFileDialog()`
- [x] `src/renderer/components/ActionEditor/ImagePicker.tsx` - Browse button works via `window.electronAPI.openFileDialog()`

### Task 0.4: Add Debug Logging Control - INCOMPLETE
**48 console.log statements found across 7 files with NO logging control**

- [ ] **Create logging utility: `src/shared/utils/logger.ts`**
  ```typescript
  const DEBUG = process.env.DEBUG_LOGGING === 'true';
  export const debug = (...args: unknown[]) => DEBUG && console.log(...args);
  export const logger = {
    debug: (...args: unknown[]) => DEBUG && console.log('[DEBUG]', ...args),
    info: (...args: unknown[]) => console.info('[INFO]', ...args),
    warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
    error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  };
  ```

- [ ] **Replace console.log in hid-manager.ts** (12 occurrences)
  - This is a critical migration module

- [ ] **Replace console.log in ipc-handlers.ts** (19 occurrences)
  - This is a critical migration module

- [ ] **Replace console.log in DeviceView.tsx** (8 occurrences)

- [ ] **Replace console.log in useDevice.ts** (4 occurrences)

- [ ] **Replace console.log in device-events.ts** (2 occurrences)
  - Lines 97, 124

- [ ] **Replace console.log in auto-launch.ts** (2 occurrences)

- [ ] **Replace console.log in index.ts** (1 occurrence)

**Note:** config-manager.ts properly uses console.info/warn/error (acceptable) - NOT console.log

### Task 0.5: Add Missing Test Coverage - INCOMPLETE
**Current: 430 tests total**

**Critical modules WITHOUT tests (prioritized for migration):**
- [ ] `src/core/device/hid-manager.ts` - 0 tests (CRITICAL for Tauri migration)
- [ ] `src/core/device/image-processor.ts` - 0 tests (CRITICAL for Tauri migration)
- [ ] `src/core/config/config-manager.ts` - 0 tests (CRITICAL for Tauri migration)
- [ ] `src/core/config/profile-manager.ts` - 0 tests (CRITICAL for Tauri migration)

**Additional modules without tests:**
- [ ] `src/core/device/packet-builder.ts` - 0 tests
- [ ] `src/core/device/soomfon-protocol.ts` - 0 tests
- [ ] `src/core/config/import-export.ts` - 0 tests
- [ ] `src/core/config/migrations.ts` - 0 tests

**Existing test gap:**
- [ ] `src/core/device/device-events.ts` - has 19 tests but `parseSoomfonReport()` (the most common format) is NOT tested

**Status Notes:**
- All 10 action handlers ARE well-tested (249 tests)
- No skipped or flaky tests found
- Action engine: 20 tests
- Event binder: 26 tests
- Validation: 33 tests

### Task 0.6: Add Input Validation - COMPLETED
**Status:** Input validation utilities implemented with 29 tests

**Created:** `src/shared/utils/validation.ts` with:
- [x] `validateBase64()` - Format validation and size limits (max 500KB)
- [x] `extractBase64Data()` - Handles data URLs and raw base64
- [x] `validateFilePath()` - Path traversal detection, length limits
- [x] `hasPathTraversal()` - Detects `..` path sequences
- [x] `validateImageInput()` - Unified image input validation

**Updated:** `src/main/ipc-handlers.ts` (SET_BUTTON_IMAGE handler)
- [x] Validates base64 format before Buffer.from()
- [x] Enforces 500KB size limit for decoded images
- [x] Handles data URL prefix stripping

**Updated:** `src/core/config/validation.ts` (Zod schemas)
- [x] Added `imageDataSchema` with format validation and size limits
- [x] Updated `buttonConfigSchema.image` to use new schema
- [x] Added `MAX_LABEL_LENGTH` constraint (255 chars)

**Design notes on script/launch handlers:**
- Path validation is *advisory* (warnings) not blocking
- The app's purpose IS to execute arbitrary commands/scripts
- Blocking path traversal would break legitimate use cases
- File existence validation already exists in script-handler.ts (line 116)

---

## What IS Already Complete (Electron Implementation)

These components are fully implemented and tested - ready for Tauri port:

### Core Systems - COMPLETE
- [x] All 10 action handlers (249 tests total)
- [x] Action engine with handler registry (20 tests)
- [x] Event binder for routing events to actions (26 tests)
- [x] All 30 IPC handlers matched to preload bridge
- [x] Config/Profile system with Zod validation (33 validation tests)
- [x] Image processor with RGB565 conversion
- [x] System tray with connection status
- [x] Auto-launch (Windows, macOS, Linux)
- [x] Home Assistant integration
- [x] Node-RED integration

### UI Components - COMPLETE (minimal tests)
- [x] All 31 React components exist
- [x] Only 3 components have tests (common components)
- [x] 6 custom hooks implemented

### Missing Features (Planned but NOT Implemented)
These are in the plans/ directory but not yet coded:

1. **Entity Browser Dialog for Home Assistant**
   - Planned in: `plans/06-integrations/07-entity-browser-dialog.md`
   - Would allow browsing HA entities instead of typing IDs

2. **Integration Presets**
   - Planned in: `plans/06-integrations/08-integration-presets.md`
   - Would provide pre-configured action templates

---

## Phase 1: Project Setup

### Task 1.1: Initialize Tauri Project
- [ ] Install Rust toolchain if not present
- [ ] Run `npm create tauri-app@latest soomfon-tauri`
- [ ] Select Vite + React + TypeScript template
- [ ] Verify `cargo tauri dev` runs successfully

### Task 1.2: Configure for Size Optimization
- [ ] Add release profile to Cargo.toml:
  ```toml
  [profile.release]
  opt-level = "z"
  lto = true
  codegen-units = 1
  panic = "abort"
  strip = true
  ```
- [ ] Configure tauri.conf.json for Windows

### Task 1.3: Add Core Dependencies
- [ ] Add to Cargo.toml:
  - `hidapi = "2.0"` (HID communication)
  - `image = "0.25"` (image processing)
  - `serde = { version = "1.0", features = ["derive"] }`
  - `serde_json = "1.0"`
  - `tokio = { version = "1", features = ["rt", "sync", "time"] }`
  - `uuid = { version = "1", features = ["v4"] }`
- [ ] Run `cargo check` to verify dependencies compile

---

## Phase 2: HID Communication Layer

**Electron Reference:** `src/core/device/hid-manager.ts`, `src/core/device/soomfon-protocol.ts`, `src/core/device/packet-builder.ts`

**Key Protocol Details:**
- Device VID: 0x1500, PID: 0x3001
- Vendor Usage Page: 0xffa0
- Report Size: 64 bytes
- LCD: 72x72 pixels, RGB565 format
- Timers: 1ms polling (Windows), 500ms long press, 50ms debounce

### Task 2.1: Create HID Module Structure
- [ ] Create `src-tauri/src/hid/mod.rs`
- [ ] Create `src-tauri/src/hid/types.rs` with:
  - `DeviceInfo` struct
  - `ConnectionState` enum
  - `SOOMFON_VID = 0x1500`
  - `SOOMFON_PID = 0x3001`
- [x] **Electron has:** Complete device constants and types

### Task 2.2: Port HID Manager (Basic)
- [ ] Create `src-tauri/src/hid/manager.rs`
- [ ] Implement `HidManager` struct with:
  - `new()` constructor
  - `enumerate_devices()` - list SOOMFON devices
  - `connect()` - open HID device
  - `disconnect()` - close device
  - `is_connected()` getter
- [x] **Electron has:** Full implementation with Windows polling workaround (1ms polling)

### Task 2.3: Port HID Manager (Communication)
- [ ] Add to `manager.rs`:
  - `write(data: &[u8])` - send data to device
  - `read_timeout(timeout_ms: i32)` - read with timeout
  - `start_polling()` - background read loop
  - `stop_polling()` - stop background loop
- [ ] Implement event emission for data received
- [x] **Electron has:** Working async polling with event emission

### Task 2.4: Port Packet Builder
- [ ] Create `src-tauri/src/hid/packets.rs`
- [ ] Implement packet building functions:
  - `build_wake_display_packet()`
  - `build_clear_screen_packet(button_index: Option<u8>)`
  - `build_brightness_packet(level: u8)`
  - `build_refresh_sync_packet()`
  - `build_image_header_packet(button_index, data_len, width, height)`
  - `build_image_data_packet(seq_num, data, is_last)`
- [x] **Electron has:** Complete packet builder with all commands

### Task 2.5: Port SOOMFON Protocol
- [ ] Create `src-tauri/src/hid/protocol.rs`
- [ ] Implement `SoomfonProtocol` struct with:
  - `wake_display()`
  - `clear_screen(button_index: Option<u8>)`
  - `set_brightness(level: u8)`
  - `refresh_sync()`
  - `set_button_image(button_index: u8, image_data: &[u8])`
- [x] **Electron has:** Full protocol implementation with chunked image upload

### Task 2.6: Create Tauri Commands for HID
- [ ] Create `src-tauri/src/commands/device.rs`
- [ ] Implement Tauri commands:
  - `#[tauri::command] connect_device()`
  - `#[tauri::command] disconnect_device()`
  - `#[tauri::command] get_device_status()`
  - `#[tauri::command] set_brightness(level: u8)`
  - `#[tauri::command] set_button_image(index: u8, image_path: String)`
- [ ] Register commands in `main.rs`
- [x] **Electron has:** All IPC handlers in `src/main/ipc-handlers.ts` (30 handlers)

### Task 2.7: Test HID Communication
- [ ] Create simple test: connect, set brightness, disconnect
- [ ] Verify device responds correctly
- [ ] Test image upload to one LCD button

---

## Phase 3: Image Processing

**Electron Reference:** `src/core/device/image-processor.ts`

### Task 3.1: Port Image Processor
- [ ] Create `src-tauri/src/image/mod.rs`
- [ ] Create `src-tauri/src/image/processor.rs`
- [ ] Implement:
  - `process_image(input: &[u8], options: ImageOptions) -> Vec<u8>`
  - `convert_to_rgb565(rgb_data: &[u8], width: u32, height: u32) -> Vec<u8>`
  - `create_solid_color(r: u8, g: u8, b: u8) -> Vec<u8>`
- [x] **Electron has:** Complete with sharp library, 72x72 LCD support, RGB565 conversion

### Task 3.2: Add Image Tauri Commands
- [ ] Add to device commands:
  - `#[tauri::command] upload_image(button_index: u8, image_path: String)`
  - `#[tauri::command] upload_image_data(button_index: u8, base64_data: String)`
- [ ] Test image upload through Tauri command
- [x] **Electron has:** `setButtonImage` IPC handler

---

## Phase 4: Configuration System

**Electron Reference:** `src/core/config/config-manager.ts`, `src/core/config/profile-manager.ts`, `src/shared/types/config.ts`

### Task 4.1: Define Config Types
- [ ] Create `src-tauri/src/config/mod.rs`
- [ ] Create `src-tauri/src/config/types.rs` with:
  - `AppSettings` struct
  - `Profile` struct
  - `ButtonConfig` struct
  - `EncoderConfig` struct
  - `Action` enum (all action types)
- [x] **Electron has:** Complete type definitions with Zod validation

### Task 4.2: Port Config Manager
- [ ] Create `src-tauri/src/config/manager.rs`
- [ ] Implement:
  - `ConfigManager::new(app_data_dir: PathBuf)`
  - `get_app_settings() -> AppSettings`
  - `set_app_settings(settings: AppSettings)`
  - `load()` / `save()` to JSON file
- [x] **Electron has:** electron-store with JSON persistence, migration support

### Task 4.3: Port Profile Manager
- [ ] Create `src-tauri/src/config/profiles.rs`
- [ ] Implement:
  - `ProfileManager::new(profiles_dir: PathBuf)`
  - `list() -> Vec<Profile>`
  - `get(id: &str) -> Option<Profile>`
  - `create(name: &str) -> Profile`
  - `update(id: &str, updates: ProfileUpdate)`
  - `delete(id: &str)`
  - `get_active() -> Profile`
  - `set_active(id: &str)`
- [x] **Electron has:** Full CRUD, import/export functionality

### Task 4.4: Create Config Tauri Commands
- [ ] Create `src-tauri/src/commands/config.rs`
- [ ] Implement commands:
  - `#[tauri::command] get_profiles()`
  - `#[tauri::command] get_active_profile()`
  - `#[tauri::command] set_active_profile(id: String)`
  - `#[tauri::command] create_profile(name: String)`
  - `#[tauri::command] update_profile(id: String, updates: ProfileUpdate)`
  - `#[tauri::command] delete_profile(id: String)`
  - `#[tauri::command] get_app_settings()`
  - `#[tauri::command] set_app_settings(settings: AppSettings)`
- [x] **Electron has:** All IPC handlers implemented

---

## Phase 5: Action System

**Electron Reference:** `src/core/actions/action-engine.ts`, `src/core/actions/event-binder.ts`, `src/core/actions/handlers/*.ts`

### Task 5.1: Define Action Types
- [ ] Create `src-tauri/src/actions/mod.rs`
- [ ] Create `src-tauri/src/actions/types.rs` with:
  - `ActionType` enum
  - `Action` enum with all variants
  - `ActionResult` struct
- [x] **Electron has:** Complete type definitions in `src/shared/types/actions.ts`

### Task 5.2: Port Action Engine
- [ ] Create `src-tauri/src/actions/engine.rs`
- [ ] Implement:
  - `ActionEngine` struct
  - `register_handler(handler: Box<dyn ActionHandler>)`
  - `execute(action: &Action) -> ActionResult`
  - `cancel()`
- [x] **Electron has:** Handler registry, execution with timeout, history tracking, statistics

### Task 5.3: Port Keyboard Handler
- [ ] Add dependency: `windows = { version = "0.58", features = ["Win32_UI_Input_KeyboardAndMouse"] }`
- [ ] Create `src-tauri/src/actions/handlers/keyboard.rs`
- [ ] Implement using Win32 `SendInput`:
  - Key press/release
  - Modifier keys (Ctrl, Alt, Shift, Win)
  - Key combinations
- [x] **Electron has:** Full implementation with 52 tests passing

### Task 5.4: Port Media Handler
- [ ] Create `src-tauri/src/actions/handlers/media.rs`
- [ ] Implement media key simulation:
  - Play/Pause
  - Next/Previous track
  - Volume up/down/mute
- [x] **Electron has:** Complete with 30 tests

### Task 5.5: Port Launch Handler
- [ ] Create `src-tauri/src/actions/handlers/launch.rs`
- [ ] Implement:
  - Launch application by path
  - Launch with arguments
  - Open URL in default browser
- [x] **Electron has:** Cross-platform with shell execution

### Task 5.6: Port HTTP Handler
- [ ] Add dependency: `reqwest = { version = "0.12", features = ["json"] }`
- [ ] Create `src-tauri/src/actions/handlers/http.rs`
- [ ] Implement:
  - GET/POST/PUT/DELETE requests
  - Custom headers
  - JSON body support
- [x] **Electron has:** Full implementation with 27 tests

### Task 5.7: Port System Handler
- [ ] Create `src-tauri/src/actions/handlers/system.rs`
- [ ] Implement:
  - Lock screen
  - Sleep/hibernate (optional)
  - Screenshot (optional)
- [x] **Electron has:** Implementation with 25 tests

### Task 5.8: Port Text Handler
- [ ] Create `src-tauri/src/actions/handlers/text.rs`
- [ ] Implement text typing using keyboard simulation
- [x] **Electron has:** Implementation with 14 tests

### Task 5.9: Port Script Handler
- [ ] Create `src-tauri/src/actions/handlers/script.rs`
- [ ] Implement:
  - Execute inline scripts (PowerShell, Bash, CMD)
  - Execute script files
  - Timeout handling
  - Process cancellation
- [x] **Electron has:** Implementation with 29 tests (after fix)

### Task 5.10: Port Home Assistant Handler
- [ ] Create `src-tauri/src/actions/handlers/home_assistant.rs`
- [ ] Implement:
  - Call service
  - Toggle entity
  - Fire event
- [x] **Electron has:** Full implementation with 21 tests

### Task 5.11: Port Node-RED Handler
- [ ] Create `src-tauri/src/actions/handlers/node_red.rs`
- [ ] Implement:
  - Trigger flow via HTTP
  - Send data to inject node
- [x] **Electron has:** Implementation with 21 tests

### Task 5.12: Port Profile Handler
- [ ] Create `src-tauri/src/actions/handlers/profile.rs`
- [ ] Implement:
  - Switch to profile by ID
  - Switch to profile by name
- [x] **Electron has:** Implementation with 12 tests

### Task 5.13: Port Event Binder
- [ ] Create `src-tauri/src/actions/event_binder.rs`
- [ ] Implement:
  - `EventBinder` struct
  - `bind_profile(profile: &Profile)`
  - `unbind()`
  - Route device events to actions
- [x] **Electron has:** Full implementation with 26 tests

---

## Phase 6: System Integration

**Electron Reference:** `src/main/tray.ts`, `src/main/auto-launch.ts`

### Task 6.1: Implement System Tray
- [ ] Add dependency: use Tauri's built-in tray
- [ ] Create `src-tauri/src/tray/mod.rs`
- [ ] Implement:
  - Tray icon with connection status
  - Context menu with profile selection
  - Show/hide window
  - Quit option
- [x] **Electron has:** Complete with connection status icons, context menu

### Task 6.2: Implement Auto-Launch
- [ ] Create `src-tauri/src/system/auto_launch.rs`
- [ ] Implement Windows registry manipulation:
  - `is_enabled() -> bool`
  - `enable()`
  - `disable()`
- [ ] Add `--hidden` argument support for tray-only start
- [x] **Electron has:** Windows registry, macOS login items, Linux XDG support

### Task 6.3: Add Auto-Launch Commands
- [ ] Create commands:
  - `#[tauri::command] get_auto_launch()`
  - `#[tauri::command] set_auto_launch(enabled: bool)`
- [x] **Electron has:** IPC handlers implemented

---

## Phase 7: Frontend Migration

**Electron Reference:** `src/renderer/**/*`

### Task 7.1: Copy Frontend Files
- [ ] Copy `src/renderer/*` to `soomfon-tauri/src/`
- [ ] Copy `src/shared/types/*` to `soomfon-tauri/src/types/`
- [ ] Update import paths
- [x] **Electron has:** Complete React UI with device visualization, action editors (43 component files)

### Task 7.2: Create IPC Bridge
- [ ] Create `src/lib/tauri.ts` with typed invoke wrappers:
  ```typescript
  export const device = {
    connect: () => invoke('connect_device'),
    disconnect: () => invoke('disconnect_device'),
    // ...
  }
  ```
- [x] **Electron has:** Preload bridge in `src/preload/index.ts` (26 invoke channels, 9 listen channels)

### Task 7.3: Update Hooks
- [ ] Update `useDevice.ts` to use Tauri invoke
- [ ] Update `useProfiles.ts` to use Tauri invoke
- [ ] Update `useConfig.ts` to use Tauri invoke
- [ ] Remove Electron-specific code
- [x] **Electron has:** Custom hooks in `src/renderer/hooks/` (6 hooks)

### Task 7.4: Update Event Listeners
- [ ] Replace Electron IPC listeners with Tauri events:
  - `listen('device-event', callback)`
  - `listen('connection-state', callback)`
- [x] **Electron has:** IPC event listeners

### Task 7.5: Remove Electron Dependencies
- [ ] Remove from package.json:
  - `electron`
  - `electron-builder`
  - `electron-store`
  - Any other Electron-specific packages
- [ ] Remove `src/main/`, `src/preload/` directories

---

## Phase 8: Testing & Polish

### Task 8.1: Test Device Communication
- [ ] Connect to SOOMFON device
- [ ] Test all button press/release events
- [ ] Test all encoder rotation events
- [ ] Test brightness control
- [ ] Test image upload to all 6 LCD buttons

### Task 8.2: Test Action System
- [ ] Test keyboard actions (single key, combos)
- [ ] Test media keys
- [ ] Test application launch
- [ ] Test HTTP requests
- [ ] Test Home Assistant integration
- [ ] Test Node-RED integration

### Task 8.3: Test Profile System
- [ ] Create/edit/delete profiles
- [ ] Switch between profiles
- [ ] Verify actions bind correctly on profile switch

### Task 8.4: Build Release
- [ ] Run `cargo tauri build`
- [ ] Verify installer size < 10 MB
- [ ] Install and test on clean Windows system
- [ ] Verify WebView2 installation handling

### Task 8.5: Memory Profiling
- [ ] Measure idle RAM usage (target: < 25 MB)
- [ ] Measure active RAM usage (target: < 60 MB)
- [ ] Measure startup time (target: < 500ms)
- [ ] Optimize any hotspots found

---

## Current Electron Implementation Reference

This section documents the complete Electron implementation that can be used as reference when porting to Rust/Tauri.

### Codebase Statistics
- **Total LOC:** ~23,000
- **Test Coverage:** 462 tests (100% passing)
- **Framework:** Electron 39.2.7 + Vite 7.3.1 + React 19.2.3 + TypeScript

### Core Modules (src/core/) - ALL COMPLETE

| Module | File | Status | Tests | Notes |
|--------|------|--------|-------|-------|
| HID Manager | `device/hid-manager.ts` | Complete | 0 | Windows 1ms polling workaround |
| Device Events | `device/device-events.ts` | Complete | 19 | Button/encoder event parsing (parseSoomfonReport untested) |
| Packet Builder | `device/packet-builder.ts` | Complete | 0 | All HID packet formats |
| SOOMFON Protocol | `device/soomfon-protocol.ts` | Complete | 0 | High-level device API |
| Image Processor | `device/image-processor.ts` | Complete | 0 | RGB565, 72x72 LCD |
| Config Manager | `config/config-manager.ts` | Complete | 0 | electron-store wrapper |
| Profile Manager | `config/profile-manager.ts` | Complete | 0 | CRUD + import/export |
| Import/Export | `config/import-export.ts` | Complete | 0 | Profile import/export |
| Validation | `config/validation.ts` | Complete | 33 | Zod schemas |
| Migrations | `config/migrations.ts` | Complete | 0 | Config versioning |
| Action Engine | `actions/action-engine.ts` | Complete | 20 | Handler registry, timeout |
| Event Binder | `actions/event-binder.ts` | Complete | 26 | Event->Action routing |

### Action Handlers (src/core/actions/handlers/) - ALL COMPLETE (249 tests)

| Handler | File | Status | Tests | Rust Complexity |
|---------|------|--------|-------|-----------------|
| Keyboard | `keyboard-handler.ts` | Complete | 52 | High (Win32 SendInput) |
| Media | `media-handler.ts` | Complete | 30 | High (Win32 SendInput) |
| Launch | `launch-handler.ts` | Complete | - | Low (Command::new) |
| Script | `script-handler.ts` | Complete | 29 | Medium (process spawn) |
| HTTP | `http-handler.ts` | Complete | 27 | Low (reqwest) |
| System | `system-handler.ts` | Complete | 25 | Medium (Win32 APIs) |
| Text | `text-handler.ts` | Complete | 14 | High (keyboard sim) |
| Profile | `profile-handler.ts` | Complete | 12 | Low (config lookup) |
| Home Assistant | `home-assistant-handler.ts` | Complete | 21 | Low (HTTP) |
| Node-RED | `node-red-handler.ts` | Complete | 21 | Low (HTTP) |

### Integrations (src/core/integrations/) - ALL COMPLETE

| Integration | File | Status | Notes |
|-------------|------|--------|-------|
| Home Assistant | `home-assistant.ts` | Complete | REST API client |
| Node-RED | `node-red.ts` | Complete | HTTP trigger client |

### Main Process (src/main/) - ALL COMPLETE

| Module | File | Status | Notes |
|--------|------|--------|-------|
| Main Entry | `index.ts` | Complete | Window management |
| IPC Handlers | `ipc-handlers.ts` | Complete | 30 handlers |
| System Tray | `tray.ts` | Complete | Status icons, menu |
| Auto-Launch | `auto-launch.ts` | Complete | Win/Mac/Linux |

### Renderer (src/renderer/) - ALL COMPLETE

| Component Category | Count | Status |
|--------------------|-------|--------|
| Device Visualization | 5+ | Complete |
| Action Editors | 10+ | Complete |
| Profile Management | 3+ | Complete |
| Settings Panels | 3+ | Complete |
| Common Components | 4 | Complete (tested) |
| Custom Hooks | 6 | Complete |

**Total: 43 renderer component files**

### Key Implementation Details

**HID Communication:**
- Uses `node-hid` library
- Windows requires 1ms polling (no native events)
- Interface 0 (MI_00) for button/encoder events
- Interface 2 (MI_02) for LCD image upload
- Report format: `[reportId, buttonIndex, state, ...]`

**Image Processing:**
- Uses `sharp` library for resize/convert
- Target: 72x72 pixels for LCD buttons
- Format: RGB565 (16-bit color, 2 bytes per pixel)
- Total: 10,368 bytes per button image

**Configuration:**
- Uses `electron-store` with JSON backend
- Zod schemas for validation
- Migration system for version upgrades
- Profiles stored as separate JSON files

**Action Execution:**
- Handler registry pattern
- 30-second default timeout
- Execution history tracking
- Statistics (success/failure counts)

---

## Dependencies Requiring Rust Replacement for Tauri

| Electron Dependency | Tauri Replacement | Complexity |
|---------------------|-------------------|------------|
| `node-hid` | Rust `hidapi` crate | HIGH |
| `sharp` | Rust `image` crate + `resvg` | MEDIUM |
| `electron-store` | Tauri filesystem API | MEDIUM |
| `@nut-tree-fork/nut-js` | Windows `SendInput` API via Rust | HIGH |
| Node.js `fs` module | Tauri filesystem commands | LOW |
| `axios` | Rust `reqwest` crate | LOW |
| EventEmitter | Tauri event system | LOW |

---

## File Structure Reference

```
soomfon-tauri/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── device.rs
│       │   └── config.rs
│       ├── hid/
│       │   ├── mod.rs
│       │   ├── types.rs
│       │   ├── manager.rs
│       │   ├── protocol.rs
│       │   └── packets.rs
│       ├── actions/
│       │   ├── mod.rs
│       │   ├── types.rs
│       │   ├── engine.rs
│       │   ├── event_binder.rs
│       │   └── handlers/
│       │       ├── mod.rs
│       │       ├── keyboard.rs
│       │       ├── media.rs
│       │       ├── launch.rs
│       │       ├── script.rs
│       │       ├── http.rs
│       │       ├── system.rs
│       │       ├── text.rs
│       │       ├── profile.rs
│       │       ├── home_assistant.rs
│       │       └── node_red.rs
│       ├── config/
│       │   ├── mod.rs
│       │   ├── types.rs
│       │   ├── manager.rs
│       │   └── profiles.rs
│       ├── image/
│       │   ├── mod.rs
│       │   └── processor.rs
│       ├── tray/
│       │   └── mod.rs
│       └── system/
│           └── auto_launch.rs
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── lib/
│   │   └── tauri.ts       # Tauri invoke wrappers
│   ├── components/
│   ├── hooks/
│   └── types/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Dependencies (Cargo.toml)

```toml
[package]
name = "soomfon-controller"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["rt", "sync", "time"] }
hidapi = "2.0"
image = "0.25"
reqwest = { version = "0.12", features = ["json"] }
uuid = { version = "1", features = ["v4"] }
directories = "5"
log = "0.4"
env_logger = "0.11"

[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = [
    "Win32_UI_Input_KeyboardAndMouse",
    "Win32_System_Registry"
]}

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

---

## Progress Tracking

### Phase 0: Pre-Migration Cleanup - IN PROGRESS
- [x] Task 0.1: Fix Failing Tests - **COMPLETED** (433 tests passing, 100% pass rate)
- [x] Task 0.2: Fix Type Definitions - **COMPLETED** (encoder longPress binding fixed)
- [ ] Task 0.2b: Fix Encoder Trigger Naming (rotateCW vs clockwise)
- [x] Task 0.3: Remove Outdated Comments - **COMPLETED** (3 files fixed)
- [ ] Task 0.4: Add Debug Logging Control (7 files, 48 console.logs)
- [ ] Task 0.5: Add Missing Test Coverage (8 critical modules + parseSoomfonReport)
- [x] Task 0.6: Add Input Validation - **COMPLETED** (29 tests, validation utilities)

### Remaining Phases
- [ ] Phase 1: Project Setup (Tasks 1.1-1.3)
- [ ] Phase 2: HID Communication (Tasks 2.1-2.7)
- [ ] Phase 3: Image Processing (Tasks 3.1-3.2)
- [ ] Phase 4: Configuration (Tasks 4.1-4.4)
- [ ] Phase 5: Action System (Tasks 5.1-5.13)
- [ ] Phase 6: System Integration (Tasks 6.1-6.3)
- [ ] Phase 7: Frontend Migration (Tasks 7.1-7.5)
- [ ] Phase 8: Testing & Polish (Tasks 8.1-8.5)

---

## Quick Start Checklist

1. [ ] **Complete Phase 0 Priority Items:**
   - [x] Fix CRITICAL encoder longPress type bug (Task 0.2) - **COMPLETED**
   - [ ] Fix encoder trigger naming inconsistency (Task 0.2b)
   - [x] Fix 3 failing tests (Task 0.1) - **COMPLETED**
   - [x] Add input validation (Task 0.6) - **COMPLETED**
2. [ ] **Complete Phase 0 Quality Items:**
   - [x] Remove outdated comments (Task 0.3) - **COMPLETED**
   - [ ] Add logging utility (Task 0.4)
   - [ ] Add tests for critical modules (Task 0.5)
3. [x] Run `npm test` - verify 433 tests pass (100%) - **COMPLETED**
4. [ ] Initialize Tauri project (Phase 1)
5. [ ] Port HID manager first (Phase 2) - this is the core functionality
6. [ ] Port action handlers (Phase 5) - makes the device useful
7. [ ] Migrate frontend (Phase 7) - mostly copy-paste with IPC changes
8. [ ] Build and measure - verify < 10 MB installer, < 25 MB RAM

---

## Phase 0 Completion Criteria

Phase 0 is complete when ALL of the following are true:

1. **Tests:** All tests pass (0 failures) - ✓ **COMPLETED**
2. **Types:** EncoderTrigger includes 'longPress', EncoderEventType includes LONG_PRESS - ✓ **COMPLETED**
3. **Types:** Encoder trigger naming is consistent across all layers
4. **Comments:** No false "not implemented" comments remain - ✓ **COMPLETED**
5. **Logging:** All console.log replaced with logger utility
6. **Security:** Input validation in place for images, file paths - ✓ **COMPLETED**
7. **Coverage:** Critical modules have basic test coverage

**Estimated effort:** 2-3 developer days
