# Ralph Loop Prompt Template

Always use:

- serena for semantic code retrieval and editing tools
- context7 when I need code generation, setup or configuration steps, or
  library/API documentation. This means you should automatically use the Context7 MCP
  tools to resolve library id and get library docs without me having to explicitly ask.
- sequential thinking for any decision making

## Success Criteria
- [ ] Criterion 1: Describe what must be true when done
- [ ] Criterion 2: Another measurable outcome
- [ ] Criterion 3: Final verification step

## Task Description
Describe the task you want Claude to work on iteratively.

Be specific about:
1. What needs to be accomplished
2. What files or areas to focus on
3. Any constraints or requirements

## Completion Marker
When ALL success criteria above are met, output:
"RALPH_COMPLETE: All criteria satisfied"

## Notes
- Each iteration builds on previous work
- Check git status to see what changed
- Review logs for previous iteration results
