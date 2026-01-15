# Ralph Loop: Phase 5.9 - System Tray
Parent: Phase 5 - Electron GUI
Sequence: 9 of 10
Next: 10-auto-launch-startup.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement system tray integration with icon, context menu (show/hide, profiles, status, quit), and close-to-tray behavior.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** System tray presence and background operation
- **Dependencies:** Task 5.1 complete (Electron main process)
- **Tray Features:** Icon with connection state, context menu, minimize-to-tray, single-click restore
- **Platform:** Windows-specific tray behavior

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.9.

## Task
### Task 5.9: System Tray
**Check:** `test -f src/main/tray.ts`
**Skip If:** Tray icon appears with working context menu
**Requires:** Task 5.1
**Work:**
1. Create tray icon assets:
   - `assets/tray/tray-icon.png` - Default icon (16x16 or 32x32)
   - `assets/tray/tray-icon-connected.png` - Green state
   - `assets/tray/tray-icon-disconnected.png` - Red/gray state
   - Consider ICO format for Windows
2. Create tray manager (`src/main/tray.ts`):
   - Initialize tray with icon
   - Update icon based on device connection state
   - Handle tray click events
3. Create context menu with:
   - **Show/Hide Window:** Toggle main window visibility
   - **Separator**
   - **Profile submenu:** List profiles, current marked, click to switch
   - **Separator**
   - **Status:** Display connection status (disabled item)
   - **Separator**
   - **Quit:** Exit application completely
4. Implement close-to-tray behavior:
   - Override window close event
   - Hide window instead of closing (if setting enabled)
   - Show notification on first minimize to tray
5. Single-click restore:
   - Click tray icon to show/restore window
   - Double-click alternative if needed
6. Wire up events:
   - Device connection changes update tray icon
   - Profile changes update submenu
**Files:** `src/main/tray.ts`, `assets/tray/tray-icon.png`, `assets/tray/tray-icon-connected.png`, `assets/tray/tray-icon-disconnected.png`
**Verify:** Tray icon visible; right-click shows menu; closing window minimizes to tray

## Completion Criteria
When task is complete:
<promise>SUBPLAN_9_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [10-auto-launch-startup.md](./10-auto-launch-startup.md).
