# Expected Output

```json
{
  "changeRecord": {
    "changeId": "2026-05-28-add-article-cover-image",
    "taskSummary": "Add Article.coverImage and show it on editor, list, detail, and profile article cards.",
    "matchedSkills": [
      "conduit-repo-map",
      "conduit-domain-model",
      "conduit-frontend-map",
      "add-entity-field",
      "conduit-test-command",
      "test-repair-pr"
    ],
    "changedFiles": [
      "VERIFIED_ARTICLE_MODEL_FILE",
      "VERIFIED_ARTICLE_API_FILE",
      "VERIFIED_ARTICLE_EDITOR_FILE",
      "VERIFIED_ARTICLE_CARD_FILE"
    ],
    "testsRun": [
      { "command": "npm run lint", "status": "passed" },
      { "command": "npm test", "status": "passed" }
    ],
    "outcome": "success"
  },
  "memoryUpdates": {
    "journalEntry": "Append a concise entry for 2026-05-28-add-article-cover-image with task, Skills, changed files, tests, PR Draft, and rollout summary link.",
    "projectFactsToAdd": [
      {
        "factId": "article-cover-image-optional-string-url",
        "status": "active",
        "confidence": "medium",
        "sourceChangeId": "2026-05-28-add-article-cover-image",
        "fact": "Article.coverImage was implemented as an optional string URL with fallback display for missing values."
      }
    ],
    "projectFactsToInvalidate": [],
    "rolloutSummaryPath": "references/rollout-summaries/2026-05-28-add-article-cover-image.md"
  },
  "skillImpactAnalysis": [
    {
      "skillId": "conduit-frontend-map",
      "impactType": "search-hint",
      "reason": "The run verified article card naming that may improve future frontend surface discovery.",
      "suggestedUpdate": "Consider adding the verified article card component name to conduit-frontend-map searchHints after separate maintenance approval.",
      "priority": "low"
    }
  ],
  "writePlan": {
    "allowedFiles": [
      "backend/src/ai/skills/project/delivery/conduit-change-memory/references/change-journal.md",
      "backend/src/ai/skills/project/delivery/conduit-change-memory/references/project-facts.md",
      "backend/src/ai/skills/project/delivery/conduit-change-memory/references/skill-impact-index.md",
      "backend/src/ai/skills/project/delivery/conduit-change-memory/references/rollout-summaries/2026-05-28-add-article-cover-image.md"
    ],
    "forbiddenFiles": [
      "Conduit business source code",
      "Other Skill files without separate maintenance approval",
      ".env",
      "lockfiles",
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".git"
    ]
  }
}
```
