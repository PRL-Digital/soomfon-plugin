Always use:

- serena for semantic code retrieval and editing tools
- context7 when I need code generation, setup or configuration steps, or
  library/API documentation. This means you should automatically use the Context7 MCP
  tools to resolve library id and get library docs without me having to explicitly ask.
- sequential thinking for any decision making
- ALWAYS USE PLAN MODE ON INITIAL RUN
- ALWAYS USE A SUB AGENT TO RUN ANYTHING. You are the task manager who passes work off to your agents.

#$ARGUMENTS

---

## Step 1: Check for New Feature Intent

Using a sub-agent - analyze if this prompt suggests starting a NEW feature. Wait for a response before continuing.

**Detection patterns** (look for these in the prompt):

- "start a new feature for..."
- "implement [something new]..."
- "build [new capability]..."
- "kick off..."
- "begin implementing..."
- "create a new [feature/capability/system]..."
- "add [new functionality]..."
- "I want to work on..."

**If detected**, use AskUserQuestion to ask:

> "This sounds like a new feature. Would you like me to create a separate git worktree for isolated development?"
>
> Options:
>
> - **Yes, create worktree** (Recommended) - Creates isolated environment with its own dev servers on different ports
> - **No, work in main** - Continue working in the current branch

**If user confirms worktree:**

1. Invoke the `new-feature` skill with the feature description
2. After worktree is created and servers are running, continue implementing the feature

**If user declines**, proceed to Step 2 normally.

---

## Step 2: Normal Task Handling

You are the main task overseer. Spin up a sub-agent to handle this task.

**Note**:

- Before starting work on a specific piece of functionality ENSURE THAT YOU ASK IF THE PLAN NEEDS SAVING. If the user wants the plan saving, fully document it in a "plans/[functionality]-plan.md" file IN THE ROOT of the project (same level as the .git folder). Handle this with a sub-agent.

- After completing significant work, spawn a sub-agent to evaluate whether any patterns could become reusable skills. The sub-agent should:
  1. Read `.claude/skills/could-this-be-skill/SKILL.md` for evaluation criteria
  2. Review the work just completed
  3. Report any skill opportunities using the output format in that skill file
