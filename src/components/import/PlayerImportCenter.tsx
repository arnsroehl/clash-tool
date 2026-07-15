"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScreenshotImportWizard } from "@/components/import/ScreenshotImportWizard";
import {
  getCurrentScreenshotMaxLevel,
  getMagicItemScreenshotAliases,
  getScreenshotAliases,
  parseScreenshotLevels,
  type ScreenshotEntity,
  type ScreenshotResourceDetection,
  type ScreenshotMagicItemDetection,
  type ScreenshotProfileDetection,
} from "@/features/screenshot-import/screenshot-import";
import {
  applyPlayerImport,
  fetchOfficialPlayer,
  type ImportChange,
  type PlayerImportPreview,
} from "@/services/playerImportService";
import type { ClashAccount } from "@/types/account";
import type { Building, BuildingInstanceLevelMap } from "@/types/building";
import type { Hero } from "@/types/hero";
import type { SiegeMachine, Spell, Troop } from "@/types/laboratory";
import type { ScreenshotUpgradeSlot, ScreenshotWallLevel } from "@/types/screenshotProgress";
import type { MagicInventoryItem } from "@/types/magicItems";

type Props = {
  officialApiEnabled?: boolean;
  account: ClashAccount | null;
  buildings: Building[];
  buildingInstanceLevels: BuildingInstanceLevelMap;
  heroes: Hero[];
  heroLevels: Record<string, number>;
  troops: Troop[];
  troopLevels: Record<string, number>;
  spells: Spell[];
  spellLevels: Record<string, number>;
  siegeMachines: SiegeMachine[];
  siegeLevels: Record<string, number>;
  extraScreenshotEntities?: ScreenshotEntity[];
  magicItems?: MagicInventoryItem[];
  language?: "de" | "en";
  onResourcesImported?: (resources: ScreenshotResourceDetection[]) => void;
  onMagicItemsImported?: (items: ScreenshotMagicItemDetection[]) => Promise<void>;
  onProfileImported?: (profile: ScreenshotProfileDetection) => Promise<void>;
  onUpgradeSlotsImported?: () => Promise<void> | void;
  upgradeSlots?: ScreenshotUpgradeSlot[];
  onProgressImported?: () => Promise<void> | void;
  wallLevels?: ScreenshotWallLevel[];
  onWallLevelsImported?: () => Promise<void> | void;
};
const normalize = (name: string) =>
  name
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const screenshotAliases = (...values: Array<string | null | undefined>) => [
  ...values.filter((value): value is string => Boolean(value)),
  ...values.flatMap((value) => getScreenshotAliases(value)),
];

