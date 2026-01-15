# Ralph Loop: Phase 6.6 - Node-RED Settings UI
Parent: Phase 6 - Integrations
Sequence: 6 of 8
Next: 07-entity-browser-dialog.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a configuration interface for Node-RED connection with base URL, optional auth token, and test webhook.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Node-RED settings panel in IntegrationSettings
- **Dependencies:** Tasks 6.4, 6.5 complete

## Task
### Task 6.6: Node-RED Settings UI
**Requires:** Tasks 6.4, 6.5 complete
**Check:** `grep -q "Node-RED" src/renderer/components/Settings/IntegrationSettings.tsx 2>/dev/null && npm run build`
**Skip If:** Node-RED settings section exists AND build succeeds
**Work:**
1. Add Node-RED section to IntegrationSettings.tsx
2. Create base URL input field (default: http://localhost:1880)
3. Create optional auth token input (password/masked field)
4. Add "Send Test Webhook" button
5. Display test status (success/failure with timestamp)
6. Save settings to config store
**Files:** `src/renderer/components/Settings/IntegrationSettings.tsx`
**Verify:** `npm run build` succeeds AND Node-RED settings section renders

## Completion Criteria
When task is complete:
<promise>SUBPLAN_6_COMPLETE</promise>
