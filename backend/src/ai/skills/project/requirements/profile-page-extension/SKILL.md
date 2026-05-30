---
name: profile-page-extension
description: Profile page frontend extensions such as About Me tabs, user.bio display, and static profile information sections using existing data. Do not use for new backend profile fields or Follow logic.
version: "1.0.0"
type: requirement-execution
riskLevel: L1
---

# Profile Page Extension

## Purpose

Guide safe L1 frontend changes to extend the Profile page layout using existing profile data, without changing Follow, Favorite, like, backend, database, or API behavior.

## When to use

Use this Skill for Profile About Me tabs, read-only `user.bio` display, static personal info sections, or rearranging existing profile information.

## Do not use when

Do not use this Skill when the request needs a new persisted profile field, API response change, settings form persistence change, Follow behavior change, Favorite/like behavior change, or backend model update. Use `add-entity-field` for new data fields.

## Required inputs

- `taskSpec` with requested Profile page behavior.
- `repoUnderstanding` from `conduit-repo-map`.
- `domainUnderstanding` from `conduit-domain-model`.
- `frontendUnderstanding` from `conduit-frontend-map`.
- `testPlan` from `conduit-test-command`, or enough package metadata to create one.

## Required understanding skills

- `conduit-repo-map`
- `conduit-domain-model`
- `conduit-frontend-map`
- `conduit-test-command`

## Workflow

1. Clarify whether the change is a tab or static section.
2. Clarify whether the content uses existing profile data or needs a new persisted field.
3. If a new field is required, stop and route to `add-entity-field`.
4. Locate Profile route, Profile component, tab structure, profile data access, and adjacent tests.
5. Patch only verified frontend Profile files.
6. Preserve existing Follow, Favorite, article list, and navigation behavior.
7. Produce a frontend-only test plan and completion report.

## Context selection rules

- Include the Profile route/page component, profile header component, tab component, and profile data shape.
- Include existing tests that cover Profile page rendering or tab navigation.
- Include domain notes that distinguish Follow from Profile like.
- Do not include backend files unless checking that a field already exists in API data.

## Clarification rules

Ask blocking questions for:

- Tab versus static section when the requested layout is unclear.
- Existing field versus new field when the data source is unclear.
- Empty-state copy if the requested field may be missing.

## Safe defaults

- If `user.bio` already exists in frontend data, display it read-only.
- If a tab structure already exists and the user asked for About Me, add an About Me tab near existing profile tabs.
- If bio is empty, use concise empty-state text consistent with nearby UI.
- Do not create persistence or settings-form behavior unless routed to `add-entity-field`.

## Patch / modification rules

- Modify only verified frontend Profile-related files and focused frontend tests.
- Do not change Follow/unfollow logic, Favorite/like logic, backend models, routes, serializers, migrations, API contracts, lockfiles, `.env`, `node_modules`, `dist`, `build`, `coverage`, or `.git`.
- Keep layout changes local to Profile page surfaces.

## Testing rules

- Use `frontend-only` profile.
- Prefer discovered lint plus frontend component/unit tests.
- Add or update a focused Profile page render test when adjacent tests exist.
- Report missing commands instead of inventing them.

## Expected outputs

Return:

```json
{
  "clarificationResult": {},
  "contextPackageRequest": {},
  "patchPlan": {
    "profileSurface": "",
    "contentSource": "existing-field | new-field-required",
    "allowedFiles": [],
    "forbiddenFiles": []
  },
  "testPlan": {},
  "completionReport": {
    "changedSurfaces": [],
    "routedToAddEntityField": false,
    "risks": []
  }
}
```

## Failure handling

If the required content does not exist in frontend data, do not add backend code here. Return `routedToAddEntityField: true` with the missing field details.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
