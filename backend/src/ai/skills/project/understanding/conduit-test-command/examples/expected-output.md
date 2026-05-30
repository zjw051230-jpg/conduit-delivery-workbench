# Expected Output

```json
{
  "testPlan": {
    "testProfile": "frontend-only",
    "discoveredScripts": {
      "lint": "npm run lint",
      "test": "npm test"
    },
    "commands": [
      { "command": "npm run lint", "reason": "Frontend code changed and lint script exists." },
      { "command": "npm test", "reason": "Frontend code changed and test script exists." }
    ],
    "rationale": [
      "Changed file is under a verified frontend path.",
      "The requirement is L1 display-only."
    ],
    "fallback": "If scripts fail because dependencies are absent, report dependency missing to delivery repair.",
    "blockingIssues": []
  }
}
```
