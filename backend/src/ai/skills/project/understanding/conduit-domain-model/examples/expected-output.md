# Expected Output

```json
{
  "domainUnderstanding": {
    "entities": {
      "User": { "role": "authentication identity", "verifiedPaths": [] },
      "Profile": { "role": "public user projection", "verifiedPaths": [] },
      "Article": { "role": "authored content", "verifiedPaths": [] },
      "Comment": { "role": "article discussion item", "verifiedPaths": [] },
      "Tag": { "role": "article classification", "verifiedPaths": [] }
    },
    "relationships": [
      { "name": "Favorite", "from": "User", "to": "Article", "kind": "relationship" },
      { "name": "Follow", "from": "User", "to": "Profile", "kind": "relationship" }
    ],
    "apiShapes": {},
    "frontendShapes": {},
    "businessRules": [
      "Article favorite is not Profile like.",
      "Follow is not Profile like."
    ],
    "antiConfusions": [
      "Do not model comment like as a simple display field without verifying behavior."
    ],
    "verifiedPaths": [],
    "uncertainties": ["Verify actual model and API file locations before patching."]
  }
}
```
