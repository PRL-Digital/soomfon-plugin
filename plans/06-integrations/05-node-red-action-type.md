# Ralph Loop: Phase 6.5 - Node-RED Action Type
Parent: Phase 6 - Integrations
Sequence: 5 of 8
Next: 06-node-red-settings-ui.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Define a specialized action type and handler for Node-RED webhook operations with a UI form component.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** NodeRedAction type, handler, and UI form
- **Dependencies:** Task 6.4 (Node-RED Client) complete

## Task
### Task 6.5: Node-RED Action Type
**Requires:** Task 6.4 complete
**Check:** `ls src/core/actions/handlers/node-red-handler.ts src/renderer/components/ActionEditor/NodeRedAction.tsx 2>/dev/null && npm run build`
**Skip If:** Both files exist AND build succeeds
**Work:**
1. Define `NodeRedAction` interface extending BaseAction with type `'node_red'`
2. Add params: `endpoint` (string), `eventName` (string), `payload` (optional object)
3. Create handler that uses NodeRedClient
4. Add NodeRedAction to action type union
5. Create React form component with endpoint, event name, and JSON payload editor
6. Add "Test Webhook" button to form
**Files:** `src/core/actions/handlers/node-red-handler.ts`, `src/renderer/components/ActionEditor/NodeRedAction.tsx`
**Verify:** `npm run build` succeeds with no type errors

## Completion Criteria
When task is complete:
<promise>SUBPLAN_5_COMPLETE</promise>
