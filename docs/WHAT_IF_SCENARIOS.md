# What-if scenarios

Scenario v2 is an isolated planning laboratory. Saving, editing, duplicating or comparing a scenario does not mutate account levels, the productive queue or current resources.

## Stored model

Each scenario stores:

- name and description
- immutable base-state snapshot with account, strategy, resources, queue, goals, events and Magic Items
- visible assumptions
- independent queue snapshot
- independent resource forecast and simulation result
- creation/update timestamps and optional comparison scenario
- schema version `scenario-v2`

## Supported assumptions

- Town Hall unchanged, immediately upgraded or scheduled for a date
- one to seven builders
- play-pause interval in which no new upgrade starts
- separate current resources and daily farming income
- Gold Pass modeled as a 20% time/cost reduction
- strategy switch with optional automatic queue optimization
- add or remove events
- allocate available Magic Items to scenario queue entries
- reorder, add or remove queue entries
- override goal dates
- force or exclude specific upgrades

The simulation supports per-item earliest starts and pause windows. Upgrades already running when a pause begins continue; only new starts are delayed.

## Comparison

The UI compares the active plan, the draft and an optional second saved scenario across total duration, current-TH max estimate, overall-max estimate, builder/lab idle time, resources, daily farming, goal feasibility, time/resource savings, Magic Items and projected Health Score. Model-derived long-range values are marked as estimates.

## Adoption safety

`apply_planning_scenario_queue` runs as `SECURITY INVOKER` inside one database transaction. It can only access rows allowed by existing RLS policies. Planned/active unlocked entries are replaced; locked productive entries remain by default. The UI requires an explicit checkbox to replace locked entries. Completed/skipped history is not deleted.

Migration: `src/scripts/sql/planning-scenarios-v2.sql`

## Verification

Scenario and builder-simulation tests cover isolation, discounts, resources, scheduled Town Hall starts, pauses, forced/excluded items, locked positions, Magic Items, strategy optimization and deep duplication.
