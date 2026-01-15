# Ralph Loop: Phase 5.1 - Electron + Vite + React Setup
Parent: Phase 5 - Electron GUI
Sequence: 1 of 10
Next: 02-ipc-communication-layer.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Set up a complete Electron + Vite + React development environment with TypeScript support and hot reload.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Project scaffolding and build configuration
- **Dependencies:** Phase 4 complete with working configuration system
- **Target Platform:** Windows desktop application
- **Key Files:** Main process entry, preload script, renderer entry, build config

## Status Tracking
Create/update `STATUS.md` in this folder:
```markdown
# Phase 5 Status

## Tasks
- [ ] 5.1: Electron + Vite + React Setup
- [ ] 5.2: IPC Communication Layer
- [ ] 5.3: Main Window Layout
- [ ] 5.4: Device View Component
- [ ] 5.5: Action Editor Panel
- [ ] 5.6: Encoder Editor Panel
- [ ] 5.7: Profile Manager
- [ ] 5.8: Settings Panel
- [ ] 5.9: System Tray
- [ ] 5.10: Auto-Launch on Startup

## Current Task
5.1: Electron + Vite + React Setup

## Blockers
None

## Notes
```

## Task
### Task 5.1: Electron + Vite + React Setup
**Check:** `test -f src/main/index.ts && test -f vite.config.ts`
**Skip If:** Both files exist and `npm run build` succeeds
**Work:**
1. Set up Electron main process entry (`src/main/index.ts`)
2. Create preload script with context bridge (`src/preload/index.ts`)
3. Configure Vite for React frontend (`vite.config.ts`)
4. Create renderer entry files (`src/renderer/index.html`, `src/renderer/main.tsx`)
5. Set up TypeScript configuration for all processes
6. Configure build process (`electron-builder.json`)
7. Set up hot reload for development
**Files:** `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `vite.config.ts`, `electron-builder.json`
**Verify:** `npm run dev` starts dev server; `npm run build` builds production app

## UI Verification (Playwright)
After `npm run dev` starts, verify the app loads:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_screenshot` with name "01-app-initial-load", fullPage: true
3. Verify: Screenshot shows React app rendered (not blank or error page)

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [02-ipc-communication-layer.md](./02-ipc-communication-layer.md).
