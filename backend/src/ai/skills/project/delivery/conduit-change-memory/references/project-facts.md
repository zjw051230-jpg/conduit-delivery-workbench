# Project Facts

Store durable, evidence-linked facts learned from completed Conduit delivery runs. Reverify facts against `TARGET_REPO_PATH` before patching.

## Fact Template

```md
### <factId>

- Status: active | invalidated | superseded
- Confidence: low | medium | high
- Memory Type: semantic
- Source Change: <changeId>
- Last Verified: <YYYY-MM-DD>
- Fact: <stable project fact>
- Evidence: <brief evidence or rollout summary path>
- Invalidated By: <changeId or none>
```
