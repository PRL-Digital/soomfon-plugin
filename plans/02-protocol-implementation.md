# Ralph Loop: Phase 2 - Protocol Implementation

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
Build the core USB HID communication layer for SOOMFON device connection management, input event parsing, and output commands (images, brightness, screen control).

## Context
- Phase 1 completed with documented protocol specification
- Known packet formats for input and output
- Device has 6 LCD buttons, 3 normal buttons, and 3 encoders
- VID/PID known for device discovery

## Status Tracking
Maintain `STATUS.md` with:
```markdown
# Phase 2 Status

## Tasks
- [ ] 2.1: HID Manager
- [ ] 2.2: Event Parser
- [ ] 2.3: Protocol Commands
- [ ] 2.4: Image Transmission
- [ ] 2.5: Integration Test Script

## Current Task: [X.X]
## Blockers: [none]
## Last Updated: [timestamp]
```

## Tasks

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

---

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

---

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

---

### Task 2.4: Image Transmission
**Check:** `ls src/core/device/image-processor.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Requires:** Task 2.3
**Work:**
1. Determine required image format (size, rotation, encoding)
2. Implement image chunking for large payloads
3. Handle transmission timing to avoid buffer overflow
4. Support both file paths and buffers as input
**Files:** `src/core/device/image-processor.ts`
**Verify:** `npm run build`

---

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

---

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
<promise>PHASE_2_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## New Dependencies

```json
{
  "dependencies": {
    "node-hid": "^3.2.0",
    "sharp": "^0.33.1"
  }
}
```

## Next Phase

Once all device communication is working, proceed to [Phase 3: Action System](./03-action-system.md) to build the action execution layer.
