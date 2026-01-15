# Ralph Loop: Phase 3.3 - Keyboard Handler
Parent: Phase 3 - Action System
Sequence: 3 of 9
Next: 04-launch-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement keyboard action handler supporting key combinations and modifiers using nut-js.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Keyboard simulation handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/keyboard-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Install @nut-tree/nut-js if not present
2. Map string key names to nut-js Key enum
3. Support modifier combinations (Ctrl, Alt, Shift, Win)
4. Support single keys and key combinations
5. Handle holdDuration for hold-to-press actions
**Files:** `src/core/actions/handlers/keyboard-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_3_COMPLETE</promise>
