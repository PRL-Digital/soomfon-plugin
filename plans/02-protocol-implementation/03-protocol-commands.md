# Ralph Loop: Phase 2.3 - Protocol Commands
Parent: Phase 2 - Protocol Implementation
Sequence: 3 of 5
Next: 04-image-transmission.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create packet builder utility and implement device control commands for wake display, clear screen, brightness control, and refresh/sync.

## Context
- **Parent Phase:** Phase 2 - Protocol Implementation
- **Focus:** Protocol command building and execution
- **Dependencies:** Task 2.1 (HID Manager) complete
- **Commands Needed:** Wake display, clear screen, brightness control, refresh/sync

## Task
### Task 2.3: Protocol Commands
**Check:** `ls src/core/device/packet-builder.ts 2>/dev/null && ls src/core/device/soomfon-protocol.ts 2>/dev/null && npm run build`
**Skip If:** Files exist AND build succeeds
**Requires:** Task 2.1
**Work:**
1. Create packet builder utility
2. Implement wake display command
3. Implement clear screen command
4. Implement brightness control
5. Implement refresh/sync command
**Files:** `src/core/device/packet-builder.ts`, `src/core/device/soomfon-protocol.ts`
**Verify:** `npm run build`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_3_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`
