# SOOMFON CN002-4B27 Implementation Plan

**Last Updated:** 2026-01-15 (Comprehensive verification with 12 parallel subagents)
**Project:** Custom Windows driver for SOOMFON CN002-4B27 stream deck
**Status:** ALL CLAIMS VERIFIED - Implementation gaps confirmed

---

## Project Overview

**Purpose:** Replace official SOOMFON software with a custom Electron application providing full control over the CN002-4B27 stream deck hardware.

**Target Device:**
- Model: SOOMFON CN002-4B27
- USB: VID 0x1500 (5376) / PID 0x3001 (12289)
- Layout: 6 LCD Keys, 3 Normal Buttons, 1 Main Encoder, 2 Side Encoders
- Interfaces: MI_00 (vendor commands) + MI_01 (keyboard events)

**Tech Stack:**
- Desktop: Electron + React + TypeScript + Vite
- Styling: Tailwind CSS
- USB: node-hid
- Images: sharp (RGB565 conversion)
- Automation: @nut-tree-fork/nut-js
- Storage: electron-store

---

## Phase Status Summary

| Phase | Description | Status | Progress | Notes |
|-------|-------------|--------|----------|-------|
| 1 | Device Discovery | COMPLETE | 100% | Fully working |
| 2 | Protocol Implementation | COMPLETE | 100% | Code done, IPC stubs pending |
| 3 | Action System | IN PROGRESS | 75% | Handlers done, NOT REGISTERED |
| 4 | Configuration System | COMPLETE | 100% | Fully working |
| 5 | Electron GUI | IN PROGRESS | 90% | UI done, save/clear stubs |
| 6 | Integrations (HA/Node-RED) | PARTIAL | 15% | Settings UI done, no backend |
| 7 | Polish & Distribution | PENDING | 5% | Build config ready, no tests |

**Overall Progress:** ~65% (Core components built, integration/wiring layer missing)

---

## Critical Gap Summary

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ HIDManager  │────▶│ EventParser │────▶│ EventBinder │────▶│ActionEngine │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                  ❌                   ❌                   │
       │              NOT WIRED            NOT WIRED               ▼
┌──────┴──────┐                         ┌─────────────┐     ┌─────────────┐
│  Soomfon    │◀────── IPC Handlers ────│   Profile   │     │  Handlers   │
│  Protocol   │            ▲            │   Manager   │     │ (6 ready)   │
└─────────────┘            │            └─────────────┘     └─────────────┘
       │                   │                                      ❌
       ▼            ┌──────┴──────┐                          NOT REGISTERED
