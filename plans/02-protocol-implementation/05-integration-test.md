# Ralph Loop: Phase 2.5 - Integration Test Script
Parent: Phase 2 - Protocol Implementation
Sequence: 5 of 5
Next: ../03-action-system.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a comprehensive integration test script that validates all device communication functionality implemented in Phase 2.

## Context
- **Parent Phase:** Phase 2 - Protocol Implementation
- **Focus:** Integration testing of all device functionality
- **Dependencies:** Tasks 2.1-2.4 complete
- **Test Coverage:** Device connection, button inputs, encoder inputs, brightness control, image display, screen clear

## Task
### Task 2.5: Integration Test Script
**Check:** `ls scripts/test-device.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Requires:** Tasks 2.1-2.4
**Work:**
1. Test device connection
2. Test all button inputs
3. Test all encoder inputs
4. Test brightness control
5. Test image display on each LCD button
6. Test screen clear
**Files:** `scripts/test-device.ts`
**Verify:** `npm run build && npx ts-node scripts/test-device.ts --help`

## Completion Criteria
ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `ls src/core/device/hid-manager.ts` exists
3. `ls src/core/device/device-events.ts` exists
4. `ls src/core/device/packet-builder.ts` exists
5. `ls src/core/device/soomfon-protocol.ts` exists
6. `ls src/core/device/image-processor.ts` exists
7. `ls src/shared/types/device.ts` exists
8. `ls scripts/test-device.ts` exists

When ALL criteria met, output:
<promise>SUBPLAN_5_COMPLETE</promise>

## Next Phase
Once all device communication is working, proceed to [Phase 3: Action System](../03-action-system.md) to build the action execution layer.

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`
