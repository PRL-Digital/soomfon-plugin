# CLAUDE.md - AI Agent Guide

This file provides essential context for AI agents working on the SOOMFON Controller codebase.

## Project Overview

**Purpose**: Desktop application controlling SOOMFON CN002-4B27 stream deck HID devices

**Stack**:
- Frontend: React 19 + TypeScript + Vite
- Backend: Rust (Tauri 2.x)
- Testing: Vitest (1179+ tests)
- Styling: Tailwind CSS v4

**Status**: Phase 5 complete (Electron GUI migrated to Tauri). Ready for Phase 6 (Integrations).

## Architecture

### Dual-Language Structure

```
TypeScript (src/)          Rust (src-tauri/)
├── Shared types           ├── HID communication
├── React UI               ├── Config persistence
├── Business logic tests   ├── Image processing
└── Tauri API adapter      └── Action execution
```

### Data Flow

```
Device USB → Rust HID Manager → IPC → React UI
                                 ↓
                          Config Manager (Rust)
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/shared/types/` | TypeScript type definitions (source of truth for frontend) |
| `src/renderer/components/` | React UI components |
| `src/core/actions/` | Action handlers and event binding logic |
| `src/core/config/` | Config validation and profile management |
| `src-tauri/src/hid/` | USB HID communication (Rust) |
| `src-tauri/src/config/` | Config persistence (Rust) |
| `src-tauri/src/image/` | Image processing for LCD buttons (Rust) |
| `docs/` | Protocol documentation |

## Common Development Tasks

### Run Development Server
```bash
npm run tauri:dev
```

### Run Tests
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### Type Check
```bash
npm run typecheck
```

### Build
```bash
npm run tauri:build         # Production build
```

### Rust-Only Commands
```bash
cd src-tauri
cargo check                 # Verify compilation
cargo test                  # Rust unit tests (requires platform libs)
```

## Testing Patterns

- Tests use Vitest with happy-dom
- Mock Tauri API via `src/lib/tauri-api.ts`
- Test files: `*.test.ts` or `*.test.tsx`
- Run specific test: `npx vitest run path/to/test.ts`

## Device-Specific Information

### Constants

| Constant | Value | Location |
|----------|-------|----------|
| `SOOMFON_VID` | `0x1500` | `src-tauri/src/hid/types.rs` |
| `SOOMFON_PID` | `0x3001` | `src-tauri/src/hid/types.rs` |
| `LCD_WIDTH/HEIGHT` | `60` | `src-tauri/src/hid/types.rs` |
| `SHIFT_BUTTON_INDEX` | `6` | `src/shared/types/device.ts` |
| `WORKSPACE_PREV_BUTTON_INDEX` | `7` | `src/shared/types/device.ts` |
| `WORKSPACE_NEXT_BUTTON_INDEX` | `8` | `src/shared/types/device.ts` |

### Button Indexing

| UI Index | Protocol Index | Description |
|----------|----------------|-------------|
| 0-5 | 1-6 | LCD Buttons (protocol is 1-indexed) |
| 6 | 0x25 | Small Button 0 (SHIFT) |
| 7 | 0x30 | Small Button 1 (Prev Workspace) |
| 8 | 0x31 | Small Button 2 (Next Workspace) |

### Encoder Event IDs

| Encoder | Press | CW | CCW |
|---------|-------|-----|-----|
| Encoder 0 | 0x35 | 0x51 | 0x50 |
| Encoder 1 | 0x33 | 0x91 | 0x90 |
| Encoder 2 | 0x34 | 0x61 | 0x60 |

### Image Specifications

- **Dimensions**: 60x60 pixels
- **Format**: JPEG (90% quality)
- **Transfer**: BAT/STP packet protocol
- **Reference**: `docs/usb-protocol-reverse-engineering.md`

## Important Conventions

### Naming

- TypeScript: `camelCase` for variables/functions, `PascalCase` for types/components
- Rust: `snake_case` for variables/functions, `PascalCase` for types
- Files: `kebab-case.ts` for TypeScript, `snake_case.rs` for Rust

### Action Types

```typescript
type ActionType = 'keyboard' | 'launch' | 'script' | 'http' | 'media' | 'system' | 'workspace';
```

### Config Structure

- Frontend uses `camelCase` field names
- Backend (Rust) uses `snake_case` with serde rename
- `tauri-api.ts` handles mapping between them

### Shift Modifier Pattern

Button 6 (small button 0) acts as a shift key:
- `action` / `longPressAction` - Normal triggers
- `shiftAction` / `shiftLongPressAction` - Shift+button triggers
- Same pattern applies to encoders

### Workspace Pattern

- Profiles contain `workspaces: Workspace[]` and `activeWorkspaceIndex`
- Legacy `buttons`/`encoders` fields are deprecated (migrated on load)
- Navigation via buttons 7/8 or workspace actions

## Known Issues / Quirks

1. **Rust tests require platform libraries**: GTK, WebKit on Linux; use `cargo check` to verify compilation without linking

2. **Process.platform in tests**: Module-level `isWindows` constants are evaluated at load time; don't mock `process.platform` at runtime

3. **Git identity**: May need configuration: `git config user.name` and `git config user.email`

## Quick Reference Commands

```bash
# Development
npm run tauri:dev           # Full dev environment
npm test                    # Run tests

# Checks
npm run typecheck           # TypeScript check
cd src-tauri && cargo check # Rust check

# Build
npm run tauri:build         # Production build
```

## Files to Check First

When starting a new task, consider these files:

| Task Type | Key Files |
|-----------|-----------|
| UI changes | `src/renderer/App.tsx`, `src/renderer/components/` |
| Action handling | `src/core/actions/`, `src/shared/types/actions.ts` |
| Config changes | `src/shared/types/config.ts`, `src-tauri/src/config/types.rs` |
| Device communication | `src-tauri/src/hid/`, `docs/usb-protocol-reverse-engineering.md` |
| Type definitions | `src/shared/types/` |
| Tests | Look for `*.test.ts` adjacent to source files |

## Related Documentation

- `STATUS.md` - Current project status and task details
- `IMPLEMENTATION_PLAN.md` - Completed features and architecture notes
- `AGENTS.md` - Agent operations guide (git, rust commands)
- `docs/usb-protocol-reverse-engineering.md` - Device protocol details
