---
name: test-repair-pr
description: Parse Conduit test results, classify failures, propose repair actions, and produce PR Draft structure after validation. Do not use to decide new business behavior.
version: "1.0.0"
type: delivery
riskLevel: system
---

# Test Repair PR

## Purpose

Guide the delivery stage after code generation by selecting or reviewing tests, parsing test run output, classifying failures, proposing scoped repair actions, and drafting a PR summary.

## When to use

Use this Skill after a requirement Skill has produced changes or when the orchestrator needs to interpret lint/test output and prepare a PR Draft.

## Do not use when

Do not use this Skill to choose business requirements, add new feature scope, change domain rules, or bypass missing clarification. Route business uncertainty back to the originating requirement Skill.

## Required inputs

- `taskSpec` or RequirementIR.
- `changedFiles` relative to `TARGET_REPO_PATH`.
- `testPlan` from `conduit-test-command`.
- `testRuns` with command, stdout, stderr, exitCode, and duration when available.
- `completionReports` from requirement Skills when available.

## Required understanding skills

- `conduit-repo-map`
- `conduit-test-command`

## Workflow

1. Confirm a test plan exists; if missing, request or derive one through `conduit-test-command`.
2. Parse each test run by command, stdout, stderr, and exitCode.
3. Classify failures:
   - `lint`: formatter, lint rule, type lint, unused variable, style rule.
   - `import`: module resolution, bad path, missing export.
   - `undefined`: undefined variable, property, function, or type.
   - `test-failure`: assertion, snapshot, component, API, or behavior mismatch.
   - `command-missing`: script or executable not found.
   - `dependency-missing`: dependencies absent or install required.
   - `unknown`: insufficient evidence.
4. Link each failure to changed files, affected Skill, and likely repair owner.
5. Produce repair suggestions and a rerun plan.
6. Produce PR Draft with honest validation status.

## Context selection rules

- Use changed files, test output, package scripts, and nearby failing test files.
- Include only enough source context to explain failure ownership.
- Do not inspect forbidden directories.
- Do not broaden context to unrelated features.

## Clarification rules

Ask for missing stdout, stderr, or exitCode only when failure classification is impossible. Ask for business clarification only by routing to the originating requirement Skill.

## Safe defaults

- Treat command-not-found as `command-missing` when script evidence is absent.
- Treat missing installed packages as `dependency-missing`; do not install dependencies unless separately authorized.
- Treat assertion mismatches as `test-failure` and route business expectation changes back to the requirement Skill.
- Keep PR Draft explicit about tests not run.

## Patch / modification rules

- This Skill may propose repair actions but should not invent business patches.
- Mechanical repair suggestions may mention imports, undefined names, lint fixes, or test command corrections when evidence is present.
- Business behavior repair must reference the originating Skill and taskSpec.
- Do not modify `.env`, lockfiles, `node_modules`, `dist`, `build`, `coverage`, `.git`, or unrelated code.

## Testing rules

- Use the existing `testPlan` profile unless changed files require reclassification through `conduit-test-command`.
- Rerun the smallest command set that covers repaired files.
- Preserve command output evidence in the delivery artifact.
- If no tests can run, state why and include the missing command or dependency evidence.

## Expected outputs

Return:

```json
{
  "failureAnalysis": [
    {
      "command": "",
      "exitCode": 0,
      "category": "lint | import | undefined | test-failure | command-missing | dependency-missing | unknown",
      "evidence": "",
      "likelyOwner": ""
    }
  ],
  "repairSuggestions": [],
  "rerunPlan": {
    "commands": [],
    "rationale": []
  },
  "prDraft": {
    "title": "",
    "summary": [],
    "changedFiles": [],
    "testsRun": [],
    "knownFailures": [],
    "riskNotes": []
  }
}
```

## Failure handling

If outputs are incomplete, request a rerun with command, stdout, stderr, and exitCode. If a failure points to missing business decisions, stop and route to the proper requirement Skill.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
