# Clash Tool

Clash Tool ist eine Next.js-Anwendung zum Verwalten von Clash of Clans Accounts, Spielfortschritt und Upgrade-Empfehlungen. Das Projekt kombiniert Account-Daten aus Supabase, importierbare JSON-Game-Data und eine framework-unabhängige Planner Engine.

## Table of Contents

- [Product Vision](#product-vision)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Supabase](#supabase)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [CI](#ci)

## Product Vision

Clash Tool entwickelt sich zu einem planner-zentrierten Fortschrittstool für Clash of Clans. Der aktuelle Fokus liegt darauf, Account-Zustand, statische Game-Data und deterministische Planner-Logik sauber zu trennen.

Mehr Kontext steht in `docs/PRODUCT_VISION.md`.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Database | Supabase |
| Language | TypeScript strict |
| Scripts and tests | `tsx`, Node test runner |
| CI | GitHub Actions |

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
# Nur für das lokale Import-Script; niemals mit NEXT_PUBLIC_ präfixen:
SUPABASE_SECRET_KEY=
```

Keep these values in `.env.local`. Do not commit secrets or local environment files.

SQL helper files for selected modules live in:

```text
src/scripts/sql/
```

These SQL files are setup helpers and are not executed automatically by the app.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the production application |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs planner tests |
| `npm run import-game-data` | Imports validated JSON game data with a server-only Supabase secret key |

Run the game-data importer after Supabase tables and local environment variables are configured:

```bash
npm run import-game-data
```

## Architecture

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

Core rule: components render UI, hooks orchestrate React state, services access Supabase, and business logic belongs in `src/features`.

## Development Workflow

1. Work on a scoped branch such as `feature/<topic>`, `docs/<topic>`, or `infrastructure/<topic>`.
2. Keep changes focused.
3. Do not edit `.env.local`.
4. Run relevant checks before handing off:

```bash
npm run lint
npm test
npm run build
```

## Documentation

Start here:

- `docs/PROJECT.md`
- `docs/PRODUCT_VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

Focused references:

- `docs/DATABASE.md`
- `docs/GAME_DATA.md`
- `docs/IMPORT_PIPELINE.md`
- `docs/PLANNER.md`
- `docs/ROADMAP.md`
- `docs/DEVELOPMENT.md`
- `docs/CODING_STANDARDS.md`
- `docs/TESTING.md`
- `docs/CONTRIBUTING.md`

## CI

GitHub Actions runs on `push` and `pull_request`.

The CI workflow installs dependencies with `npm ci` and verifies:

```bash
npm run lint
npm test
npm run build
```
