# Ralph Loop: Phase 5.10 - Auto-Launch on Startup
Parent: Phase 5 - Electron GUI
Sequence: 10 of 10
Next: ../06-integrations.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement Windows auto-launch functionality that enables or disables application startup when the user logs in.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Windows startup integration
- **Dependencies:** Task 5.8 complete (settings panel with startup toggle)
- **Implementation Options:** electron-auto-launch package or Windows Registry direct access
- **Platform:** Windows-specific startup behavior

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.10.

## Task
### Task 5.10: Auto-Launch on Startup
**Check:** `test -f src/main/auto-launch.ts`
**Skip If:** Auto-launch toggle enables/disables Windows startup
**Requires:** Task 5.8
**Work:**
1. Choose implementation approach:
   - **Option A:** Use `auto-launch` npm package
   - **Option B:** Direct Windows Registry manipulation
   - Option A is simpler and cross-platform compatible
2. Create auto-launch manager (`src/main/auto-launch.ts`):
   ```typescript
   // Example structure:
   export class AutoLaunchManager {
     async isEnabled(): Promise<boolean>
     async enable(): Promise<void>
     async disable(): Promise<void>
     async setEnabled(enabled: boolean): Promise<void>
   }
   ```
3. Implement enable/disable:
   - Register/unregister app for startup
   - Handle hidden start (minimize to tray on startup)
   - Use appropriate app path (handle development vs production)
4. Handle errors gracefully:
   - Permission errors (user may not have admin rights)
   - Registry access failures
   - Log errors but don't crash
5. Wire up to settings:
   - IPC handler for auto-launch toggle
   - Settings panel checkbox syncs with actual state
   - Read current state on app start
6. Test scenarios:
   - Enable via settings
   - Disable via settings
   - Verify app appears/disappears from Windows startup
**Files:** `src/main/auto-launch.ts`
**Verify:** Toggle in settings enables/disables startup; app launches on Windows boot when enabled

## Completion Criteria
ALL of the following must be TRUE (Phase 5 completion):
1. `npm run build` succeeds
2. `test -f src/main/index.ts` (Electron main entry exists)
3. `test -f src/main/ipc-handlers.ts` (IPC handlers exist)
4. `test -f src/renderer/App.tsx` (React root exists)
5. `test -f src/renderer/components/DeviceView/DeviceView.tsx` (Device view exists)
6. `test -f src/renderer/components/ActionEditor/ActionEditor.tsx` (Action editor exists)
7. `test -f src/renderer/components/ActionEditor/EncoderEditor.tsx` (Encoder editor exists)
8. `test -f src/renderer/components/ProfileManager/ProfileSelector.tsx` (Profile manager exists)
9. `test -f src/renderer/components/Settings/SettingsPanel.tsx` (Settings panel exists)
10. `test -f src/main/tray.ts` (System tray exists)
11. `test -f src/main/auto-launch.ts` (Auto-launch exists)

When ALL criteria met, output:
<promise>SUBPLAN_10_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Phase
Once GUI is complete, proceed to [Phase 6: Integrations](../06-integrations.md) to build Home Assistant and Node-RED modules.
