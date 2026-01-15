# Ralph Loop: Phase 4.6 - Configuration Migration
Parent: Phase 4 - Configuration System
Sequence: 6 of 6
Next: None (final sub-plan)

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Implement a configuration migration system that handles version upgrades with backup support.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4
- Task 4.3 must be complete (ConfigManager class available)

## Task

### Task 4.6: Configuration Migration
**Check:** `ls src/core/config/migrations.ts`
**Skip If:** File exists and exports ConfigMigrator class
**Requires:** Task 4.3 complete
**Work:**
1. Define VERSION_HISTORY array with schema versions
2. Create migration functions map (e.g., '1.0.0' -> '1.1.0')
3. Implement migrate() - detects version, runs necessary migrations
4. Implement backup() - saves current config before migration
5. Auto-run migration check on ConfigManager initialization
**Files:** `src/core/config/migrations.ts`
**Verify:** `npx tsc --noEmit src/core/config/migrations.ts`

## Phase Completion
When this final sub-plan is complete, ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `ls src/shared/types/config.ts` exists
3. `ls src/core/config/validation.ts` exists
4. `ls src/core/config/config-manager.ts` exists
5. `ls src/core/config/profile-manager.ts` exists
6. `ls src/core/config/import-export.ts` exists
7. `ls src/core/config/migrations.ts` exists
8. `npx tsc --noEmit` passes with no errors

When ALL criteria met, output:
<promise>PHASE_4_COMPLETE</promise>

## Next Phase
Once configuration system is complete, proceed to [Phase 5: Electron GUI](../05-electron-gui.md) to build the user interface.

## Completion Criteria
When task is complete:
<promise>SUBPLAN_6_COMPLETE</promise>
