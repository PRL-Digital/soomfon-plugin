# Ralph Loop: Phase 5.6 - Encoder Editor Panel
Parent: Phase 5 - Electron GUI
Sequence: 6 of 10
Next: 07-profile-manager.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create an encoder-specific editor panel with four configurable action sections for press, long press, clockwise rotation, and counter-clockwise rotation.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Rotary encoder configuration UI
- **Dependencies:** Task 5.5 complete (action editor with reusable forms)
- **Encoder Actions:** Press (short), Long Press, Rotate Clockwise, Rotate Counter-Clockwise
- **Key Pattern:** Reuse action type forms from Task 5.5

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.6.

## Task
### Task 5.6: Encoder Editor Panel
**Check:** `test -f src/renderer/components/ActionEditor/EncoderEditor.tsx`
**Skip If:** Encoder editor has all 4 action sections (press, long press, CW, CCW)
**Requires:** Task 5.5
**Work:**
1. Create encoder-specific editor (`EncoderEditor.tsx`):
   - Shows when an encoder is selected (detect from selection context)
   - Title showing encoder name (e.g., "Encoder 1")
   - Four collapsible/expandable sections
2. Add sections for each action type:
   - **Press Action:** Short press configuration
   - **Long Press Action:** Hold for 500ms+ configuration
   - **Clockwise Rotation:** CW turn action
   - **Counter-Clockwise Rotation:** CCW turn action
3. For each section:
   - Action type selector (reuse `ActionTypeSelect`)
   - Action form (reuse forms from Task 5.5)
   - Enable/disable toggle
   - Clear button
4. Reuse components from Task 5.5:
   - Import and use `KeyboardAction`, `LaunchAction`, etc.
   - Same validation and save patterns
5. Wire up save functionality:
   - Save all four action configurations
   - Update via IPC
**Files:** `src/renderer/components/ActionEditor/EncoderEditor.tsx`
**Verify:** Encoder shows 4 configurable action sections; saves correctly

## UI Verification (Playwright)
Verify encoder editor with 4 action sections:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_click` selector "[data-testid='encoder-0']" to select an encoder
3. `playwright_screenshot` with name "06-encoder-editor"
4. `playwright_get_visible_html` selector "[data-testid='encoder-editor']"
5. Verify: 4 sections visible (Press, Long Press, Clockwise, Counter-Clockwise)

## Completion Criteria
When task is complete:
<promise>SUBPLAN_6_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [07-profile-manager.md](./07-profile-manager.md).
