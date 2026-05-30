# Expected Output

```json
{
  "clarificationResult": {
    "fieldSpecComplete": true,
    "fieldSpec": {
      "entity": "Article",
      "fieldName": "coverImage",
      "type": "string URL",
      "required": false,
      "defaultForOldData": "",
      "displaySurfaces": ["editor", "list", "detail", "profile"]
    }
  },
  "patchPlan": {
    "orderedAreas": [
      "model/schema",
      "API create/update/read",
      "frontend client",
      "editor form",
      "list/detail/profile surfaces",
      "tests"
    ],
    "allowedFiles": ["verified backend, frontend, and targeted test files"],
    "forbiddenFiles": [".env", "lockfiles", "node_modules", "dist", "build", "coverage", ".git"]
  },
  "apiContractImpact": {
    "requestPayloads": ["create article", "update article"],
    "responsePayloads": ["article read/list responses"],
    "backwardCompatibility": "Existing articles without coverImage remain valid and render fallback UI."
  },
  "testPlan": {
    "testProfile": "fullstack-targeted",
    "commands": ["Use commands discovered by conduit-test-command."]
  },
  "completionReport": {
    "changedSurfaces": ["editor", "article list", "article detail", "profile article list"],
    "risks": []
  }
}
```
