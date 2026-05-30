---
name: ui-computed-display
description: Computed frontend display changes for article word count, reading time, mock read counts, Popular Tags top-five labels, and existing-field timestamps. Do not use when backend or API data must change.
version: "1.0.0"
type: requirement-execution
riskLevel: L1
---

# UI Computed Display

## Purpose

Guide safe L1 frontend-only changes that compute and render derived values from data already available to the UI.

## When to use

Use this Skill for article word count, estimated reading time, frontend-only mock read counts, Popular Tags first-five labels, or display of existing timestamps such as last edited time.

## Do not use when

Do not use this Skill when the request requires a new backend field, database schema change, API contract change, authentication behavior, write persistence, or cross-stack data migration. Use `add-entity-field` for cross-stack fields.

## Required inputs

- `taskSpec` with requested display behavior.
- `repoUnderstanding` from `conduit-repo-map`.
- `frontendUnderstanding` from `conduit-frontend-map`.
- `testPlan` from `conduit-test-command`, or enough package metadata to create one.

## Required understanding skills

- `conduit-repo-map`
- `conduit-frontend-map`
- `conduit-test-command`

## Workflow

1. Confirm the display can be computed from existing frontend data.
2. Locate the route, component, data access, and rendering surface through `frontendUnderstanding`.
3. Select the smallest verified context package that includes the data shape, render component, and nearby tests.
4. Define a pure helper or local calculation when it reduces duplication or clarifies edge cases.
5. Patch only verified frontend files.
6. Use `conduit-test-command` to produce a frontend-only validation plan.
7. Return a completion report with changed surfaces and test status.

## Context selection rules

- Include the component that renders the value and the nearest data source or prop type.
- Include shared article list/detail components when the value appears in multiple surfaces.
- Include existing frontend tests around the affected component if present.
- Do not include backend files unless proving the data already exists in the API shape.

## Clarification rules

Ask a blocking question if the requested value cannot be computed from existing frontend data. Otherwise use safe defaults.

## Safe defaults

- Reading time: count article body text length, divide by 500 Chinese characters per minute, round up, and display at least 1 minute.
- Word count: count non-whitespace text units consistently with existing UI language if a local helper exists; otherwise use visible body text length after trimming.
- Popular Tags top-five label: label indexes 0 through 4 in the existing returned order.
- Mock read count: keep it deterministic from existing stable data such as slug or created timestamp; do not persist it.
- Last edited display: use an existing updated timestamp only when already present in frontend data.

## Patch / modification rules

- Modify only verified frontend source or frontend test files under `TARGET_REPO_PATH`.
- Do not modify backend, database, migrations, API contracts, generated assets, lockfiles, `.env`, `node_modules`, `dist`, `build`, `coverage`, or `.git`.
- Keep UI copy concise and consistent with nearby text.
- Avoid broad refactors unrelated to the requested display.

## Testing rules

- Use `frontend-only` profile.
- Prefer discovered lint and frontend unit/component scripts.
- Add or update focused frontend tests when the repository already has adjacent tests and the calculation has edge cases.
- If no runnable scripts exist, report the missing script evidence rather than inventing commands.

## Expected outputs

Return:

```json
{
  "contextPackageRequest": {},
  "patchPlan": {
    "allowedFiles": [],
    "forbiddenFiles": [],
    "calculationRules": []
  },
  "testPlan": {},
  "completionReport": {
    "changedSurfaces": [],
    "safeDefaultsUsed": [],
    "risks": []
  }
}
```

## Failure handling

If a required input field is absent from frontend data, stop and route to `add-entity-field` or ask for clarification instead of adding backend changes inside this Skill.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
