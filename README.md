# Conduit Delivery Workbench

A full-stack test bed for turning a change request into a reviewed patch against the Conduit sample application. The server coordinates repository lookup, planning, code changes, tests, and delivery records; the web client exposes the same flow for local use.

## Getting started

```bash
npm ci
cp .env.example .env
npm run dev
```

The API and Vite client start together. Use `npm run dev:api` or `npm run dev:web` when working on one side only.

## Checks

```bash
npm test
npm run build
npm run smoke:full-flow
```

## Layout

- `backend/src/`: API, task orchestration, repository context, and delivery logic.
- `backend/src/ai/skills/project/`: Conduit-specific task definitions and references.
- `frontend/src/`: local workbench UI.
- `fixtures/`: small competition and workflow fixtures used by tests.
- `scripts/`: end-to-end smoke tests.

This is a development workbench, not a hosted service. Keep model endpoints and credentials in `.env`.
