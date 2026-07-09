# Development

## Table of Contents

- [Workflow](#workflow)
- [Commands](#commands)
- [Branches](#branches)
- [Commits](#commits)
- [Reviews](#reviews)
- [Environment](#environment)
- [CI](#ci)

## Workflow

1. Work on a scoped branch.
2. Read relevant local Next.js documentation before changing Next.js code.
3. Keep changes scoped to the request.
4. Run lint, tests, and build where relevant.
5. Do not modify `.env.local` unless explicitly requested.
6. Update documentation when architecture, data flow, scripts, commands, or roadmap status changes.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server |
| `npm run lint` | Run ESLint |
| `npm test` | Run planner tests |
| `npm run build` | Build the app |
| `npm run import-game-data` | Import current JSON game data into Supabase |

## Branches

Branch names visible in project work follow scoped prefixes:

| Prefix | Use |
| --- | --- |
| `feature/` | Product or architecture feature work |
| `docs/` | Documentation-only work |
| `infrastructure/` | CI, deployment, or project setup |

## Commits

No commit convention file is present. Keep commit messages concise and scoped to the change.

## Reviews

Review focus:

- no direct Supabase calls in UI components
- no `any`
- no accidental `.env.local` changes
- no database structure changes outside SQL helper files
- planner remains framework-independent
- app still runs

## Environment

Next.js reads `.env.local`. The import script also reads `.env.local` into the Node process, but does not modify it.

## CI

GitHub Actions runs on `push` and `pull_request`. The workflow uses Node.js 20 and runs:

```bash
npm ci
npm run lint
npm test
npm run build
```
