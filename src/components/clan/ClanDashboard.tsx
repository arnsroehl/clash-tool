"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateClanDashboard } from "@/features/clan-dashboard/clan-dashboard";
import type { Clan, ClanGoal, ClanMember } from "@/types/clan";

type Props = {
  clans: Clan[]; selectedClan: Clan | null; members: ClanMember[]; goals: ClanGoal[]; isBusy: boolean;
  onSelect: (clan: Clan) => void | Promise<void>; onSync: (tag: string) => void | Promise<void>;
  onCreateManual: (tag: string, name: string) => void | Promise<void>;
  onCreateGoal: (goal: Omit<ClanGoal, "id" | "status">) => void | Promise<void>;
  onDeleteGoal: (id: string) => void | Promise<void>;
};

const roleNames: Record<ClanMember["role"], string> = { leader: "Anführer", co_leader: "Vize", admin: "Ältester", member: "Mitglied" };

export function ClanDashboard({ clans, selectedClan, members, goals, isBusy, onSelect, onSync, onCreateManual, onCreateGoal, onDeleteGoal }: Props) {
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const metrics = useMemo(() => calculateClanDashboard(members), [members]);

  const submitGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedClan) return;
    const form = event.currentTarget; const data = new FormData(form);
    void onCreateGoal({ clanId: selectedClan.id, name: String(data.get("name") || "").trim(),
      description: String(data.get("description") || "").trim(), targetValue: Number(data.get("targetValue")) || 1,
      currentValue: Number(data.get("currentValue")) || 0, targetDate: String(data.get("targetDate") || "") || null });
    form.reset();
  };

  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><h2 className="text-2xl font-bold">Clan-Zentrale</h2><p className="mt-1 text-sm text-slate-400">Mitglieder, Rollen, Aktivität, CWL-Bereitschaft und gemeinsame Ziele.</p></div>
      {clans.length ? <label className="text-sm text-slate-300">Aktiver Clan<select value={selectedClan?.id || ""} onChange={(event) => { const clan = clans.find((item) => item.id === event.target.value); if (clan) void onSelect(clan); }} className="mt-2 block rounded-xl border border-white/10 bg-slate-950 p-3">{clans.map((clan) => <option key={clan.id} value={clan.id}>{clan.name} ({clan.clanTag})</option>)}</select></label> : null}
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
      <input aria-label="Clan-Tag" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="#CLANTAG" className="rounded-xl border border-white/10 bg-slate-950 p-3" />
      <input aria-label="Clan-Name für manuelle Anlage" value={name} onChange={(event) => setName(event.target.value)} placeholder="Clan-Name (nur manuell)" className="rounded-xl border border-white/10 bg-slate-950 p-3" />
      <button type="button" disabled={isBusy || !tag} onClick={() => void onSync(tag)} className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">API synchronisieren</button>
      <button type="button" disabled={isBusy || !tag || !name} onClick={() => void onCreateManual(tag, name)} className="rounded-xl border border-white/10 px-4 py-3 font-bold disabled:opacity-40">Manuell anlegen</button>
    </div>

    {!selectedClan ? <p className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-400">Lege einen Clan an oder synchronisiere ihn über den Clan-Tag.</p> : <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['Mitglieder', metrics.memberCount], ['Ø Rathaus', metrics.averageTownHall], ['Spenden', metrics.totalDonations], ['CWL-bereit*', metrics.cwlReadyCount], ['Wenig aktiv*', metrics.inactiveCount]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-900 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
      </div>
      <p className="mt-2 text-xs text-slate-500">* Heuristik aus Rathaus, Trophäen und Spenden; keine offizielle CWL- oder Online-Status-Angabe.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Mitglied</th><th>Rolle</th><th>TH</th><th>Trophäen</th><th>Spenden</th><th>Aktivität*</th><th>CWL*</th></tr></thead><tbody>{members.map((member) => <tr key={member.playerTag} className="border-t border-white/5"><td className="p-3"><b>{member.name}</b><span className="ml-2 text-xs text-slate-500">{member.playerTag}</span></td><td>{roleNames[member.role]}</td><td>{member.townHallLevel}</td><td>{member.trophies}</td><td>{member.donations}</td><td>{member.activityScore}%</td><td>{member.cwlReady ? 'Bereit' : 'Aufbau'}</td></tr>)}</tbody></table>
        {!members.length ? <p className="p-4 text-slate-400">Noch keine Mitglieder importiert.</p> : null}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={submitGoal} className="rounded-2xl bg-slate-900 p-5"><h3 className="font-bold">Clan-Ziel anlegen</h3><div className="mt-3 grid gap-3"><input required name="name" placeholder="z. B. 15 CWL-bereite Accounts" className="rounded-xl border border-white/10 bg-slate-950 p-3"/><textarea name="description" placeholder="Beschreibung" className="rounded-xl border border-white/10 bg-slate-950 p-3"/><div className="grid grid-cols-2 gap-3"><input name="currentValue" min="0" type="number" placeholder="Aktuell" className="rounded-xl border border-white/10 bg-slate-950 p-3"/><input required name="targetValue" min="1" type="number" placeholder="Ziel" className="rounded-xl border border-white/10 bg-slate-950 p-3"/></div><input name="targetDate" type="date" className="rounded-xl border border-white/10 bg-slate-950 p-3"/><button className="rounded-xl bg-emerald-400 p-3 font-bold text-slate-950">Ziel speichern</button></div></form>
        <div className="grid content-start gap-3">{goals.map((goal) => <article key={goal.id} className="rounded-2xl bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{goal.name}</h3><p className="mt-1 text-sm text-slate-400">{goal.description || 'Keine Beschreibung'}</p></div><button type="button" onClick={() => void onDeleteGoal(goal.id)} className="text-sm text-red-300">Löschen</button></div><div className="mt-3 h-2 overflow-hidden rounded bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, goal.currentValue / goal.targetValue * 100)}%` }}/></div><p className="mt-2 text-xs text-slate-400">{goal.currentValue} / {goal.targetValue}{goal.targetDate ? ` · bis ${new Date(goal.targetDate).toLocaleDateString('de-DE')}` : ''}</p></article>)}{!goals.length ? <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">Noch keine Clan-Ziele.</p> : null}</div>
      </div>
    </>}
  </section>;
}
