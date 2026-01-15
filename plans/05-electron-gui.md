# Ralph Loop: Phase 5 - Electron GUI

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
Build a complete Electron + React GUI with device visualization, action configuration, profile management, settings panels, and system tray integration.

## Context
- Phase 4 completed with working configuration system
- All core functionality (device, actions, config) operational
- Target: Windows desktop application

## Status Tracking

Create `STATUS.md` if it doesn't exist:
```markdown
# Phase 5 Status

## Tasks
- [ ] 5.1: Electron + Vite + React Setup
- [ ] 5.2: IPC Communication Layer
- [ ] 5.3: Main Window Layout
- [ ] 5.4: Device View Component
- [ ] 5.5: Action Editor Panel
- [ ] 5.6: Encoder Editor Panel
- [ ] 5.7: Profile Manager
- [ ] 5.8: Settings Panel
- [ ] 5.9: System Tray
- [ ] 5.10: Auto-Launch on Startup

## Current Task
None started

## Blockers
None

## Notes
```

---

## Tasks

### Task 5.1: Electron + Vite + React Setup
**Check:** `test -f src/main/index.ts && test -f vite.config.ts`
**Skip If:** Both files exist and `npm run build` succeeds
**Work:**
1. Set up Electron main process entry
2. Configure Vite for React frontend
3. Set up TypeScript for all processes
4. Configure build process
5. Set up hot reload for development

