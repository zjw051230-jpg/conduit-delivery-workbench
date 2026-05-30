# Expected Output

```json
{
  "frontendUnderstanding": {
    "framework": "unknown",
    "router": {
      "verifiedPaths": [],
      "candidatePaths": ["src/routes", "src/pages", "client/src", "frontend/src"]
    },
    "surfaces": {
      "home": {
        "candidateSearches": ["HomePage", "ArticleList", "global feed"]
      },
      "popularTags": {
        "candidateSearches": ["Popular Tags", "popular tags", "tagList"]
      }
    },
    "dataAccess": {},
    "tests": {},
    "uncertainties": ["Verify component and data access paths before selecting context."]
  }
}
```
