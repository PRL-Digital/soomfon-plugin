# Ralph Loop: Phase 4.5 - Import/Export
Parent: Phase 4 - Configuration System
Sequence: 5 of 6
Next: 06-migrations.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Add import/export functionality for configurations and individual profiles with validation and error handling.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4
- Task 4.3 must be complete (ConfigManager class available)
- Task 4.4 must be complete (ProfileManager class available)

## Task

### Task 4.5: Import/Export
**Check:** `ls src/core/config/import-export.ts`
**Skip If:** File exists and exports import/export functions
**Requires:** Task 4.3, Task 4.4 complete
**Work:**
1. Implement exportConfig() - returns full config as JSON string
2. Implement exportProfile(id) - returns single profile as JSON string
3. Implement importConfig(json) - validates and replaces entire config
4. Implement importProfile(json) - validates and adds profile with new UUID
5. Add error handling with descriptive messages for validation failures
**Files:** `src/core/config/import-export.ts`
**Verify:** `npx tsc --noEmit src/core/config/import-export.ts`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_5_COMPLETE</promise>
