# Clash Tool

Clash Tool ist eine Next.js-Anwendung zum Verwalten von Clash of Clans Accounts, Spielfortschritt und Upgrade-Empfehlungen. Das Projekt kombiniert Account-Daten aus Supabase, statische Game-Data-JSON-Dateien und eine framework-unabhängige Planner Engine.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Supabase](#supabase)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [CI](#ci)

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Database | Supabase |
| Language | TypeScript |
| Scripts and tests | `tsx`, Node test runner |

## Local Setup

Install dependencies:

```bash
npm ci
```

Start the local development server:

```bash
npm run dev
```

The app runs at:

```text
http://localhost:3000
```

## Supabase

The app expects Supabase configuration through local environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Keep these values in `.env.local`. Do not commit secrets or local environment files.

SQL helper files for selected modules live in:

```text
src/scripts/sql/
```

These SQL files are documentation/setup helpers and are not executed automatically by the app.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the production application |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs planner tests |
| `npm run import-game-data` | Imports JSON game data into Supabase using upserts |

Run the game-data importer after Supabase tables and local environment variables are configured:

```bash
npm run import-game-data
```

## Architecture

The current architecture separates UI, state orchestration, data access, game data, and planner logic:

```text
src/app/              Next.js app entry points
src/components/       Presentational UI components
src/hooks/            React hooks for state and actions
src/services/         Supabase access and row mapping
src/features/planner/ Framework-independent planner engine
src/data/             JSON game-data source files
src/scripts/          Import pipeline and SQL helper files
src/types/            Shared TypeScript domain types
docs/                 Project documentation
```

Start with `docs/PROJECT.md` for a project overview, then read:

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/GAME_DATA.md`
- `docs/PLANNER.md`
- `docs/IMPORT_PIPELINE.md`
- `docs/DEVELOPMENT.md`
- `docs/CODING_STANDARDS.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `docs/CONTRIBUTING.md`

## CI

GitHub Actions runs on `push` and `pull_request`.

The CI workflow installs dependencies with `npm ci` and verifies:

```bash
npm run lint
npm test
npm run build
```
