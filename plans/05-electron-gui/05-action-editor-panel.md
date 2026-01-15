# Ralph Loop: Phase 5.5 - Action Editor Panel
Parent: Phase 5 - Electron GUI
Sequence: 5 of 10
Next: 06-encoder-editor-panel.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a comprehensive action editor panel with forms for all action types (Keyboard, Launch, Script, HTTP, Media, System) and icon/image picker.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Action configuration UI
- **Dependencies:** Task 5.4 complete (device view for selection context)
- **Action Types:** Keyboard shortcuts, app launch, script execution, HTTP requests, media control, system commands
- **Features:** Type selector, type-specific forms, image picker, save/cancel

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.5.

## Task
### Task 5.5: Action Editor Panel
**Check:** `test -f src/renderer/components/ActionEditor/ActionEditor.tsx`
**Skip If:** Action editor shows all action type forms and saves configuration
**Requires:** Task 5.4
**Work:**
1. Create sidebar panel layout (`ActionEditor.tsx`):
   - Shows when a button/encoder is selected
   - Title showing selected button name
   - Action type selector dropdown
   - Dynamic form based on type
   - Save/Cancel/Clear buttons
2. Create action type selector (`ActionTypeSelect.tsx`):
   - Dropdown with all action types
   - Icons for each type
3. Create form for each action type:
   - `KeyboardAction.tsx`: Key combination picker, modifiers (Ctrl, Alt, Shift, Win)
   - `LaunchAction.tsx`: File path input, browse button, arguments field
   - `ScriptAction.tsx`: Script type selector (PowerShell, Cmd, Node), code editor
   - `HttpAction.tsx`: Method, URL, headers, body inputs
   - `MediaAction.tsx`: Media command selector (play/pause, next, prev, volume)
   - `SystemAction.tsx`: System command selector (lock, sleep, shutdown, etc.)
4. Create icon/image picker (`ImagePicker.tsx`):
   - Preview current image
   - Browse for image file
   - Built-in icon library (optional)
   - Clear image button
5. Wire up save functionality:
   - Validate inputs
   - Save to configuration via IPC
   - Update device display
**Files:** `src/renderer/components/ActionEditor/ActionEditor.tsx`, `src/renderer/components/ActionEditor/ActionTypeSelect.tsx`, `src/renderer/components/ActionEditor/KeyboardAction.tsx`, `src/renderer/components/ActionEditor/LaunchAction.tsx`, `src/renderer/components/ActionEditor/ScriptAction.tsx`, `src/renderer/components/ActionEditor/HttpAction.tsx`, `src/renderer/components/ActionEditor/MediaAction.tsx`, `src/renderer/components/ActionEditor/SystemAction.tsx`, `src/renderer/components/ActionEditor/ImagePicker.tsx`, `src/renderer/components/ActionEditor/index.ts`
**Verify:** All action types selectable; keyboard form allows key selection; saving updates config

## UI Verification (Playwright)
Verify action editor panel and forms:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_click` selector "[data-testid='lcd-button-0']" to select a button
3. `playwright_screenshot` with name "05-action-editor-panel"
4. `playwright_click` selector "[data-testid='action-type-select']"
5. `playwright_screenshot` with name "05-action-types-dropdown"
6. For each action type (Keyboard, Launch, Script, HTTP, Media, System):
   - Select the type
   - `playwright_screenshot` with name "05-form-{type}"
7. Verify: All 6 action type forms render correctly with appropriate inputs

## Completion Criteria
When task is complete:
<promise>SUBPLAN_5_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [06-encoder-editor-panel.md](./06-encoder-editor-panel.md).
