# Clash Tool

Clash Tool ist eine Next.js-Anwendung zum Verwalten von Clash of Clans Accounts, Spielfortschritt und Upgrade-Empfehlungen. Das Projekt kombiniert Account-Daten aus Supabase, importierbare JSON-Game-Data und eine framework-unabhängige Planner Engine.

## Table of Contents

- [Product Vision](#product-vision)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Supabase](#supabase)
- [Clash API Proxy](#clash-api-proxy)
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

## Optional Clash API integration

The app runs in manual mode by default. Level entry, screenshot recognition,
planning, queues, simulations, and manual clan creation work without the
official Clash API. To expose automatic player and clan sync after configuring
a fixed-IP API connection, set:

```env
NEXT_PUBLIC_CLASH_API_ENABLED=true
```

Leave the variable unset or set it to `false` to avoid automatic API requests
and hide unavailable sync controls.

## Screenshot import rollout

Screenshot recognition stores its game-UI, model, and layout versions with each
import. Public feature flags allow a changed Clash interface to be disabled on
Vercel without a code rollback:

```env
NEXT_PUBLIC_SCREENSHOT_IMPORT_ENABLED=true
NEXT_PUBLIC_LABORATORY_IMPORT_ENABLED=true
NEXT_PUBLIC_VILLAGE_DETECTION_ENABLED=true
NEXT_PUBLIC_SUPPORTED_GAME_UI_VERSION=coc-ui-2026-07
NEXT_PUBLIC_SCREENSHOT_MODEL_VERSION=local-tesseract-v1
NEXT_PUBLIC_SCREENSHOT_LAYOUT_VERSION=guided-layout-v1
```

These values are public compatibility metadata, not secrets. When a game update
changes the interface, disable the affected importer until its layout is
verified, then set a new UI/layout version and redeploy. Imports without the
currently supported UI version are not automatically analyzed.

The guided resource view recognizes current Gold, Elixir, Dark Elixir and ore
balances. Lines such as `Gold 12.5M / 22M` additionally populate the storage
capacity. Amounts and capacities remain separately editable in the review and
are only persisted after confirmation. The same guided area recognizes the 14
Magic Items from the live Supabase catalog in German and English, compares each
quantity with the saved inventory and blocks conflicting screenshots until the
user corrects them. Existing databases can add the capacity columns with
`src/scripts/sql/screenshot-resource-capacities.sql`.

The `Complete account` option combines all supported guided views in one
private import session. Screenshots can be added in any order; each image is
classified and routed to the matching laboratory, hero, pet, equipment,
builder, building, wall, resource or profile parser. Low-confidence views are
never guessed: the review asks the user to assign the correct view manually.
Confirmation remains disabled until every Town-Hall-relevant view is present,
while the whole session can be saved and resumed later. Existing databases can
enable this session type with
`src/scripts/sql/screenshot-full-account-import.sql`.

Profile screenshots recognize the player tag, player name, Town Hall,
experience level and clan in German and English. Conflicting names, tags or
clans block confirmation until corrected. Confirmed experience and clan values
are stored on the linked account using
`src/scripts/sql/screenshot-profile-details.sql` when the optional official API
is disabled.

Every accepted screenshot is orientation-corrected, capped at 2400 pixels and
re-encoded as JPEG before private Storage upload. This removes original EXIF and
GPS blocks. The import record keeps only the original filename, MIME type and
byte size, normalized byte size, image dimensions and a coarse device platform
(`ios`, `android`, `macos`, `windows`, `linux`, `chromeos`, `other` or
`unknown`). Raw user-agent strings are not stored. Existing databases can add
these columns with `src/scripts/sql/screenshot-file-metadata.sql`.

### Clash API Proxy

The official Clash of Clans API restricts every key to configured outbound IP
addresses. Vercel Hobby uses changing outbound IPs, so production imports should
use the small authenticated proxy in `services/clash-api-proxy`.

The repository includes `render.yaml` for a Render Blueprint. The proxy only
accepts validated player and clan paths, requires a 32+ character shared secret,
and keeps the official Clash token outside Vercel.

Setup order:

1. In Render, create a Blueprint from this repository and select `render.yaml`.
2. Initially set `CLASH_OF_CLANS_API_TOKEN` to a temporary non-empty value.
3. Generate a random shared secret and set it as `CLASH_PROXY_SHARED_SECRET`:

   ```bash
   openssl rand -hex 32
   ```

4. Provide the proxy with individual, fixed outbound IPv4 addresses. Shared
   Render CIDR ranges cannot be entered in the Clash Developer Portal.
5. In the Clash of Clans Developer Portal, create a key for this proxy and add
   every individual fixed IPv4 address under **Allowed IP Addresses**.
6. Replace the temporary Render token with the generated official API token and
   redeploy the proxy. `/health` must return `{ "status": "ok" }`.
7. Add the following sensitive values to Vercel Preview and Production:

   ```text
   CLASH_OF_CLANS_API_PROXY_URL=https://<service-name>.onrender.com
   CLASH_OF_CLANS_API_PROXY_SECRET=<same shared secret as Render>
   ```

8. Redeploy the Next.js app. Do not put the official Clash token in Vercel when
   using the proxy.

For a host that already has a fixed outbound IP, omit the two proxy variables
and set `CLASH_OF_CLANS_API_TOKEN` directly instead.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the production application |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs planner tests |
| `npm run import-game-data` | Imports validated JSON game data with a server-only Supabase secret key |
| `npm --prefix services/clash-api-proxy test` | Tests the standalone Clash API proxy |

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
