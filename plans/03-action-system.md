# Ralph Loop: Phase 3 - Action System

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
Build the action execution engine that translates device events into configurable actions (keyboard, launch, script, HTTP, media, system operations).

## Context
- Phase 2 completed with working device communication
- Button and encoder events being received
- Action types: keyboard, launch, script, http, media, system, profile, text

## Status Tracking
At the START of each iteration, read `STATUS.md`. If it doesn't exist, create it:
```
# Phase 3 Status
Last Updated: [timestamp]
Iteration: 1

## Task Status
- [ ] 3.1 Action Type Definitions
- [ ] 3.2 Action Engine
- [ ] 3.3 Keyboard Handler
- [ ] 3.4 Launch Handler
- [ ] 3.5 Script Handler
- [ ] 3.6 HTTP Handler
- [ ] 3.7 Media Handler
- [ ] 3.8 System Handler
- [ ] 3.9 Event-to-Action Binding

## Blockers
None

## Notes
[Any observations from this iteration]
```

Update this file at the END of each iteration.

## Tasks

### Task 3.1: Action Type Definitions
**Check:** `ls src/shared/types/actions.ts 2>/dev/null && ls src/core/actions/schemas.ts 2>/dev/null`
**Skip If:** Both files exist
**Work:**
1. Create base action interface with id, type, name, icon, enabled fields
2. Define specific interfaces for each action type (KeyboardAction, LaunchAction, ScriptAction, etc.)
3. Create union type `Action` of all action types
4. Include Zod validation schemas for each action type
5. Define execution result types (success/failure with error message)
**Files:** `src/shared/types/actions.ts`, `src/core/actions/schemas.ts`
**Verify:** `npm run build 2>/dev/null`

### Task 3.2: Action Engine
**Requires:** Task 3.1 complete
**Check:** `ls src/core/actions/action-engine.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement handler registry pattern with registerHandler method
2. Create execute method that routes actions to appropriate handlers
3. Handle async execution with proper error handling
4. Implement cancellation support for long-running actions
5. Add execution logging/history tracking
**Files:** `src/core/actions/action-engine.ts`
**Verify:** `npx ts-node -e "import {ActionEngine} from './src/core/actions/action-engine';"` compiles

### Task 3.3: Keyboard Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/keyboard-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Install @nut-tree/nut-js if not present
2. Map string key names to nut-js Key enum
3. Support modifier combinations (Ctrl, Alt, Shift, Win)
4. Support single keys and key combinations
5. Handle holdDuration for hold-to-press actions
**Files:** `src/core/actions/handlers/keyboard-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.4: Launch Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/launch-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Use Node.js child_process.spawn for launching
2. Support command-line arguments via args array
3. Support working directory specification
4. Support opening files with default application (shell: true)
5. Handle path escaping for Windows paths
**Files:** `src/core/actions/handlers/launch-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.5: Script Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/script-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Support PowerShell and CMD script types
2. Support inline script strings and script file paths
3. Implement execution timeout with process kill
4. Capture stdout/stderr in execution result
5. Handle script errors gracefully with proper error messages
**Files:** `src/core/actions/handlers/script-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.6: HTTP Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/http-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Install axios if not present
2. Support all HTTP methods (GET, POST, PUT, DELETE, PATCH)
3. Support custom headers including Authorization
4. Support JSON and form body types
5. Implement request timeout with configurable duration
**Files:** `src/core/actions/handlers/http-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.7: Media Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/media-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Send media key events using nut-js (play/pause, next, prev, stop)
2. Control system volume (up, down, mute) via media keys
3. Support volume amount parameter for increment/decrement
**Files:** `src/core/actions/handlers/media-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.8: System Handler
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/handlers/system-handler.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement switch_desktop (Win+Ctrl+Left/Right)
2. Implement show_desktop (Win+D)
3. Implement lock_screen (Win+L)
4. Implement screenshot (Win+Shift+S)
5. Implement start_menu (Win) and task_view (Win+Tab)
**Files:** `src/core/actions/handlers/system-handler.ts`
**Verify:** Handler instantiates without error

### Task 3.9: Event-to-Action Binding
**Requires:** Task 3.2 complete
**Check:** `ls src/core/actions/event-binder.ts 2>/dev/null && npm run build 2>/dev/null`
**Skip If:** File exists AND build succeeds
**Work:**
1. Create binding configuration structure (elementType, elementIndex, trigger, action)
2. Support press, release, and long-press triggers for buttons
3. Support clockwise and counter-clockwise triggers for encoders
4. Integrate with ActionEngine for execution
5. Implement handleEvent method to process device events
**Files:** `src/core/actions/event-binder.ts`
**Verify:** `npx ts-node -e "import {EventBinder} from './src/core/actions/event-binder';"` compiles

## Completion Criteria
ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `ls src/shared/types/actions.ts` exists
3. `ls src/core/actions/schemas.ts` exists
4. `ls src/core/actions/action-engine.ts` exists
5. `ls src/core/actions/event-binder.ts` exists
6. `ls src/core/actions/handlers/keyboard-handler.ts` exists
7. `ls src/core/actions/handlers/launch-handler.ts` exists
8. `ls src/core/actions/handlers/script-handler.ts` exists
9. `ls src/core/actions/handlers/http-handler.ts` exists
10. `ls src/core/actions/handlers/media-handler.ts` exists
11. `ls src/core/actions/handlers/system-handler.ts` exists

When ALL criteria met, output:
<promise>PHASE_3_COMPLETE</promise>

## If Blocked
If you cannot proceed on any task:
1. Document in STATUS.md under Blockers
2. Try alternative approaches
3. Skip to next task if possible
4. If completely stuck, output: <promise>BLOCKED: [specific reason]</promise>

## Dependencies
```json
{
  "dependencies": {
    "@nut-tree/nut-js": "^4.2.0",
    "axios": "^1.6.2",
    "zod": "^3.22.4"
  }
}
```

## Next Phase
Once complete, proceed to [Phase 4: Configuration System](./04-configuration-system.md) to build persistent storage.
