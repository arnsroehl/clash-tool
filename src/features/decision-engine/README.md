# Decision Engine

The Decision Engine is the future orchestration layer for Clash Tool recommendations.

## Responsibilities

The module is designed to coordinate:

- Planner
- Upgrade Queue
- Builder Simulation
- Progress Forecast
- Recommendation Engine
- Strategy Engine
- Resource Engine

## Current Implementation

The first implementation calls the existing Planner, maps planner recommendations into Decision Engine recommendations, selects a strategy from `PlayerGoal`, and returns placeholder results for modules that do not exist yet.

## Boundaries

- No React.
- No Next.js.
- No Supabase access.
- Business logic only.
