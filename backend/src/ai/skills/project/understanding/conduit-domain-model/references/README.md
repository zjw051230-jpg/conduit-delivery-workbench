# Reference Notes

Important relationship guardrails:

- User owns Articles and Comments through author identity.
- Profile is the public view of a User and may include whether the current viewer follows that user.
- Article favorite belongs to Article and viewer/user relationship state.
- Article favorite is not a Profile like.
- Follow is not a Profile like.
- Comment like, when requested, should be treated as a relationship or idempotent interaction, not as a normal display-only scalar field.
- Tags classify Articles and may be represented as strings, Tag entities, or API DTO values depending on the actual target repo.

Always verify actual file paths and code shapes in `TARGET_REPO_PATH`.
