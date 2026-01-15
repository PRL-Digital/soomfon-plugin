# Ralph Loop: Phase 6.2 - Home Assistant Action Type
Parent: Phase 6 - Integrations
Sequence: 2 of 8
Next: 03-home-assistant-settings-ui.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Define a specialized action type and handler for Home Assistant operations with a UI form component.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** HomeAssistantAction type, handler, and UI form
- **Dependencies:** Task 6.1 (Home Assistant Client) complete

## Task
### Task 6.2: Home Assistant Action Type
**Requires:** Task 6.1 complete
**Check:** `ls src/core/actions/handlers/home-assistant-handler.ts src/renderer/components/ActionEditor/HomeAssistantAction.tsx 2>/dev/null && npm run build`
**Skip If:** Both files exist AND build succeeds
**Work:**
1. Define `HomeAssistantAction` interface extending BaseAction with type `'home_assistant'`
2. Add params: `operation` (toggle/turn_on/turn_off/set_brightness/run_script/trigger_automation/custom)
3. Add params: `entityId`, `brightness`, `customService` (domain, service, data)
4. Create handler that uses HomeAssistantClient
5. Add HomeAssistantAction to action type union
6. Create React form component with operation dropdown and entity selector
7. Add "Test Action" button to form
**Files:** `src/core/actions/handlers/home-assistant-handler.ts`, `src/renderer/components/ActionEditor/HomeAssistantAction.tsx`
**Verify:** `npm run build` succeeds with no type errors

## Completion Criteria
When task is complete:
<promise>SUBPLAN_2_COMPLETE</promise>
