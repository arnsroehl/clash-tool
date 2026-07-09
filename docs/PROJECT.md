# Project

## Table of Contents

- [Goal](#goal)
- [Vision](#vision)
- [Audience](#audience)
- [Tech Stack](#tech-stack)
- [Implemented Features](#implemented-features)
- [Current Status](#current-status)

## Goal

Clash Tool is a web application for tracking Clash of Clans account progress and producing upgrade recommendations from account state plus imported game data.

## Vision

The project is evolving toward a planner-centered tool. Static sample game data is stored as JSON, imported into Supabase, loaded through services and hooks, and passed into a framework-independent planner engine.

## Audience

The current application serves users who manage one or more Clash of Clans accounts and want to track:

- account metadata
- building levels
- hero levels
- troop levels
- spell levels
- siege machine levels
- upgrade recommendations

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Runtime database | Supabase |
| Language | TypeScript strict |
| Scripts/tests | `tsx`, Node test runner |
| CI | GitHub Actions |

## Implemented Features

Implemented features visible in the repository:

- Account creation, selection, and deletion.
- Building tracking per account.
- Hero tracking per account.
- Laboratory tracking for troops, spells, and siege machines.
- Dashboard summary cards, progress overview, resources summary, and recommendation list.
- JSON sample game-data files.
- Game-data importer using validation and upserts.
- SQL helper files for heroes and laboratory tables.
- Planner V1 with simple priority scoring and tests.
- Decision Engine foundation that calls the Planner and returns recommendation orchestration placeholders.
- CI workflow for lint, tests, and build.

## Current Status

The project is under active feature development. The main page composes hooks, dashboard components, account components, building manager, hero manager, laboratory manager, and planner output.

Planner V2, upgrade queue, builder simulation, and progress forecast are in progress or planned depending on the branch. The Decision Engine foundation is present on this branch; dedicated feature modules for queue, builder simulation, and progress forecast are not present on this branch.
