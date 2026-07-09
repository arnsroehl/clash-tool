# Builder Simulation

Builder Simulation V1 distributes existing upgrade queue items across the active account builders.

## V1 Logic

- Input is `UpgradeQueueItem[]`.
- `builderCount` comes from the active account.
- The next queue item is always assigned to the builder with the earliest free hour.
- Times are relative hours from start `0`.
- Queue order is respected.

## Excluded From V1

- Resource logic.
- Real calendar dates.
- Magic items.
- Pauses.
- Priority recalculation.
- Supabase persistence for simulation output.
