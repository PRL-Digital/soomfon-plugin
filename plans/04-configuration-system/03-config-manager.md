# Ralph Loop: Phase 4.3 - Configuration Manager
Parent: Phase 4 - Configuration System
Sequence: 3 of 6
Next: 04-profile-manager.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Build a ConfigManager class that uses electron-store for persistence with type-safe getters and setters for all configuration sections.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4
- Task 4.1 must be complete (config.ts interfaces defined)
- Task 4.2 must be complete (validation.ts Zod schemas defined)

## Task

### Task 4.3: Configuration Manager
**Check:** `ls src/core/config/config-manager.ts`
**Skip If:** File exists and exports ConfigManager class with get/set methods
**Requires:** Task 4.1, Task 4.2 complete
**Work:**
1. Initialize electron-store with typed defaults and schema
2. Implement getConfig() returning full AppConfig
3. Implement getDeviceSettings(), getAppSettings(), getIntegrations() getters
4. Implement setDeviceSettings(), setAppSettings(), setIntegrations() with validation
5. Implement reset() to restore defaults
6. Handle config file path configuration
**Files:** `src/core/config/config-manager.ts`
**Verify:** `npx tsc --noEmit src/core/config/config-manager.ts`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_3_COMPLETE</promise>
