# Ralph Loop Conversion Guide

A practical guide for converting standard planning documents into Ralph Loop compatible format.

---

## What is Ralph Loop?

Ralph Loop is an iterative execution pattern for AI agents that enables autonomous, repeating task completion. Instead of executing a plan document once, the agent:

1. **Repeats the prompt** on each iteration
2. **Tracks progress** via a STATUS.md file
3. **Works on ONE task** per iteration
4. **Verifies completion** using explicit checks
5. **Signals completion** via a special `<promise>` tag

This pattern transforms a static plan into an executable loop that can:
- Resume after interruption
- Handle manual/human-dependent tasks
- Self-verify progress
- Signal completion or blockage

---

## Key Structural Changes

| Standard Plan | Ralph Loop Plan |
|--------------|-----------------|
| Title: "Phase X: Name" | Title: "Ralph Loop: Phase X - Name" |
| Objective section | Mission section (concise) |
| Prerequisites section | Context section (key facts only) |
| Tasks with descriptions | Tasks with Check/Skip/Work/Verify structure |
| Verification checklist | Completion Criteria (boolean conditions) |
| Deliverables table | Removed (implied by tasks) |
| File structure diagram | Removed or minimized |
| Next Phase link | Next Phase link (kept) |
| N/A | Loop Instructions section (NEW) |
| N/A | Status Tracking section (NEW) |
| N/A | If Blocked section (NEW) |

---

## Required Sections (in order)

### 1. Loop Instructions
**Always include at the top, immediately after the title.**

```markdown
## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise
```

### 2. Mission
**Replace verbose "Objective" with a concise mission statement.**

```markdown
## Mission
[One sentence describing what this phase accomplishes and why]
```

### 3. Context
**Replace "Prerequisites" with key facts the agent needs.**

```markdown
## Context
- **Key Fact 1:** value
- **Key Fact 2:** value
- Any critical context needed for task execution
```

### 4. Status Tracking
**Define the STATUS.md template.**

```markdown
## Status Tracking
At the START of each iteration, read `STATUS.md`. If it doesn't exist, create it:
```
# Phase X Status
Last Updated: [timestamp]
Iteration: 1

## Task Status
- [ ] X.1 Task Name
- [ ] X.2 Task Name
- [ ] X.3 Task Name (MANUAL - waiting for human)

## Blockers
None

## Notes
[Any observations from this iteration]
```

Update this file at the END of each iteration.
```

### 5. Tasks (Converted Format)
**Each task MUST have this structure:**

```markdown
### Task X.Y: Task Name
**Check:** [Command to determine if task is done]
**Skip If:** [Condition that means task is already complete]
**Work:**
1. Step one
2. Step two
3. Step three
**Files:** [List of files created/modified]
**Verify:** [How to confirm success]
```

#### Special Task Variants

**For tasks with dependencies:**
```markdown
### Task X.Y: Task Name
**Requires:** Task X.1, X.2 complete
**Check:** ...
```

**For manual/human tasks:**
```markdown
### Task X.Y: Task Name (MANUAL)
**Type:** REQUIRES HUMAN INTERVENTION
**Check:** [Command to check if human completed it]
**Skip If:** [Condition indicating human has done the work]
**If Missing:**
- Add note to STATUS.md: "Waiting for human: [description]"
- Continue with other tasks
**Work:** (Human performs this task)
**Files:** [Expected output files]
```

### 6. Completion Criteria
**Define explicit boolean conditions.**

```markdown
## Completion Criteria
ALL of the following must be TRUE:
1. [Verifiable condition 1]
2. [Verifiable condition 2]
3. [Verifiable condition 3]

Note: [Any tasks NOT required for completion]

When ALL criteria met, output:
<promise>PHASE_X_COMPLETE</promise>
```

### 7. If Blocked
**Define behavior when stuck.**

```markdown
## If Blocked
If you cannot proceed on any task:
1. Document in STATUS.md under Blockers
2. Try alternative approaches
3. Skip to next task if possible
4. If completely stuck, output: <promise>BLOCKED: [specific reason]</promise>
```

### 8. Dependencies (Optional)
**Keep only if specific versions matter.**

```markdown
## Dependencies
```json
{
  "dependencies": {
    "package": "^version"
  }
}
```
```

### 9. Next Phase
**Keep the navigation link.**

