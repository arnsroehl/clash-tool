# Roadmap

## Table of Contents

- [Status Legend](#status-legend)
- [Done](#done)
- [In Progress](#in-progress)
- [Planned](#planned)
- [Repository Notes](#repository-notes)

## Status Legend

| Status | Meaning |
| --- | --- |
| DONE | Present in the repository or represented by current project setup |
| IN PROGRESS | Started or represented by partial architecture, but not complete |
| PLANNED | Not implemented yet |

## Done

| Area | Evidence |
| --- | --- |
| Foundation | Next.js app, Supabase setup, shared `src/` structure |
| Dashboard | `src/components/dashboard/`, dashboard composition in `src/app/page.tsx` |
| Heroes | `src/data/heroes.json`, hero SQL helper, service, hook, components |
| Laboratory | troops, spells, siege machines data/services/hooks/components |
| Planner V1 | `src/features/planner/` with engine, rules, service, utils, tests |
| CI/CD | GitHub Actions workflow runs install, lint, tests, and build |
| GitHub | Repository workflow uses scoped branches and GitHub Actions |
| Vercel | App is a standard Next.js project compatible with Vercel deployment; no custom Vercel config is present |

## In Progress

| Area | Current state |
| --- | --- |
| Planner V2 | Planner already supports multiple item types and simple priority; richer planning remains in progress |
| Decision Engine | `src/features/decision-engine/` exists as orchestration foundation with Planner integration and placeholders |
| Upgrade Queue | Queue-related types exist in planner; dedicated queue feature module is not present on this branch |
| Builder Simulation | Builder availability exists in planner types; dedicated simulation feature module is not present on this branch |
| Progress Forecast | Dashboard shows current planner progress; dedicated forecast module is not present on this branch |

## Planned

| Area | Current state |
| --- | --- |
| Complete Game Data | Current JSON files are small sample datasets |
| Screenshot Import | No screenshot import module is present |
| Pets | No pets data, services, hooks, or components are present |
| Hero Equipment | No equipment data, services, hooks, or components are present |
| Walls | No walls data, services, hooks, or components are present |
| AI Assistant | No AI assistant workflow is present |

## Repository Notes

The roadmap reflects repository state on this branch. Planned systems are not documented as implemented until matching files exist.
