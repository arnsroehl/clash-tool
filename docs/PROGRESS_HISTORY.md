# Fortschrittshistorie

`account_progress_snapshots` speichert unveränderliche Accountstände. Ein Tagessnapshot wird höchstens einmal pro Berliner Kalendertag angelegt; Screenshot-Import, API-Abgleich, Rathauswechsel, Zielabschluss und manuelle Vollaktualisierung sind eigene Quellen.

Die Oberfläche bietet 7/30/90/365 Tage, aktuelles Rathaus und Gesamtzeitraum. Fehlende Tage bleiben als Datenlücken sichtbar. CSV- und JSON-Export enthalten ausschließlich die ausgewählten Snapshots.

Statistiken verwenden Differenzen kumulativer Zähler zwischen erstem und letztem Snapshot. Dadurch werden Upgrades und Ressourcen nicht doppelt gezählt. Prognosewerte sind in der UI ausdrücklich als Schätzung markiert. Das Schema ist mit `history-v1` versioniert; spätere Berechnungsregeln verändern bestehende Zeilen nicht.

Migration: `src/scripts/sql/account-progress-history.sql`.
