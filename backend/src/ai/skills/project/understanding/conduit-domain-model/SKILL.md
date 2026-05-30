---
name: conduit-domain-model
description: Model Conduit User, Profile, Article, Comment, Tag, Favorite, and Follow relationships before business logic changes. Do not use to implement UI-only computed display changes.
version: "1.0.0"
type: understanding
riskLevel: system
---

# Conduit Domain Model

## Purpose

Produce a domain understanding object that describes the Conduit business entities, relationship edges, API-facing shapes, and risky ambiguities for downstream code generation.

## When to use

Use this Skill when a request mentions users, profiles, articles, comments, tags, favorites, follows, comment likes, ownership, author identity, or cross-stack entity fields.

## Do not use when

Do not use this Skill for pure repository mapping, pure frontend route mapping, or delivery repair. Use it as input to execution Skills, not as a patch generator.

## Required inputs

- `repoUnderstanding` from `conduit-repo-map`.
- `targetRepoPath` as `TARGET_REPO_PATH`.
- `taskSpec` or RequirementIR.

## Required understanding skills

- `conduit-repo-map`

## Workflow

1. Start from verified repo areas in `repoUnderstanding`.
2. Search for entity and relationship names in source, API, serializer, DTO, and frontend client code.
3. Identify canonical entities: User, Profile, Article, Comment, Tag, Favorite, and Follow.
4. Distinguish scalar fields from relationship edges.
5. Capture API-facing shapes separately from persistence models.
6. Return a `domainUnderstanding` object with verified facts, candidate facts, and unresolved assumptions.

## Context selection rules

- Prefer model/entity/schema files, serializers, controllers/routes, API client types, and tests that name the entities.
- Use `searchHints` before assuming implementation details.
- Include only paths verified inside `TARGET_REPO_PATH`.
- Keep relationship semantics explicit.

## Clarification rules

Ask for clarification when a PM request uses ambiguous words like "like profile", "like comment", or "favorite author" and the intended entity or interaction cannot be derived safely.

## Safe defaults

- Article favorite is an Article-User relationship, not a Profile like.
- Follow is a Profile/User relationship, not a Profile like.
- Comment like should be modeled as a relationship or idempotent interaction until existing behavior proves otherwise.
- Tags are classification labels for articles unless the target repo shows a different model.

## Patch / modification rules

Do not patch files. This Skill only outputs domain understanding for later execution.

## Testing rules

Do not run tests. Report relevant existing test locations or search hints for downstream Skills.

## Expected outputs

Return a structured object:

```json
{
  "domainUnderstanding": {
    "entities": {},
    "relationships": [],
    "apiShapes": {},
    "frontendShapes": {},
    "businessRules": [],
    "antiConfusions": [],
    "verifiedPaths": [],
    "uncertainties": []
  }
}
```

## Failure handling

If entity code cannot be found, return candidate search terms and mark the understanding incomplete. Do not invent fields, tables, endpoints, or DTO names.

## Examples

See `examples/sample-input.json` and `examples/expected-output.md`.