```markdown
## Next Phase
Once complete, proceed to [Phase X+1: Name](./0X-name.md).
```

---

## Before/After Comparison

### Title

**BEFORE:**
```markdown
# Phase 2: Protocol Implementation
```

**AFTER:**
```markdown
# Ralph Loop: Phase 2 - Protocol Implementation
```

---

### Objective vs Mission

**BEFORE:**
```markdown
## Objective

Build the core communication layer that handles all USB HID interaction with the SOOMFON device, including:
1. Device connection management (connect, reconnect, disconnect)
2. Input event parsing (buttons, encoders)
3. Output commands (images, brightness, screen control)
```

**AFTER:**
```markdown
## Mission
Build the USB HID communication layer for device connection, input event parsing, and output commands (images, brightness, screen control).
```

---

### Prerequisites vs Context

**BEFORE:**
```markdown
## Prerequisites

- Phase 1 completed with documented protocol specification
- Known packet formats for input and output
```

**AFTER:**
```markdown
## Context
- Phase 1 completed with protocol spec in `docs/soomfon-protocol.md`
- Input/output packet formats documented
- VID: 0x1500, PID: 0x3001
```

---

### Task Format

**BEFORE:**
```markdown
### Task 2.1: HID Manager
**Create a robust connection manager for the USB device**

**Actions:**
1. Implement device discovery using VID/PID
2. Handle both HID interfaces appropriately
3. Implement automatic reconnection on disconnect
4. Emit connection status events
5. Provide async read/write methods

**Files to Create:**
- `src/core/device/hid-manager.ts`

**Required Outcome:**
```typescript
const manager = new HIDManager();
manager.on('connected', (info) => console.log('Connected:', info));
// ...
```

**Verification:**
- Connects to device on startup
- Reconnects automatically after USB unplug/replug
- Emits proper events for connection state changes
```

**AFTER:**
```markdown
### Task 2.1: HID Manager
**Check:** `ls src/core/device/hid-manager.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND build succeeds
**Work:**
1. Implement device discovery using VID/PID
2. Handle both HID interfaces appropriately
3. Implement automatic reconnection on disconnect
4. Emit connection status events
5. Provide async read/write methods
**Files:** `src/core/device/hid-manager.ts`
**Verify:** `npx ts-node -e "import {HIDManager} from './src/core/device/hid-manager'; new HIDManager();"` compiles
```

---

### Verification Checklist vs Completion Criteria

**BEFORE:**
```markdown
## Verification Checklist

- [ ] Device connects reliably
- [ ] Device reconnects after USB unplug/replug
- [ ] All 6 LCD button presses detected
- [ ] All 3 normal button presses detected
- [ ] All 3 encoder presses detected
- [ ] All 3 encoder rotations detected (CW and CCW)
- [ ] Brightness control works (0-100%)
- [ ] Screen clear works (full and per-button)
- [ ] Images display correctly on all 6 LCD buttons
- [ ] Images are properly oriented
- [ ] No buffer overflow with rapid operations
```

**AFTER:**
```markdown
## Completion Criteria
ALL of the following must be TRUE:
1. `npm run build` succeeds
2. `ls src/core/device/hid-manager.ts` exists
3. `ls src/core/device/device-events.ts` exists
4. `ls src/core/device/soomfon-protocol.ts` exists
5. `ls src/core/device/image-processor.ts` exists
6. `npx ts-node scripts/test-device.ts` runs without error

When ALL criteria met, output:
<promise>PHASE_2_COMPLETE</promise>
```

---

## Template for New Conversions

Copy and adapt this template:

```markdown
# Ralph Loop: Phase [X] - [Name]

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Identify the next incomplete task
3. Work on ONE task per iteration
4. Verify your work with the specified commands
5. Update `STATUS.md` with results
6. If ALL tasks complete, output the completion promise

## Mission
[One-sentence description of what this phase accomplishes]

## Context
- **Key Fact:** [value]
- **Another Fact:** [value]
- [Any critical information needed]

## Status Tracking
At the START of each iteration, read `STATUS.md`. If it doesn't exist, create it:
```
# Phase [X] Status
Last Updated: [timestamp]
Iteration: 1

## Task Status
- [ ] [X].1 [Task Name]
- [ ] [X].2 [Task Name]
- [ ] [X].3 [Task Name]

## Blockers
None

## Notes
[Any observations from this iteration]
```

