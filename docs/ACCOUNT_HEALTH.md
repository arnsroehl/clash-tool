# Account Health

The Account Health engine is deterministic and derives its result only from persisted account and planning data. It does not define one correct play style.

## Result

- `score`: general health from progress, balance, efficiency, goals, rush safety and a small strategy-fit component
- `generalProgressScore`: time-weighted completion where complete upgrade-time data is available, otherwise level-weighted completion
- `balanceScore`: dispersion between measured account areas
- `strategyFitScore`: a separate strategy-dependent view
- `rushRiskScore`: explainable risk from offensive cores, heroes, laboratory, defenses, unbuilt entities and uneven building instances
- ten area scores for offense, defense, heroes, laboratory, resources, walls, pets, equipment, builder efficiency and goal achievement
- strongest and weakest area, largest gap and up to three concrete improvements
- explicit `missingData`; missing areas are not silently treated as zero

The calculation version is stored with every result so historical values remain interpretable when scoring changes later.

## Data sources

- Planner catalog and current levels: buildings, heroes, troops, spells and siege machines
- Screenshot progress catalog: pets and equipment
- Screenshot imports: walls and current builder/laboratory/pet-house/blacksmith availability
- Planning data: active goals, queue, strategy and custom weights
- Magic Item inventory: unreserved quantities as an efficiency signal

## History

`account_health_snapshots` stores one RLS-protected snapshot per account and calendar day. Recalculations on the same day update that row. The UI compares the current score with the newest earlier snapshot.

Migration: `src/scripts/sql/account-health-snapshots.sql`

## Verification

`src/features/account-health/account-health.test.ts` covers reproducibility, time weighting, missing-data behavior, strategy influence, goals and slot utilization.
