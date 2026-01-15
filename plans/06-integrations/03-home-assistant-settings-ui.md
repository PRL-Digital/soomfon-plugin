# Ralph Loop: Phase 6.3 - Home Assistant Settings UI
Parent: Phase 6 - Integrations
Sequence: 3 of 8
Next: 04-node-red-webhook-client.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a configuration interface for Home Assistant connection with URL, token, and connection testing.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Home Assistant settings panel in IntegrationSettings
- **Dependencies:** Tasks 6.1, 6.2 complete

## Task
### Task 6.3: Home Assistant Settings UI
**Requires:** Tasks 6.1, 6.2 complete
**Check:** `grep -q "Home Assistant" src/renderer/components/Settings/IntegrationSettings.tsx 2>/dev/null && npm run build`
**Skip If:** HA settings section exists AND build succeeds
**Work:**
1. Add Home Assistant section to IntegrationSettings.tsx
2. Create URL input field for HA server address
3. Create access token input (password/masked field)
4. Add "How to get token?" help link pointing to HA profile page
5. Add "Test Connection" button
6. Display connection status with entity count on success
7. Save settings to config store
**Files:** `src/renderer/components/Settings/IntegrationSettings.tsx`
**Verify:** `npm run build` succeeds AND HA settings section renders

## Completion Criteria
When task is complete:
<promise>SUBPLAN_3_COMPLETE</promise>
