# Ralph Loop: Phase 5.2 - IPC Communication Layer
Parent: Phase 5 - Electron GUI
Sequence: 2 of 10
Next: 03-main-window-layout.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Build the IPC communication layer connecting the Electron main process to the React renderer with type-safe channel definitions and React hooks.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Main-to-renderer communication bridge
- **Dependencies:** Task 5.1 complete (Electron setup)
- **Key Patterns:** Context bridge for security, typed IPC channels, React hooks for consuming IPC
- **Core Use Cases:** Device status updates, action execution, profile management

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.2.

## Task
### Task 5.2: IPC Communication Layer
**Check:** `test -f src/main/ipc-handlers.ts && test -f src/renderer/hooks/useIpc.ts`
**Skip If:** IPC handlers exist and device status available in React
**Requires:** Task 5.1
**Work:**
1. Define IPC channel names in `src/shared/types/ipc.ts`
   - Device channels: get-status, on-device-event, set-brightness
   - Action channels: execute-action, get-actions, save-action
   - Profile channels: get-profiles, switch-profile, save-profile
   - Config channels: get-config, save-config
2. Expose safe APIs via context bridge in preload script
3. Create handlers in main process (`src/main/ipc-handlers.ts`)
4. Create React hooks for IPC calls:
   - `useDevice()` - device connection status and events
   - `useActions()` - action configuration CRUD
   - `useProfiles()` - profile management
   - `useConfig()` - app settings
**Files:** `src/shared/types/ipc.ts`, `src/main/ipc-handlers.ts`, `src/preload/index.ts`, `src/renderer/hooks/useIpc.ts`, `src/renderer/hooks/useDevice.ts`, `src/renderer/hooks/useActions.ts`, `src/renderer/hooks/useProfiles.ts`
**Verify:** Device status displays in React; actions execute from renderer

## UI Verification (Playwright)
Verify device status displays in React:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_get_visible_text` - should contain device status (connected/disconnected)
3. `playwright_screenshot` with name "02-ipc-device-status"

## Completion Criteria
When task is complete:
<promise>SUBPLAN_2_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [03-main-window-layout.md](./03-main-window-layout.md).
