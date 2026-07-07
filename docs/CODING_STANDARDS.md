# Coding Standards

## Table of Contents

- [TypeScript](#typescript)
- [React](#react)
- [Data Access](#data-access)
- [Planner](#planner)
- [Game Data](#game-data)
- [Scripts](#scripts)

## TypeScript

- Use strict TypeScript.
- Do not use `any`.
- Prefer explicit domain types in `src/types` or feature-local types.
- Keep functions small and named by behavior.

## React

- Components render UI and accept props.
- Components must not query Supabase directly.
- Hooks own React state, effects, loading states, save states, and optimistic updates.

## Data Access

- Services own Supabase access.
- Services map database rows into domain types.
- `src/lib/supabase.ts` owns the browser Supabase client setup.

## Planner

- Planner code must not import React, Next.js, or Supabase.
- Planner input should be plain data.
- Planner output should be deterministic.

## Game Data

- JSON files in `src/data/` are source of truth for importable game data.
- IDs are UUIDs.
- Level data includes costs, upgrade time, town hall level, and hitpoints.

## Scripts

- Import scripts may access Supabase.
- SQL helper files are not auto-executed.
- Importer should validate before upserting.
