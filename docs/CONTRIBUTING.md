# Contributing

## Table of Contents

- [Feature Workflow](#feature-workflow)
- [Branches](#branches)
- [Development Checklist](#development-checklist)
- [Pull Requests](#pull-requests)
- [Review Checklist](#review-checklist)

## Feature Workflow

1. Start from the intended feature branch.
2. Keep changes scoped to the request.
3. Preserve existing behavior unless explicitly asked to change it.
4. Update documentation when architecture, data flow, scripts, or commands change.

## Branches

Use feature branches for feature work. Existing branch names show the pattern:

```text
feature/<topic>
```

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
