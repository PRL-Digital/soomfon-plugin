# Ralph Loop: Phase 5.7 - Profile Manager
Parent: Phase 5 - Electron GUI
Sequence: 7 of 10
Next: 08-settings-panel.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Build a complete profile management system with dropdown selector, create/rename/delete/duplicate actions, and import/export functionality.

## Context
- **Parent Phase:** Phase 5 - Electron GUI
- **Focus:** Profile CRUD operations and switching
- **Dependencies:** Task 5.2 complete (IPC layer for profile operations)
- **Profile Features:** Quick switch dropdown, full list view, create/rename/delete/duplicate, import/export JSON
- **Integration:** Profile changes should update device display immediately

## Status Tracking
Update `STATUS.md` to reflect progress on Task 5.7.

## Task
### Task 5.7: Profile Manager
**Check:** `test -f src/renderer/components/ProfileManager/ProfileSelector.tsx`
**Skip If:** Profile dropdown works and create/delete/duplicate functions work
**Requires:** Task 5.2
**Work:**
1. Create profile selector dropdown (`ProfileSelector.tsx`):
   - Show current profile name
   - Dropdown list of all profiles
   - Quick switch on selection
   - Visual indicator for active profile
   - "Manage Profiles" option to open list view
2. Create profile list view (`ProfileList.tsx`):
   - Full list of profiles
   - Select to switch active
   - Context menu or action buttons per profile
3. Create profile editor (`ProfileEditor.tsx`):
   - Rename profile input
   - Delete confirmation dialog
   - Duplicate profile button
4. Implement profile actions:
   - **Create:** New profile with default/empty actions
   - **Rename:** Edit profile name
   - **Delete:** Remove profile (with confirmation)
   - **Duplicate:** Clone existing profile
5. Add import/export buttons:
   - **Export:** Save profile to JSON file (file dialog)
   - **Import:** Load profile from JSON file (file dialog)
6. Wire up IPC:
   - Use `useProfiles()` hook
   - Immediate device update on profile switch
**Files:** `src/renderer/components/ProfileManager/ProfileSelector.tsx`, `src/renderer/components/ProfileManager/ProfileList.tsx`, `src/renderer/components/ProfileManager/ProfileEditor.tsx`, `src/renderer/components/ProfileManager/index.ts`
**Verify:** Dropdown shows profiles; switching profiles updates immediately; export/import works

## UI Verification (Playwright)
Verify profile management UI:
1. `playwright_navigate` to `http://localhost:5173`
2. `playwright_click` selector "[data-testid='profile-selector']"
3. `playwright_screenshot` with name "07-profile-list"
4. `playwright_click` selector "[data-testid='create-profile-btn']"
5. `playwright_screenshot` with name "07-create-profile-dialog"
6. Verify: Profile dropdown shows profiles, create/delete/duplicate buttons work

## Completion Criteria
When task is complete:
<promise>SUBPLAN_7_COMPLETE</promise>

## If Blocked
If you cannot proceed:
1. Document the blocker in `STATUS.md`
2. List what you tried
3. Specify what information or resource is needed
4. Output: `<blocked>REASON</blocked>`

## Next Sub-Plan
After completion, continue to [08-settings-panel.md](./08-settings-panel.md).
