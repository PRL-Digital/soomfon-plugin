# Ralph Loop: Phase 5.3 - Main Window Layout
Parent: Phase 5 - Electron GUI
Sequence: 3 of 10
Next: 04-device-view-component.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create the main application window layout with header, profile selector, navigation tabs, and content area using Tailwind CSS.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Core UI layout and styling foundation
- **Dependencies:** Task 5.1 complete (Electron setup)
- **Styling:** Tailwind CSS for utility-first styling
- **Layout:** Header with status/profile + Tab navigation + Main content area

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.3.

## Task
### Task 5.3: Main Window Layout
**Check:** `test -f src/renderer/App.tsx && test -f tailwind.config.js`
**Skip If:** App.tsx renders header with profile selector and status indicator
**Requires:** Task 5.1
**Work:**
1. Configure Tailwind CSS:
   - Create `tailwind.config.js` with custom theme
   - Set up PostCSS in `postcss.config.js`
   - Create base styles in `src/renderer/styles/global.css`
2. Create header component with:
   - Application title/logo
   - Device connection status indicator (green/red dot)
   - Profile selector dropdown placeholder
3. Create tab navigation:
   - Device tab (shows device view)
   - Settings tab (shows settings panel)
4. Create main content area:
   - Tab-based content switching
   - Responsive layout
5. Style with Tailwind:
   - Dark theme base
   - Consistent spacing and typography
**Files:** `src/renderer/App.tsx`, `src/renderer/styles/global.css`, `tailwind.config.js`, `postcss.config.js`, `src/renderer/components/Layout/Header.tsx`, `src/renderer/components/Layout/TabNav.tsx`
**Verify:** Window shows header, profile dropdown placeholder, and content area; tabs switch content

## UI Verification (Playwright)
Verify main layout components render:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_screenshot` with name "03-main-layout", fullPage: true
3. `playwright_click` selector "[data-testid='profile-selector']" or similar profile dropdown selector
4. `playwright_screenshot` with name "03-profile-dropdown-open"
5. Verify: Header visible, profile selector works, tab navigation present

## Completion Criteria
When task is complete:
<promise>SUBPLAN_3_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [04-device-view-component.md](./04-device-view-component.md).
