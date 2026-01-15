# Ralph Loop: Phase 3.2 - Action Engine
Parent: Phase 3 - Action System
Sequence: 2 of 9
Next: 03-keyboard-handler.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement the core action engine with handler registry pattern for routing actions to handlers.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Core action execution engine
- **Dependencies:** Task 3.1 complete

## Task
**Requires:** Task 3.1 complete
**Check:** `ls src/core/actions/action-engine.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement handler registry pattern with registerHandler method
2. Create execute method that routes actions to appropriate handlers
3. Handle async execution with proper error handling
4. Implement cancellation support for long-running actions
5. Add execution logging/history tracking
**Files:** `src/core/actions/action-engine.ts`
**Verify:** `npx ts-node -e "import {ActionEngine} from './src/core/actions/action-engine';"` compiles

## Completion Criteria
When task is complete:
<promise>SUBPLAN_2_COMPLETE</promise>
