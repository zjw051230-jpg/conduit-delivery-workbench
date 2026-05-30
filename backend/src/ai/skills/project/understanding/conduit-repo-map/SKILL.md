---
name: conduit-repo-map
description: Map Conduit repository structure, frontend/backend boundaries, and TARGET_REPO_PATH separation before context selection or code generation. Do not use to generate patches or decide business behavior.
version: "1.0.0"
type: understanding
riskLevel: system
---

# Conduit Repo Map

## Purpose

Produce a verified repository understanding object for a Conduit target checkout. The object must help later agents distinguish frontend, backend, shared code, tests, scripts, and forbidden directories without assuming exact file paths.

## When to use

Use this Skill before locating modules, compiling context, choosing test commands, or applying any requirement Skill against a Conduit repository.

## Do not use when

Do not use this Skill to change Conduit business code, infer domain rules, choose tests, or draft a PR. Use specialized Skills for those tasks.

## Required inputs

- `targetRepoPath`: the target checkout root, represented as `TARGET_REPO_PATH` in Skill assets.
- `taskSpec`: optional PM request or Code Agent Task Spec.
- `changedFiles`: optional list of files already changed by another step.

## Required understanding skills

None.

## Workflow

1. Confirm the target root is available as `TARGET_REPO_PATH`.
2. List top-level files and directories while excluding `.git`, `.env`, `node_modules`, `dist`, `build`, and `coverage`.
3. Inspect package, workspace, or project metadata before classifying the layout.
4. Identify candidate frontend, backend, shared, test, and configuration areas.
5. Record each path as `verified` only when it exists in the target checkout.
6. Return a `repoUnderstanding` object with uncertainties and follow-up search hints.

## Context selection rules

- Prefer metadata files such as package manifests, workspace config, framework config, and test config.
- Use `candidatePaths` for likely locations and `searchHints` for discovery.
- Never assert that a Conduit file exists until it has been inspected in the actual target repository.
- Keep main-system paths separate from `TARGET_REPO_PATH` paths.

## Clarification rules

Ask only if the target repository root is unavailable or if multiple target roots are present and the orchestrator has not selected one.

## Safe defaults

- Treat repository shape as `unknown` until verified.
- Treat missing expected files as uncertainty, not failure.
- Prefer read-only discovery.

## Patch / modification rules

Do not create patches. This Skill is read-only.

## Testing rules

Do not run tests. If test scripts are discovered, report them for `conduit-test-command`.

## Expected outputs

Return a structured object:

```json
{
  "repoUnderstanding": {
    "targetRepoPath": "TARGET_REPO_PATH",
    "layout": "unknown | single-app | split-frontend-backend | monorepo",
    "frontend": { "verifiedPaths": [], "candidatePaths": [] },
    "backend": { "verifiedPaths": [], "candidatePaths": [] },
    "shared": { "verifiedPaths": [], "candidatePaths": [] },
    "tests": { "verifiedPaths": [], "candidatePaths": [] },
    "scripts": { "packageScripts": {}, "otherScripts": [] },
    "forbiddenPaths": [".env", "node_modules", "dist", "build", "coverage", ".git"],
    "uncertainties": []
  }
}
```

## Failure handling

If the repository cannot be inspected, return an object with `layout: "unknown"` and a blocking reason instead of inventing paths.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