┌─────────────┐     │    GUI      │
│ Device LCD  │     │  (Renderer) │
└─────────────┘     └─────────────┘
```

**Current Status:** The center pipeline (EventParser → EventBinder → ActionEngine with handlers) is NOT wired. All components exist and are fully implemented but not instantiated or connected.

---

## Prioritized Task List

Tasks sorted by priority. All items **VERIFIED** via code search on 2026-01-15.

---

### PRIORITY 1: Critical Path Blockers (MVP Required)

These tasks block the application from functioning at all.

#### P1.1: Wire Event Processing Pipeline ⚠️ CRITICAL
- **Files:** `src/main/index.ts`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** HIDManager → EventParser → EventBinder → ActionEngine pipeline not connected

**Verification Evidence:**
- `src/main/index.ts` contains NO import of DeviceEventParser or EventBinder
- HIDManager events only wired to TrayManager icon updates (lines 156-165)
- No event parsing or action execution occurs

**Required Changes:**
- [ ] Import `DeviceEventParser` from `src/core/device/device-events.ts`
- [ ] Import `EventBinder` from `src/core/actions/event-binder.ts`
- [ ] Create `DeviceEventParser` instance in main process
- [ ] Wire HIDManager `'data'` event to `parser.parseData()`
- [ ] Create `EventBinder` instance with ActionEngine
- [ ] Wire parser `'button'` event to `eventBinder.handleButtonEvent()`
- [ ] Wire parser `'encoder'` event to `eventBinder.handleEncoderEvent()`

**Code Location:** After `app.whenReady()` in `src/main/index.ts`

---

#### P1.2: Register Action Handlers with ActionEngine ⚠️ CRITICAL
- **Files:** `src/main/ipc-handlers.ts:124-130`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** ActionEngine created but 0/6 handlers registered

**Verification Evidence:**
```typescript
// Line 124-130 in ipc-handlers.ts
function initActionEngine(): ActionEngine {
  if (!actionEngine) {
    actionEngine = new ActionEngine();
    // Handlers are registered in the main index.ts after all modules are loaded
  }
  return actionEngine;
}
```
- Comment claims handlers registered in index.ts - this is **FALSE**
- `src/main/index.ts` does NOT import any handlers
- All 6 handlers exist and are FULLY IMPLEMENTED in `src/core/actions/handlers/`

**Required Changes:**
- [ ] Import all 6 handler classes from `src/core/actions/handlers/`
- [ ] Call `actionEngine.registerHandler()` for each:
  - KeyboardHandler (VERIFIED: fully implemented with nut-js)
  - LaunchHandler (VERIFIED: fully implemented)
  - ScriptHandler (VERIFIED: fully implemented)
  - HttpHandler (VERIFIED: fully implemented)
  - MediaHandler (VERIFIED: fully implemented)
  - SystemHandler (VERIFIED: fully implemented)

---

#### P1.3: Load Bindings from Active Profile on Startup
- **Files:** `src/main/index.ts`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** EventBinder never receives bindings from profile

**Profile Structure (VERIFIED):**
- Profiles store bindings in `buttons: ButtonConfig[]` and `encoders: EncoderConfig[]`
- ButtonConfig has: `index`, `action`, `longPressAction`, `image`, `label`
- EncoderConfig has: `index`, `pressAction`, `longPressAction`, `clockwiseAction`, `counterClockwiseAction`
- Event name is `'profile:activated'` (not 'activeProfileChanged')

**Required Changes:**
- [ ] After EventBinder creation, get active profile via `profileManager.getActive()`
- [ ] Convert `profile.buttons` and `profile.encoders` to ActionBinding format
- [ ] Call `eventBinder.loadBindings(convertedBindings)`
- [ ] Subscribe to ProfileManager `'profile:activated'` event to reload bindings on profile switch

---

#### P1.4: Implement SET_BRIGHTNESS IPC Handler
- **Files:** `src/main/ipc-handlers.ts:201-214`
- **Status:** STUB with TODO (VERIFIED at line 212)
- **Issue:** Handler updates config but doesn't send command to device

**Verification Evidence:**
```typescript
// Line 212-213 in ipc-handlers.ts
// TODO: Send brightness command to device via protocol
// This will be implemented when integrating with soomfon-protocol.ts
```

**Core Implementation Ready:**
- `SoomfonProtocol.setBrightness()` is FULLY IMPLEMENTED (lines 61-68)
- `buildBrightnessPacket()` is FULLY IMPLEMENTED in packet-builder.ts

**Required Changes:**
- [ ] Import SoomfonProtocol class
- [ ] Create/get SoomfonProtocol instance (pass hidManager)
- [ ] Call `protocol.setBrightness(brightness)` after validation
- [ ] Add error handling for device communication failure

---

#### P1.5: Implement SET_BUTTON_IMAGE IPC Handler
- **Files:** `src/main/ipc-handlers.ts:216-226`
- **Status:** STUB with TODO (VERIFIED at line 223)
- **Issue:** Handler only logs, doesn't transmit image

**Verification Evidence:**
```typescript
// Lines 223-225 in ipc-handlers.ts
// TODO: Send button image to device via image-processor.ts
// This will be implemented when integrating with image transmission
console.log(`Setting button ${request.buttonIndex} image`);
```

**Core Implementation Ready:**
- `ImageProcessor.processImage()` is FULLY IMPLEMENTED (converts to RGB565)
- `SoomfonProtocol.setButtonImage()` is FULLY IMPLEMENTED (handles chunked transmission)

**Required Changes:**
- [ ] Import ImageProcessor from `src/core/device/image-processor.ts`
- [ ] Import SoomfonProtocol from `src/core/device/soomfon-protocol.ts`
- [ ] Decode Base64 imageData from request to Buffer
- [ ] Use `ImageProcessor.processImage()` to convert to RGB565 format (72x72)
- [ ] Create/get SoomfonProtocol instance
- [ ] Call `protocol.setButtonImage(buttonIndex, processedBuffer)`

---

### PRIORITY 2: Persistence Layer (Configuration Saving)

These tasks enable user configurations to persist across restarts.

#### P2.1: Implement handleActionSave in Renderer
- **Files:** `src/renderer/App.tsx:370-378`
- **Status:** STUB - console.log only (VERIFIED)
- **Issue:** Action save only logs, doesn't call IPC

**Verification Evidence:**
```typescript
// Lines 373-374 in App.tsx
// TODO: Save action to configuration via IPC
console.log('Saving action for selection:', selection, 'Action:', action, 'Image:', imageUrl);
```

**Required Changes:**
- [ ] Replace console.log with IPC call to save binding
- [ ] Update profile via `window.electronAPI.profile.update()`
- [ ] Trigger image upload to device after save

---

#### P2.2: Implement handleEncoderSave in Renderer
- **Files:** `src/renderer/App.tsx:392-400`
- **Status:** STUB - console.log only (VERIFIED)
- **Issue:** Encoder config save only logs, doesn't call IPC

**Verification Evidence:**
```typescript
// Lines 395-396 in App.tsx
// TODO: Save encoder config to configuration via IPC
console.log('Saving encoder config for selection:', selection, 'Config:', encoderConfig);
```

**Required Changes:**
- [ ] Replace console.log with IPC call to save encoder binding
- [ ] Update profile via `window.electronAPI.profile.update()`

---

#### P2.3: Implement handleActionClear in Renderer
- **Files:** `src/renderer/App.tsx:381-389`
- **Status:** STUB - console.log only (VERIFIED)

**Verification Evidence:**
```typescript
// Lines 384-385 in App.tsx
// TODO: Clear action from configuration via IPC
console.log('Clearing action for selection:', selection);
```

**Required Changes:**
- [ ] Replace console.log with IPC call to remove binding from profile

---

#### P2.4: Implement handleEncoderClear in Renderer
- **Files:** `src/renderer/App.tsx:403-411`
- **Status:** STUB - console.log only (VERIFIED)

**Verification Evidence:**
```typescript
// Lines 406-407 in App.tsx
// TODO: Clear encoder config from configuration via IPC
console.log('Clearing encoder config for selection:', selection);
```

**Required Changes:**
- [ ] Replace console.log with IPC call to remove encoder binding from profile

---

#### P2.5: Add Binding Management IPC Handlers (Optional)
- **Files:** `src/main/ipc-handlers.ts`, `src/shared/types/ipc.ts`
- **Status:** DEFINED in types but NOT IMPLEMENTED (VERIFIED)
- **Issue:** 3 IPC channels declared but no handlers exist

**Missing Handlers:**
- [ ] `ActionChannels.GET_BINDINGS` - defined at ipc.ts:35, no implementation
- [ ] `ActionChannels.SAVE_BINDING` - defined at ipc.ts:36, no implementation
- [ ] `ActionChannels.DELETE_BINDING` - defined at ipc.ts:37, no implementation

**Note:** These may not be needed if binding persistence uses ProfileManager.update() directly. P2.1-P2.4 could update profile bindings without dedicated binding IPC.

---

#### P2.6: Reload EventBinder on Configuration Save
- **Files:** `src/main/index.ts` or `src/main/ipc-handlers.ts`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** After saving bindings, EventBinder doesn't reload them

**Required Changes:**
- [ ] After profile update, call `eventBinder.loadBindings()` with new bindings
- [ ] Or subscribe to ProfileManager 'profile:activated' event and reload automatically

---

### PRIORITY 3: Device Event Forwarding to UI (Optional for MVP)

These tasks enable the UI to react to device events.

#### P3.1: Forward Button Events to Renderer
- **Files:** `src/main/ipc-handlers.ts`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** Preload exposes listeners but main process never sends events

**Verification Evidence:**
- Preload defines `onButtonPress` and `onButtonRelease` listeners (preload/index.ts:119-124)
- No code in main process calls `sendToRenderer(DeviceChannels.BUTTON_PRESS, ...)`

**Missing Emissions:**
- [ ] `DeviceChannels.BUTTON_PRESS` - preload ready, no emission
- [ ] `DeviceChannels.BUTTON_RELEASE` - preload ready, no emission

**Required Changes:**
- [ ] In event pipeline, after parser emits button event, forward to renderer
- [ ] Call `mainWindow.webContents.send(DeviceChannels.BUTTON_PRESS, event)`

---

#### P3.2: Forward Encoder Events to Renderer
- **Files:** `src/main/ipc-handlers.ts`
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** Same as above for encoder events

**Missing Emissions:**
- [ ] `DeviceChannels.ENCODER_ROTATE` - preload ready, no emission
- [ ] `DeviceChannels.ENCODER_PRESS` - preload ready, no emission

---

### PRIORITY 0: Foundational Gaps (Quality/Distribution)

These don't block MVP but are significant gaps.

#### P0.1: Add Test Framework
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Issue:** Zero test files exist in the project

**Verification Evidence:**
- No `*.test.ts` or `*.spec.ts` files found anywhere
- No jest.config.js, vitest.config.ts, or any test framework config
- No test scripts in package.json
- No test dependencies (jest, vitest, mocha) in package.json
- 63 TypeScript/TSX source files with 0% test coverage

**Required Changes:**
- [ ] Install test framework (recommend Vitest for Vite projects)
- [ ] Add test script to package.json
- [ ] Create tests for core business logic (protocol, actions, config)

---

#### P0.2: Create Build Icon
- **Status:** MISSING (VERIFIED)
- **File:** `build/icon.ico`
- **Issue:** Windows installer will lack custom icon

**Verification Evidence:**
- `/workspace/build/` directory does not exist
- electron-builder.json references `"icon": "build/icon.ico"` (file missing)

**Required Changes:**
- [ ] Create `build/` directory
- [ ] Add `icon.ico` file (256x256 recommended)
- [ ] Optionally add `icon.png` for macOS builds

---

#### P0.3: Create Integration Test Script (Phase 2.5)
- **Status:** NOT IMPLEMENTED (VERIFIED)
- **Planned File:** `scripts/test-device.ts`
- **Issue:** No script to verify device protocol end-to-end

**Required Changes:**
- [ ] Create `scripts/test-device.ts` per `plans/02-protocol-implementation/05-integration-test.md`
- [ ] Test wake, brightness, clear, image transmission commands

---

### PRIORITY 4: Polish & Distribution

#### P4.1: Error Handling
- [ ] Add toast notifications for user-facing errors
- [ ] Add React error boundaries for component crashes
- [ ] Replace console.error calls with proper error UI

#### P4.2: Loading States
- [ ] Add loading spinners during device connection
- [ ] Add skeleton loaders for profile list
- [ ] Add progress indicator for image upload

#### P4.3: Windows Installer
- [ ] Configure electron-builder for NSIS installer (config exists)
- [ ] Test installation on clean Windows system
- [ ] Add auto-update capability (optional)

#### P4.4: Portable Executable
- [ ] Build portable .exe version
- [ ] Test without installation

---

### PRIORITY 5: Post-MVP (Optional)

#### P5.1: ProfileHandler Action
- **Files:** `src/core/actions/handlers/` (new file)
- **Status:** Schema exists, handler NOT IMPLEMENTED (VERIFIED)
- **Purpose:** Switch profiles via button press

**Notes:**
- Schema defined in `src/core/actions/schemas.ts:121-124`
- GUI already has profile switching - this is convenience feature

---

#### P5.2: TextHandler Action
- **Files:** `src/core/actions/handlers/` (new file)
- **Status:** Schema exists, handler NOT IMPLEMENTED (VERIFIED)
- **Purpose:** Type text macros via button press

**Notes:**
- Schema defined in `src/core/actions/schemas.ts:127-131`
- KeyboardHandler can cover most use cases

---

#### P5.3: Home Assistant Integration (Phase 6)
- **Status:** PARTIAL (Settings UI done, backend missing)
- **Plans:** `plans/06-integrations/01-home-assistant-client.md`

**What Exists (VERIFIED):**
- Settings UI complete in `src/renderer/components/Settings/IntegrationSettings.tsx` (386 lines)
- URL/token inputs, enable toggle, test connection button
- `HomeAssistantSettings` type in `src/shared/types/config.ts`
- Default settings defined, ConfigManager handles persistence

**What's Missing:**
- [ ] `src/core/integrations/home-assistant.ts` - REST API client
- [ ] `src/core/actions/handlers/home-assistant-handler.ts` - Action handler
- [ ] `src/renderer/components/ActionEditor/HomeAssistantAction.tsx` - Action form
- [ ] Add `'home_assistant'` to action type enum in schemas.ts

---

#### P5.4: Node-RED Integration (Phase 6)
- **Status:** PARTIAL (Settings UI done, backend missing)
- **Plans:** `plans/06-integrations/04-node-red-webhook-client.md`

**What Exists (VERIFIED):**
- Settings UI complete in `src/renderer/components/Settings/IntegrationSettings.tsx`
- Webhook URL input, enable toggle, test button
- `NodeRedSettings` type in `src/shared/types/config.ts`

**What's Missing:**
- [ ] `src/core/integrations/node-red.ts` - Webhook client
- [ ] `src/core/actions/handlers/node-red-handler.ts` - Action handler
- [ ] Add `'node_red'` to action type enum in schemas.ts

---

## Component Readiness Summary

| Component | Code Complete | Wired/Integrated | Verification |
|-----------|---------------|------------------|--------------|
| HIDManager | ✅ DONE | ✅ DONE | Emits events, connected to tray |
| DeviceEventParser | ✅ DONE | ❌ NOT DONE | Class exists, not instantiated |
| EventBinder | ✅ DONE | ❌ NOT DONE | Class exists, not instantiated |
| ActionEngine | ✅ DONE | ⚠️ PARTIAL | Created, no handlers registered |
| KeyboardHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| LaunchHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| ScriptHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| HttpHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| MediaHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| SystemHandler | ✅ DONE | ❌ NOT DONE | Fully implemented, not registered |
| ProfileHandler | ❌ NOT DONE | ❌ NOT DONE | Schema only, Post-MVP |
| TextHandler | ❌ NOT DONE | ❌ NOT DONE | Schema only, Post-MVP |
| SoomfonProtocol | ✅ DONE | ❌ NOT DONE | setBrightness/setButtonImage ready |
| ImageProcessor | ✅ DONE | ❌ NOT DONE | processImage ready, not called |
| ProfileManager | ✅ DONE | ✅ DONE | Fully working |
| ConfigManager | ✅ DONE | ✅ DONE | Fully working |
| All UI Components | ✅ DONE | ✅ DONE | Fully working |
| IPC Handlers | ⚠️ PARTIAL | ⚠️ PARTIAL | 2 TODO stubs, 3 missing channels |
| Test Framework | ❌ NOT DONE | ❌ NOT DONE | Zero tests exist |
| Build Icon | ❌ NOT DONE | ❌ NOT DONE | build/icon.ico missing |
| HA Settings UI | ✅ DONE | ✅ DONE | In IntegrationSettings.tsx |
| HA Backend | ❌ NOT DONE | ❌ NOT DONE | Client + handler missing |
| NR Settings UI | ✅ DONE | ✅ DONE | In IntegrationSettings.tsx |
| NR Backend | ❌ NOT DONE | ❌ NOT DONE | Client + handler missing |

---

## Action Type Coverage

| Action Type | Schema | Handler | Registered | Status |
|-------------|--------|---------|------------|--------|
| keyboard | ✅ | ✅ | ❌ | Ready, not wired |
| launch | ✅ | ✅ | ❌ | Ready, not wired |
| script | ✅ | ✅ | ❌ | Ready, not wired |
| http | ✅ | ✅ | ❌ | Ready, not wired |
| media | ✅ | ✅ | ❌ | Ready, not wired |
| system | ✅ | ✅ | ❌ | Ready, not wired |
| profile | ✅ | ❌ | ❌ | Post-MVP |
| text | ✅ | ❌ | ❌ | Post-MVP |
| home_assistant | ❌ | ❌ | ❌ | Phase 6 |
| node_red | ❌ | ❌ | ❌ | Phase 6 |

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/main/index.ts` | Main process entry | Needs pipeline wiring (P1.1, P1.3) |
| `src/main/ipc-handlers.ts` | IPC handler registration | 2 TODO stubs (P1.4, P1.5), needs handler registration (P1.2) |
| `src/renderer/App.tsx` | Main UI component | 4 console.log stubs (P2.1-P2.4) |
| `src/core/device/soomfon-protocol.ts` | Device protocol | DONE - setBrightness, setButtonImage ready |
| `src/core/device/image-processor.ts` | Image conversion | DONE - processImage ready |
| `src/core/device/device-events.ts` | Event parser | DONE - parseData, emits button/encoder |
| `src/core/actions/event-binder.ts` | Event-action mapper | DONE - handleButtonEvent, handleEncoderEvent |
| `src/core/actions/action-engine.ts` | Action executor | DONE - execute, registerHandler |
| `src/core/actions/handlers/*.ts` | 6 action handlers | DONE - all fully implemented |
| `src/preload/index.ts` | IPC bridge | DONE |
| `src/shared/types/ipc.ts` | IPC type definitions | 3 channels defined but unused |
| `src/shared/types/config.ts` | Profile/Button/Encoder types | DONE - reference for binding structure |
| `src/core/config/validation.ts` | Zod schemas | DONE - button indices 0-14, encoder 0-2 |
| `src/renderer/components/Settings/IntegrationSettings.tsx` | HA/Node-RED UI | DONE - settings complete |

