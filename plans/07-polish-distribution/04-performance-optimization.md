# Ralph Loop: Phase 7.4 - Performance Optimization
Parent: Phase 7 - Polish & Distribution
Sequence: 4 of 10
Next: 05-accessibility.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Optimize for smooth operation with image caching, debouncing, and lazy loading.

## Context
- **Parent Phase:** Phase 7 - Polish & Distribution
- **Focus:** Performance optimization and memory usage
- **Dependencies:** Task 7.1 complete

## Task
### Task 7.4: Performance Optimization
**Check:** `ls src/core/device/image-cache.ts 2>/dev/null`
**Skip If:** Image cache exists and app uses <100MB RAM
**Requires:** Task 7.1
**Work:**
1. Implement image caching for LCD buttons
2. Debounce rapid config saves
3. Lazy load settings panels
4. Optimize device event handling
5. Profile React components for re-renders
**Files:**
- `src/core/device/image-cache.ts`
**Verify:** `npx tsc --noEmit && ls src/core/device/image-cache.ts`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>
