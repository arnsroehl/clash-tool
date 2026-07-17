"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { unzip } from "fflate";
import type { ScreenshotEntity } from "@/features/screenshot-import/screenshot-import";
import {
  resolveTrainingBulkImportPath,
  type TrainingBulkImportError,
} from "@/features/screenshot-import/training-bulk-import";
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
  onBusyChange?: (busy: boolean) => void;
  onSaved?: (count: number) => void;
};

type UploadResult = {
  id: string;
  filename: string;
  duplicate: boolean;
  error?: string;
};

type TrainingUploadEntry = {
  file: File;
  relativePath: string;
  entity?: ScreenshotEntity;
  level?: number;
  error?: TrainingBulkImportError;
};

const MAX_AUTOMATIC_FILES = 500;
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;

function imageMimeType(path: string): string {
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.webp$/i.test(path)) return "image/webp";
  return "image/jpeg";
}

async function extractZipImages(archive: File, en: boolean): Promise<Array<{ file: File; relativePath: string }>> {
  if (archive.size > MAX_ARCHIVE_BYTES)
    throw new Error(en ? "ZIP archives may be at most 100 MB." : "ZIP-Dateien dürfen höchstens 100 MB groß sein.");
  const source = new Uint8Array(await archive.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(source, (error, result) => error ? reject(error) : resolve(result));
  });
  const imageEntries = Object.entries(entries).filter(([path]) =>
    IMAGE_EXTENSION.test(path) && !path.includes("/__MACOSX/") && !path.startsWith("__MACOSX/"),
  );
  if (imageEntries.length > MAX_AUTOMATIC_FILES)
    throw new Error(en
      ? `One import may contain at most ${MAX_AUTOMATIC_FILES} images.`
      : `Ein Import darf höchstens ${MAX_AUTOMATIC_FILES} Bilder enthalten.`);
  const extractedBytes = imageEntries.reduce((sum, [, bytes]) => sum + bytes.byteLength, 0);
  if (extractedBytes > MAX_EXTRACTED_BYTES)
    throw new Error(en
      ? "Extracted images may be at most 250 MB in total."
      : "Die entpackten Bilder dürfen zusammen höchstens 250 MB groß sein.");
  return imageEntries.map(([relativePath, bytes]) => ({
    relativePath,
    file: new File([bytes.slice().buffer], relativePath.split("/").at(-1) || "training-image.jpg", {
      type: imageMimeType(relativePath),
    }),
  }));
}

function errorLabel(error: TrainingBulkImportError, en: boolean): string {
  const labels = {
    missing_label: en ? "Folder or filename has no building/level label" : "Gebäude oder Level fehlen im Pfad",
    unknown_entity: en ? "Building is unknown" : "Gebäude ist unbekannt",
    invalid_level: en ? "Level is invalid" : "Level ist ungültig",
    level_too_high: en ? "Level exceeds the town hall limit" : "Level liegt über dem Rathaus-Limit",
  };
  return labels[error];
}

