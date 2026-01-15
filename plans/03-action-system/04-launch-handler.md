# Ralph Loop: Phase 3.4 - Launch Handler
Parent: Phase 3 - Action System
Sequence: 4 of 9
Next: 05-script-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement launch handler for starting applications and opening files with child_process.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Application/file launch handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/launch-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Use Node.js child_process.spawn for launching
2. Support command-line arguments via args array
3. Support working directory specification
4. Support opening files with default application (shell: true)
5. Handle path escaping for Windows paths
**Files:** `src/core/actions/handlers/launch-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>
