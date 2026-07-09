# Coding Standards

## Table of Contents

- [TypeScript](#typescript)
- [React](#react)
- [Data Access](#data-access)
- [Features](#features)
- [Game Data](#game-data)
- [Scripts](#scripts)
- [Documentation](#documentation)

## TypeScript

- Use strict TypeScript.
- Do not use `any`.
- Prefer explicit domain types in `src/types` or feature-local types.
- Keep functions small and named by behavior.

## React

- Components render UI and accept props.
- Components must not query Supabase directly.
- Hooks own React state, effects, loading states, save states, and optimistic updates.
- `src/app/page.tsx` composes hooks, feature output, and components.

## Data Access

- Services own runtime Supabase access.
- Services map database rows into domain types.
- `src/lib/supabase.ts` owns the browser Supabase client setup.
- Import scripts may access Supabase for data pipeline work.

## Features

- Business logic belongs in `src/features`.
- Feature logic must be reusable without React, Next.js, or Supabase when possible.
- Planner input and output should be plain data.
- Planner output should be deterministic.

## Game Data

- Current JSON files in `src/data/` are source of truth for importable sample game data.
- Current item IDs are UUIDs because they map to Supabase primary keys.
- Display names are localized in `name`.
- English stable IDs are a planned direction for future game-data structure, not the current implemented format on this branch.
- Level data includes costs, upgrade time, town hall level, and hitpoints.

## Scripts

- Import scripts may access Supabase.
- SQL helper files are not auto-executed.
- Importer should validate before upserting.
- Scripts must not modify `.env.local`.

## Documentation

- Do not document planned systems as implemented.
- Keep roadmap status aligned with repository files.
- Prefer links to focused docs instead of duplicating long explanations.