export function VillageTrainingBulkUpload({
  session,
  entities,
  townHallLevel,
  language,
  improvementConsent,
  onImprovementConsentChange,
  onBusyChange,
  onSaved,
}: Props) {
  const en = language === "en";
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [automaticFiles, setAutomaticFiles] = useState<TrainingUploadEntry[]>([]);
  const [automaticMessage, setAutomaticMessage] = useState<string | null>(null);
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
  const automaticErrors = automaticFiles.filter((entry) => entry.error);
  const automaticValid = automaticFiles.filter((entry) => entry.entity && entry.level && !entry.error);
  const automaticGroups = useMemo(() => {
    const groups = new Map<string, { name: string; level: number; count: number }>();
    automaticFiles.forEach((entry) => {
      if (!entry.entity || !entry.level || entry.error) return;
      const key = `${entry.entity.id}:${entry.level}`;
      const current = groups.get(key);
      groups.set(key, {
        name: entry.entity.name,
        level: entry.level,
        count: (current?.count || 0) + 1,
      });
    });
    return [...groups.values()].sort((left, right) =>
      left.name.localeCompare(right.name, language) || left.level - right.level,
    );
  }, [automaticFiles, language]);

  const prepareAutomaticFiles = (files: Array<{ file: File; relativePath: string }>) => {
    const images = files.filter(({ relativePath }) => IMAGE_EXTENSION.test(relativePath));
    if (images.length > MAX_AUTOMATIC_FILES) {
      setAutomaticFiles([]);
      setAutomaticMessage(en
        ? `One import may contain at most ${MAX_AUTOMATIC_FILES} images.`
        : `Ein Import darf höchstens ${MAX_AUTOMATIC_FILES} Bilder enthalten.`);
      return;
    }
    const prepared = images.map(({ file, relativePath }) => ({
      file,
      ...resolveTrainingBulkImportPath(relativePath, availableEntities),
    }));
    setResults([]);
    setAutomaticFiles(prepared);
    setAutomaticMessage(images.length
      ? null
      : en ? "No supported images were found." : "Es wurden keine unterstützten Bilder gefunden.");
  };

  const uploadEntries = async (entries: TrainingUploadEntry[]) => {
    setBusy(true);
    onBusyChange?.(true);
    setMessage(null);
    setResults([]);
    setProgress(0);
    const nextResults: UploadResult[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry.entity || !entry.level) continue;
      try {
        const normalized = await normalizeScreenshot(entry.file);
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
            entityId: entry.entity.id,
            entityType: entry.entity.type === "wall" ? "wall" : "building",
            level: entry.level,
            improvementConsent: true,
          })],
        });
        nextResults.push({
          id: uploaded.id,
          filename: entry.relativePath,
          duplicate: uploaded.duplicate,
        });
      } catch (error) {
        nextResults.push({
          id: crypto.randomUUID(),
          filename: entry.relativePath,
          duplicate: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      setResults([...nextResults]);
      setProgress(Math.round(((index + 1) / entries.length) * 100));
    }
    const successCount = nextResults.filter((result) => !result.error).length;
    try {
      if (successCount) await saveScreenshotImportForLater(session.id);
      if (successCount) onSaved?.(successCount);
      setMessage(en
        ? `${successCount} of ${entries.length} training images saved.`
        : `${successCount} von ${entries.length} Trainingsbildern gespeichert.`);
      if (successCount === entries.length) setAutomaticFiles([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = [...(input.files || [])];
    input.value = "";
    if (!files.length || !selectedEntity || !levelIsValid || !improvementConsent) return;
    await uploadEntries(files.map((file) => ({
      file,
      relativePath: file.name,
      entity: selectedEntity,
      level,
    })));
  };

  const handleFolder = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = [...(input.files || [])];
    input.value = "";
    prepareAutomaticFiles(files.map((file) => ({
      file,
      relativePath: file.webkitRelativePath || file.name,
    })));
  };

  const handleZip = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const archive = input.files?.[0];
    input.value = "";
    if (!archive) return;
    setAutomaticMessage(en ? "Reading ZIP archive…" : "ZIP-Archiv wird gelesen…");
    try {
      prepareAutomaticFiles(await extractZipImages(archive, en));
    } catch (error) {
      setAutomaticFiles([]);
      setAutomaticMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const chooseFolder = () => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.click();
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
              ? "Import a labeled folder or ZIP automatically, or choose one building and level manually."
              : "Beschrifteten Ordner oder ZIP automatisch importieren – oder Gebäude und Level manuell wählen."}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-violet-200">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {!session.retainOriginals ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
              {en
                ? "Start the dedicated training-image import so the private source images remain available for model preparation."
                : "Starte den eigenen Trainingsbilder-Import, damit die privaten Ausgangsbilder für die Modellvorbereitung verfügbar bleiben."}
            </p>
          ) : null}

          <div className="rounded-xl border border-sky-300/25 bg-sky-300/5 p-4">
            <b className="text-sky-100">{en ? "Automatic dataset import" : "Automatischer Dataset-Import"}</b>
            <p className="mt-1 text-xs text-slate-300">
              {en
                ? "Use folders like town-hall/18/images.jpg or filenames like town-hall__18__001.png. A root folder is allowed."
                : "Nutze Ordner wie town-hall/18/bild.jpg oder Dateinamen wie town-hall__18__001.png. Ein übergeordneter Hauptordner ist erlaubt."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={folderInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy || !session.retainOriginals}
                onChange={handleFolder}
                className="sr-only"
              />
              <button
                type="button"
                disabled={busy || !session.retainOriginals}
                onClick={chooseFolder}
                className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
              >
                {en ? "Select dataset folder" : "Dataset-Ordner auswählen"}
              </button>
              <label className="cursor-pointer rounded-lg border border-sky-300/30 px-4 py-2 text-sm font-bold text-sky-100 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  disabled={busy || !session.retainOriginals}
                  onChange={(event) => void handleZip(event)}
                  className="sr-only"
                />
                {en ? "Select ZIP archive" : "ZIP-Archiv auswählen"}
              </label>
              {automaticFiles.length ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAutomaticFiles([]);
                    setAutomaticMessage(null);
                  }}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 disabled:opacity-40"
                >
                  {en ? "Clear selection" : "Auswahl leeren"}
                </button>
              ) : null}
            </div>
            {automaticFiles.length ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <span className="rounded-lg bg-slate-950/70 p-2"><b className="block text-lg text-white">{automaticFiles.length}</b>{en ? "Images" : "Bilder"}</span>
                  <span className="rounded-lg bg-emerald-400/10 p-2 text-emerald-200"><b className="block text-lg">{automaticValid.length}</b>{en ? "Ready" : "Bereit"}</span>
                  <span className="rounded-lg bg-rose-400/10 p-2 text-rose-200"><b className="block text-lg">{automaticErrors.length}</b>{en ? "Errors" : "Fehler"}</span>
                </div>
                {automaticGroups.length ? (
                  <ul className="grid gap-1 text-xs sm:grid-cols-2">
                    {automaticGroups.map((group) => (
                      <li key={`${group.name}:${group.level}`} className="flex justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-slate-300">
                        <span>{group.name} · Level {group.level}</span>
                        <b>{group.count}</b>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {automaticErrors.length ? (
                  <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-3">
                    <b className="text-xs text-rose-100">
                      {en ? "Fix these paths before uploading:" : "Diese Pfade vor dem Upload korrigieren:"}
                    </b>
                    <ul className="mt-2 space-y-1 text-xs text-rose-200">
                      {automaticErrors.slice(0, 10).map((entry) => (
                        <li key={entry.relativePath}>• {entry.relativePath} · {errorLabel(entry.error!, en)}</li>
                      ))}
                    </ul>
                    {automaticErrors.length > 10 ? <p className="mt-2 text-xs text-rose-300">+{automaticErrors.length - 10}</p> : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={busy || !improvementConsent || automaticValid.length < 1 || automaticErrors.length > 0}
                  onClick={() => void uploadEntries(automaticValid)}
                  className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {en ? `Upload ${automaticValid.length} labeled images` : `${automaticValid.length} beschriftete Bilder hochladen`}
                </button>
                {!improvementConsent ? (
                  <p className="text-xs text-amber-200">
                    {en ? "Enable training consent below before uploading." : "Aktiviere vor dem Upload unten die Trainingsfreigabe."}
                  </p>
                ) : null}
              </div>
            ) : null}
            {automaticMessage ? <p aria-live="polite" className="mt-3 text-xs text-sky-200">{automaticMessage}</p> : null}
          </div>

          <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-200">
              {en ? "Manual upload for one building and level" : "Manueller Upload für ein Gebäude und Level"}
            </summary>
            <div className="mt-4 space-y-3">
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
            </div>
          </details>

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
                  ? "Images stay private, are never applied as account changes, and retained originals are automatically deleted after 30 days by default."
                  : "Bilder bleiben privat, werden nie als Account-Änderungen übernommen und aufbewahrte Originale werden standardmäßig nach 30 Tagen automatisch gelöscht."}
              </small>
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
            <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
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
