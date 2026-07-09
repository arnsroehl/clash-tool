# Contributing

## Table of Contents

- [Feature Workflow](#feature-workflow)
- [Branches](#branches)
- [Development Checklist](#development-checklist)
- [Pull Requests](#pull-requests)
- [Review Checklist](#review-checklist)

## Feature Workflow

1. Start from the intended branch.
2. Keep changes scoped to the request.
3. Preserve existing behavior unless explicitly asked to change it.
4. Update documentation when architecture, data flow, scripts, commands, or roadmap status changes.
5. Do not modify `.env.local`.

## Branches

Use scoped branches:

| Prefix | Example |
| --- | --- |
| `feature/` | `feature/laboratory` |
| `docs/` | `docs/finalize-project-docs` |
| `infrastructure/` | `infrastructure/ci-deployment` |

## Development Checklist

Run relevant checks:

```bash
npm run lint
npm test
npm run build
npm run dev
```

## Pull Requests

No PR template is present in the repository. A useful PR description should include:

- summary
- changed files or modules
- tests run
- database implications, if any
- screenshots only when UI changed

## Review Checklist

- No `.env.local` changes.
- No unexpected database schema changes.
- No `any`.
- No direct Supabase queries in components.
- Planner remains framework-independent.
- Importer remains idempotent.
- Documentation does not claim planned features are implemented.
