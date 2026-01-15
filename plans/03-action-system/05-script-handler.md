# Ralph Loop: Phase 3.5 - Script Handler
Parent: Phase 3 - Action System
Sequence: 5 of 9
Next: 06-http-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement script execution handler supporting PowerShell and CMD with timeout and output capture.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Script execution handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/script-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Support PowerShell and CMD script types
2. Support inline script strings and script file paths
3. Implement execution timeout with process kill
4. Capture stdout/stderr in execution result
5. Handle script errors gracefully with proper error messages
**Files:** `src/core/actions/handlers/script-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_5_COMPLETE</promise>
