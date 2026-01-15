# Ralph Loop: Phase 4.2 - Zod Validation Schemas
Parent: Phase 4 - Configuration System
Sequence: 2 of 6
Next: 03-config-manager.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create Zod validation schemas that match TypeScript interfaces and provide runtime validation for configuration data.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4
- Task 4.1 must be complete (config.ts interfaces defined)

## Task

### Task 4.2: Zod Validation Schemas
**Check:** `ls src/core/config/validation.ts`
**Skip If:** File exists and exports configSchema with safeParse functionality
**Requires:** Task 4.1 complete
**Work:**
1. Create Zod schemas matching all TypeScript types from config.ts
2. Add custom validation rules (e.g., button index 0-8, encoder index 0-2)
3. Create validateConfig() helper that returns typed result
4. Create validateProfile() helper for single profile validation
5. Export schema for use in migrations
**Files:** `src/core/config/validation.ts`
**Verify:** `npx tsc --noEmit src/core/config/validation.ts`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_2_COMPLETE</promise>
