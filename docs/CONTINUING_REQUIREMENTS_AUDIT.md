# Continuing feature-list audit

Last reviewed: 2026-07-14

This document maps sections 10–18 of `Plannung Clash tool Weiterführend.rtf` to executable functionality. “Activation required” means the code and schema are present, but a credential owned by the app owner must still be configured outside the repository.

## 10. Goals and milestones — implemented

- Any building instance, hero, troop, spell or siege machine can receive a target level and date.
- Programs cover laboratory completion, CWL heroes, every individual wall, all defenses and next-Town-Hall readiness.
- Calculations use the actual remaining level path. Group dates account for parallel builders and the independent laboratory.
- Individual entity paths remain sequential in milestone schedules; CWL includes heroes plus laboratory offense, while the wall milestone measures exactly one next level per segment.
- Saved goals show live progress, complete automatically and trigger delay warnings from remaining—not original—work.
- “Optimize” prioritizes every currently missing next step, preserves locked queue positions and avoids duplicates.

## 11. Notifications and daily companion — implemented

- Builder/laboratory completion, immediately startable upgrades, recommendation, goal delay, empty-queue adjustment and event-change notifications are derived from the live plan.
- Storage warnings forecast the 90% threshold from current resources, capacity and daily income.
- Immediate start notices consume the available resource budget once, and scheduled event payouts create a dated notice when they make the next recommendation affordable.
- Daily summary is limited to the next three upgrades; the UI also shows today, the next seven days and a weekly outlook.
- Browser Push subscriptions, automatic preference-driven schedule synchronization, a test route and a token-protected daily Cron delivery route are implemented. Production receipt verification requires an HTTPS deployment.

## 12. Import and synchronization — implemented; official API activation required

- Official player-tag preview, manual quick lists and local screenshot OCR feed one confirmation preview.
- Stable English `api_name` values map official API results to localized German catalog names without changing display labels.
- Buildings are imported by exact instance (`Kanone 1`, `Kanone 2`, …); heroes, troops, spells and siege machines share the same confirmation flow.
- A saved tag is checked again after 24 hours when the import center opens. Data is never applied without confirmation.
- The official API route is authenticated and rate-limited. Live use requires `CLASH_OF_CLANS_API_TOKEN`.

## 13. Magic items — implemented

- Books, hammers, builder/research potions, Wall Rings and runes are stored in Supabase inventory.
- Best use and up to three alternatives compare time and/or resource savings against the actual queue.
- Reservations only offer applicable upgrades; Wall Rings only offer walls and runes use the missing storage amount.
- Active Gold Pass/event settings feed queue affordability; current and future event windows are evaluated separately for every simulated upgrade.

## 14. Seasons and events — implemented

- Supabase holds versioned presets for Gold Pass, Hoggy Bank (formerly Season Bank), Hammer Jam, Clan Games, CWL, custom discounts and boosts.
- Presets expose data version, maintenance note and official source where available, while dates and player-dependent rewards remain editable.
- Active time, cost and resource effects change recommendations, notifications and assistant answers. Current and future cost/time windows are evaluated at each simulated upgrade start, with plan-wide resource savings shown separately.
- Season Bank, Clan Games and CWL resource payouts become available at their configured payout time and appear separately in the selected planning horizon.

## 15. Data-grounded assistant — implemented

- Answers are generated only from the current planner, ranked recommendations, queue/simulation, resources, inventory, events and profile.
- Questions cover next upgrade, Town Hall timing, heroes vs. defenses, plan delay, exactly two weeks of savings, matching strategy and biggest gap.
- The two-week answer totals applicable magic-item time and active event savings and reports the remaining shortfall instead of inventing data.

## 16. User profiles and complexity — implemented

- Casual, ambitious and hardcore profiles are persisted per user.
- Hardcore opens advanced scenario, event and comparison controls; casual hides low-priority detail.
- Custom weights, eight strategies, synchronized scenario save/load and side-by-side scenario comparison are available.
- Language, reminders and daily-summary preferences synchronize across devices.

## 17. Clan dashboard — implemented; official API activation required

- Clan import/manual creation, members, donations, activity heuristic, CWL readiness, shared goals and clan progress are available.
- Owned accounts with matching player tags synchronize their progress into the shared member view.
- A later official clan sync preserves linked account IDs and progress, upserts current members and removes only players who actually left.
- Leader/co-leader/member collaboration, single-use invite codes and row-level permissions are enforced in Supabase.
- Rushed and inactive notices are heuristic and explicitly labeled, since the official API does not provide a reliable online/rushed flag.

## 18. Platforms, sharing and localization — implemented; external delivery checks remain

- Responsive web UI, dark design, automatically registered service worker, installable manifest and dedicated 192/512/Apple icons support desktop, iOS and Android as a PWA.
- Supabase stores account and planning state for device synchronization.
- German and English cover authentication, data entry and planning features.
- Full JSON export includes entity levels, resources, queue, goals, events, profile, scenarios and clan data; system share and authenticated Discord webhook delivery are available.
- A signature-verified, replay-protected Discord interactions route implements `/clash-help` and `/clash-plan`; the repository includes command registration. A Discord application public key and bot token are required for activation.

## Verification evidence

- ESLint: pass, zero warnings.
- Node/TypeScript tests: 71 pass, 0 fail.
- Next.js production build: pass, including all API routes and manifest.
- Supabase migrations applied: planning scenarios, building-instance planner IDs, own clan progress synchronization, versioned event presets and official API-name aliases.
- Browser smoke test: local page returns 200 and renders the authentication UI without a visible Next.js error overlay.
