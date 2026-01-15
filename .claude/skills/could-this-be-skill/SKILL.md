# Skill Opportunity Evaluation

Use this template to evaluate whether completed work could become a reusable skill.

## Evaluation Criteria

A pattern should become a skill if it meets **3 or more** of these criteria:

### 1. Repeatability
- [ ] The process has been done more than once
- [ ] The steps are consistent each time
- [ ] Future instances are likely

### 2. Clear Contract
- [ ] Has well-defined input (what it receives)
- [ ] Has well-defined output (what it produces)
- [ ] Input/output types are predictable

### 3. Deterministic Steps
- [ ] Steps can be documented as a checklist
- [ ] Minimal subjective judgment required
- [ ] Same input produces same output

### 4. Time Savings
- [ ] Takes more than 2-3 minutes manually
- [ ] Involves multiple files or tools
- [ ] Has setup/boilerplate overhead

### 5. Error-Prone Without Automation
- [ ] Easy to miss steps manually
- [ ] Has specific format requirements
- [ ] Requires remembering details

## Output Format

When reporting a skill opportunity, use this format:

```
## Skill Opportunity: [Name]

**Assessment:** [STRONG CANDIDATE / POSSIBLE CANDIDATE / NOT RECOMMENDED]

**Criteria Met:**
- ✅ Repeatability: [reason]
- ✅ Clear Contract: [input] → [output]
- ❌ Deterministic: [why not, if applicable]
...

**Proposed Skill Name:** `skill-name`

**Description:** [One sentence describing what the skill does]

**Trigger Phrases:**
- "convert X to Y"
- "generate Z from A"

**Next Steps:**
1. [Action to create the skill]
2. [Action to test it]
```

## Not a Skill If...

- One-time task unlikely to repeat
- Requires significant human judgment each time
- Too simple (< 3 steps)
- Too complex to generalize (highly context-dependent)
