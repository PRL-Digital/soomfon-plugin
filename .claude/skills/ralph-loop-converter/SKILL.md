# Ralph Loop Converter Skill

Converts standard planning documents into Ralph Loop compatible format for iterative AI agent execution.

## When to Use

Use this skill when you need to convert a standard plan document (with Objective, Prerequisites, Tasks, Deliverables sections) into Ralph Loop format for autonomous, iterative execution.

## Usage

### Single File Mode (default)
Converts a plan file in-place:
```
/ralph-loop-converter plans/03-action-system.md
```

### Folder Mode (--folder)
Splits a plan into separate sub-plan files (one task per file) for reduced context window usage:
```
/ralph-loop-converter --folder plans/03-action-system.md
```

Creates:
```
plans/03-action-system/
├── _manifest.md          # Control file listing sub-plans in order
├── 01-task-name.md       # Sub-plan for Task 3.1
├── 02-task-name.md       # Sub-plan for Task 3.2
└── ...                   # One file per task
```

## Output

### Single File Mode
- Overwrites the original file with converted format
- Reports: tasks converted, sections added/removed

### Folder Mode
- Creates folder with `_manifest.md` and individual sub-plan files
- Reports: folder path, files created, run command

Run with: `./ralph-loop.sh plans/03-action-system/ 20`

## Reference

For conversion format details, templates, and examples see: `plans/RALPH-LOOP-GUIDE.md`
