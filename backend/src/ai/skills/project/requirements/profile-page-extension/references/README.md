# Reference Notes

Use this Skill only for Profile UI changes that consume existing data.

Guardrails:

- Follow is a relationship/action, not a Profile like.
- Do not change Follow or Favorite behavior while adding Profile layout.
- `user.bio` may or may not exist in the actual target repo; verify before using it.
- A request for a new persisted profile attribute must be routed to `add-entity-field`.
- Use verified Profile route/component paths from `conduit-frontend-map`.
