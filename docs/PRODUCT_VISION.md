# Product Vision

## Table of Contents

- [Vision](#vision)
- [Problem](#problem)
- [Audience](#audience)
- [Current Product](#current-product)
- [Direction](#direction)
- [Non-Goals](#non-goals)

## Vision

Clash Tool is evolving into a planner-centered progress tool for Clash of Clans accounts. It combines account state, static game data, and deterministic planning logic to help users understand what can be upgraded next.

## Problem

Clash of Clans progression spans many domains: buildings, heroes, troops, spells, siege machines, and future systems such as pets, equipment, and walls. Tracking this manually becomes difficult as accounts grow.

## Audience

The current application is built for users who manage one or more Clash of Clans accounts and want to track:

- account metadata
- building levels
- hero levels
- troop levels
- spell levels
- siege machine levels
- upgrade recommendations

## Current Product

The repository currently contains:

- account management
- building tracking
- hero tracking
- laboratory tracking for troops, spells, and siege machines
- dashboard summaries
- JSON-based sample game data
- a Supabase import pipeline
- a framework-independent Planner V1
- CI checks for lint, tests, and build

## Direction

The established direction is to keep business logic independent from React and Supabase, then compose it into the dashboard. Planned planner work includes upgrade queues, builder simulation, and progress forecasting.

## Non-Goals

The current repository does not contain:

- screenshot import
- AI assistant workflows
- complete Clash of Clans game data
- pets, hero equipment, or walls modules
- a dedicated upgrade queue feature module
- a dedicated builder simulation feature module
- a dedicated progress forecast feature module
