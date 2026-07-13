"use client";
import { useMemo, useState } from "react";
import { applyPlayerImport, fetchOfficialPlayer, type ImportChange, type ImportEntityType, type PlayerImportPreview } from "@/services/playerImportService";
import type { ClashAccount } from "@/types/account";
import type { Hero } from "@/types/hero";
import type { SiegeMachine, Spell, Troop } from "@/types/laboratory";

type Entity = { id: string; name: string; type: ImportEntityType; currentLevel: number };
type Props = { account: ClashAccount | null; heroes: Hero[]; heroLevels: Record<string,number>; troops: Troop[]; troopLevels: Record<string,number>; spells: Spell[]; spellLevels: Record<string,number>; siegeMachines: SiegeMachine[]; siegeLevels: Record<string,number> };
const normalize = (name: string) => name.toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");

export function PlayerImportCenter(props: Props) {
  const [tag, setTag] = useState(""); const [manual, setManual] = useState(""); const [preview, setPreview] = useState<PlayerImportPreview | null>(null); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const entities = useMemo<Entity[]>(() => [
    ...props.heroes.map((item) => ({ id:item.id,name:item.name,type:"hero" as const,currentLevel:props.heroLevels[item.id]||0 })),
    ...props.troops.map((item) => ({ id:item.id,name:item.name,type:"troop" as const,currentLevel:props.troopLevels[item.id]||0 })),
    ...props.spells.map((item) => ({ id:item.id,name:item.name,type:"spell" as const,currentLevel:props.spellLevels[item.id]||0 })),
    ...props.siegeMachines.map((item) => ({ id:item.id,name:item.name,type:"siege_machine" as const,currentLevel:props.siegeLevels[item.id]||0 })),
  ], [props]);
  const entityMap = useMemo(() => new Map(entities.map((entity) => [normalize(entity.name), entity])), [entities]);
  const changesFromItems = (groups: {name:string;level:number}[][]): ImportChange[] => groups.flat().flatMap((item) => { const match=entityMap.get(normalize(item.name)); return match && match.currentLevel !== item.level ? [{ type:match.type,itemId:match.id,name:match.name,fromLevel:match.currentLevel,toLevel:item.level }] : []; });
  const loadOfficial = async () => { if(!props.account)return; setBusy(true);setMessage(null);try{const data=await fetchOfficialPlayer(tag);setPreview({playerName:data.name,playerTag:data.tag,townHallFrom:props.account.townHallLevel,townHallTo:data.townHallLevel,changes:changesFromItems([data.heroes,data.troops,data.spells]),equipmentCount:data.heroEquipment.length});}catch(error){setMessage(error instanceof Error?error.message:"Import fehlgeschlagen.");}finally{setBusy(false);} };
  const parseManual = () => { if(!props.account)return; const changes:ImportChange[]=[]; for(const line of manual.split(/\r?\n/)){const [rawName,rawLevel]=line.split(/[=:;]/).map((part)=>part.trim());const match=entityMap.get(normalize(rawName||""));const level=Number(rawLevel);if(match&&Number.isFinite(level)&&level>=0&&level!==match.currentLevel)changes.push({type:match.type,itemId:match.id,name:match.name,fromLevel:match.currentLevel,toLevel:level});} setPreview({playerName:props.account.name,townHallFrom:props.account.townHallLevel,townHallTo:props.account.townHallLevel,changes}); };
  const apply = async () => { if(!props.account||!preview)return;setBusy(true);try{await applyPlayerImport(props.account,preview);window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:"Änderungen konnten nicht gespeichert werden.");setBusy(false);} };
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Import & Aktualisierung</h2><p className="mt-2 text-sm text-slate-400">Die offizielle API liefert Rathaus, Helden, Truppen, Zauber, Belagerungsmaschinen, Begleiter und Ausrüstung – keine Gebäudelevel.</p>
    {!props.account?<p className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-400">Wähle zuerst einen Account.</p>:<div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Spieler-Tag</h3><div className="mt-3 flex gap-2"><input value={tag} onChange={(e)=>setTag(e.target.value)} placeholder="#SPIELERTAG" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"/><button disabled={busy||!tag} onClick={loadOfficial} className="rounded-xl bg-amber-400 px-4 font-bold text-slate-950 disabled:opacity-40">Abrufen</button></div></div>
      <div className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Manuelle Schnellerfassung</h3><p className="mt-1 text-xs text-slate-400">Eine Zeile pro Level, z. B. Barbarian King = 80</p><textarea value={manual} onChange={(e)=>setManual(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"/><button onClick={parseManual} className="mt-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-200">Änderungen prüfen</button></div>
    </div>}
    {message?<p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{message}</p>:null}
    {preview?<div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><h3 className="font-bold">Änderungsvorschau für {preview.playerName}</h3>{preview.townHallFrom!==preview.townHallTo?<p className="mt-2 text-sm">Rathaus {preview.townHallFrom} → {preview.townHallTo}</p>:null}<div className="mt-3 grid gap-2 md:grid-cols-2">{preview.changes.map((change)=><div key={`${change.type}-${change.itemId}`} className="rounded-xl bg-slate-900 p-3 text-sm"><b>{change.name}</b>: {change.fromLevel} → {change.toLevel}</div>)}</div>{!preview.changes.length&&preview.townHallFrom===preview.townHallTo?<p className="mt-3 text-sm text-slate-400">Keine abweichenden unterstützten Level erkannt.</p>:null}{preview.equipmentCount?<p className="mt-3 text-xs text-slate-400">{preview.equipmentCount} Ausrüstungsdatensätze erkannt; die Magic-Items-Etappe bindet diese als Nächstes ein.</p>:null}<button disabled={busy} onClick={apply} className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950">Änderungen bestätigen und speichern</button></div>:null}
  </section>;
}
