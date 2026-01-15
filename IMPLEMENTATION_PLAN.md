# SOOMFON CN002-4B27 Implementation Plan

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

## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Device Discovery | COMPLETE |
| 2 | Protocol Implementation | COMPLETE |
| 3 | Actions Framework | COMPLETE |
| 4 | Configuration System | COMPLETE |
| 5 | GUI Application | COMPLETE |
| 6 | Home Assistant / Node-RED Integration | PARTIALLY COMPLETE |
| 7 | Polish & Distribution | NOT STARTED |

**Test Coverage Summary:**
- Total test files: 12
- Total test blocks: 252
- Tested handlers: 4 (profile, text, home-assistant, node-red) with 81 test cases
- Untested handlers: 6 (keyboard, launch, script, http, media, system)

---

## Prioritized Implementation Items

### HIGH PRIORITY - Significant Functionality Gaps

#### Test Coverage (6 Handlers Without Tests)

| Handler | Lines | Status |
|---------|-------|--------|
| `keyboard-handler.ts` | 402 | NO TESTS |
| `script-handler.ts` | 283 | NO TESTS |
| `http-handler.ts` | 230 | NO TESTS |
| `launch-handler.ts` | 171 | NO TESTS |
| `system-handler.ts` | 147 | NO TESTS |
| `media-handler.ts` | 131 | NO TESTS |

Reference implementations exist:
- `profile-handler.test.ts` - 14 tests, comprehensive
- `text-handler.test.ts` - 15 tests, comprehensive
- `home-assistant-handler.test.ts` - 28 tests, comprehensive
- `node-red-handler.test.ts` - 24 tests, comprehensive

#### Device Layer Issues

- **MI_01 keyboard interface NOT implemented:**
  - `KEYBOARD_USAGE_PAGE` (0x0001) and `KEYBOARD_USAGE` (0x0006) defined in `src/core/device/device.ts`
  - Constants are NEVER used - `hid-manager.ts` only opens MI_00 (vendor interface)
  - Standard keyboard HID events unavailable

- **No command acknowledgment handling:**
  - `write()` returns byte count only, no device confirmation
  - No response/ACK parsing for reliability

- **No write timeout enforcement:**
  - Only read operations have timeout support
  - Write operations can hang indefinitely

- **Silent error swallowing in read operations:**
  - `read()` and `readTimeout()` catch all exceptions and return null
  - Located at `src/core/device/hid-manager.ts` lines 178-203
  - Errors are silently discarded without logging

- **No image transfer validation:**
  - No device acknowledgment after image packets
  - No verification that image data was fully received

- **Checksum functions unused:**
  - `calculateChecksum()` and `isValidPacket()` defined at `src/core/device/packet-builder.ts` lines 147-165
  - Functions are NEVER called anywhere in codebase
  - No data integrity verification

### MEDIUM PRIORITY - Feature Enhancements

#### Network Resilience

- **Add retry/backoff strategy for integration clients:**
  - Home Assistant client: Single attempts with 10s timeout, no retry logic
  - Node-RED client: Single attempts with 10s timeout, no retry logic
  - Consider using `exponential-backoff` package (already in dependencies)

#### Home Assistant Additional Methods

Existing methods: `configure`, `isConfigured`, `getBaseUrl`, `checkConnection`, `getStates`, `getState`, `callService`, `toggleLight`, `setLightBrightness`, `runScript`, `turnOn`, `turnOff`, `toggle`, `triggerAutomation`

Missing methods:
- `setLightColor()` - RGB/HSL color control for smart lights
- `setClimate()` - Thermostat/HVAC temperature and mode control
- `callScene()` - Scene activation as dedicated action

#### Security Improvements

- **Implement secure token storage:**
  - Currently stored as plain string in memory (`src/core/integrations/home-assistant.ts` line 100: `private accessToken: string = ''`)
  - No OS keychain or safeStorage usage found
  - Use Electron's `safeStorage` API or `keytar` package

#### Form Validation Improvements

- **Add URL format validation to `HttpAction.tsx`:**
  - Currently accepts any text in URL field
  - No real-time validation or user feedback

- **Add path existence validation to `LaunchAction.tsx`:**
  - Only shows errors from file dialog failures
  - No validation that entered path exists on filesystem

- **Improve JSON validation feedback:**
  - Silent parse failures in body fields:
    - `HttpAction.tsx` lines 59-65
    - `HomeAssistantAction.tsx` lines 120-130
    - `NodeRedAction.tsx` lines 78-83
  - Should show inline error when JSON is malformed

