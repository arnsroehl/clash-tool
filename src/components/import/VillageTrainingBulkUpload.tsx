"use client";

import { ChangeEvent, useMemo, useState } from "react";
import type { ScreenshotEntity } from "@/features/screenshot-import/screenshot-import";
import {
  createFullImageVillageAnnotation,
  getVillageAnnotationEntities,
} from "@/features/screenshot-import/village-annotations";
import { replaceVillageScreenshotAnnotations } from "@/services/screenshotAnnotationService";
import {
  saveScreenshotImportForLater,
  updateScreenshotAnalysis,
  uploadScreenshot,
  type ScreenshotImportSession,
} from "@/services/screenshotImportService";
import { normalizeScreenshot } from "@/services/screenshotRecognitionService";

type Props = {
  session: ScreenshotImportSession;
  entities: ScreenshotEntity[];
  townHallLevel: number;
  language: "de" | "en";
  improvementConsent: boolean;
  onImprovementConsentChange: (enabled: boolean) => void;
};

type UploadResult = {
  id: string;
  filename: string;
  duplicate: boolean;
  error?: string;
};

export function VillageTrainingBulkUpload({
  session,
  entities,
  townHallLevel,
  language,
  improvementConsent,
  onImprovementConsentChange,
}: Props) {
  const en = language === "en";
  const [open, setOpen] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const availableEntities = useMemo(
    () => getVillageAnnotationEntities(entities, townHallLevel, language),
    [entities, language, townHallLevel],
  );
  const selectedEntity = availableEntities.find((entity) => entity.id === selectedEntityId);
  const level = Number(selectedLevel);
  const levelIsValid = Number.isInteger(level)
    && level >= 1
    && level <= (selectedEntity?.maxLevelForTownHall || selectedEntity?.maxLevel || 100);
  const canUpload = Boolean(selectedEntity) && levelIsValid && improvementConsent && !busy;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = [...(input.files || [])];
    input.value = "";
    if (!files.length || !selectedEntity || !levelIsValid || !improvementConsent) return;
    setBusy(true);
    setMessage(null);
    setProgress(0);
    const nextResults: UploadResult[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const normalized = await normalizeScreenshot(file);
        const uploaded = await uploadScreenshot({
          session,
          screenshot: normalized,
          screenType: "village",
          screenTypeConfidence: 1,
        });
        await updateScreenshotAnalysis({
          screenshotId: uploaded.id,
          screenType: "village",
          screenTypeConfidence: 1,
          processingStatus: "ready",
          qualityScore: normalized.quality.score,
          qualityIssues: normalized.quality.issues,
        });
        await replaceVillageScreenshotAnnotations({
          sessionId: session.id,
          screenshotId: uploaded.id,
          annotations: [createFullImageVillageAnnotation({
            screenshotId: uploaded.id,
            entityId: selectedEntity.id,
            entityType: selectedEntity.type === "wall" ? "wall" : "building",
            level,
            improvementConsent: true,
          })],
        });
        nextResults.push({
          id: uploaded.id,
          filename: file.name,
          duplicate: uploaded.duplicate,
        });
      } catch (error) {
        nextResults.push({
          id: crypto.randomUUID(),
          filename: file.name,
          duplicate: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      setResults([...nextResults]);
      setProgress(Math.round(((index + 1) / files.length) * 100));
    }
    const successCount = nextResults.filter((result) => !result.error).length;
    try {
      if (successCount) await saveScreenshotImportForLater(session.id);
      setMessage(en
        ? `${successCount} of ${files.length} training images saved.`
        : `${successCount} von ${files.length} Trainingsbildern gespeichert.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-violet-400/30 bg-violet-400/5 p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <b className="block text-violet-100">
            {en ? "Upload pre-cropped training images" : "Zugeschnittene Trainingsbilder hochladen"}
          </b>
          <span className="mt-1 block text-xs text-slate-400">
            {en
              ? "Choose a building and level once, then add several matching image crops."
              : "Gebäude und Level einmal auswählen, danach mehrere passende Bildausschnitte hinzufügen."}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-violet-200">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          {!session.retainOriginals ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
              {en
                ? "Start the dedicated training-image import so the private source images remain available for model preparation."
                : "Starte den eigenen Trainingsbilder-Import, damit die privaten Ausgangsbilder für die Modellvorbereitung verfügbar bleiben."}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-300">{en ? "Building" : "Gebäude"}</span>
              <select
                value={selectedEntityId}
                onChange={(event) => {
                  setSelectedEntityId(event.target.value);
                  setSelectedLevel("");
                }}
                disabled={busy}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
              >
                <option value="">{en ? "Select building…" : "Gebäude auswählen…"}</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-300">Level</span>
              <input
                type="number"
                min={1}
                max={selectedEntity?.maxLevelForTownHall || selectedEntity?.maxLevel || 100}
                value={selectedLevel}
                onChange={(event) => setSelectedLevel(event.target.value)}
                disabled={busy || !selectedEntity}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
              />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={improvementConsent}
              onChange={(event) => onImprovementConsentChange(event.target.checked)}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              {en
                ? "I allow these labeled image crops to be used to improve screenshot recognition."
                : "Ich erlaube, dass diese beschrifteten Bildausschnitte zur Verbesserung der Screenshot-Erkennung verwendet werden."}
              <small className="mt-1 block text-slate-500">
                {en
                  ? "Optional and off by default. Images stay private, are never applied as account changes, and retained originals are automatically deleted after 30 days by default."
                  : "Optional und standardmäßig aus. Bilder bleiben privat, werden nie als Account-Änderungen übernommen und aufbewahrte Originale werden standardmäßig nach 30 Tagen automatisch gelöscht."}
              </small>
            </span>
          </label>
          <label className={`block rounded-xl border border-dashed px-4 py-5 text-center ${canUpload ? "cursor-pointer border-violet-300/50 bg-violet-300/10" : "cursor-not-allowed border-white/10 opacity-50"}`}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={!canUpload || !session.retainOriginals}
              onChange={(event) => void handleFiles(event)}
              className="sr-only"
            />
            <b className="text-violet-100">
              {en ? "Choose cropped images from photo library" : "Zugeschnittene Bilder aus der Mediathek wählen"}
            </b>
            <span className="mt-1 block text-xs text-slate-400">
              {en
                ? "Each file should show exactly one complete building at the selected level."
                : "Jede Datei sollte genau ein vollständiges Gebäude im ausgewählten Level zeigen."}
            </span>
          </label>
          {busy ? (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-slate-950">
                <div className="h-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{progress}%</p>
            </div>
          ) : null}
          {results.length ? (
            <ul className="space-y-1 text-xs">
              {results.map((result) => (
                <li key={`${result.id}:${result.filename}`} className={`rounded-lg px-3 py-2 ${result.error ? "bg-rose-400/10 text-rose-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                  {result.error ? "✕" : "✓"} {result.filename}
                  {result.duplicate ? (en ? " · duplicate label updated" : " · Dublette, Beschriftung aktualisiert") : ""}
                  {result.error ? ` · ${result.error}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {message ? <p aria-live="polite" className="text-sm text-sky-200">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
