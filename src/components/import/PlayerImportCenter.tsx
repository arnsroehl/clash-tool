"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseScreenshotLevels, type ScreenshotEntity } from "@/features/screenshot-import/screenshot-import";
import { applyPlayerImport, fetchOfficialPlayer, type ImportChange, type PlayerImportPreview } from "@/services/playerImportService";
import { recognizeScreenshot } from "@/services/screenshotRecognitionService";
import type { ClashAccount } from "@/types/account";
import type { Hero } from "@/types/hero";
import type { SiegeMachine, Spell, Troop } from "@/types/laboratory";

type Props = { account: ClashAccount | null; heroes: Hero[]; heroLevels: Record<string,number>; troops: Troop[]; troopLevels: Record<string,number>; spells: Spell[]; spellLevels: Record<string,number>; siegeMachines: SiegeMachine[]; siegeLevels: Record<string,number> };
const normalize = (name: string) => name.toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export function PlayerImportCenter(props: Props) {
  const [tag, setTag] = useState(props.account?.playerTag || "");
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState<PlayerImportPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const autoCheckedAccount = useRef<string | null>(null);
  const entities = useMemo<ScreenshotEntity[]>(() => [
    ...props.heroes.map((item) => ({ id:item.id,name:item.name,type:"hero" as const,currentLevel:props.heroLevels[item.id]||0 })),
    ...props.troops.map((item) => ({ id:item.id,name:item.name,type:"troop" as const,currentLevel:props.troopLevels[item.id]||0 })),
    ...props.spells.map((item) => ({ id:item.id,name:item.name,type:"spell" as const,currentLevel:props.spellLevels[item.id]||0 })),
    ...props.siegeMachines.map((item) => ({ id:item.id,name:item.name,type:"siege_machine" as const,currentLevel:props.siegeLevels[item.id]||0 })),
  ], [props.heroes, props.heroLevels, props.siegeLevels, props.siegeMachines, props.spellLevels, props.spells, props.troopLevels, props.troops]);
  const entityMap = useMemo(() => new Map(entities.map((entity) => [normalize(entity.name), entity])), [entities]);
  const changesFromItems = useCallback((groups: {name:string;level:number}[][]): ImportChange[] => groups.flat().flatMap((item) => { const match=entityMap.get(normalize(item.name)); return match && match.currentLevel !== item.level ? [{ type:match.type,itemId:match.id,name:match.name,fromLevel:match.currentLevel,toLevel:item.level }] : []; }), [entityMap]);
  const previewOfficial = useCallback(async (playerTag: string) => {
    if (!props.account) return;
    const data = await fetchOfficialPlayer(playerTag);
    setTag(data.tag);
    setPreview({ playerName:data.name, playerTag:data.tag, townHallFrom:props.account.townHallLevel, townHallTo:data.townHallLevel,
      changes:changesFromItems([data.heroes,data.troops,data.spells]), equipmentCount:data.heroEquipment.length });
  }, [changesFromItems, props.account]);

  useEffect(() => {
    const account = props.account;
    if (!account?.playerTag || autoCheckedAccount.current === account.id || entities.length === 0) return;
    const playerTag = account.playerTag;
    const lastSync = account.lastSyncedAt ? new Date(account.lastSyncedAt).getTime() : 0;
    if (Date.now() - lastSync < 86_400_000) return;
    autoCheckedAccount.current = account.id;
    void Promise.resolve().then(() => {
      setBusy(true);
      return previewOfficial(playerTag);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Automatischer Abgleich fehlgeschlagen."))
      .finally(() => setBusy(false));
  }, [entities.length, previewOfficial, props.account]);

  const loadOfficial = async () => { if (!props.account) return; setBusy(true); setMessage(null); try { await previewOfficial(tag); } catch(error) { setMessage(error instanceof Error ? error.message : "Import fehlgeschlagen."); } finally { setBusy(false); } };
  const parseText = (text: string) => { if (!props.account) return; const changes = parseScreenshotLevels(text, entities).filter((match) => match.detectedLevel !== match.currentLevel).map((match) => ({ type: match.type, itemId: match.id, name: match.name, fromLevel: match.currentLevel, toLevel: match.detectedLevel })); setPreview({ playerName:props.account.name,townHallFrom:props.account.townHallLevel,townHallTo:props.account.townHallLevel,changes }); };
  const handleScreenshot = async (event: ChangeEvent<HTMLInputElement>) => { const file=event.target.files?.[0]; if(!file)return; setBusy(true);setMessage(null);setOcrProgress(0);try{const text=await recognizeScreenshot(file,setOcrProgress);setManual(text);parseText(text);setMessage("Screenshot lokal erkannt. Bitte prüfe die Änderungsvorschau vor dem Speichern.");}catch(error){setMessage(error instanceof Error?error.message:"Screenshot konnte nicht gelesen werden.");}finally{setBusy(false);setOcrProgress(null);event.target.value="";} };
  const apply = async () => { if(!props.account||!preview)return;setBusy(true);try{await applyPlayerImport(props.account,preview);window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:"Änderungen konnten nicht gespeichert werden.");setBusy(false);} };

  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Import & Aktualisierung</h2><p className="mt-2 text-sm text-slate-400">API-Abgleiche werden nach 24 Stunden beim Öffnen vorbereitet. Screenshots werden lokal per OCR gelesen; gespeichert wird immer erst nach deiner Bestätigung.</p>
    {!props.account?<p className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-400">Wähle zuerst einen Account.</p>:<div className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Spieler-Tag & API</h3><div className="mt-3 flex gap-2"><input value={tag} onChange={(e)=>setTag(e.target.value)} placeholder="#SPIELERTAG" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"/><button type="button" disabled={busy||!tag} onClick={() => void loadOfficial()} className="rounded-xl bg-amber-400 px-4 font-bold text-slate-950 disabled:opacity-40">Abrufen</button></div><p className="mt-2 text-xs text-slate-500">Letzter Abgleich: {props.account.lastSyncedAt ? new Date(props.account.lastSyncedAt).toLocaleString("de-DE") : "noch nie"}</p></div>
      <div className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Screenshot-Erkennung</h3><p className="mt-1 text-xs text-slate-400">Nutze gut lesbare Level-Übersichten. Der erste OCR-Lauf lädt Sprachdaten.</p><label className="mt-3 block cursor-pointer rounded-xl border border-amber-400/30 p-3 text-center text-sm font-bold text-amber-200"><input type="file" accept="image/*" onChange={(event) => void handleScreenshot(event)} className="sr-only"/>Screenshot auswählen</label>{ocrProgress !== null ? <p className="mt-2 text-xs text-slate-400">Erkennung: {ocrProgress}%</p> : null}</div>
      <div className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Level-Liste / OCR-Text</h3><p className="mt-1 text-xs text-slate-400">Eine Zeile pro Level, z. B. Barbarian King = 80</p><textarea value={manual} onChange={(e)=>setManual(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"/><button type="button" onClick={()=>parseText(manual)} className="mt-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-200">Änderungen prüfen</button></div>
    </div>}
    {message?<p aria-live="polite" className="mt-4 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200">{message}</p>:null}
    {preview?<div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><h3 className="font-bold">Änderungsvorschau für {preview.playerName}</h3>{preview.townHallFrom!==preview.townHallTo?<p className="mt-2 text-sm">Rathaus {preview.townHallFrom} → {preview.townHallTo}</p>:null}<div className="mt-3 grid gap-2 md:grid-cols-2">{preview.changes.map((change)=><div key={`${change.type}-${change.itemId}`} className="rounded-xl bg-slate-900 p-3 text-sm"><b>{change.name}</b>: {change.fromLevel} → {change.toLevel}</div>)}</div>{!preview.changes.length&&preview.townHallFrom===preview.townHallTo?<p className="mt-3 text-sm text-slate-400">Keine abweichenden unterstützten Level erkannt. Prüfe bei OCR den erkannten Text.</p>:null}{preview.equipmentCount?<p className="mt-3 text-xs text-slate-400">{preview.equipmentCount} Ausrüstungsdatensätze erkannt.</p>:null}<button type="button" disabled={busy || (!preview.changes.length && preview.townHallFrom===preview.townHallTo)} onClick={() => void apply()} className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Änderungen bestätigen und speichern</button></div>:null}
  </section>;
}
