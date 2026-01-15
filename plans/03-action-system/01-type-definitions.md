# Ralph Loop: Phase 3.1 - Action Type Definitions
Parent: Phase 3 - Action System
Sequence: 1 of 9
Next: 02-action-engine.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create base action interfaces and Zod validation schemas for all action types.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Type definitions and validation schemas
- **Dependencies:** Phase 2 complete

## Task
**Check:** `ls src/shared/types/actions.ts 2>/dev/null && ls src/core/actions/schemas.ts 2>/dev/null`
**Skip If:** Both files exist
**Work:**
1. Create base action interface with id, type, name, icon, enabled fields
2. Define specific interfaces for each action type (KeyboardAction, LaunchAction, ScriptAction, etc.)
3. Create union type `Action` of all action types
4. Include Zod validation schemas for each action type
5. Define execution result types (success/failure with error message)
**Files:** `src/shared/types/actions.ts`, `src/core/actions/schemas.ts`
**Verify:** `npm run build 2>/dev/null`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>
