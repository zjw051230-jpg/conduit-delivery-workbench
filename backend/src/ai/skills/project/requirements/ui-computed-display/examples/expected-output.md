# Expected Output

```json
{
  "patchPlan": {
    "allowedFiles": ["verified frontend article card/list files"],
    "forbiddenFiles": ["backend files", "database files", "API contract files"],
    "calculationRules": [
      "Read article body from existing frontend data.",
      "minutes = max(1, ceil(bodyCharacterCount / 500))."
    ]
  },
  "testPlan": {
    "testProfile": "frontend-only",
    "commands": ["Use commands discovered by conduit-test-command."]
  },
  "completionReport": {
    "changedSurfaces": ["article list card"],
    "safeDefaultsUsed": ["500 Chinese characters per minute", "minimum 1 minute"],
    "risks": []
  }
}
```
