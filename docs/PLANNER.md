# Planner

## Table of Contents

- [Purpose](#purpose)
- [Files](#files)
- [Input](#input)
- [Output](#output)
- [Rules](#rules)
- [Priority v1](#priority-v1)
- [Extensibility](#extensibility)

## Purpose

The planner is framework-independent business logic. It receives account state, planner items, current levels, and optional level metadata. It returns upgrade candidates, recommendations, progress, aggregate costs, and aggregate time.

## Files

| File | Purpose |
| --- | --- |
| `planner.types.ts` | Domain contracts |
| `planner.constants.ts` | Shared constants |
| `planner.rules.ts` | Toggleable rules |
| `planner.utils.ts` | Pure helper functions |
| `planner.engine.ts` | Core calculation |
| `planner.service.ts` | Service boundary |
| `planner.test.ts` | Node tests |

## Input

Current planner item types:

- `building`
- `hero`
- `troop`
- `spell`
- `siege_machine`

The page converts loaded domain data into `PlannerItem[]`, `PlannerItemLevels`, and `PlannerUpgradeLevel[]`.

## Output

`PlannerResult` includes:

- account id and name
- progress rows
- possible upgrades
- blocked upgrades
- recommendations
- summary totals

## Rules

Rules live in `planner.rules.ts`. The current architecture supports enabling rules by id. The town hall rule blocks items not unlocked by the account town hall level.

## Priority v1

Current priority scoring is simple and deterministic:

- laboratory item types receive a bonus
- heroes receive a bonus
- Rathaus/Town Hall and Clanburg/Clan Castle receive a bonus
- defense category receives a smaller bonus
- resource category receives a penalty
- missing levels and current level influence the final score

## Extensibility

Future strategies can extend planner rules and utility functions while preserving the service boundary. The planner must remain independent of React, Next.js, and Supabase.
