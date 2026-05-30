# Expected Output

```json
{
  "clarificationResult": {
    "layout": "About Me tab",
    "contentSource": "existing user.bio field if verified"
  },
  "patchPlan": {
    "profileSurface": "Profile page tab area",
    "contentSource": "existing-field",
    "allowedFiles": ["verified frontend Profile files"],
    "forbiddenFiles": ["Follow logic", "backend files", "API contract files"]
  },
  "testPlan": {
    "testProfile": "frontend-only",
    "commands": ["Use commands discovered by conduit-test-command."]
  },
  "completionReport": {
    "changedSurfaces": ["Profile About Me tab"],
    "routedToAddEntityField": false,
    "risks": ["If user.bio is not present, route to add-entity-field before patching."]
  }
}
```
