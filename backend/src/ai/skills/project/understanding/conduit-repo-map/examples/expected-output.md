# Expected Output

```json
{
  "repoUnderstanding": {
    "targetRepoPath": "TARGET_REPO_PATH",
    "layout": "unknown",
    "frontend": {
      "verifiedPaths": [],
      "candidatePaths": ["frontend", "client", "src", "apps/*"]
    },
    "backend": {
      "verifiedPaths": [],
      "candidatePaths": ["backend", "server", "api", "apps/*"]
    },
    "shared": {
      "verifiedPaths": [],
      "candidatePaths": []
    },
    "tests": {
      "verifiedPaths": [],
      "candidatePaths": []
    },
    "scripts": {
      "packageScripts": {},
      "otherScripts": []
    },
    "forbiddenPaths": [".env", "node_modules", "dist", "build", "coverage", ".git"],
    "uncertainties": ["Inspect repository metadata before selecting exact paths."]
  }
}
```
