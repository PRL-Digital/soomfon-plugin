Always use:

- serena for semantic code retrieval and editing tools
- context7 when I need code generation, setup or configuration steps, or
  library/API documentation. This means you should automatically use the Context7 MCP
  tools to resolve library id and get library docs without me having to explicitly ask.
- sequential thinking for any decision making
- ALWAYS USE PLAN MODE ON INITIAL RUN

#$ARGUMENTS

---

You are the main task overseer. Spin up a sub-agent to handle this task.

**Note**:

- Before starting work on a specific piece of functionality ENSURE THAT YOU ASK IF THE PLAN NEEDS SAVING. If the user wants the plan saving, fully document it in a "plans/[functionality]-plan.md" file IN THE ROOT of the project (same level as the .git folder). Handle this with a sub-agent.

- After completing significant work, spawn a sub-agent to evaluate whether any patterns could become reusable skills. The sub-agent should:
  1. Review the work just completed
  2. Report any skill opportunities using the output format in that skill file