export function PlayerImportCenter(props: Props) {
  const en = props.language === "en";
  const officialApiEnabled = props.officialApiEnabled === true;
  const [tag, setTag] = useState(props.account?.playerTag || "");
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState<PlayerImportPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoCheckedAccount = useRef<string | null>(null);
  const entities = useMemo<ScreenshotEntity[]>(
    () => [
      ...props.buildings.flatMap((item) =>
        Array.from({ length: item.countAfterMerges || 1 }, (_, index) => ({
          id: `${item.id}:${index + 1}`,
          name: `${item.name} ${index + 1}`,
          aliases: item.sourceId ? [item.sourceId, `${item.sourceId}-${index + 1}`] : [],
          category: item.category,
          type: "building" as const,
          currentLevel: props.buildingInstanceLevels[item.id]?.[index] || 0,
          maxLevel: item.maxLevel,
          unlockTownHallLevel: item.unlockTownHallLevel,
        })),
      ),
      ...props.heroes.map((item) => ({
        id: item.id,
        name: item.name,
        aliases: [item.apiName, item.sourceId].filter((value): value is string => Boolean(value)),
        type: "hero" as const,
        currentLevel: props.heroLevels[item.id] || 0,
        maxLevel: item.maxLevel,
        unlockTownHallLevel: item.unlockTownHallLevel,
      })),
      ...props.troops.map((item) => ({
        id: item.id,
        name: item.name,
        aliases: screenshotAliases(item.apiName, item.sourceId),
        type: "troop" as const,
        currentLevel: props.troopLevels[item.id] || 0,
        maxLevel: getCurrentScreenshotMaxLevel(item.sourceId, item.maxLevel),
        unlockTownHallLevel: item.unlockTownHallLevel,
      })),
      ...props.spells.map((item) => ({
        id: item.id,
        name: item.name,
        aliases: screenshotAliases(item.apiName, item.sourceId),
        type: "spell" as const,
        currentLevel: props.spellLevels[item.id] || 0,
        maxLevel: getCurrentScreenshotMaxLevel(item.sourceId, item.maxLevel),
        unlockTownHallLevel: item.unlockTownHallLevel,
      })),
      ...props.siegeMachines.map((item) => ({
        id: item.id,
        name: item.name,
        aliases: screenshotAliases(item.apiName, item.sourceId),
        type: "siege_machine" as const,
        currentLevel: props.siegeLevels[item.id] || 0,
        maxLevel: getCurrentScreenshotMaxLevel(item.sourceId, item.maxLevel),
        unlockTownHallLevel: item.unlockTownHallLevel,
      })),
      ...(props.extraScreenshotEntities || []),
    ],
    [
      props.buildingInstanceLevels,
      props.buildings,
      props.extraScreenshotEntities,
      props.heroes,
      props.heroLevels,
      props.siegeLevels,
      props.siegeMachines,
      props.spellLevels,
      props.spells,
      props.troopLevels,
      props.troops,
    ],
  );
  const entityMap = useMemo(
    () =>
      new Map(
        entities.flatMap((entity) =>
          [entity.name, ...(entity.aliases || [])].map((name) => [
            normalize(name),
            entity,
          ]),
        ),
      ),
    [entities],
  );
  const wallBuilding = props.buildings.find((building) => building.sourceId === "wall");
  const changesFromItems = useCallback(
    (groups: { name: string; level: number }[][]): ImportChange[] =>
      groups.flat().flatMap((item) => {
        const match = entityMap.get(normalize(item.name));
        return match && match.currentLevel !== item.level
          ? [
              {
                type: match.type as ImportChange["type"],
                itemId: match.id,
                name: match.name,
                fromLevel: match.currentLevel,
                toLevel: item.level,
              },
            ]
          : [];
      }),
    [entityMap],
  );
  const previewOfficial = useCallback(
    async (playerTag: string) => {
      if (!props.account) return;
      const data = await fetchOfficialPlayer(playerTag);
      setTag(data.tag);
      setPreview({
        playerName: data.name,
        playerTag: data.tag,
        townHallFrom: props.account.townHallLevel,
        townHallTo: data.townHallLevel,
        changes: changesFromItems([data.heroes, data.troops, data.spells]),
        equipmentCount: data.heroEquipment.length,
      });
    },
    [changesFromItems, props.account],
  );

  useEffect(() => {
    if (!officialApiEnabled) return;
    const account = props.account;
    if (
      !account?.playerTag ||
      autoCheckedAccount.current === account.id ||
      entities.length === 0
    )
      return;
    const playerTag = account.playerTag;
    const lastSync = account.lastSyncedAt
      ? new Date(account.lastSyncedAt).getTime()
      : 0;
    if (Date.now() - lastSync < 86_400_000) return;
    autoCheckedAccount.current = account.id;
    void Promise.resolve()
      .then(() => {
        setBusy(true);
        return previewOfficial(playerTag);
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : en
              ? "Automatic sync failed."
              : "Automatischer Abgleich fehlgeschlagen.",
        ),
      )
      .finally(() => setBusy(false));
  }, [
    en,
    entities.length,
    officialApiEnabled,
    previewOfficial,
    props.account,
  ]);

  const loadOfficial = async () => {
    if (!props.account) return;
    setBusy(true);
    setMessage(null);
    try {
      await previewOfficial(tag);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? "Import failed."
            : "Import fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  };
  const parseText = (text: string) => {
    if (!props.account) return;
    const changes = parseScreenshotLevels(text, entities)
      .filter((match) => match.detectedLevel !== match.currentLevel)
      .map((match) => ({
        type: match.type as ImportChange["type"],
        itemId: match.id,
        name: match.name,
        fromLevel: match.currentLevel,
        toLevel: match.detectedLevel,
      }));
    setPreview({
      playerName: props.account.name,
      townHallFrom: props.account.townHallLevel,
      townHallTo: props.account.townHallLevel,
      changes,
    });
  };
  const applyScreenshotChanges = async (changes: ImportChange[]) => {
    if (!props.account) return;
    await applyPlayerImport(props.account, {
      playerName: props.account.name,
      townHallFrom: props.account.townHallLevel,
      townHallTo: props.account.townHallLevel,
      changes,
    });
    await props.onProgressImported?.();
  };
  const apply = async () => {
    if (!props.account || !preview) return;
    setBusy(true);
    try {
      await applyPlayerImport(props.account, preview);
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? "Changes could not be saved."
            : "Änderungen konnten nicht gespeichert werden.",
      );
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">
        {en ? "Import & Updates" : "Import & Aktualisierung"}
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        {officialApiEnabled
          ? en
            ? "API sync is prepared after 24 hours. The guided screenshot import validates every detected change before confirmation."
            : "API-Abgleiche werden nach 24 Stunden beim Öffnen vorbereitet. Der geführte Screenshot-Import prüft jede erkannte Änderung vor der Bestätigung."
          : en
            ? "Manual API mode is active. Screenshot imports work independently and save only confirmed changes."
            : "Der manuelle API-Modus ist aktiv. Screenshot-Importe funktionieren unabhängig und speichern nur bestätigte Änderungen."}
      </p>
      {!props.account ? (
        <p className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-400">
          {en ? "Select an account first." : "Wähle zuerst einen Account."}
        </p>
      ) : (
        <div
          className={`mt-5 grid gap-5 ${
            officialApiEnabled ? "lg:grid-cols-3" : "lg:grid-cols-2"
          }`}
        >
          {officialApiEnabled ? (
            <div className="rounded-2xl bg-slate-900 p-5">
              <h3 className="font-bold">
                {en ? "Player tag & API" : "Spieler-Tag & API"}
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="#PLAYERTAG"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"
                />
                <button
                  type="button"
                  disabled={busy || !tag}
                  onClick={() => void loadOfficial()}
                  className="rounded-xl bg-amber-400 px-4 font-bold text-slate-950 disabled:opacity-40"
                >
                  {en ? "Fetch" : "Abrufen"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {en ? "Last sync" : "Letzter Abgleich"}:{" "}
                {props.account.lastSyncedAt
                  ? new Date(props.account.lastSyncedAt).toLocaleString(
                      en ? "en-US" : "de-DE",
                    )
                  : en
                    ? "never"
                    : "noch nie"}
              </p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-slate-900 p-5">
            <h3 className="font-bold">
              {en ? "Level list / OCR text" : "Level-Liste / OCR-Text"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {en
                ? "One line per level, e.g. Cannon 2 = 20 or Barbarian King = 80"
                : "Eine Zeile pro Level, z. B. Kanone 2 = 20 oder Barbarenkönig = 80"}
            </p>
            <textarea
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
            />
            <button
              type="button"
              onClick={() => parseText(manual)}
              className="mt-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-200"
            >
              {en ? "Review changes" : "Änderungen prüfen"}
            </button>
          </div>
        </div>
      )}
      {props.account ? (
        <div className="mt-5">
          <ScreenshotImportWizard
            accountId={props.account.id}
            expectedPlayerTag={props.account.playerTag}
            entities={entities}
            townHallLevel={props.account.townHallLevel}
            language={en ? "en" : "de"}
            magicItems={(props.magicItems || []).map((item) => ({
              itemKey: item.itemKey,
              name: item.name,
              aliases: getMagicItemScreenshotAliases(item.itemKey),
              currentQuantity: item.quantity,
            }))}
            onConfirm={applyScreenshotChanges}
            onResourcesConfirmed={props.onResourcesImported}
            onMagicItemsConfirmed={props.onMagicItemsImported}
            onProfileConfirmed={props.onProfileImported}
            onUpgradeSlotsConfirmed={props.onUpgradeSlotsImported}
            existingUpgradeSlots={props.upgradeSlots}
            existingWallLevels={props.wallLevels || []}
            expectedWallCount={wallBuilding?.buildingCount || 0}
            maxWallLevel={wallBuilding?.maxLevel || 0}
            onWallLevelsConfirmed={props.onWallLevelsImported}
          />
        </div>
      ) : null}
      {message ? (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200"
        >
          {message}
        </p>
      ) : null}
      {preview ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <h3 className="font-bold">
            {en ? "Change preview for" : "Änderungsvorschau für"}{" "}
            {preview.playerName}
          </h3>
          {preview.townHallFrom !== preview.townHallTo ? (
            <p className="mt-2 text-sm">
              {en ? "Town Hall" : "Rathaus"} {preview.townHallFrom} →{" "}
              {preview.townHallTo}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {preview.changes.map((change) => (
              <div
                key={`${change.type}-${change.itemId}`}
                className="rounded-xl bg-slate-900 p-3 text-sm"
              >
                <b>{change.name}</b>: {change.fromLevel} → {change.toLevel}
              </div>
            ))}
          </div>
          {!preview.changes.length &&
          preview.townHallFrom === preview.townHallTo ? (
            <p className="mt-3 text-sm text-slate-400">
              {en
                ? "No different supported levels detected. Review the recognized OCR text."
                : "Keine abweichenden unterstützten Level erkannt. Prüfe bei OCR den erkannten Text."}
            </p>
          ) : null}
          {preview.equipmentCount ? (
            <p className="mt-3 text-xs text-slate-400">
              {preview.equipmentCount}{" "}
              {en
                ? "equipment records detected."
                : "Ausrüstungsdatensätze erkannt."}
            </p>
          ) : null}
          <button
            type="button"
            disabled={
              busy ||
              (!preview.changes.length &&
                preview.townHallFrom === preview.townHallTo)
            }
            onClick={() => void apply()}
            className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40"
          >
            {en
              ? "Confirm and save changes"
              : "Änderungen bestätigen und speichern"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
