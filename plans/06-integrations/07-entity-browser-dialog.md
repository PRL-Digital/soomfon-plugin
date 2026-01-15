# Ralph Loop: Phase 6.7 - Entity Browser Dialog
Parent: Phase 6 - Integrations
Sequence: 7 of 8
Next: 08-integration-presets.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create a modal dialog component for browsing and selecting Home Assistant entities with search and domain grouping.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Entity browser modal for HA entity selection
- **Dependencies:** Task 6.1 (HA Client) complete for fetching entities

## Task
### Task 6.7: Entity Browser Dialog
**Requires:** Task 6.1 complete
**Check:** `ls src/renderer/components/common/EntityBrowser.tsx 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Work:**
1. Create modal dialog component `EntityBrowser`
2. Fetch entity list from HomeAssistantClient on open
3. Add search box with real-time filtering
4. Group entities by domain (light, switch, script, automation, etc.)
5. Display entity_id and friendly_name for each entity
6. Implement click-to-select that closes modal and returns entity_id
7. Add loading state and error handling
**Files:** `src/renderer/components/common/EntityBrowser.tsx`
**Verify:** `npm run build` succeeds AND component can be imported

## Completion Criteria
When task is complete:
<promise>SUBPLAN_7_COMPLETE</promise>
