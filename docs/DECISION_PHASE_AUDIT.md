# Abschlussaudit: Entscheidungs- und Fortschrittsphase

| Abschnitt der Planung | Umsetzung | Fachliche Version / Nachweis |
|---|---|---|
| 1. Entscheidungs-Engine | vollständige Kandidatenbewertung, gewichtete Teilwerte, Ausschlüsse, Alternativen, Nutzerpriorität | `decision-v2.0.0`, `decision-engine.test.ts` |
| 2. Erklärbare Empfehlungen | Kurz-, Detail- und Vergleichserklärungen mit Reason Codes in DE/EN | `decision-v2.0.0` |
| 3. Account Health | Teilbereiche, Rush-Risiko, Effizienz, Strategiepassung, tägliche Historie | `health-v1.0.0`, `account-health.test.ts` |
| 4. Was-wäre-wenn | isolierter Ausgangszustand, Annahmen, Queue, Prognose, Vergleich, explizite Übernahme | `scenario-v2`, `planning-scenario.engine.test.ts` |
| 5. Planner Intelligence | acht Hinweisarten, Priorisierung, Dismiss/Snooze/Kategorien, direkte Aktionen | `planner-intelligence-v1.0.0`, `planner-intelligence.test.ts` |
| 6. Timeline | gemeinsames Eventformat, Liste/Kalender, Zeit- und Spurfilter, lokale Zeitzone, Interaktionen | `timeline.engine.test.ts` |
| 7. Historie | unveränderliche Tages-/Ereignissnapshots, Auslöser, Lücken, Zeitraumfilter und Export | `history-v1`, `progress-history.engine.test.ts` |
| 8. Statistiken | Zeit, Ressourcen, Fortschritt, Plan-Ist-Fehler, Magic Items/Events getrennt | `history-v1` |
| 9. Tiefenanalyse | messbare Stärken/Schwächen, neutrale fehlende Daten, Strategie-Reaktion, direkte Aktionen | `account-analysis-v1.0.0`, `account-analysis.engine.test.ts` |
| 10. Rathausmodell | fünf Ergebnisarten, gewichtete Faktoren, Confidence, Pro/Contra, drei Szenarien | `town-hall-v1.0.0`, `town-hall-decision.engine.test.ts` |

## Technische Querschnittsprüfung

- Fachlogik liegt in reproduzierbaren, UI-unabhängigen `src/features/*`-Modulen und wird durch Node-Tests ausgeführt; Datenmutationen liegen in Services beziehungsweise geprüften Supabase-Funktionen.
- Manuelle Prioritäten und gesperrte Queue-Einträge haben Vorrang.
- Historische Datensätze sind versioniert und für authentifizierte Nutzer nicht änder- oder löschbar.
- Szenariovergleiche verändern keine produktiven Daten; Übernahme erfolgt nur explizit über eine `SECURITY INVOKER`-Transaktion.
- RLS schützt Szenarien, Health- und Fortschrittshistorie accountbezogen; `anon` besitzt keine Leserechte auf der Fortschrittshistorie.
- Schätzungen sind in Szenario, Timeline, Statistik und Rathausvergleich sichtbar gekennzeichnet.
- Die Clash API bleibt optional und ist für diese Funktionen nicht erforderlich.