---

## TODO Locations Summary

All TODO comments in the codebase (6 critical + 2 minor):

| File | Line | TODO | Priority |
|------|------|------|----------|
| `src/main/ipc-handlers.ts` | 212 | Send brightness command to device | P1.4 |
| `src/main/ipc-handlers.ts` | 223 | Send button image to device | P1.5 |
| `src/renderer/App.tsx` | 373 | Save action to configuration via IPC | P2.1 |
| `src/renderer/App.tsx` | 384 | Clear action from configuration via IPC | P2.3 |
| `src/renderer/App.tsx` | 395 | Save encoder config to configuration via IPC | P2.2 |
| `src/renderer/App.tsx` | 406 | Clear encoder config from configuration via IPC | P2.4 |
| `docs/soomfon-protocol.md` | 125 | Historic protocol research notes | Low |
| `docker-compose.yml` | 15-16 | Git user config for Docker dev | Low |

---

## Profile Data Structure Reference

Profiles store action bindings directly:

```typescript
// src/shared/types/config.ts
interface Profile {
  id: string;
  name: string;
  buttons: ButtonConfig[];    // Button bindings stored here
  encoders: EncoderConfig[];  // Encoder bindings stored here
  // ...
}

interface ButtonConfig {
  index: number;              // 0-14 (device supports 0-5 LCD + 3 normal)
  action?: Action;            // Normal press action
  longPressAction?: Action;   // Long press action
  image?: string;             // Base64 image data
  label?: string;
}

interface EncoderConfig {
  index: number;                    // 0-2 (main + 2 side encoders)
  pressAction?: Action;             // Press action
  longPressAction?: Action;         // Long press action
  clockwiseAction?: Action;         // CW rotation
  counterClockwiseAction?: Action;  // CCW rotation
}
```

