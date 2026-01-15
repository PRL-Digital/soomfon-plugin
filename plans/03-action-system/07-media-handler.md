# Ralph Loop: Phase 3.7 - Media Handler
Parent: Phase 3 - Action System
Sequence: 7 of 9
Next: 08-system-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement media control handler for play/pause, volume, and track navigation using nut-js media keys.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Media control handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/media-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Send media key events using nut-js (play/pause, next, prev, stop)
2. Control system volume (up, down, mute) via media keys
3. Support volume amount parameter for increment/decrement
**Files:** `src/core/actions/handlers/media-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_7_COMPLETE</promise>