#### Error Boundaries

- **Add granular React error boundaries:**
  - Currently only app-level boundary at `src/renderer/main.tsx` lines 24-29
  - No isolation for component failures
  - Add boundaries around:
    - ActionEditor forms
    - Settings panels
    - Profile manager
    - DeviceView component

#### Accessibility Improvements

- **Add `htmlFor` attributes to action form labels:**
  - Most ActionEditor form components missing `htmlFor`
  - Settings components (`IntegrationSettings`, `DeviceSettings`, `AppSettings`, `ProfileEditor`) have proper labels

- **Add ARIA attributes to status indicators:**
  - Status dots missing `aria-hidden` or `aria-label`:
    - `Header.tsx` line 45
    - `DeviceSettings.tsx` lines 115-121
  - Color-only indicators need text alternatives

- **Add keyboard navigation to dropdowns:**
  - `ProfileSelector` dropdown has no arrow key navigation
  - No keyboard focus indicators for device components

#### Configuration System

- **Integrate file picker for config import/export:**
  - File I/O exists but uses JSON strings only
  - No file dialog integration for user-friendly import/export
  - Can now use `dialog:openFile` IPC handler (implemented)

Note: The following features are already implemented:
- Version compatibility checking (`src/core/config/migrations.ts` lines 291-304)
- Migration rollback mechanism (`src/core/config/migrations.ts` lines 122-224)
- URL validation in schemas (`src/core/actions/validation.ts` lines 178, 199)

---

### LOW PRIORITY - Polish & Distribution (Phase 7)

#### Developer Experience

- **Add file logging for errors:**
  - Persist errors to log file for debugging
  - Include rotation to prevent unbounded growth

#### User Experience

- **Add keyboard shortcuts:**
  - Profile switching: 1-9 keys
  - Settings: Ctrl+, (comma)
  - Save: Ctrl+S

- **Add image caching layer:**
  - Cache processed button images to reduce CPU usage
  - Implement LRU eviction strategy

#### Distribution

- **Configure Windows installer:**
  - Create NSIS or Squirrel.Windows installer configuration
  - Include auto-update support

- **Create README documentation:**
  - Installation instructions
  - Configuration guide
  - Troubleshooting section

---

## Phase 6 Completion Checklist

### Implemented
- [x] `src/core/integrations/home-assistant.ts` - Client library
- [x] `src/core/integrations/node-red.ts` - Client library
- [x] `src/core/actions/handlers/home-assistant-handler.ts` - Action handler with 28 tests
- [x] `src/core/actions/handlers/node-red-handler.ts` - Action handler with 24 tests
- [x] `src/renderer/components/ActionEditor/HomeAssistantAction.tsx` - Form component
- [x] `src/renderer/components/ActionEditor/NodeRedAction.tsx` - Form component
- [x] `src/renderer/components/Settings/IntegrationSettings.tsx` - Settings panel

### Not Implemented
- [ ] `src/core/integrations/presets.ts` - Integration presets for quick setup
- [ ] `src/renderer/components/IntegrationPresets/PresetSelector.tsx` - Preset picker UI
- [ ] `src/renderer/components/EntityBrowser/EntityBrowser.tsx` - Modal to browse Home Assistant entities

---

## Code Quality Metrics

| Metric | Value |
|--------|-------|
| TODO comments | 0 |
| FIXME comments | 0 |
| Skipped tests | 0 |
| Total test files | 12 |
| Total test blocks | 252 |

---

## File Reference

| Area | Key Files |
|------|-----------|
| IPC Handlers | `src/main/ipc-handlers.ts` |
| IPC Types | `src/shared/types/ipc.ts` |
| Action Schemas | `src/core/actions/schemas.ts` |
| Action Validation | `src/core/actions/validation.ts` |
| HID Manager | `src/core/device/hid-manager.ts` |
| Device Constants | `src/core/device/device.ts` |
| Protocol | `src/core/device/soomfon-protocol.ts` |
| Packet Builder | `src/core/device/packet-builder.ts` |
| Config Migrations | `src/core/config/migrations.ts` |
| HA Client | `src/core/integrations/home-assistant.ts` |
| Node-RED Client | `src/core/integrations/node-red.ts` |
| Action Forms | `src/renderer/components/ActionEditor/*.tsx` |
| Settings | `src/renderer/components/Settings/*.tsx` |
| App Entry | `src/renderer/main.tsx` |
