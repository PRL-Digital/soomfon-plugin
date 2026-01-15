# Ralph Loop: Phase 3.9 - Event-to-Action Binding
Parent: Phase 3 - Action System
Sequence: 9 of 9
Next: End of Phase

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create event-to-action binding system that maps device events (button presses, encoder rotations) to configured actions.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Event-to-action binding
- **Dependencies:** Task 3.2 complete

## Task
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/event-binder.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Create binding configuration structure (elementType, elementIndex, trigger, action)
2. Support press, release, and long-press triggers for buttons
3. Support clockwise and counter-clockwise triggers for encoders
4. Integrate with ActionEngine for execution
5. Implement handleEvent method to process device events
**Files:** `src/core/actions/event-binder.ts`
**Verify:** `npx ts-node -e "import {EventBinder} from './src/core/actions/event-binder';"` compiles

## Completion Criteria
When task is complete:
<promise>SUBPLAN_9_COMPLETE</promise>
