# Ralph Loop: Phase 6.8 - Integration Presets
Parent: Phase 6 - Integrations
Sequence: 8 of 8
Next: ../07-polish-distribution.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Create quick setup templates (presets) for common integration actions like toggle light, play/pause media, and trigger flows.

## Context
- **Parent Phase:** Phase 6 - Integrations
- **Focus:** Action presets for common integration use cases
- **Dependencies:** Tasks 6.1-6.6 complete (both HA and Node-RED integrations)

## Task
### Task 6.8: Integration Presets
**Requires:** Tasks 6.1-6.6 complete
**Check:** `ls src/core/integrations/presets.ts src/renderer/components/ActionEditor/PresetSelector.tsx 2>/dev/null && npm run build`
**Skip If:** Both files exist AND build succeeds
**Work:**
1. Create preset definitions file with common action templates
2. Define preset for "Toggle Light" (HA)
3. Define preset for "Play/Pause Media" (HA)
4. Define preset for "Run HA Script" (HA)
5. Define preset for "Trigger Node-RED Flow" (Node-RED)
6. Create PresetSelector component with "Add Preset" button
7. Display preset options as quick-add buttons in action editor
8. Clicking preset adds pre-configured action to profile
**Files:** `src/core/integrations/presets.ts`, `src/renderer/components/ActionEditor/PresetSelector.tsx`
**Verify:** `npm run build` succeeds AND presets can be imported

## Completion Criteria
When task is complete:
<promise>SUBPLAN_8_COMPLETE</promise>

## Phase Complete
When all 8 sub-plans are complete, the folder is done:
<promise>PHASE_6_COMPLETE</promise>
