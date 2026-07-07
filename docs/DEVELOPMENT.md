# Development

## Table of Contents

- [Workflow](#workflow)
- [Commands](#commands)
- [Branches](#branches)
- [Commits](#commits)
- [Reviews](#reviews)
- [Environment](#environment)

## Workflow

1. Work on a feature branch.
2. Read relevant local Next.js documentation before changing Next.js code.
3. Keep changes scoped.
4. Run lint, tests, and build where relevant.
5. Do not modify `.env.local` unless explicitly requested.

## Commands

```bash
npm run dev
npm run lint
npm test
npm run build
npm run import-game-data
```

## Branches

Feature branch names used in the repository include:

- `feature/game-data`
- `feature/dashboard-v1`
- `feature/heroes`
- `feature/laboratory`
- `feature/intelligent-planner-v1`

## Commits

No commit convention file is present. Keep commit messages concise and scoped to the change.

## Reviews

Review focus:

- no direct Supabase calls in UI components
- no `any`
- no accidental `.env.local` changes
- no database structure changes outside SQL helper files
- app still runs

## Environment

Next.js reads `.env.local`. The import script also reads `.env.local` into the Node process, but does not modify it.
