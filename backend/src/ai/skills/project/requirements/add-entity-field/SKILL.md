---
name: add-entity-field
description: Cross-stack L2 entity field additions such as Article.coverImage across model/schema, API, frontend client, forms, displays, and tests. Do not use for frontend-only computed fields.
version: "1.0.0"
type: requirement-execution
riskLevel: L2
---

# Add Entity Field

## Purpose

Guide cross-stack entity field additions in Conduit while keeping schema, API contract, frontend data flow, forms, display surfaces, backward compatibility, and tests aligned.

## When to use

Use this Skill for persisted or API-visible entity fields, such as `Article.coverImage`, or any requirement that changes model/schema, API create/update/read behavior, frontend client shape, editor forms, list/detail/profile display, or tests.

## Do not use when

Do not use this Skill for frontend-only computed display, read-only layout changes using existing data, pure test repair, or unrelated domain behavior changes.

## Required inputs

- `taskSpec` or RequirementIR.
- `fieldSpec` with entity, field name, type, required flag, default, validation, display surfaces, and old-data behavior.
- `repoUnderstanding` from `conduit-repo-map`.
- `domainUnderstanding` from `conduit-domain-model`.
- `frontendUnderstanding` from `conduit-frontend-map`.
- `testPlan` from `conduit-test-command`, or package metadata to create one.

## Required understanding skills

- `conduit-repo-map`
- `conduit-domain-model`
- `conduit-frontend-map`
- `conduit-test-command`

## Workflow

1. Collect or confirm the complete field spec:
   - entity and field name
   - type
   - required or optional
   - default for old data
   - create/update support
   - read response support
   - validation rules
   - list, detail, profile, and editor display locations
2. Locate backend model/schema/persistence, API create/update/read, serializer/DTO, frontend client/types, editor form, list/detail/profile surfaces, and tests.
3. Build an ordered patch plan from data layer outward:
   - model/schema or persistence
   - API create/update/read contract
   - frontend API client/type shape
   - editor form state and validation
   - list/detail/profile rendering
   - targeted tests
4. Patch only verified files inside `TARGET_REPO_PATH`.
5. Preserve existing records according to the confirmed old-data behavior.
6. Use `fullstack-targeted` test selection and capture validation results.
7. Return API impact, changed surfaces, tests, and residual risk.

## Context selection rules

- Include all files participating in the field lifecycle, not only the visible component.
- Include adjacent tests for create/update/read and affected frontend rendering.
- Include migration or persistence files only when the target repo has such a layer.
- Do not include unrelated domain areas or forbidden directories.

## Clarification rules

Ask blocking questions before patching if any of these are missing:

- Exact entity and field name.
- Field type.
- Required versus optional.
- Default value or old-data behavior.
- Create/update form support.
- Display surfaces.
- Validation rules.

## Safe defaults

- Prefer optional fields for old-data compatibility unless the user explicitly requires mandatory data and provides a migration/default plan.
- For `Article.coverImage`, use optional string URL semantics only after confirmation or when the task explicitly says cover image URL.
- Do not reject old records that lack the new field.
- Keep visual fallback minimal when the field is empty.

## Patch / modification rules

- Patch from backend data contract to frontend consumers in a traceable order.
- Keep field naming consistent across model, API payloads, frontend types, form state, and render code unless existing conventions differ.
- Do not modify authentication, authorization, Follow, Favorite, or like behavior unless explicitly required.
- Do not modify lockfiles, `.env`, `node_modules`, `dist`, `build`, `coverage`, `.git`, or unverified generated files.
- Avoid unrelated refactors.

## Testing rules

- Use `fullstack-targeted` profile.
- Prefer backend tests for create/update/read serialization and frontend tests for editor/list/detail/profile rendering.
- Run lint and targeted tests when discovered scripts exist.
- If tests cannot run due missing scripts or dependencies, report the classification for `test-repair-pr`.

## Expected outputs

Return:

```json
{
  "clarificationResult": {
    "fieldSpecComplete": true,
    "fieldSpec": {}
  },
  "contextPackageRequest": {},
  "patchPlan": {
    "orderedAreas": [
      "model/schema",
      "API create/update/read",
      "frontend client",
      "editor form",
      "list/detail/profile surfaces",
      "tests"
    ],
    "allowedFiles": [],
    "forbiddenFiles": []
  },
  "apiContractImpact": {
    "requestPayloads": [],
    "responsePayloads": [],
    "backwardCompatibility": ""
  },
  "testPlan": {},
  "completionReport": {
    "changedSurfaces": [],
    "risks": []
  }
}
```

## Failure handling

If the field spec is incomplete, stop before patching and return the missing questions. If a required layer cannot be located, return the searches attempted and mark the change blocked rather than patching a partial stack.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
