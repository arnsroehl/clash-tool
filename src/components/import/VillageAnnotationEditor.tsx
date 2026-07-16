"use client";

import Image from "next/image";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ScreenshotEntity,
} from "@/features/screenshot-import/screenshot-import";
import {
  buildVillageTrainingDataset,
  normalizeDrawnBoundingBox,
  type VillageScreenshotAnnotation,
} from "@/features/screenshot-import/village-annotations";
import {
  fetchVillageScreenshotAnnotations,
  replaceVillageScreenshotAnnotations,
  sha256Hex,
} from "@/services/screenshotAnnotationService";
import { SCREENSHOT_IMPORT_CONFIG } from "@/config/screenshotImport";

type Props = {
  accountId: string;
  sessionId: string;
  screenshot: {
    id: string;
    name: string;
    previewUrl: string;
    width: number;
    height: number;
    deviceType: string;
  };
  entities: ScreenshotEntity[];
  townHallLevel: number;
  language: "de" | "en";
  improvementConsent: boolean;
};

type Point = { x: number; y: number };

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VillageAnnotationEditor({
  accountId,
  sessionId,
  screenshot,
  entities,
  townHallLevel,
  language,
  improvementConsent,
}: Props) {
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [annotations, setAnnotations] = useState<VillageScreenshotAnnotation[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawEnd, setDrawEnd] = useState<Point | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const loaded = useRef(false);
  const availableEntities = useMemo(
    () => {
      const unique = new Map<string, ScreenshotEntity>();
      entities
        .filter((entity) =>
          (entity.type === "building" || entity.type === "wall")
          && (entity.unlockTownHallLevel === undefined || entity.unlockTownHallLevel <= townHallLevel),
        )
        .forEach((entity) => {
          const sourceId = entity.aliases?.[0] || entity.id.split(":")[0];
          if (unique.has(sourceId)) return;
          unique.set(sourceId, {
            ...entity,
            id: sourceId,
            name: entity.name.replace(/\s+\d+$/, ""),
          });
        });
      return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, language));
    },
    [entities, language, townHallLevel],
  );
  const selectedEntity = availableEntities.find((entity) => entity.id === selectedEntityId);
  const activeBox = drawStart && drawEnd
    ? normalizeDrawnBoundingBox(drawStart, drawEnd)
    : null;

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    setLoading(true);
    void fetchVillageScreenshotAnnotations({ sessionId, screenshotId: screenshot.id })
      .then(setAnnotations)
      .catch((error) => {
        loaded.current = false;
        setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoading(false));
  }, [open, screenshot.id, sessionId]);

  const pointFromEvent = (event: PointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const finishDrawing = (event: PointerEvent<HTMLDivElement>) => {
    if (!drawStart || !selectedEntity) return;
    const box = normalizeDrawnBoundingBox(drawStart, pointFromEvent(event));
    setDrawStart(null);
    setDrawEnd(null);
    if (!box) return;
    const level = selectedLevel === "" ? null : Number(selectedLevel);
    setAnnotations((current) => [...current, {
      id: crypto.randomUUID(),
      screenshotId: screenshot.id,
      entityId: selectedEntity.id,
      entityType: selectedEntity.type === "wall" ? "wall" : "building",
      level,
      boundingBox: box,
      improvementConsent,
    }]);
    setMessage(null);
  };

  const preparedAnnotations = annotations.map((annotation) => ({
    ...annotation,
    improvementConsent,
  }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await replaceVillageScreenshotAnnotations({
        sessionId,
        screenshotId: screenshot.id,
        annotations: preparedAnnotations,
      });
      setAnnotations(preparedAnnotations);
      setMessage(en ? "Annotations saved privately." : "Annotationen wurden privat gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const exportSample = async () => {
    if (!improvementConsent) {
      setMessage(en
        ? "Enable the optional quality-improvement consent before exporting."
        : "Aktiviere vor dem Export die optionale Einwilligung zur Qualitätsverbesserung.");
      return;
    }
    try {
      const [accountGroupHash, captureSeriesHash] = await Promise.all([
        sha256Hex(`account:${accountId}`),
        sha256Hex(`capture:${sessionId}`),
      ]);
      const dataset = buildVillageTrainingDataset({
        datasetVersion: "village-manual-annotations-v1",
        targetGameVersion: SCREENSHOT_IMPORT_CONFIG.supportedGameUiVersion,
        targetModelVersion: "village-detector-v1",
        targetLayoutVersion: "free-village-v1",
        imagePath: `images/${screenshot.id}.jpg`,
        screenshotId: screenshot.id,
        accountGroupHash,
        captureSeriesHash,
        deviceType: screenshot.deviceType,
        width: screenshot.width,
        height: screenshot.height,
        language,
        townHallLevel,
        annotations: preparedAnnotations,
      });
      downloadJson(`village-annotation-${screenshot.id}.json`, dataset);
      setMessage(en
        ? "Training sample exported. The image itself remains private."
        : "Trainingsbeispiel exportiert. Das Bild selbst bleibt privat.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="w-full rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-left font-bold text-violet-100"
      >
        {open
          ? (en ? "Close building annotations" : "Gebäude-Annotationen schließen")
          : (en ? "Mark buildings for recognition" : "Gebäude für Erkennung markieren")}
        {annotations.length ? ` · ${annotations.length}` : ""}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-slate-400">
            {en
              ? "Choose a building and level, then drag a tight rectangle around one visible instance."
              : "Wähle Gebäude und Level und ziehe anschließend einen engen Rahmen um ein sichtbares Exemplar."}
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <label>
              <span className="sr-only">{en ? "Building" : "Gebäude"}</span>
              <select
                value={selectedEntityId}
                onChange={(event) => setSelectedEntityId(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
              >
                <option value="">{en ? "Select building…" : "Gebäude auswählen…"}</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{en ? "Level" : "Level"}</span>
              <input
                type="number"
                min={0}
                max={selectedEntity?.maxLevelForTownHall || selectedEntity?.maxLevel || 100}
                value={selectedLevel}
                onChange={(event) => setSelectedLevel(event.target.value)}
                placeholder={en ? "Level" : "Level"}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
              />
            </label>
          </div>
          <div
            className={`relative touch-none overflow-hidden rounded-xl border ${selectedEntity ? "cursor-crosshair border-violet-300/40" : "cursor-not-allowed border-white/10 opacity-70"}`}
            style={{ aspectRatio: `${screenshot.width} / ${screenshot.height}` }}
            role="application"
            aria-label={en
              ? "Village image annotation area. Drag a rectangle around the selected building."
              : "Anmerkungsbereich für das Dorfbild. Ziehe einen Rahmen um das ausgewählte Gebäude."}
            onPointerDown={(event) => {
              if (!selectedEntity) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const point = pointFromEvent(event);
              setDrawStart(point);
              setDrawEnd(point);
            }}
            onPointerMove={(event) => {
              if (drawStart) setDrawEnd(pointFromEvent(event));
            }}
            onPointerUp={finishDrawing}
            onPointerCancel={() => {
              setDrawStart(null);
              setDrawEnd(null);
            }}
          >
            <Image
              src={screenshot.previewUrl}
              alt={en ? "Village screenshot to annotate" : "Dorf-Screenshot zum Markieren"}
              fill
              sizes="(min-width: 1024px) 900px, 100vw"
              unoptimized
              draggable={false}
              className="pointer-events-none select-none object-contain"
            />
            {annotations.map((annotation, index) => {
              const entity = availableEntities.find((item) => item.id === annotation.entityId);
              return (
                <div
                  key={annotation.id}
                  className="pointer-events-none absolute border-2 border-emerald-300 bg-emerald-300/10"
                  style={{
                    left: `${annotation.boundingBox.x * 100}%`,
                    top: `${annotation.boundingBox.y * 100}%`,
                    width: `${annotation.boundingBox.width * 100}%`,
                    height: `${annotation.boundingBox.height * 100}%`,
                  }}
                  title={`${index + 1}. ${entity?.name || annotation.entityId} · ${annotation.level ?? "?"}`}
                >
                  <span className="absolute left-0 top-0 bg-emerald-300 px-1 text-[10px] font-bold text-slate-950">
                    {index + 1}
                  </span>
                </div>
              );
            })}
            {activeBox ? (
              <div
                className="pointer-events-none absolute border-2 border-violet-300 bg-violet-300/10"
                style={{
                  left: `${activeBox.x * 100}%`,
                  top: `${activeBox.y * 100}%`,
                  width: `${activeBox.width * 100}%`,
                  height: `${activeBox.height * 100}%`,
                }}
              />
            ) : null}
          </div>
          {loading ? <p className="text-slate-400">{en ? "Loading…" : "Wird geladen…"}</p> : null}
          {annotations.length ? (
            <ol className="space-y-1">
              {annotations.map((annotation, index) => {
                const entity = availableEntities.find((item) => item.id === annotation.entityId);
                return (
                  <li key={annotation.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                    <span>{index + 1}. {entity?.name || annotation.entityId} · {en ? "Level" : "Level"} {annotation.level ?? "?"}</span>
                    <button
                      type="button"
                      onClick={() => setAnnotations((current) => current.filter((item) => item.id !== annotation.id))}
                      className="rounded-md border border-rose-400/30 px-2 py-1 font-bold text-rose-200"
                    >
                      {en ? "Remove" : "Entfernen"}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-lg bg-violet-300 px-3 py-2 font-bold text-slate-950 disabled:opacity-40"
            >
              {saving ? (en ? "Saving…" : "Speichert…") : (en ? "Save annotations" : "Annotationen speichern")}
            </button>
            <button
              type="button"
              disabled={!annotations.length || !improvementConsent}
              onClick={() => void exportSample()}
              className="rounded-lg border border-white/20 px-3 py-2 font-bold text-slate-200 disabled:opacity-40"
            >
              {en ? "Export training sample" : "Trainingsbeispiel exportieren"}
            </button>
          </div>
          {!improvementConsent ? (
            <p className="text-amber-200">
              {en
                ? "Annotations stay private. Enable the optional quality-improvement consent in the review step to release them for training."
                : "Annotationen bleiben privat. Aktiviere im Prüfschritt die optionale Einwilligung, um sie für das Training freizugeben."}
            </p>
          ) : null}
          {message ? <p aria-live="polite" className="text-sky-200">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
