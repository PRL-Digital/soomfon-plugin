# Ralph Loop: Phase 4.1 - Configuration Schema
Parent: Phase 4 - Configuration System
Sequence: 1 of 6
Next: 02-zod-validation.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Define all TypeScript interfaces for the configuration system including button configs, encoder configs, profiles, and application settings.

## Context
- Phase 3 completed with working action system
- Action type definitions available from `src/shared/types/actions.ts`
- Uses electron-store for persistence
- Config stored at `C:\Users\{username}\AppData\Roaming\soomfon-controller\config.json`
- Required dependencies: electron-store ^8.1.0, uuid ^9.0.1, zod ^3.22.4

## Task

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

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>
