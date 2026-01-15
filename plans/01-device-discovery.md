# Ralph Loop: Phase 1 - Device Discovery

Always use:

- serena for semantic code retrieval and editing tools
- context7 when I need code generation, setup or configuration steps, or
  library/API documentation. This means you should automatically use the Context7 MCP
  tools to resolve library id and get library docs without me having to explicitly ask.
- sequential thinking for any decision making

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
Establish USB communication with the SOOMFON CN002-4B27 and reverse-engineer its HID protocol to understand how to read button/encoder events and send images to LCD buttons.

## Context
- **VID:** 0x1500
- **PID:** 0x3001
- **Interfaces:** MI_00 and MI_01 (must determine what each handles)
- Protocol is undocumented - requires discovery through packet analysis

## Status Tracking
At the START of each iteration, read `STATUS.md`. If it doesn't exist, create it:
```
# Phase 1 Status
Last Updated: [timestamp]
Iteration: 1

## Task Status
- [ ] 1.1 Project Setup
- [ ] 1.2 Device Enumeration
- [ ] 1.3 Raw Input Capture
- [ ] 1.4 Wireshark Analysis (MANUAL - waiting for human)
- [ ] 1.5 Protocol Documentation

## Blockers
None

## Notes
[Any observations from this iteration]
```

Update this file at the END of each iteration.

## Tasks

### Task 1.1: Project Setup
**Check:** Run `ls package.json tsconfig.json 2>/dev/null && npm run build`
**Skip If:** Both files exist AND build succeeds
**Work:**
1. Initialize npm project with TypeScript
2. Install node-hid and type definitions
3. Configure TypeScript for Node.js
**Files:** `package.json`, `tsconfig.json`, `.gitignore`
**Verify:** `npm run build` compiles without errors

### Task 1.2: Device Enumeration Script
**Check:** `ls scripts/detect-device.ts 2>/dev/null`
**Skip If:** File exists and `npx ts-node scripts/detect-device.ts` runs
**Work:**
1. Use HID.devices() to list all HID devices
2. Filter for VID 0x1500, PID 0x3001
3. Display device info including both interfaces
**Files:** `scripts/detect-device.ts`
**Verify:** Script outputs device VID, PID, interface paths

### Task 1.3: Raw Input Capture
**Requires:** Task 1.1, 1.2 complete
**Check:** `ls scripts/capture-input.ts 2>/dev/null`
**Skip If:** File exists and runs without error
**Work:**
1. Open both HID interfaces
2. Register data event listeners
3. Log raw byte arrays on input events
**Files:** `scripts/capture-input.ts`
**Verify:** Script logs hex bytes when buttons/encoders activated

### Task 1.4: Wireshark Analysis (MANUAL)
**Type:** REQUIRES HUMAN INTERVENTION
**Check:** `ls docs/protocol-analysis.md 2>/dev/null`
**Skip If:** File exists with substantial content (>500 bytes)
**If Missing:**
- Add note to STATUS.md: "Waiting for human: Wireshark USB capture needed"
- Continue with other tasks
**Work:** (Human performs USB packet capture with Wireshark)
**Files:** `docs/protocol-analysis.md`

### Task 1.5: Protocol Documentation
**Requires:** Task 1.3 complete, Task 1.4 helpful but not blocking
**Check:** `ls docs/soomfon-protocol.md 2>/dev/null`
**Skip If:** File exists with complete protocol spec
**Work:**
1. Document input report format (button/encoder events)
2. Document output report format (images, commands)
3. Note packet sizes, headers, command codes
**Files:** `docs/soomfon-protocol.md`
**Verify:** Document contains packet formats and event parsing info

## Completion Criteria
ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `npx ts-node scripts/detect-device.ts` detects SOOMFON device
3. `scripts/capture-input.ts` exists and runs
4. `docs/soomfon-protocol.md` exists with protocol basics

Note: Task 1.4 (Wireshark) is NOT required for completion - can be done later.

When ALL criteria met, output:
<promise>PHASE_1_COMPLETE</promise>

## If Blocked
If you cannot proceed on any task:
1. Document in STATUS.md under Blockers
2. Try alternative approaches
3. Skip to next task if possible
4. If completely stuck, output: <promise>BLOCKED: [specific reason]</promise>

## Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.2"
  },
  "dependencies": {
    "node-hid": "^3.2.0"
  }
}
```

## Next Phase
Once complete, proceed to [Phase 2: Protocol Implementation](./02-protocol-implementation.md).
