# Reference Notes

Supported L1 display patterns:

- Article word count from existing article body.
- Estimated reading time from existing article body.
- Frontend-only mock read count from stable existing article data.
- Popular Tags first-five label from existing tag list order.
- Last edited display from an existing update timestamp already present in frontend data.

Reading time default:

```txt
minutes = max(1, ceil(characterCount / 500))
```

Do not modify backend files, persistence, or API contracts for this Skill.
