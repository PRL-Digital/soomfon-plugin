# Ralph Loop: Phase 5.8 - Settings Panel
Parent: Phase 5 - Electron GUI
Sequence: 8 of 10
Next: 09-system-tray.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a tabbed settings panel with device settings (brightness, sleep), app settings (startup, theme), and integration settings (Home Assistant, Node-RED).

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Application and device configuration UI
- **Dependencies:** Task 5.3 complete (main window with Settings tab)
- **Setting Categories:** Device (hardware), App (behavior), Integrations (external services)
- **Key Feature:** Live brightness slider that updates device in real-time

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.8.

## Task
### Task 5.8: Settings Panel
**Check:** `test -f src/renderer/components/Settings/SettingsPanel.tsx`
**Skip If:** Settings panel has Device, App, and Integration tabs with working controls
**Requires:** Task 5.3
**Work:**
1. Create tabbed settings layout (`SettingsPanel.tsx`):
   - Sub-tabs: Device, App, Integrations
   - Content area for each tab
   - Save indicator (auto-save or explicit save)
2. Create Device Settings (`DeviceSettings.tsx`):
   - **Brightness slider:** 0-100% with live preview
   - **Sleep timeout:** Dropdown (never, 1min, 5min, 15min, 30min)
   - **Screen saver:** Enable/disable, type selection
   - Connection status display
3. Create App Settings (`AppSettings.tsx`):
   - **Launch on startup:** Checkbox (ties to Task 5.10)
   - **Minimize to tray:** Checkbox (ties to Task 5.9)
   - **Theme:** Light/Dark/System selector
   - **Language:** Dropdown (if i18n planned)
   - Data directory path display
4. Create Integration Settings (`IntegrationSettings.tsx`):
   - **Home Assistant:**
     - Server URL input
     - Access token input (masked)
     - Test connection button
     - Entity prefix input
   - **Node-RED:**
     - Enable/disable toggle
     - Port configuration
     - Test connection button
   - Status indicators for each integration
5. Wire up settings:
   - Use `useConfig()` hook
   - Brightness updates device immediately via IPC
   - Settings persist on change
**Files:** `src/renderer/components/Settings/SettingsPanel.tsx`, `src/renderer/components/Settings/DeviceSettings.tsx`, `src/renderer/components/Settings/AppSettings.tsx`, `src/renderer/components/Settings/IntegrationSettings.tsx`, `src/renderer/components/Settings/index.ts`
**Verify:** Brightness slider changes device brightness live; settings persist

## UI Verification (Playwright)
Verify settings panel tabs and controls:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_click` selector "[data-testid='settings-tab']" or similar settings nav
3. `playwright_screenshot` with name "08-settings-panel"
4. `playwright_click` selector "[data-testid='device-settings-tab']"
5. `playwright_screenshot` with name "08-device-settings"
6. `playwright_click` selector "[data-testid='app-settings-tab']"
7. `playwright_screenshot` with name "08-app-settings"
8. `playwright_click` selector "[data-testid='integration-settings-tab']"
9. `playwright_screenshot` with name "08-integration-settings"
10. Verify: All 3 settings tabs render with appropriate controls (brightness slider, theme toggle, etc.)

## Completion Criteria
When task is complete:
<promise>SUBPLAN_8_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [09-system-tray.md](./09-system-tray.md).
