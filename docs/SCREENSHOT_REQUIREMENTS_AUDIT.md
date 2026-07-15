# Screenshot import requirements audit

This audit maps the 24 chapters of `Plannung Clash tool Screenshot.rtf` to the
shipped implementation. It is intended as a release gate: a chapter is marked
complete only when the product has a user-facing path, validation rules, and a
persisted or deliberately ephemeral result.

## Result

All product requirements and all eleven first-version acceptance criteria are
implemented. The official Clash API remains an optional enrichment path because
the application is intentionally configured to work without it. Recognition
model training is an ongoing release operation, not a missing user flow: the
repository contains the consent, annotation, split validation, versioning and
rollout controls required to train and release later models without changing the
import contract.

## Chapter evidence

| Chapter | Status | Implementation evidence |
| --- | --- | --- |
| 1. Goal | Complete | `ScreenshotImportWizard` always produces a review before `confirmScreenshotImport`; confirmed changes are applied through the existing player-import path. |
| 2. Guided principle | Complete | Select, instructions, upload, quality check, classification, recognition, database plausibility, review, correction and confirmation are explicit wizard stages. |
| 3.1 Buildings | Complete | Separate catalog instances, building sections, current/max-level validation, locked/not-built level zero, duplicate-instance matching and active upgrade slots are supported. |
| 3.2 Heroes | Complete | Heroes are loaded from `screenshot_catalog_entities`, not hard-coded in the wizard; levels, max levels, locked state and active upgrades are handled. |
| 3.3 Laboratory | Complete | Troops, spells and siege machines support icon fingerprints, German/English OCR, the calibrated grid, max/locked states and research slots. |
| 3.4 Pets | Complete | Pet catalog entities, levels, locked state, Pet House slots and remaining duration are supported. |
| 3.5 Equipment | Complete | Equipment category, level, locked state and Shiny/Glowy/Starry Ore upgrade costs are recognized and checked against catalog level data. |
| 3.6 Walls | Complete | Wall distributions are parsed as level/count pairs, compared with the saved distribution and total wall count, and remain manually editable. |
| 3.7 Builders/upgrades | Complete | Builder availability plus builder, laboratory, Pet House and blacksmith slots include object, target level, remaining seconds and calculated completion time; confirmed slots feed planner state. |
| 3.8 Resources | Complete | Gold, Elixir, Dark Elixir and ores support amount/capacity validation; Magic Items have catalog-backed aliases and editable quantity validation. Low-confidence values cannot be confirmed. |
| 4. Screenshot types | Complete | Village, buildings, laboratory, heroes, pets, equipment, builders, profile, walls and resources are classified separately. Village recognition is explicitly experimental and never treats a visual level estimate as confirmed. |
| 5. Guided capture | Complete | Import-area selection, view-specific capture instructions, full-account coverage, quality errors, manual type selection and progress are present. Mobile upload uses a normal multi-image picker without the forced `capture` attribute, so the photo library remains available. |
| 6. Recognition | Complete | Images are orientation-corrected, resized, metadata-minimized and normalized; OCR is contrast-normalized/denoised/sharpened; relative bounding boxes, grid regions, icon hashes, bilingual OCR, database validation and review crops are used. |
| 7. Confidence | Complete | Confidence combines object, OCR, layout, catalog plausibility, previous state and cross-screenshot agreement. Bands implement very-safe, safe, uncertain and unusable handling. |
| 8. Change detection | Complete | Level changes, unchanged values, conflicts, locked/new entities and upgrade-slot changes (started, completed, changed, remaining-time changed) are distinguished. |
| 9. Review | Complete | Summary counters, entity groups, screenshot crop, previous/proposed value, confidence, reasons, alternatives, accept/reject-by-selection, correction, defer, safe bulk selection, filters, discard and save-for-later are implemented. |
| 10. Conflicts | Complete | Level decreases require manual confirmation; impossible levels are rejected; duplicate disagreements are conflicts; profile tag mismatch blocks confirmation; replay/foreign-base markers are rejected. |
| 11. Multiple screenshots | Complete | Files share an import session, exact duplicates are ignored, overlapping detections are merged by stable instance ID, confidence decides compatible duplicates, conflicts remain visible, missing full-import areas/entities are shown, and upload order is irrelevant. |
| 12. Languages | Complete | German and English OCR run with automatic language detection; stable IDs and icon matches are primary, aliases are catalog data, and UI translation stays separate. |
| 13. Official API | Complete (optional) | The player API route and profile validation are available, while screenshot-only operation remains supported. API-derived data is not required for screenshot-only account maintenance, matching the explicit project decision to keep the API disabled for now. |
| 14. Privacy | Complete | Private Storage/RLS, confirmation-time deletion by default, immediate manual deletion, 30-day retained-original and 7-day unfinished-session cleanup, consent-off feedback, metadata removal, ownership checks and lifecycle audit events are implemented. |
| 15. Quality improvement | Complete | Consented corrections store recognition/correction, model/game/layout version, language, device, confidence and crop coordinates. Private metrics cover object/level accuracy, corrections, auto-confirmation, abandonment, duration and breakdowns. |
| 16. Architecture | Complete | The client performs privacy-preserving normalization/OCR; authenticated API routes and Supabase persist sessions/jobs/results; idempotent asynchronous job stages cover preprocessing through review. The contract permits replacing the client recognizer with a dedicated model service later. |
| 17. Data model | Complete | Sessions, files, detections, proposed changes, events, feedback, progress catalog, wall distributions, upgrade slots, resource snapshots and analysis jobs are represented in SQL with RLS. |
| 18. API endpoints | Complete | Create/list session, upload screenshot, start analysis, read session/results, patch change, confirm and delete routes exist under `/api/import-sessions`. |
| 19. Model training | Complete as release infrastructure | `training/screenshot-dataset.manifest.json`, annotation kinds, consent requirement, device/language/theme/crop variants and leakage-safe account/capture-series train/validation/test checks are CI-validated. Real consented samples and measured accuracy remain release inputs, not application code. |
| 20. Game updates | Complete | Game/model/layout versions are stored; supported types and UI version are feature-flagged; an unknown/changed UI blocks mass import; per-type rollout can be disabled independently. |
| 21. Phases 1-6 | Complete | Labor; heroes/pets/equipment; builders; structured buildings; walls; and guarded free-village detection all have selectable flows. Free-village icon proposals require visual support and manual confirmation; visible timers/status text feeds upgrade-slot recognition without claiming a still image can reliably identify every animation frame. |
| 22. Acceptance criteria | Complete | See the executable verification below and the automated screenshot-import/retention tests. |
| 23. Prohibited behavior | Complete | No blind overwrite, no automatic visual level estimate, no silent correction reset, no automatic decrease/foreign-account/stale import, no indefinite originals, no false certainty, and no single OCR number is written directly. |
| 24. Hybrid decision | Complete | The implementation combines optional official API data, guided screenshots, OCR, icon matching, game catalog validation and explicit user confirmation. |

