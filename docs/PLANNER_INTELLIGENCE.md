# Planner Intelligence

Planner Intelligence is a deterministic rule engine for current planning risks and opportunities. It is separate from scheduled push notifications: notifications answer *when to notify*, while insights explain *what currently needs attention and why*.

## Rules

- `BUILDER_IDLE_RISK`: a builder becomes free within 72 hours without an affordable follow-up and with more than six projected idle hours
- `RESOURCE_SHORTFALL`: projected balance at a simulated start does not cover its effective cost
- `RESOURCE_OVERFLOW_RISK`: balance plus saved daily income reaches capacity within 72 hours
- `MAGIC_ITEM_BETTER_USE`: a reserved item has a materially better currently applicable use
- `UNFAVORABLE_FINISH_TIME`: local simulated completion is between 23:00 and 07:00 and a daytime alternative exists
- `GOAL_DEADLINE_RISK`: exact remaining goal time exceeds the target date
- `EVENT_SAVING_OPPORTUNITY`: a future enabled event creates a concrete cost or time saving
- `QUEUE_RESOURCE_CONFLICT`: multiple same-day starts require more of one resource than projected to be available

Every insight contains severity, urgency, financial impact, time impact, goal link, expiry, structured metadata, explanation, solution and an optional direct action. Stable keys merge duplicates and keep dismiss/snooze state across small recalculations. Rules that no longer match disappear automatically.

## User controls

Users can dismiss a concrete insight, snooze it for 24 hours, disable or re-enable a whole category, apply supported recommendations directly, open the relevant planning area and inspect the exact rule explanation.

State is stored in the RLS-protected `account_insight_settings` and `account_insight_actions` tables. Migration: `src/scripts/sql/planner-insight-preferences.sql`.

## Verification

`src/features/planner-intelligence/planner-intelligence.test.ts` covers all eight rule families, numerical impacts, stable keys, deduplication, priority order and critical solutions.
