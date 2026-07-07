# Architecture

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Layer Responsibilities](#layer-responsibilities)
- [Data Flow](#data-flow)
- [Components](#components)
- [Hooks](#hooks)
- [Services](#services)
- [Features](#features)
- [Scripts and Data](#scripts-and-data)

## Overview

Clash Tool uses a layered frontend architecture. Components receive props, hooks orchestrate React state, services access Supabase, and feature modules contain isolated business logic.

```mermaid
flowchart LR
  Components --> Hooks
  Hooks --> Services
  Services --> Supabase[(Supabase)]
  Page --> Planner
  Planner --> Dashboard
  DataJSON[src/data JSON] --> Importer
  Importer --> Supabase
```

## Folder Structure

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js App Router entry files |
| `src/components/` | UI components grouped by domain |
| `src/hooks/` | React hooks for loading and mutating domain state |
| `src/services/` | Supabase access and row mapping |
| `src/features/planner/` | Planner business logic |
| `src/data/` | JSON game-data source files |
| `src/scripts/` | Import pipeline and SQL helper files |
| `src/types/` | Shared TypeScript types |
| `src/lib/` | Shared library setup, currently Supabase |

## Layer Responsibilities

| Layer | Owns | Must not own |
| --- | --- | --- |
| Components | Markup, display states, buttons | Supabase queries |
| Hooks | React state, effects, optimistic updates | SQL schemas |
| Services | Supabase queries and row mapping | JSX |
| Planner | Upgrade business logic | React/Next/Supabase |
| Scripts | Import validation and upsert flow | App UI |

## Data Flow

Runtime app:

1. `src/app/page.tsx` calls hooks.
2. Hooks call services.
3. Services query Supabase.
4. Hooks return data and actions.
5. `page.tsx` passes account state and game state into `planUpgrades`.
6. Dashboard components render `PlannerResult`.

## Components

Component groups currently present:

- `components/accounts`
- `components/buildings`
- `components/dashboard`
- `components/heroes`
- `components/laboratory`
- `components/ui`

The components follow the existing dark theme, rounded cards, and amber accents.

## Hooks

Domain hooks currently present:

- `useAccounts`
- `useBuildings`
- `useHeroes`
- `useTroops`
- `useSpells`
- `useSiegeMachines`

These hooks expose loaded rows, filtered available rows, progress, loading state, saving state, and update handlers.

## Services

Services currently present:

- `accountService`
- `buildingService`
- `heroService`
- `troopService`
- `spellService`
- `siegeMachineService`

All Supabase table access belongs here or in import scripts.

## Features

`src/features/planner` is the only feature module currently present. It contains:

- types
- constants
- rules
- utils
- engine
- service boundary
- tests
- README

## Scripts and Data

The importer is `src/scripts/import-game-data.ts`. It reads JSON files from `src/data/` and writes to Supabase with upserts.
