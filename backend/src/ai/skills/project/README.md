# Conduit Engineering Skills

These project-level Skills are runtime assets for the Super Individual AI orchestration layer. They guide agents that inspect and modify a target Conduit repository referenced as `TARGET_REPO_PATH`.

## Layers

- `understanding/`: project, domain, frontend, and test-command discovery Skills. These produce structured understanding objects and do not create patches.
- `requirements/`: requirement execution Skills for recurring Conduit change patterns. These depend on understanding Skills and define safe patch and test rules.
- `delivery/`: verification, repair, and PR draft guidance after code generation.

## Registry Loading Idea

Load `registry.example.json`, resolve each listed `manifestPath` relative to this directory, validate every manifest against `skill-manifest.schema.json`, then index by `id`, `type`, `triggers`, `riskLevel`, and `testProfile`.

At runtime, the orchestrator should:

1. Build or refresh understanding objects with the relevant `understanding` Skills.
2. Match the PM request against requirement or delivery Skill manifests.
3. Compile a context package from each matched Skill's `contextHints`.
4. Enforce `allowedChanges`, `forbiddenChanges`, and `clarificationPolicy`.
5. Select tests from `testProfile` and `conduit-test-command`.
6. Attach Skill outputs to review, repair, and PR draft artifacts.

## Safety

Do not hardcode local absolute paths. Use `TARGET_REPO_PATH` for the target Conduit checkout and verify all candidate paths against the actual repository before reading, patching, or testing.
