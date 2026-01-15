# Ralph Loop: Phase 5.4 - Device View Component
Parent: Phase 5 - Electron GUI
Sequence: 4 of 10
Next: 05-action-editor-panel.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Build a visual representation of the physical device showing all LCD buttons, normal buttons, and rotary encoders with accurate layout and interactive feedback.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Device visualization and interaction
- **Dependencies:** Task 5.3 complete (main window layout)
- **Device Layout:** 6 LCD buttons, 3 normal buttons, 3 rotary encoders
- **Interactions:** Click to select, visual feedback on physical press, selection highlight

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.4.

## Task
### Task 5.4: Device View Component
**Check:** `test -f src/renderer/components/DeviceView/DeviceView.tsx`
**Skip If:** Device view renders all buttons and encoders matching physical layout
**Requires:** Task 5.3
**Work:**
1. Create device container (`DeviceView.tsx`):
   - Layout matching physical device
   - Grid/flex arrangement of components
   - Connection state awareness
2. Create LCD button component (`LCDButton.tsx`):
   - Square button with image display area
   - Click handler for selection
   - Visual states: normal, selected, pressed
   - Image preview from configuration
3. Create normal button component (`NormalButton.tsx`):
   - Physical button representation
   - Click handler for selection
   - Visual states: normal, selected, pressed
4. Create rotary encoder component (`RotaryKnob.tsx`):
   - Knob visual with rotation indicator
   - Click handler for selection
   - Visual state for pressed (center button)
   - Optional: rotation animation on physical input
5. Add interaction feedback:
   - Press animation (scale down briefly)
   - Selection highlight (border/glow)
   - Sync selection state with action editor
**Files:** `src/renderer/components/DeviceView/DeviceView.tsx`, `src/renderer/components/DeviceView/LCDButton.tsx`, `src/renderer/components/DeviceView/NormalButton.tsx`, `src/renderer/components/DeviceView/RotaryKnob.tsx`, `src/renderer/components/DeviceView/index.ts`
**Verify:** Clicking button selects it; physical press shows animation; layout matches device

## UI Verification (Playwright)
Verify device visualization renders correctly:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_screenshot` with name "04-device-view", fullPage: true
3. `playwright_click` selector "[data-testid='lcd-button-0']" (first LCD button)
4. `playwright_screenshot` with name "04-button-selected"
5. Verify:
   - 6 LCD buttons visible in correct layout
   - 3 normal buttons visible
   - 3 rotary encoders visible
   - Selection highlight appears on clicked button

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [05-action-editor-panel.md](./05-action-editor-panel.md).