Update this file at the END of each iteration.

## Tasks

### Task [X].1: [Task Name]
**Check:** `[command to check if done]`
**Skip If:** [condition for skipping]
**Work:**
1. [Step one]
2. [Step two]
3. [Step three]
**Files:** `[file1]`, `[file2]`
**Verify:** [verification command or check]

### Task [X].2: [Task Name]
**Requires:** Task [X].1 complete
**Check:** `[command]`
**Skip If:** [condition]
**Work:**
1. [Steps...]
**Files:** `[files]`
**Verify:** [verification]

### Task [X].3: [Task Name] (MANUAL)
**Type:** REQUIRES HUMAN INTERVENTION
**Check:** `[command to check if human did it]`
**Skip If:** [condition]
**If Missing:**
- Add note to STATUS.md: "Waiting for human: [description]"
- Continue with other tasks
**Work:** (Human performs this)
**Files:** `[expected output]`

## Completion Criteria
ALL of the following must be TRUE:
1. [Verifiable condition with command]
2. [Another condition]
3. [Another condition]

Note: Task [X].3 (Manual) is NOT required for completion.

When ALL criteria met, output:
<promise>PHASE_[X]_COMPLETE</promise>

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
    "[package]": "^[version]"
  }
}
```

## Next Phase
Once complete, proceed to [Phase [X+1]: [Name]](./0[X+1]-[filename].md).
```

---

## Conversion Checklist

Use this checklist when converting each plan file:

### Header Changes
- [ ] Rename title to "Ralph Loop: Phase X - Name"
- [ ] Add Loop Instructions section immediately after title
- [ ] Add Mission section (condense Objective)
- [ ] Add Context section (condense Prerequisites)
- [ ] Add Status Tracking section with STATUS.md template

### Task Conversion
- [ ] Convert each task to Check/Skip/Work/Files/Verify format
- [ ] Add **Requires:** for tasks with dependencies
- [ ] Mark manual tasks with (MANUAL) and special handling
- [ ] Remove "Required Outcome" code examples (keep only if essential)
- [ ] Remove verbose descriptions

### Footer Changes
- [ ] Replace Verification Checklist with Completion Criteria
- [ ] Add completion promise: `<promise>PHASE_X_COMPLETE</promise>`
- [ ] Add If Blocked section
- [ ] Remove Deliverables table
- [ ] Remove File Structure diagram (or minimize)
- [ ] Keep Dependencies section (if needed)
- [ ] Keep Next Phase link

### Quality Checks
- [ ] Every task has a testable **Check** command
- [ ] Every task has a clear **Skip If** condition
- [ ] Completion Criteria are all command-verifiable
- [ ] STATUS.md template matches task list
- [ ] Manual tasks are clearly marked and handled

---

## Files to Convert

Apply this guide to convert the remaining standard plans:

| File | Status |
|------|--------|
| `01-device-discovery.md` | Converted (reference) |
| `02-protocol-implementation.md` | Needs conversion |
| `03-action-system.md` | Needs conversion |
| `04-configuration-system.md` | Needs conversion |
| `05-electron-gui.md` | Needs conversion |
| `06-integrations.md` | Needs conversion |
| `07-polish-distribution.md` | Needs conversion |

---

## Tips for Good Conversions

1. **Check commands should be fast** - Use `ls` to check file existence, `npm run build` for compilation checks
2. **Skip conditions should be unambiguous** - "File exists AND compiles" not "Task is done"
3. **Work steps should be atomic** - Each step should be completable in one action
4. **Verify commands should prove success** - Not just "no errors" but actual output verification
5. **Manual tasks need escape hatches** - Always allow the loop to continue without them
6. **Completion criteria should be automatable** - Avoid subjective conditions like "works correctly"

---

## Folder Mode (Sub-Plans)

For large plans with many tasks, you can split them into separate sub-plan files to reduce context window usage. Each sub-plan contains ONE task, maximizing context efficiency.

### When to Use Folder Mode

- Plans with 5+ tasks
- Long tasks with detailed work steps
- When context window usage is a concern
- When you want to process tasks completely independently

### Folder Structure