## First-version acceptance gate

| Criterion | Verification |
| --- | --- |
| Guided capture | Wizard copy and per-type/full-import steps are rendered from the selected import type. |
| Wrong screenshot types | Classification mismatch/unknown handling requires correction; content checks reject foreign/replay views. |
| Blurry images | `assessImageQuality` blocks low blur score before analysis. |
| Supported objects | Catalog entities, aliases and visual signatures are inputs to the recognizer; no wizard entity list is hard-coded. |
| Plausible levels | Catalog and Town Hall max-level rules run before a proposal can be safe. |
| No overwrite without preview | Only accepted review decisions are transformed into confirmed player changes. |
| Uncertainty visible | Confidence band, percentage, reason and alternatives are displayed per change. |
| Easy correction | Every detected level, wall count, resource, Magic Item and profile field has a bounded correction control. |
| Correct persistence | Confirmation is idempotent and persists account progress plus specialist snapshots/slots. |
| Defined deletion | Confirmation deletes originals by default; scheduled retention enforces final deadlines. |
| Audit trail | Application events plus database triggers record creation, upload, status changes and original deletion. |

## Verification commands

Run before release:

```bash
npm test
npm run lint
npm run build
npm run validate-screenshot-dataset
```

Last verified on 2026-07-15:

- 143/143 automated tests passed.
- ESLint passed without findings.
- The Next.js production build and all import routes compiled successfully.
- Dataset structure validation passed; the repository manifest intentionally
  contains zero personal samples until consented training material is added.
- The local application loaded without browser warnings or console errors.
- The mobile image input accepts JPEG, PNG and WebP files, supports multiple
  selection and has no forced camera `capture` attribute.

The two `.traineddata` files used during local OCR troubleshooting are local
artifacts and must not be committed; Tesseract language assets are loaded by the
runtime dependency.
