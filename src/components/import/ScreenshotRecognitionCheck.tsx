"use client";
import { useEffect, useRef, useState } from "react";
import type { VillageScreenshotAnnotation } from "@/features/screenshot-import/village-annotations";
import type { ScreenshotRecognitionEvaluation } from "@/services/screenshotRecognitionEvaluationService";

type Props = { blob: Blob; annotations: VillageScreenshotAnnotation[]; language: "de" | "en" };
export function ScreenshotRecognitionCheck({ blob, annotations, language }: Props) {
  const en = language === "en";
  const [result, setResult] = useState<ScreenshotRecognitionEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const run = async () => {
    setBusy(true); setError(null);
    try {
      const { evaluateScreenshotRecognition } = await import("@/services/screenshotRecognitionEvaluationService");
      const next = await evaluateScreenshotRecognition(blob, annotations);
      if (active.current) setResult(next);
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (active.current) setBusy(false);
    }
  };
  return <div className="space-y-2 rounded-lg border border-sky-400/20 p-3">
    <button type="button" disabled={busy || !annotations.length} onClick={() => void run()} className="rounded-lg border border-sky-400/30 px-3 py-2 font-bold text-sky-100 disabled:opacity-40">
      {busy ? (en ? "Checking recognition…" : "Erkennung wird geprüft…") : (en ? "Check recognition against labels" : "Erkennung gegen Markierungen prüfen")}
    </button>
    <p className="text-slate-400">{en ? "Runs locally with the saved labels. No uploads or account changes. This image may be only partly labeled; it is not an independent test dataset." : "Prüft lokal anhand der gespeicherten Markierungen. Keine Uploads oder Accountänderungen. Das Bild kann unvollständig beschriftet sein und ist kein unabhängiger Testdatensatz."}</p>
    {busy ? <p role="status">{en ? "Please wait…" : "Bitte warten…"}</p> : null}
    {error ? <p role="alert" className="text-rose-200">{error}</p> : null}
    {result ? <div aria-live="polite" className="space-y-1 text-slate-200">
      {result.search ? <p>{en ? "Free image search: matching labels" : "Freie Bildsuche: passende Markierungen"}: <b>{result.search.matchedLabels} / {result.search.labeledObjects}</b></p> : <p>{en ? "Single building crop: free village search is not evaluated." : "Einzelner Gebäudeausschnitt: Die freie Dorfsuche wird hier nicht bewertet."}</p>}
      <p>{en ? "Correct types with known building positions" : "Passende Typen bei vorgegebenen Gebäudeausschnitten"}: <b>{result.correctCropTypes} / {result.crops.length}</b></p>
      {result.search ? <p>{en ? "Proposals without a matching label" : "Vorschläge ohne passende Markierung"}: {result.search.unmatchedProposals}</p> : null}
      <p className="text-slate-400">{en ? "A search match requires the same type and at least 50% box overlap. Known-position type agreement includes uncertain best guesses; it is a separate diagnostic and does not prove automatic detection or a correct level." : "Ein Suchtreffer braucht denselben Typ und mindestens 50 % Rahmenüberlappung. Der Typvergleich bei vorgegebenen Ausschnitten zählt auch unsichere beste Vorschläge. Er ist eine separate Diagnose und belegt weder automatische Erkennung noch ein korrektes Level."}</p>
    </div> : null}
  </div>;
}
