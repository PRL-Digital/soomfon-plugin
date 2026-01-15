# Ralph Loop: Phase 3.8 - System Handler
Parent: Phase 3 - Action System
Sequence: 8 of 9
Next: 09-event-binder.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement system operations handler for desktop switching, lock screen, screenshot, and other Windows shortcuts.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** System operations handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/system-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement switch_desktop (Win+Ctrl+Left/Right)
2. Implement show_desktop (Win+D)
3. Implement lock_screen (Win+L)
4. Implement screenshot (Win+Shift+S)
5. Implement start_menu (Win) and task_view (Win+Tab)
**Files:** `src/core/actions/handlers/system-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_8_COMPLETE</promise>
