# Architecture Decisions

## Table of Contents

- [Decision Log](#decision-log)
- [Notes](#notes)

## Decision Log

| Decision | Rationale | Current evidence |
| --- | --- | --- |
| JSON is the source of truth for importable sample game data | Game data can be reviewed, versioned, and imported deterministically | `src/data/*.json`, `src/scripts/import-game-data.ts` |
| Supabase is the runtime database | Account state and imported game data need persistence | `src/lib/supabase.ts`, `src/services/` |
| Feature branch workflow | Work is isolated by topic and easier to review | Branch names such as `feature/...`, `docs/...`, `infrastructure/...` |
| TypeScript strict | Domain logic and database mapping need strong contracts | `tsconfig.json`, typed services/hooks/features |
| Business logic belongs in `src/features` | Planner logic should be reusable outside React and Next.js | `src/features/planner/` |
| Services encapsulate data access | Supabase calls remain outside UI components | `src/services/*Service.ts` |
| Hooks contain React logic | Loading state, selected data, and mutations are React concerns | `src/hooks/use*.ts` |
| Components contain UI only | Components stay reusable and easy to reason about | `src/components/` receives props and callbacks |
| Import scripts validate before upsert | Invalid game data should fail before writing to Supabase | `src/scripts/import-game-data.ts` validation functions |
| SQL helper files are not auto-executed | Database changes remain explicit and reviewable | `src/scripts/sql/*.sql` |
| Planner is framework-independent | Planner output can later be reused by UI, API, CLI, worker, or mobile clients | Planner files avoid React/Next/Supabase imports |
| Decision Engine coordinates higher-level recommendations | Planner should remain focused; orchestration belongs in a dedicated feature module | `src/features/decision-engine/` |
| Current game-data IDs are UUIDs | Existing Supabase tables use UUID primary keys | Current `src/data/*.json` uses UUID `id` values |
| Future stable IDs should be English | English IDs are better for long-term code and data references | Planned in roadmap; not implemented on this branch |
| Display names may be localized | User-facing names can remain German while technical identifiers stay stable | Current data uses German `name` values |
| CI runs lint, tests, and build | Basic quality gates catch regressions before merge | `.github/workflows/ci.yml` |

## Notes

This document records decisions visible in the repository. It does not document future systems as implemented unless corresponding code or configuration exists on this branch.
