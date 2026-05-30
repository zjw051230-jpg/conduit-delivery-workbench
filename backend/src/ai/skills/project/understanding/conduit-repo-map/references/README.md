# Reference Notes

Use this reference when building the repository understanding object.

- Treat `TARGET_REPO_PATH` as the only target repository root.
- Candidate paths are discovery hints, not facts.
- Exclude `.git`, `.env`, `node_modules`, `dist`, `build`, and `coverage` from scans and context packages.
- Record uncertainty explicitly when framework, package manager, or frontend/backend split cannot be verified.
- Understanding Skills should produce structured facts for downstream agents and should not patch files.
