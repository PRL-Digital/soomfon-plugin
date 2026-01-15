# Ralph Loop: Phase 2.4 - Image Transmission
Parent: Phase 2 - Protocol Implementation
Sequence: 4 of 5
Next: 05-integration-test.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement image processing and chunked transmission for displaying images on the device LCD buttons.

## Context
- **Parent Phase:** Phase 2 - Protocol Implementation
- **Focus:** Image format conversion and transmission
- **Dependencies:** Task 2.3 (Protocol Commands) complete
- **Requirements:** Handle image format, size, rotation, encoding, chunking, and timing

## Task
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

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`
