---
name: conduit-test-command
description: Select Conduit testProfile and candidate commands by discovering package scripts before running validation. Do not use to repair failures or patch code.
version: "1.0.0"
type: understanding
riskLevel: system
---

# Conduit Test Command

## Purpose

Produce a test plan that maps changed files and requirement risk to a `testProfile` and candidate validation commands. The plan must be based on discovered scripts or verified tool configuration.

## When to use

Use this Skill before running lint, unit, integration, or end-to-end tests for Conduit changes, and before delivery repair summarizes validation status.

## Do not use when

Do not use this Skill to modify code, repair test failures, invent missing scripts, or decide business behavior.

## Required inputs

- `repoUnderstanding` from `conduit-repo-map`.
- `changedFiles`: file paths relative to `TARGET_REPO_PATH`.
- `taskSpec`: requirement summary and risk.
- `targetRepoPath` as `TARGET_REPO_PATH`.

## Required understanding skills

- `conduit-repo-map`

## Workflow

1. Read discovered package scripts from `repoUnderstanding`; inspect package manifests if missing.
2. Classify `changedFiles` as frontend, backend, shared/fullstack, docs-only, or unknown.
3. Select one profile:
   - `frontend-only`: only frontend UI/client code changed.
   - `backend-only`: only backend model/API/server code changed.
   - `fullstack-targeted`: API contract, shared types, model plus frontend, or cross-stack field changed.
   - `unknown`: ownership or scripts cannot be verified.
   - `none`: no Conduit code changed or the Skill is read-only.
4. Choose commands only from discovered scripts or verified local tooling.
5. Return command order, rationale, and fallback behavior.

## Context selection rules

- Include package manifests, test configs, and changed file list.
- Do not include full source context unless needed to classify ownership.
- Do not scan forbidden directories.

## Clarification rules

Ask for clarification only if `changedFiles` are unavailable and the orchestrator expects a runnable test plan.

## Safe defaults

- Prefer `unknown` over guessing when scripts are missing.
- Prefer lint before tests when both scripts exist.
- Prefer targeted frontend/backend commands over fullstack commands for L1 changes.

## Patch / modification rules

Do not patch files. This Skill only plans validation.

## Testing rules

This Skill does not execute tests. It returns commands for another step to run and capture stdout, stderr, and exit code.

## Expected outputs

Return a structured object:

```json
{
  "testPlan": {
    "testProfile": "frontend-only | backend-only | fullstack-targeted | unknown | none",
    "discoveredScripts": {},
    "commands": [],
    "rationale": [],
    "fallback": "",
    "blockingIssues": []
  }
}
```

## Failure handling

If scripts cannot be discovered, return `testProfile: "unknown"` with the files inspected and the missing evidence.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
