# Reference Notes

Profile selection rules:

- `frontend-only`: UI components, frontend routes, frontend API clients, display-only transforms, frontend tests.
- `backend-only`: server controllers, routes, serializers, models, migrations, backend tests.
- `fullstack-targeted`: entity fields, API contract changes, shared types, backend plus frontend surfaces.
- `unknown`: changed files or package scripts cannot be classified with evidence.
- `none`: read-only understanding tasks or no target Conduit source changes.

Always discover package scripts first. Do not invent commands that the repository does not expose or configure.
