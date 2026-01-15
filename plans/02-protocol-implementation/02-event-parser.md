# Ralph Loop: Phase 2.2 - Event Parser
Parent: Phase 2 - Protocol Implementation
Sequence: 2 of 5
Next: 03-protocol-commands.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Define event types and implement packet parsing for button and encoder inputs from the SOOMFON device.

## Context
- **Parent Phase:** Phase 2 - Protocol Implementation
- **Focus:** Event types and packet parsing
- **Dependencies:** Task 2.1 (HID Manager) complete
- **Device Layout:** 6 LCD buttons, 3 normal buttons, 3 encoders
- **Packet Formats:** Known from Phase 1 findings

## Task
### Task 2.2: Event Parser
**Check:** `ls src/core/device/device-events.ts 2>/dev/null && ls src/shared/types/device.ts 2>/dev/null && npm run build`
**Skip If:** Files exist AND build succeeds
**Requires:** Task 2.1
**Work:**
1. Define event types (ButtonEvent, EncoderEvent)
2. Implement packet parsing based on Phase 1 findings
3. Handle debouncing if needed
4. Support long-press detection timer
**Files:** `src/core/device/device-events.ts`, `src/shared/types/device.ts`
**Verify:** `npm run build`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_2_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`
