"use client";

import Image from "next/image";
import { ScreenshotRecognitionCheck } from "@/components/import/ScreenshotRecognitionCheck";
import { useEffect, useState } from "react";
import type { ScreenshotEntity } from "@/features/screenshot-import/screenshot-import";
import type { VillageScreenshotAnnotation } from "@/features/screenshot-import/village-annotations";
import { fetchRetainedScreenshots, loadRetainedScreenshot, type RetainedScreenshot } from "@/services/screenshotHistoryService";

type Props = { sessionId: string; entities: ScreenshotEntity[]; language: "de" | "en" };

export function ScreenshotHistoryViewer({ sessionId, entities, language }: Props) {
  const en = language === "en";
  const [files, setFiles] = useState<RetainedScreenshot[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<{ id: string; url: string; blob: Blob; annotations: VillageScreenshotAnnotation[] } | null>(null);
  const [listLoaded, setListLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchRetainedScreenshots(sessionId).then((entries) => {
      if (!cancelled) { setFiles(entries); setSelected(entries[0]?.id || ""); setListLoaded(true); }
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; };
  }, [sessionId]);
  const file = files.find((entry) => entry.id === selected);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let url: string | undefined;
    void loadRetainedScreenshot(sessionId, file).then((result) => {
      if (cancelled) return;
      url = URL.createObjectURL(result.blob);
      setPreview({ id: file.id, url, blob: result.blob, annotations: result.annotations });
      setError(null);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [sessionId, file]);
  const visible = preview?.id === selected ? preview : null;
  const entityName = (id: string) => entities.find((entity) =>
    entity.id === id || entity.id.startsWith(`${id}:`) || entity.aliases?.includes(id),
  )?.name.replace(/\s+\d+$/, "") || id;
  return (
    <div className="mt-3 w-full space-y-3 rounded-lg bg-slate-950 p-3">
      <label className="block">
        <span className="mb-1 block">{en ? "Retained screenshot" : "Aufbewahrter Screenshot"}</span>
        <select value={selected} onChange={(event) => { setSelected(event.target.value); setError(null); }} className="w-full rounded border border-white/20 bg-slate-900 p-2">
          {files.map((entry, index) => <option key={entry.id} value={entry.id}>{index + 1}. {entry.name}</option>)}
        </select>
      </label>
      {error ? <p role="alert" className="text-rose-200">{error}</p> : null}
      {listLoaded && !files.length && !error ? <p>{en ? "No retained images remain in this import." : "In diesem Import sind keine aufbewahrten Bilder mehr vorhanden."}</p> : null}
      {!visible && !error && (!listLoaded || files.length > 0) ? <p role="status">{en ? "Loading image…" : "Bild wird geladen…"}</p> : null}
      {visible && file ? <>
        <div className="relative w-full" style={{ aspectRatio: `${file.width} / ${file.height}` }}>
          <Image src={visible.url} alt={file.name} fill unoptimized sizes="100vw" className="object-contain" />
          {visible.annotations.map((annotation, index) => <div key={annotation.id} title={`${entityName(annotation.entityId)} · ${annotation.level ?? "?"}`} className="pointer-events-none absolute border-2 border-amber-300" style={{ left: `${annotation.boundingBox.x * 100}%`, top: `${annotation.boundingBox.y * 100}%`, width: `${annotation.boundingBox.width * 100}%`, height: `${annotation.boundingBox.height * 100}%` }}><span className="bg-amber-300 px-1 text-xs font-bold text-black">{index + 1}</span></div>)}
        </div>
        <ScreenshotRecognitionCheck key={file.id} blob={visible.blob} annotations={visible.annotations} language={language} />
        <ol className="grid list-inside list-decimal gap-1 sm:grid-cols-2">{visible.annotations.map((annotation) => <li key={annotation.id}>{entityName(annotation.entityId)} · Level {annotation.level ?? "?"}</li>)}</ol>
        <p className="text-slate-400">{en ? "Private preview. Labels are shown as saved; no account values are changed." : "Private Vorschau. Beschriftungen werden wie gespeichert angezeigt; Accountwerte werden nicht verändert."}</p>
      </> : null}
    </div>
  );
}
