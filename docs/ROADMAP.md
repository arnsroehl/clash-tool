# Roadmap and implementation status

Last reviewed: 2026-07-13

## Available now

| Area                              | Implementation                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete village data             | Buildings with per-instance levels and merge rules, heroes and guardians, troops, spells, siege machines, TH17 Eagle Artillery merge and TH18 content                                                         |
| Upgrade planning                  | Ranked recommendations, manual additions, priorities starting at 1, reorder/lock/status controls, resource totals and unlimited recommendation paging                                                         |
| Builder and laboratory simulation | Parallel builder slots, independent laboratory slot, event time discounts, idle time and completion forecast                                                                                                  |
| Strategies and resources          | Balanced, offense, war/CWL, farming, fastest, rush recovery, Town Hall push and custom weighting; synchronized scenarios with side-by-side comparison, affordability and farming-time estimates               |
| Goals and milestones              | Target levels and dates, laboratory/offense/defense/walls/next-TH programs, actual per-level paths, parallel builder/laboratory dates, live progress, automatic completion and infeasibility warnings         |
| Daily companion and notifications | Daily/weekly outlook, next upgrades, builder/lab/queue/goal/event notifications, browser push subscriptions and daily Vercel Cron delivery                                                                    |
| Imports                           | Official player-tag API preview, manual level lists, local screenshot OCR, confirmation preview, 24-hour sync check and combined account updates                                                              |
| Magic items                       | Books, hammers, potions, wall rings and runes with inventory, reservations, best-use recommendation and estimated time saved                                                                                  |
| Seasons and events                | Versioned Supabase presets for Gold Pass, Hoggy Bank/Season Bank, Hammer Jam, Clan Games, CWL, event discounts and builder boosts; official-source notes, editable dates/rewards and active cost/time effects |
| Personal assistant                | Data-grounded answers for next upgrade, Town Hall timing, heroes vs. defense, delays, time saving, strategy and biggest gap                                                                                   |
| User profiles                     | Casual, ambitious and hardcore display behavior; persisted reminders, daily summary and German/English language preference                                                                                    |
| Clan center                       | Official/manual clan import, member roles/activity/donations/CWL readiness, clan goals, invite codes and shared leader/co-leader/member access protected by RLS                                               |
| Platforms and sharing             | Responsive web app, installable PWA for iOS/Android/desktop, service worker, JSON export, system share menu, Discord webhook delivery and a signed slash-command endpoint with registration script            |
| Localization                      | German and English across authentication, planning, queue, simulation, data entry, imports, goals, clan, events and sharing                                                                                   |

## Production configuration

The Supabase schema, seed data, RLS policies, shared-clan functions, push subscriptions and Cron delivery functions are applied to project `vmzilrvzzbsymzsufdam`.

Vercel has the Supabase public variables and production/preview Web Push variables. Production also has `CRON_SECRET`. A production deployment is created by pushing the current branch through the connected GitHub repository.

The official Clash of Clans import additionally requires `CLASH_OF_CLANS_API_TOKEN` in Vercel. This credential must come from the app owner's Clash of Clans developer account and is intentionally not stored in the repository.

Discord slash commands additionally require a Discord application. Set `DISCORD_PUBLIC_KEY` on Vercel, point its interaction URL to `/api/integrations/discord/interactions`, then set `DISCORD_APPLICATION_ID` and `DISCORD_BOT_TOKEN` locally and run `npm run register-discord-commands`. `DISCORD_GUILD_ID` can be used for immediate test-server registration.

## Verification

- ESLint passes.
- 51 domain and service tests pass.
- The Next.js production build passes, including all API routes and the PWA manifest.
- `npm audit --omit=dev` reports zero known vulnerabilities.
- Browser smoke test passes: HTTP 200, meaningful authentication UI and no visible framework error overlay; DE/EN switching and `html[lang]` updates were also verified.
- Supabase advisors show only unused-index information on the fresh/low-traffic project. Remaining security notices are intentional for token-protected Cron RPCs and authenticated invite/progress RPCs.

## Deployment-only verification still required

- Register a browser subscription on the deployed HTTPS site and confirm receipt of one test push and one scheduled push.
- Add `CLASH_OF_CLANS_API_TOKEN`, then confirm one official player import and one official clan sync against the deployed app.
- Add the Discord application public key, register the interaction URL and commands, then verify `/clash-help` and `/clash-plan` in a Discord test server.

The requirement-by-requirement evidence is maintained in `docs/CONTINUING_REQUIREMENTS_AUDIT.md`.