```
plans/phase-03-action-system/
├── _manifest.md          # Control file (REQUIRED)
├── 01-type-definitions.md
├── 02-action-engine.md
├── 03-button-handlers.md
├── 04-encoder-handlers.md
├── 05-integration.md
├── STATUS.md             # Shared status (created during execution)
└── manifest-status.md    # Script progress (created during execution)
```

### _manifest.md Format

The `_manifest.md` file lists sub-plans in execution order:

```markdown
# Phase 3: Action System Sub-Plans

**Source:** plans/03-action-system.md
**Total Sub-Plans:** 5
**Completion Signal:** PHASE_3_COMPLETE

## Sub-Plans (in order)
1. `01-type-definitions.md` - Define action types and interfaces
2. `02-action-engine.md` - Build core action engine
3. `03-button-handlers.md` - Implement button action handlers
4. `04-encoder-handlers.md` - Implement encoder action handlers
5. `05-integration.md` - Event binding and integration

## Usage
```bash
./ralph-loop.sh plans/phase-03-action-system/ 20
```
```

**Important:** Sub-plan files MUST be listed with backticks around the filename:
- ✅ `1. \`01-type-definitions.md\` - Description`
- ❌ `1. 01-type-definitions.md - Description`

### Sub-Plan File Format

Each sub-plan file is a self-contained Ralph Loop prompt:

```markdown
# Ralph Loop: Phase 3.1 - Type Definitions
Parent: Phase 3 - Action System
Sequence: 1 of 5
Next: 02-action-engine.md

## Loop Instructions
This prompt will be repeated. Each iteration you must:
1. Read/update `STATUS.md` to check progress
2. Work on this task until complete
3. Verify your work with the Check command
4. Update `STATUS.md` with results
5. When task complete, output the completion promise

## Mission
Define TypeScript interfaces for all action types.

## Context
- **Parent Phase:** Phase 3 - Action System
- **Focus:** Type definitions only
- **Dependencies:** Phase 2 complete

## Task
### Task 3.1: Type Definitions
**Check:** `ls src/types/actions.ts 2>/dev/null && npm run build`
**Skip If:** File exists AND compiles
**Work:**
1. Create src/types/actions.ts
2. Define ActionType enum
3. Define Action interfaces
**Files:** `src/types/actions.ts`
**Verify:** `npx ts-node -e "import { ActionType } from './src/types/actions'"`

## Completion Criteria
When task is complete:
<promise>SUBPLAN_1_COMPLETE</promise>
```

### Running Folder Mode

```bash
# Process all sub-plans in order
./ralph-loop.sh plans/phase-03-action-system/ 20

# Script will:
# 1. Read _manifest.md to get sub-plan list
# 2. Process first sub-plan until SUBPLAN_1_COMPLETE
# 3. Advance to next sub-plan
# 4. Continue until all complete or max iterations reached
```

### Completion Signals

Each sub-plan uses a numbered completion signal:
- Sub-plan 1: `<promise>SUBPLAN_1_COMPLETE</promise>`
- Sub-plan 2: `<promise>SUBPLAN_2_COMPLETE</promise>`
- etc.

When all sub-plans complete, the script outputs:
- `<promise>FOLDER_COMPLETE</promise>`

### Resume After Interruption

The script tracks progress in `manifest-status.md`. If interrupted:

```bash
# Just run again - it resumes from current sub-plan
./ralph-loop.sh plans/phase-03-action-system/ 15
```

### Converting to Folder Mode

Use the ralph-loop-converter skill with `--folder` flag:

```bash
/ralph-loop-converter --folder plans/03-action-system.md
```

This will:
1. Create the folder structure
2. Generate `_manifest.md`
3. Split each task into its own sub-plan file
4. Output the command to run

### Folder Mode vs Single File Mode

| Aspect | Single File | Folder Mode |
|--------|-------------|-------------|
| Context usage | Full plan each iteration | One task per iteration |
| Best for | Small plans (1-4 tasks) | Large plans (5+ tasks) |
| Resume | Via STATUS.md | Via manifest-status.md |
| Complexity | Simple | More files to manage |
| Progress visibility | STATUS.md | manifest-status.md |

### Backward Compatibility

The ralph-loop.sh script auto-detects the input type:
- If a **file** is passed → Single file mode (original behavior)
- If a **folder** is passed → Folder mode with sub-plans

Existing single-file plans continue to work unchanged
