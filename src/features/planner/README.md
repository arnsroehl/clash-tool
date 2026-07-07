# Planner Engine

The planner is a framework-independent business-logic module for Clash Tool.
It must not import React, Next.js, Supabase clients, hooks, or UI components.

## Architecture

- `planner.types.ts` defines the domain contract: input, result, resources, builders, rules, candidates, recommendations, and progress.
- `planner.constants.ts` centralizes defaults, rule names, resource types, and priority boundaries.
- `planner.rules.ts` contains individually toggleable rules. The first version only has simple pass/block behavior.
- `planner.utils.ts` contains pure helper functions for progress, missing levels, resources, time, builder usage, and priority scoring.
- `planner.engine.ts` is the core calculation engine. It turns a `PlannerInput` into a `PlannerResult`.
- `planner.service.ts` is the boundary that future adapters can call after loading Supabase and game-data rows.
- `planner.test.ts` verifies the engine without a browser, React, or a database.

## Data Flow

1. An adapter loads account data, buildings, current levels, optional upgrade-level metadata, resources, builders, and queue state.
2. The adapter calls `planUpgrades(input)`.
3. The service delegates to `createPlannerResult`.
4. The engine evaluates buildings, rules, missing levels, costs, time, progress, and placeholder priority scores.
5. Consumers receive a `PlannerResult` that can be used by UI, API routes, workers, mobile apps, or CLI tools.

## Responsibilities

The planner owns only deterministic upgrade-planning logic. It does not fetch data, mutate persistence, render UI, or read environment variables.

## Extensibility

Rules are isolated objects with an `id`, display `name`, default state, and `evaluate` function. New rules can be added to `DEFAULT_RULES` and enabled through `enabledRuleIds`.

Priority scoring is intentionally simple in this version. Future versions can replace the scoring internals while keeping the public `PriorityScore` shape stable.

## Example

```ts
import { planUpgrades } from "@/features/planner/planner.service";

const result = planUpgrades({
  account,
  buildings,
  buildingLevels,
  upgradeLevels,
});

console.log(result.possibleUpgrades);
```