**Validation:** Button indices 0-14, Encoder indices 0-2 (see `src/core/config/validation.ts`)

---

## Implementation Order Recommendation

**Phase A: MVP Core (makes device functional)**
1. **P1.1 + P1.2** - Wire event pipeline and register handlers (makes actions work)
2. **P1.3** - Load bindings from profile (actions now execute based on config)
3. **P1.4 + P1.5** - Implement brightness and image IPC (device LCD responds)

**Phase B: Persistence (makes changes stick)**
4. **P2.1-P2.4** - Implement save/clear in renderer (UI can persist changes)
5. **P2.6** - Reload bindings on save (live updates work)

**Phase C: Quality & Distribution**
6. **P0.1** - Add test framework (prevents regressions)
7. **P0.2** - Create build icon (professional installer)
8. **P3.x** - Optional UI feedback for device events
9. **P4.x** - Polish and distribution

**Phase D: Post-MVP**
10. **P5.x** - Home Assistant, Node-RED, ProfileHandler, TextHandler

---

## Verification Checklist

```bash
# Build verification
npm run build          # TypeScript compiles ✓ (verified)
npm run typecheck      # Type checking passes ✓ (verified)

# Runtime verification
npm run dev            # App starts with device

# Functional verification (after implementation)
□ Button press -> action executes (requires P1.1, P1.2, P1.3)
□ Encoder rotation -> action executes (requires P1.1, P1.2, P1.3)
□ Brightness slider -> device LCD brightness changes (requires P1.4)
□ Image upload -> device LCD displays image (requires P1.5)
□ Save action -> persists after app restart (requires P2.1-P2.4, P2.6)
□ Profile switch -> bindings reload (requires P1.3)

# Distribution verification
npm run dist           # Creates installer (needs build/icon.ico)

# Test verification (after P0.1)
npm run test           # Unit tests pass
```
