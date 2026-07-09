# Planner

## Table of Contents

- [Purpose](#purpose)
- [Files](#files)
- [Input](#input)
- [Output](#output)
- [Rules](#rules)
- [Priority V1](#priority-v1)
- [Current Limits](#current-limits)
- [Decision Engine Relationship](#decision-engine-relationship)
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

Upgrade candidates include:

- item id and item type
- name and category
- current level, next level, max level, and missing levels
- next-level costs and time
- remaining costs and time
- priority score
- blocking reasons

## Rules

Rules live in `planner.rules.ts`. The current architecture supports enabling rules by id. The town hall rule blocks items not unlocked by the account town hall level.

## Priority V1

Current priority scoring is simple and deterministic:

- laboratory item types receive a bonus
- heroes receive a bonus
- Rathaus/Town Hall and Clanburg/Clan Castle receive a bonus
- defense category receives a smaller bonus
- resource category receives a penalty
- missing levels and current level influence the final score

## Current Limits

The repository now contains `src/features/decision-engine` as an orchestration foundation. It does not currently contain dedicated feature modules for:

- upgrade queue
- builder simulation
- progress forecast

Planner V2 is listed as in progress because the planner already supports multiple item types, level metadata, simple rule evaluation, and priority scoring, but the full queue/simulation/forecast stack is not present on this branch.

## Decision Engine Relationship

The Planner remains framework-independent and focused on upgrade candidates, progress, costs, and simple recommendations.

The Decision Engine is the future orchestration layer. It currently calls the Planner and maps planner recommendations into Decision Engine recommendations with multiple reasons. Future queue, simulation, forecast, strategy, recommendation, and resource modules should be coordinated there instead of expanding the Planner into an all-purpose system.

## Extensibility

Future strategies can extend planner rules and utility functions while preserving the service boundary. The planner must remain independent of React, Next.js, and Supabase.
