# Ralph Loop: Phase 2.1 - HID Manager
Parent: Phase 2 - Protocol Implementation
Sequence: 1 of 5
Next: 02-event-parser.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement a robust HID connection manager for USB device discovery, connection handling, and read/write operations.

## Context
- **Parent Phase:** Phase 2 - Protocol Implementation
- **Focus:** HID device connection management
- **Dependencies:** Phase 1 complete with documented protocol specification
- **Device Info:** Known VID/PID for device discovery
- **Interfaces:** Device has two HID interfaces to handle

## Task
### Task 2.1: HID Manager
**Check:** `ls src/core/device/hid-manager.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement device discovery using VID/PID
2. Handle both HID interfaces appropriately
3. Implement automatic reconnection on disconnect
4. Emit connection status events
5. Provide async read/write methods
**Files:** `src/core/device/hid-manager.ts`
**Verify:** `npm run build && npx ts-node -e "import { HIDManager } from './src/core/device/hid-manager'"`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`
