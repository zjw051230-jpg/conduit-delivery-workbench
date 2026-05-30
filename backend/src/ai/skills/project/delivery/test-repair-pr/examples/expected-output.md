# Expected Output

```json
{
  "failureAnalysis": [
    {
      "command": "npm run lint",
      "exitCode": 1,
      "category": "import",
      "evidence": "Cannot find module '<missing-module>'",
      "likelyOwner": "frontend import path or missing component export"
    }
  ],
  "repairSuggestions": [
    "Verify whether the missing module exists in the target repo.",
    "Fix the import path or create the component only if it was part of the originating add-entity-field patch plan."
  ],
  "rerunPlan": {
    "commands": ["npm run lint"],
    "rationale": ["Rerun the failing lint command after import repair."]
  },
  "prDraft": {
    "title": "Add Article cover image support",
    "summary": ["Adds cover image data flow and display surfaces according to the originating task."],
    "changedFiles": ["VERIFIED_FRONTEND_ARTICLE_CARD_FILE", "VERIFIED_FRONTEND_ARTICLE_API_CLIENT_FILE"],
    "testsRun": ["npm run lint - failed: import error"],
    "knownFailures": ["Cannot find module '<missing-module>'"],
    "riskNotes": ["Business behavior should remain scoped to Article.coverImage."]
  }
}
```
