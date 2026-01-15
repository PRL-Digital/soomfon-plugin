# Ralph Loop: Phase 7.6 - Windows Installer
Parent: Phase 7 - Polish & Distribution
Sequence: 6 of 10
Next: 07-portable-version.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create distributable installer using electron-builder with NSIS configuration.

## Context
- **Parent Phase:** Phase 7 - Polish & Distribution
- **Focus:** Windows installer creation and distribution setup
- **Dependencies:** Tasks 7.1-7.5 complete

## Task
### Task 7.6: Windows Installer
**Check:** `ls electron-builder.json assets/installer/installer-icon.ico 2>/dev/null`
**Skip If:** Both files exist
**Requires:** Tasks 7.1-7.5
**Work:**
1. Configure electron-builder for Windows
2. Set up NSIS installer options
3. Create installer icon
4. Configure install location options
5. Create Start Menu and Desktop shortcuts
**Files:**
- `electron-builder.json`
- `assets/installer/installer-icon.ico`
**Verify:** `npm run dist && ls "dist/SOOMFON Controller Setup"*.exe`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_6_COMPLETE</promise>
