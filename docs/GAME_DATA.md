# Game Data

## Table of Contents

- [Source of Truth](#source-of-truth)
- [Files](#files)
- [Shape](#shape)
- [ID Convention](#id-convention)
- [Importer](#importer)
- [Versioning](#versioning)

## Source of Truth

JSON files under `src/data/` are the source of truth for imported game-data samples.

## Files

| File | Domain |
| --- | --- |
| `buildings.json` | Buildings |
| `heroes.json` | Heroes |
| `troops.json` | Troops |
| `spells.json` | Spells |
| `siege-machines.json` | Siege machines |
| `game-version.json` | Game data metadata |

## Shape

Current item JSON shape:

```json
{
  "id": "uuid",
  "name": "Name",
  "category": "Category",
  "unlockTownHall": 1,
  "sortOrder": 10,
  "levels": [
    {
      "level": 1,
      "townHall": 1,
      "upgradeTimeHours": 0,
      "goldCost": 0,
      "elixirCost": 0,
      "darkElixirCost": 0,
      "hitpoints": 0
    }
  ]
}
```

## ID Convention

The importer validates item IDs as UUIDs. Existing rows are resolved by name where implemented, so imports can reuse current database IDs.

## Importer

`src/scripts/import-game-data.ts`:

1. Loads `.env.local` values into the Node process.
2. Reads JSON files.
3. Validates item and level structure.
4. Resolves existing rows by name.
5. Upserts game-data rows.
6. Upserts level rows.

Missing laboratory tables are logged and skipped with a pointer to SQL files.

## Versioning

`src/data/game-version.json` currently stores game, data version, schema version, and description metadata.