**Files:** `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `vite.config.ts`, `electron-builder.json`
**Verify:** `npm run dev` starts dev server; `npm run build` builds production app

---

### Task 5.2: IPC Communication Layer
**Check:** `test -f src/main/ipc-handlers.ts && test -f src/renderer/hooks/useIpc.ts`
**Skip If:** IPC handlers exist and device status available in React
**Requires:** Task 5.1
**Work:**
1. Define IPC channel names in `src/shared/types/ipc.ts`
2. Expose safe APIs via context bridge in preload
3. Create handlers in main process
4. Create React hooks for IPC calls (`useDevice`, `useActions`)

**Files:** `src/shared/types/ipc.ts`, `src/main/ipc-handlers.ts`, `src/preload/index.ts`, `src/renderer/hooks/useIpc.ts`
**Verify:** Device status displays in React; actions execute from renderer

---

### Task 5.3: Main Window Layout
**Check:** `test -f src/renderer/App.tsx && test -f tailwind.config.js`
**Skip If:** App.tsx renders header with profile selector and status indicator
**Requires:** Task 5.1
**Work:**
1. Create header with title and connection status
2. Create profile selector dropdown
3. Create tab navigation (Device/Settings)
4. Create main content area
5. Style with Tailwind CSS

**Files:** `src/renderer/App.tsx`, `src/renderer/styles/global.css`, `tailwind.config.js`
**Verify:** Window shows header, profile dropdown, and content area

---

### Task 5.4: Device View Component
**Check:** `test -f src/renderer/components/DeviceView/DeviceView.tsx`
**Skip If:** Device view renders all buttons and encoders matching physical layout
**Requires:** Task 5.3
**Work:**
1. Create device container with accurate layout
2. Create LCD button component (clickable, shows image)
3. Create normal button component
4. Create rotary encoder component
5. Add press feedback animation
6. Add selection highlight

**Files:** `src/renderer/components/DeviceView/DeviceView.tsx`, `src/renderer/components/DeviceView/LCDButton.tsx`, `src/renderer/components/DeviceView/NormalButton.tsx`, `src/renderer/components/DeviceView/RotaryKnob.tsx`
**Verify:** Clicking button selects it; physical press shows animation; layout matches device

---

### Task 5.5: Action Editor Panel
**Check:** `test -f src/renderer/components/ActionEditor/ActionEditor.tsx`
**Skip If:** Action editor shows all action type forms and saves configuration
**Requires:** Task 5.4
**Work:**
1. Create sidebar panel layout
2. Create action type selector
3. Create form for each action type: Keyboard, Launch, Script, HTTP, Media, System
4. Create icon/image picker
5. Add save/cancel buttons

**Files:** `src/renderer/components/ActionEditor/ActionEditor.tsx`, `src/renderer/components/ActionEditor/ActionTypeSelect.tsx`, `src/renderer/components/ActionEditor/KeyboardAction.tsx`, `src/renderer/components/ActionEditor/LaunchAction.tsx`, `src/renderer/components/ActionEditor/ScriptAction.tsx`, `src/renderer/components/ActionEditor/HttpAction.tsx`, `src/renderer/components/ActionEditor/MediaAction.tsx`, `src/renderer/components/ActionEditor/SystemAction.tsx`, `src/renderer/components/ActionEditor/ImagePicker.tsx`
**Verify:** All action types selectable; keyboard form allows key selection; saving updates config

---

### Task 5.6: Encoder Editor Panel
**Check:** `test -f src/renderer/components/ActionEditor/EncoderEditor.tsx`
**Skip If:** Encoder editor has all 4 action sections (press, long press, CW, CCW)
**Requires:** Task 5.5
**Work:**
1. Create encoder-specific editor
2. Add sections for: press, long press, clockwise rotation, counter-clockwise rotation
3. Reuse action type forms from Task 5.5

**Files:** `src/renderer/components/ActionEditor/EncoderEditor.tsx`
**Verify:** Encoder shows 4 configurable action sections; saves correctly

---

### Task 5.7: Profile Manager
**Check:** `test -f src/renderer/components/ProfileManager/ProfileSelector.tsx`
**Skip If:** Profile dropdown works and create/delete/duplicate functions work
**Requires:** Task 5.2
**Work:**
1. Create profile selector dropdown
2. Create profile list view
3. Add create new profile button
4. Add rename/delete actions
5. Add duplicate profile option
6. Add import/export buttons

**Files:** `src/renderer/components/ProfileManager/ProfileSelector.tsx`, `src/renderer/components/ProfileManager/ProfileList.tsx`, `src/renderer/components/ProfileManager/ProfileEditor.tsx`
**Verify:** Dropdown shows profiles; switching profiles updates immediately; export/import works

---

### Task 5.8: Settings Panel
**Check:** `test -f src/renderer/components/Settings/SettingsPanel.tsx`
**Skip If:** Settings panel has Device, App, and Integration tabs with working controls
**Requires:** Task 5.3
**Work:**
1. Create tabbed settings layout
2. Create Device Settings: brightness slider, sleep timeout
3. Create App Settings: launch on startup, minimize to tray, theme
4. Create Integrations: Home Assistant config, Node-RED config, test buttons

**Files:** `src/renderer/components/Settings/SettingsPanel.tsx`, `src/renderer/components/Settings/DeviceSettings.tsx`, `src/renderer/components/Settings/AppSettings.tsx`, `src/renderer/components/Settings/IntegrationSettings.tsx`
**Verify:** Brightness slider changes device brightness live; settings persist

---

### Task 5.9: System Tray
**Check:** `test -f src/main/tray.ts`
**Skip If:** Tray icon appears with working context menu
**Requires:** Task 5.1
**Work:**
1. Create tray icon
2. Create context menu: show/hide, profile submenu, status, quit
3. Handle close-to-tray behavior
4. Show notification on minimize

**Files:** `src/main/tray.ts`, `assets/tray/tray-icon.png`, `assets/tray/tray-icon-connected.png`, `assets/tray/tray-icon-disconnected.png`
**Verify:** Tray icon visible; right-click shows menu; closing window minimizes to tray

---

### Task 5.10: Auto-Launch on Startup
**Check:** `test -f src/main/auto-launch.ts`
**Skip If:** Auto-launch toggle enables/disables Windows startup
**Requires:** Task 5.8
**Work:**
1. Use electron auto-launch or Windows registry
2. Toggle based on setting
3. Handle permission errors gracefully

**Files:** `src/main/auto-launch.ts`
**Verify:** Toggle in settings enables/disables startup; app launches on Windows boot when enabled

---

## Completion Criteria

ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `test -f src/main/index.ts` (Electron main entry exists)
3. `test -f src/main/ipc-handlers.ts` (IPC handlers exist)
4. `test -f src/renderer/App.tsx` (React root exists)
5. `test -f src/renderer/components/DeviceView/DeviceView.tsx` (Device view exists)
6. `test -f src/renderer/components/ActionEditor/ActionEditor.tsx` (Action editor exists)
7. `test -f src/renderer/components/ActionEditor/EncoderEditor.tsx` (Encoder editor exists)
8. `test -f src/renderer/components/ProfileManager/ProfileSelector.tsx` (Profile manager exists)
9. `test -f src/renderer/components/Settings/SettingsPanel.tsx` (Settings panel exists)
10. `test -f src/main/tray.ts` (System tray exists)
11. `test -f src/main/auto-launch.ts` (Auto-launch exists)
12. Electron window opens and React app renders
13. Device view matches physical layout
14. Action configuration saves and executes correctly
15. System tray icon appears with working menu

When ALL criteria met, output:
<promise>PHASE_5_COMPLETE</promise>

## If Blocked

If you cannot proceed on any task:
1. Document in STATUS.md under Blockers
2. Try alternative approaches
3. Skip to next task if possible
4. If completely stuck, output: <promise>BLOCKED: [specific reason]</promise>

## New Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "electron": "^28.1.0",
    "vite": "^5.0.10",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

## Next Phase

Once GUI is complete, proceed to [Phase 6: Integrations](./06-integrations.md) to build Home Assistant and Node-RED modules.
