# Memory Model

Use this model when recording post-delivery project memory.

## Memory Types

- `semantic`: Stable facts about the target project, such as verified field decisions, route/component conventions, API contract decisions, and test command facts.
- `episodic`: A time-anchored delivery event, including task summary, changed files, tests, failures, repairs, and PR Draft outcome.
- `procedural`: A reusable process lesson, such as a search hint to add, a clarification rule to tighten, or a testing rule that should change.

## Storage Layers

- `change-journal.md`: append-only history. Keep it short and evidence-linked.
- `project-facts.md`: durable facts. Each fact needs `factId`, `status`, `confidence`, `sourceChangeId`, and `lastVerified`.
- `skill-impact-index.md`: proposed Skill maintenance. Do not apply suggestions automatically.
- `rollout-summaries/`: detailed evidence for one delivery run.

## Promotion Rules

- Promote to `project-facts.md` only when a fact was verified against `TARGET_REPO_PATH` or confirmed by a completed delivery artifact.
- Keep one-off failure history in `change-journal.md` unless it reveals a reusable rule.
- Put process lessons in `skill-impact-index.md` when they affect an existing Skill's search hints, clarification rules, forbidden changes, test rules, or reference notes.
- Invalidate stale facts by adding a new invalidation record; do not delete old facts.

## Retrieval Rules

- Load `change-journal.md` first for recent run summaries.
- Search `project-facts.md` for stable facts relevant to the current task.
- Search `skill-impact-index.md` before editing any Skill.
- Open rollout summary files only when the short entries do not contain enough evidence.

## Safety Rules

- Do not store local absolute paths.
- Do not store unverified target repository paths as stable facts.
- Do not modify Conduit business source code from this Skill.
- Do not directly update other Skills without a separate approved maintenance task.
