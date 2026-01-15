# Phase 5: Electron GUI Sub-Plans

**Source:** plans/05-electron-gui.md
**Total Sub-Plans:** 10
**Completion Signal:** PHASE_5_COMPLETE

## Mission
Build a complete Electron + React GUI with device visualization, action configuration, profile management, settings panels, and system tray integration.

## UI Verification
Tasks 5.1-5.8 include Playwright MCP verification steps to visually confirm UI components render correctly. The dev server must be running (`npm run dev`) before executing these verification steps.

## Sub-Plans (in order)
1. `01-electron-vite-react-setup.md` - Set up Electron + Vite + React project structure
2. `02-ipc-communication-layer.md` - Implement IPC communication between main and renderer
3. `03-main-window-layout.md` - Create main window layout with header and navigation
4. `04-device-view-component.md` - Build device visualization component
5. `05-action-editor-panel.md` - Create action editor panel for button configuration
6. `06-encoder-editor-panel.md` - Create encoder editor panel with 4 action sections
7. `07-profile-manager.md` - Build profile management system
8. `08-settings-panel.md` - Create settings panel with device and app settings
9. `09-system-tray.md` - Implement system tray with context menu
10. `10-auto-launch-startup.md` - Add auto-launch on Windows startup

## Overall Completion Criteria
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

## Dependencies
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

## Prerequisites
- Phase 4 completed with working configuration system
- All core functionality (device, actions, config) operational
- Target: Windows desktop application

## Usage
```bash
./ralph-loop.sh plans/05-electron-gui/ 20
```
