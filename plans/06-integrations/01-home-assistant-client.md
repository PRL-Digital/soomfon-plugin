# Ralph Loop: Phase 6.1 - Home Assistant Client
Parent: Phase 6 - Integrations
Sequence: 1 of 8
Next: 02-home-assistant-action-type.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create an axios-based REST API client for Home Assistant with connection testing, entity listing, and service calls.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Home Assistant REST API client implementation
- **Dependencies:** Phase 5 completed with working GUI, HTTP action handler functional

## Task
### Task 6.1: Home Assistant Client
**Check:** `ls src/core/integrations/home-assistant.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Work:**
1. Create axios-based HTTP client class `HomeAssistantClient`
2. Implement `configure(url, token)` method for setup
3. Implement `checkConnection()` to test connectivity
4. Implement `getStates()` to list all entities
5. Implement `toggleLight(entityId)` convenience method
6. Implement `setLightBrightness(entityId, brightness)` method
7. Implement `runScript(entityId)` method
8. Implement generic `callService({ domain, service, target, data })` method
**Files:** `src/core/integrations/home-assistant.ts`
**Verify:** `npx ts-node -e "import { HomeAssistantClient } from './src/core/integrations/home-assistant'"` compiles

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>
