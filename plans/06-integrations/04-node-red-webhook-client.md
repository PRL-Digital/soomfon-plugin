# Ralph Loop: Phase 6.4 - Node-RED Webhook Client
Parent: Phase 6 - Integrations
Sequence: 4 of 8
Next: 05-node-red-action-type.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create an HTTP client for triggering Node-RED webhook nodes with configurable base URL and optional authentication.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Node-RED webhook client implementation
- **Dependencies:** Phase 5 complete, no direct dependency on HA tasks

## Task
### Task 6.4: Node-RED Webhook Client
**Check:** `ls src/core/integrations/node-red.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Work:**
1. Create `NodeRedClient` class with axios
2. Implement `configure(baseUrl, authToken?)` method
3. Implement `triggerWebhook(endpoint, eventName, payload)` method
4. Implement `sendButtonPress(buttonIndex)` convenience method
5. Implement `sendEncoderEvent(encoderIndex, type, direction)` method
6. Implement `sendCustomEvent(eventName, data)` method
7. Add auth header when token is configured
**Files:** `src/core/integrations/node-red.ts`
**Verify:** `npx ts-node -e "import { NodeRedClient } from './src/core/integrations/node-red'"` compiles

## Completion Criteria
When task is complete:
<promise>SUBPLAN_4_COMPLETE</promise>
