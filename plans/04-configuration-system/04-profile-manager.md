# Ralph Loop: Phase 4.4 - Profile Manager
Parent: Phase 4 - Configuration System
Sequence: 4 of 6
Next: 05-import-export.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement a ProfileManager class with full CRUD operations for managing button layout profiles.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4
- Task 4.3 must be complete (ConfigManager class available)

## Task

### Task 4.4: Profile Manager
**Check:** `ls src/core/config/profile-manager.ts`
**Skip If:** File exists and exports ProfileManager class with CRUD methods
**Requires:** Task 4.3 complete
**Work:**
1. Implement create(name) - creates new profile with defaults and UUID
2. Implement getById(id) - returns profile or undefined
3. Implement update(id, partial) - merges updates, sets updatedAt
4. Implement delete(id) - removes profile, prevents deleting last one
5. Implement setActive(id) - updates activeProfileId
6. Implement duplicate(id, newName) - clones profile with new ID
7. Implement list() - returns all profiles
**Files:** `src/core/config/profile-manager.ts`
**Verify:** `npx tsc --noEmit src/core/config/profile-manager.ts`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>
