# Ralph Loop: Phase 4 - Configuration System

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
Build a robust configuration system that persists settings across restarts, supports multiple button layout profiles with validation, and enables import/export functionality.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4

## Status Tracking
At the START of each iteration, read `STATUS.md`. If it doesn't exist, create it with task checkboxes for each task.

## Tasks

### Task 4.1: Configuration Schema
**Check:** `ls src/shared/types/config.ts`
**Skip If:** File exists and contains ButtonConfig, EncoderConfig, Profile, and AppConfig interfaces
**Requires:** None
**Work:**
1. Define ButtonConfig interface (index, image, label, action, longPressAction, longPressThreshold)
2. Define EncoderConfig interface (index, pressAction, longPressAction, clockwiseAction, counterClockwiseAction)
3. Define Profile interface (id, name, description, isDefault, buttons, encoders, createdAt, updatedAt)
4. Define DeviceSettings interface (brightness, sleepTimeout, screensaverEnabled)
5. Define AppSettings interface (launchOnStartup, minimizeToTray, closeToTray, theme, language)
6. Define IntegrationSettings interface (homeAssistant, nodeRed configs)
7. Define root AppConfig interface (version, profiles, activeProfileId, deviceSettings, appSettings, integrations)
**Files:** `src/shared/types/config.ts`
**Verify:** `npx tsc --noEmit src/shared/types/config.ts`

---

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

---

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

---

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

---

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

---

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

---

## If Blocked
If you cannot proceed on any task:
1. Document in STATUS.md under Blockers
2. Try alternative approaches
3. Skip to next task if possible
4. If completely stuck, output: <promise>BLOCKED: [specific reason]</promise>

## Dependencies
```json
{
  "dependencies": {
    "electron-store": "^8.1.0",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  }
}
```

## Completion Criteria
ALL of the following must be TRUE:
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
Once configuration system is complete, proceed to [Phase 5: Electron GUI](./05-electron-gui.md) to build the user interface.
