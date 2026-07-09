# Progress Forecast

Progress Forecast V1 calculates a live projection from Planner progress, Upgrade Queue items, and Builder Simulation output.

## V1 Logic

- One queue item from level `X` to `X + 1` counts as one completed level.
- Projected progress is current progress plus completed queue levels relative to remaining levels.
- Estimated completion hours come from Builder Simulation.
- Estimated completion days are `hours / 24`.
- Percentages are clamped to `0` through `100`.

## Limits

- No persistence in Supabase.
- No perfect progression math.
- No resource logic.
- No calendar dates.
- No magic items.
