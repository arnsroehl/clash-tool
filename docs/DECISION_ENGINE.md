# Explainable Decision Engine

The Decision Engine is the deterministic ranking layer above the Planner. The
Planner generates every currently valid next-level candidate; the Decision
Engine evaluates those candidates against the account's actual planning state.

## Inputs

- current levels, maximum levels, costs, times and Town Hall constraints
- selected strategy and custom weights
- active goals and target dates
- current and locked queue entries
- simulated builder/laboratory assignments
- resources, capacities and daily income
- active and future events
- persisted per-account preference (`prefer`, `strongly_prefer`, `avoid`, or
  `exclude`)

## Scoring contract

Ruleset `decision-v2.0.0` emits these separately testable components:

```text
base + strategy + goal + timeBenefit + costBenefit + builderImpact
+ resourceImpact + dependency + progressGap + event + userPriority
- conflicts
```

The final score is clamped to 0–100. Ties are resolved by catalog sort order and
stable upgrade ID, so identical inputs always produce identical output. Manual
exclusion and an already queued exact upgrade make a candidate ineligible while
preserving its assessment for diagnostics. Locked queue entries are never
changed or bypassed.

## Explainability

Every factor is a structured Reason Code with polarity, score impact and
optional numeric evidence. German and English text is generated exclusively
from that structure; no language model invents explanations. Each visible
recommendation includes:

- rank and total score
- the three strongest positive factors
- calculated downsides
- cost and duration
- expected slot, start and finish
- goal and strategy relationship
- up to three alternatives with the decisive score difference
- direct queue and preference actions

## Boundaries and persistence

All scoring lives in `src/features/decision-engine` and has no React, Next.js or
Supabase imports. The page passes plain data from existing modules. Only manual
preferences are persisted in `account_upgrade_preferences`; its RLS policy
derives ownership through `accounts.user_id`.

## Verification

`decision-engine.test.ts` proves candidate coverage, max-level exclusion, exact
score components, reproducibility, strategy/goal re-ranking, resource and event
effects, schedule use, user exclusions, locked queue handling, alternatives and
bilingual Reason Code rendering.
