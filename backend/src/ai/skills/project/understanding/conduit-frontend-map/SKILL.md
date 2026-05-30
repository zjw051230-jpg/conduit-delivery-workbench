---
name: conduit-frontend-map
description: Locate Conduit frontend pages, routes, components, forms, and display surfaces with candidate paths and verification steps. Do not use to patch components directly.
version: "1.0.0"
type: understanding
riskLevel: system
---

# Conduit Frontend Map

## Purpose

Produce a frontend understanding object that helps downstream agents locate page routes, components, forms, data-fetching points, and display surfaces without assuming fixed file paths.

## When to use

Use this Skill before UI changes involving HomePage, ArticlePage, EditorPage, ProfilePage, SettingsPage, Popular Tags, article cards, article detail, or profile tabs.

## Do not use when

Do not use this Skill to modify frontend files, change backend contracts, select test commands, or reason about domain relationships.

## Required inputs

- `repoUnderstanding` from `conduit-repo-map`.
- `targetRepoPath` as `TARGET_REPO_PATH`.
- `taskSpec` or RequirementIR.

## Required understanding skills

- `conduit-repo-map`

## Workflow

1. Start from verified frontend areas in `repoUnderstanding`.
2. Identify frontend framework, router, and component conventions from actual files.
3. Search for page names and behavior-oriented terms.
4. Map route entry, data source, state transformation, form submit, list card, detail view, profile view, settings view, and Popular Tags sidebar surfaces.
5. Record verified file paths only after inspection.
6. Return `frontendUnderstanding` with candidate gaps for downstream context selection.

## Context selection rules

- Prefer route configuration, page components, reusable article/profile components, editor forms, API client hooks, and related tests.
- Include both data producer and render consumer when a UI field is computed or displayed.
- Use search terms for visible labels and behavior, not only expected component names.
- Never claim a component name or path exists until verified in `TARGET_REPO_PATH`.

## Clarification rules

Ask only if the task references a UI surface that cannot be mapped to any route, component, or visible behavior after discovery.

## Safe defaults

- Treat page names as conventional labels, not guaranteed filenames.
- Prefer small context packages around the affected route and shared components.
- Keep frontend-only context separate from backend context unless the requirement changes API data.

## Patch / modification rules

Do not patch files. This Skill is read-only.

## Testing rules

Do not run tests. Report discovered frontend test files or script names for `conduit-test-command`.

## Expected outputs

Return a structured object:

```json
{
  "frontendUnderstanding": {
    "framework": "unknown",
    "router": { "verifiedPaths": [], "candidatePaths": [] },
    "surfaces": {
      "home": {},
      "articleDetail": {},
      "editor": {},
      "profile": {},
      "settings": {},
      "popularTags": {}
    },
    "dataAccess": {},
    "tests": {},
    "uncertainties": []
  }
}
```

## Failure handling

If the frontend cannot be identified, return `framework: "unknown"`, include the searches already tried, and avoid producing patch guidance.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
