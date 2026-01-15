# Ralph Loop: Phase 3.6 - HTTP Handler
Parent: Phase 3 - Action System
Sequence: 6 of 9
Next: 07-media-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement HTTP request handler supporting all methods, headers, and body types using axios.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** HTTP request handler
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/http-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Install axios if not present
2. Support all HTTP methods (GET, POST, PUT, DELETE, PATCH)
3. Support custom headers including Authorization
4. Support JSON and form body types
5. Implement request timeout with configurable duration
**Files:** `src/core/actions/handlers/http-handler.ts`
**Verify:** Handler instantiates without error

## Completion Criteria
When task is complete:
<promise>SUBPLAN_6_COMPLETE</promise>
