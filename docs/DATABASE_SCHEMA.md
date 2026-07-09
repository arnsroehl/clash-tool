# Database Schema

## Zweck

Dieses Dokument beschreibt die Struktur der Datenbank von Clash Tool.

Die Datenbank basiert auf **Supabase (PostgreSQL)** und ist so aufgebaut, dass Spielinformationen vollständig von den Fortschrittsdaten eines Spielers getrennt sind.

Dadurch können Spielupdates unabhängig von den Benutzerdaten gepflegt werden und neue Funktionen wie Planner, Simulationen oder Screenshot-Importe einfach erweitert werden.

---

# Datenbankstruktur

Die Datenbank ist in drei Bereiche aufgeteilt:

```
Game Data
├── buildings
├── building_levels
├── troops
├── troop_levels
├── spells
├── spell_levels
├── heroes
├── hero_levels
├── siege_machines
└── siege_machine_levels

Player Data
├── accounts
├── account_buildings
├── account_troops
├── account_spells
├── account_heroes
└── account_siege_machines

Planning
├── upgrade_queue
├── planner_items
└── simulation_runs
```

---

# 1. Game Data

Diese Tabellen enthalten ausschließlich die offiziellen Clash-of-Clans-Daten.

Diese Daten sind für alle Spieler identisch.

## buildings

Speichert alle Gebäude.

Beispiele:

- Rathaus
- Kanone
- Infernoturm
- Clanburg

### Wichtige Felder

- id
- name
- category
- unlock_town_hall_level
- max_level
- sort_order

---

## building_levels

Speichert sämtliche Levelinformationen eines Gebäudes.

### Enthält

- Upgradezeit
- Goldkosten
- Elixierkosten
- Dunklelixierkosten
- Trefferpunkte
- benötigtes Rathauslevel

---

## troops

Grunddaten aller Truppen.

---

## troop_levels

Alle Werte pro Truppenlevel.

---

## spells

Grunddaten aller Zauber.

---

## spell_levels

Alle Leveldaten der Zauber.

---

## heroes

Grunddaten aller Helden.

---

## hero_levels

Alle Leveldaten der Helden.

---

## siege_machines

Grunddaten aller Belagerungsmaschinen.

---

## siege_machine_levels

Alle Leveldaten der Belagerungsmaschinen.

---

# 2. Player Data

Diese Tabellen speichern ausschließlich den Fortschritt eines einzelnen Spielers.

---

## accounts

Ein Clash-Account.

### Enthält

- id
- name
- town_hall_level
- builder_count
- created_at

---

## account_buildings

Aktueller Gebäudestand eines Accounts.

Speichert für jedes Gebäude:

- Gebäude
- aktuelles Level

---

## account_troops

Aktueller Forschungsstand aller Truppen.

---

## account_spells

Aktueller Forschungsstand aller Zauber.

---

## account_heroes

Aktueller Heldenstand.

---

## account_siege_machines

Aktueller Forschungsstand aller Belagerungsmaschinen.

---

# 3. Planning

Diese Tabellen bilden den Kern von Clash Tool.

---

## upgrade_queue

Speichert die komplette Upgrade-Warteschlange.

Ein Eintrag beschreibt genau ein geplantes Upgrade.

### Enthält

- account_id
- target_type
- target_id
- from_level
- to_level
- priority
- status
- planned_start_at
- planned_finish_at

---

## planner_items

Speichert Empfehlungen des intelligenten Planners.

Beispiele:

- zuerst Labor verbessern
- Held priorisieren
- Goldlager erhöhen

Zusätzlich kann jedem Vorschlag ein Score zugewiesen werden.

---

## simulation_runs

Speichert Simulationen.

Das Ergebnis wird als JSON gespeichert und kann später erneut geladen werden.

---

# Architektur

Das Datenmodell trennt bewusst zwischen:

```
Was existiert im Spiel?
```

und

```
Welchen Fortschritt besitzt der Spieler?
```

Dadurch muss ein neues Clash-Update lediglich die Game-Data aktualisieren.

Alle Spielerdaten bleiben unverändert.

---

# Upgrade-System

Planner und Queue verwenden zwei gemeinsame Felder:

```
target_type
target_id
```

Dadurch kann dieselbe Queue alle Upgradearten speichern.

Beispiele:

```
building
troop
spell
hero
siege_machine
```

Später zusätzlich:

```
pet
hero_equipment
```

---

# Zeitformat

Alle Upgradezeiten werden derzeit in

```
upgrade_time_hours
```

gespeichert.

Dieses Format wird in der gesamten Datenbank einheitlich verwendet.

---

# Ressourcen

Kosten werden getrennt gespeichert:

- gold_cost
- elixir_cost
- dark_elixir_cost

Nicht benötigte Ressourcen erhalten den Wert 0.

---

# Sicherheit

Neue Tabellen werden grundsätzlich mit Row Level Security (RLS) erstellt.

Aktuell aktiv:

- upgrade_queue
- planner_items
- simulation_runs

Die übrigen Tabellen erhalten vor dem Release ebenfalls vollständige RLS-Policies.

---

# Geplante Erweiterungen

## Pets

- pets
- pet_levels
- account_pets

---

## Hero Equipment

- hero_equipment
- hero_equipment_levels
- account_hero_equipment

---

## Builder

- builders

Speichert:

- freier Builder
- aktuelles Upgrade
- Endzeit

---

## Ressourcen

- account_resources

Speichert:

- Gold
- Elixier
- Dunkles Elixier
- Juwelen

---

## Upgrade History

- upgrade_history

Historie aller abgeschlossenen Upgrades.

---

## Builder Base

Geplante Unterstützung der Builder Base.

Eigene Tabellen:

- builder_buildings
- builder_building_levels
- account_builder_buildings

---

# Entwicklungsrichtlinien

Beim Erweitern der Datenbank gelten folgende Regeln:

- Spielinformationen niemals mit Accountdaten vermischen.
- Jede neue Spielkategorie erhält eine eigene Stammdatentabelle und eine Leveltabelle.
- Fortschritt wird ausschließlich in account_* Tabellen gespeichert.
- Planner und Simulation greifen ausschließlich lesend auf Spielinformationen zu.
- Alle neuen Tabellen werden dokumentiert und erhalten Foreign Keys sowie Row Level Security.

---

**Version:** 1.0

**Projekt:** Clash Tool
