# Project

## Table of Contents

- [Goal](#goal)
- [Vision](#vision)
- [Audience](#audience)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Current Status](#current-status)

## Goal

Clash Tool is a web application for tracking Clash of Clans account progress and producing upgrade recommendations from account state plus imported game data.

## Vision

The repository is evolving toward a planner-centered tool. Static game data is stored as JSON, imported into Supabase, loaded through services and hooks, and passed into a framework-independent planner engine.

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
| Language | TypeScript |
| Scripts/tests | `tsx`, Node test runner |

## Features

Implemented features visible in the repository:

- Account creation, selection, and deletion.
- Building tracking per account.
- Hero tracking per account.
- Laboratory tracking for troops, spells, and siege machines.
- Dashboard summary cards and recommendation list.
- JSON game-data files.
- Game-data importer using upserts.
- SQL helper files for heroes and laboratory tables.
- Planner engine with simple priority scoring.

## Current Status

The project is under active feature development. The main page composes hooks, dashboard components, account components, building manager, hero manager, laboratory manager, and planner output.
