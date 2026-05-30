---
name: conduit-change-memory
description: Record post-delivery Conduit change memory, extract reusable project facts, and suggest Skill maintenance after test-repair-pr. Do not use to implement business changes or directly edit other Skills by default.
version: "1.0.0"
type: delivery
riskLevel: system
---

# Conduit Change Memory

## Purpose

Capture durable project memory after a Conduit delivery run. Separate one-time history from reusable facts and procedural improvements, then identify which existing Skills may need future maintenance.

## When to use

Use this Skill after `test-repair-pr`, after a PR Draft is prepared, or after a delivery run discovers project facts that should be remembered for future Conduit work.

## Do not use when

Do not use this Skill to implement business requirements, patch Conduit source code, run tests, decide unresolved product behavior, or silently update other Skills.

## Required inputs

- `taskSpec`: requirement summary, risk, and accepted scope.
- `matchedSkills`: Skills used during the run.
- `changedFiles`: files changed relative to `TARGET_REPO_PATH`.
- `testRuns`: commands, stdout, stderr, exit code, and status.
- `failureAnalysis`: output from `test-repair-pr` when available.
- `prDraft`: title, summary, tests, known failures, and risk notes.
- `discoveredFacts`: verified facts discovered during the run.
- `skillOutputs`: relevant outputs from understanding, requirement, and delivery Skills.

## Required understanding skills

- `conduit-repo-map`
- `conduit-test-command`

## Workflow

1. Confirm the run is complete enough to summarize: task, matched Skills, changed files, tests, and outcome.
2. Build a `changeRecord` with `changeId`, task summary, matched Skills, changed files, tests run, and outcome.
3. Classify memory candidates:
   - `semantic`: stable project facts about Conduit code shape, fields, commands, or conventions.
   - `episodic`: what happened in this delivery run, including failures and fixes.
   - `procedural`: reusable process lessons that may affect Skill rules.
4. Decide where each memory belongs:
   - Append one-time run history to `references/change-journal.md`.
   - Add durable facts to `references/project-facts.md`.
   - Add possible Skill updates to `references/skill-impact-index.md`.
   - Write detailed run evidence to `references/rollout-summaries/<changeId>.md`.
5. Invalidate stale facts by adding an invalidation note; do not delete history.
6. Output `skillImpactAnalysis` for any affected Skill. Do not directly edit other Skill files unless a separate maintenance task explicitly approves it.
7. Return a `writePlan` that names allowed memory files and forbidden targets.

## Context selection rules

- Read `references/memory-model.md` before writing new memory records.
- Read existing `change-journal.md`, `project-facts.md`, and `skill-impact-index.md` to avoid duplicates.
- Read only the matched Skill manifests or SKILL files needed to explain a maintenance suggestion.
- Treat current `TARGET_REPO_PATH` inspection as higher authority than stored memory.
- Do not store unverified target repository paths as stable facts.

## Clarification rules

Ask only when the outcome, changed files, or test status is missing and cannot be inferred from delivery artifacts. If evidence is incomplete, write an episodic journal entry and mark stable facts as deferred.

## Safe defaults

- Use `partial` outcome when some evidence is missing.
- Use `medium` confidence for facts derived from one successful run.
- Prefer invalidating stale facts over overwriting them.
- Prefer suggesting Skill updates over applying them.
- Keep memory entries concise and evidence-linked.

## Patch / modification rules

- May append or update this Skill's files under `references/`.
- May create rollout summary files under `references/rollout-summaries/`.
- May update this Skill's examples or manifest when maintaining this Skill.
- Must not modify Conduit business source code.
- Must not modify other Skills unless a separate Skill maintenance task approves the exact change.
- Must not modify `.env`, lockfiles, `node_modules`, `dist`, `build`, `coverage`, or `.git`.

## Testing rules

- Use `testProfile: none`; this Skill does not run Conduit tests.
- Validate JSON examples and manifest syntax.
- Verify registry entry points to an existing manifest.
- Verify memory files contain no local absolute paths and no unverified Conduit paths promoted as stable facts.

## Expected outputs

Return:

```json
{
  "changeRecord": {
    "changeId": "",
    "taskSummary": "",
    "matchedSkills": [],
    "changedFiles": [],
    "testsRun": [],
    "outcome": "success | partial | failed | blocked"
  },
  "memoryUpdates": {
    "journalEntry": "",
    "projectFactsToAdd": [],
    "projectFactsToInvalidate": [],
    "rolloutSummaryPath": ""
  },
  "skillImpactAnalysis": [
    {
      "skillId": "",
      "impactType": "search-hint | clarification-rule | forbidden-change | test-rule | reference-note",
      "reason": "",
      "suggestedUpdate": "",
      "priority": "low | medium | high"
    }
  ],
  "writePlan": {
    "allowedFiles": [],
    "forbiddenFiles": []
  }
}
```

## Failure handling

If artifacts are insufficient, record a minimal journal entry with `outcome: "partial"` and list missing evidence. If a fact conflicts with existing memory, add an invalidation proposal instead of silently replacing it.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
