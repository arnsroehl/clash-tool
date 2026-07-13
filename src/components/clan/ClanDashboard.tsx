"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateClanDashboard } from "@/features/clan-dashboard/clan-dashboard";
import type {
  Clan,
  ClanCollaborator,
  ClanGoal,
  ClanInvite,
  ClanMember,
} from "@/types/clan";

type Props = {
  currentUserId: string;
  language?: "de" | "en";
  clans: Clan[];
  selectedClan: Clan | null;
  members: ClanMember[];
  goals: ClanGoal[];
  collaborators: ClanCollaborator[];
  invites: ClanInvite[];
  isBusy: boolean;
  onSelect: (clan: Clan) => void | Promise<void>;
  onSync: (tag: string) => void | Promise<void>;
  onCreateManual: (tag: string, name: string) => void | Promise<void>;
  onCreateGoal: (goal: Omit<ClanGoal, "id" | "status">) => void | Promise<void>;
  onDeleteGoal: (id: string) => void | Promise<void>;
  onCreateInvite: (role: ClanInvite["role"]) => void | Promise<void>;
  onDeleteInvite: (id: string) => void | Promise<void>;
  onJoinClan: (code: string) => void | Promise<void>;
  onChangeCollaboratorRole: (
    userId: string,
    role: ClanCollaborator["role"],
  ) => void | Promise<void>;
  onRemoveCollaborator: (userId: string) => void | Promise<void>;
};

const roleNames: Record<"de" | "en", Record<ClanMember["role"], string>> = {
  de: {
    leader: "Anführer",
    co_leader: "Vize",
    admin: "Ältester",
    member: "Mitglied",
  },
  en: {
    leader: "Leader",
    co_leader: "Co-leader",
    admin: "Elder",
    member: "Member",
  },
};

export function ClanDashboard({
  currentUserId,
  language = "de",
  clans,
  selectedClan,
  members,
  goals,
  collaborators,
  invites,
  isBusy,
  onSelect,
  onSync,
  onCreateManual,
  onCreateGoal,
  onDeleteGoal,
  onCreateInvite,
  onDeleteInvite,
  onJoinClan,
  onChangeCollaboratorRole,
  onRemoveCollaborator,
}: Props) {
  const en = language === "en";
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<ClanInvite["role"]>("member");
  const metrics = useMemo(() => calculateClanDashboard(members), [members]);
  const ownRole =
    selectedClan?.ownerUserId === currentUserId
      ? "leader"
      : collaborators.find((item) => item.userId === currentUserId)?.role;
  const canManagePlanning = ownRole === "leader" || ownRole === "co_leader";
  const canManageAccess = ownRole === "leader";

  const submitGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClan) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    void onCreateGoal({
      clanId: selectedClan.id,
      name: String(data.get("name") || "").trim(),
      description: String(data.get("description") || "").trim(),
      targetValue: Number(data.get("targetValue")) || 1,
      currentValue: Number(data.get("currentValue")) || 0,
      targetDate: String(data.get("targetDate") || "") || null,
    });
    form.reset();
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {en ? "Clan Center" : "Clan-Zentrale"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {en
              ? "Members, roles, activity, CWL readiness and shared goals."
              : "Mitglieder, Rollen, Aktivität, CWL-Bereitschaft und gemeinsame Ziele."}
          </p>
        </div>
        {clans.length ? (
          <label className="text-sm text-slate-300">
            {en ? "Active clan" : "Aktiver Clan"}
            <select
              value={selectedClan?.id || ""}
              onChange={(event) => {
                const clan = clans.find(
                  (item) => item.id === event.target.value,
                );
                if (clan) void onSelect(clan);
              }}
              className="mt-2 block rounded-xl border border-white/10 bg-slate-950 p-3"
            >
              {clans.map((clan) => (
                <option key={clan.id} value={clan.id}>
                  {clan.name} ({clan.clanTag})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <input
          aria-label={en ? "Clan tag" : "Clan-Tag"}
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="#CLANTAG"
          className="rounded-xl border border-white/10 bg-slate-950 p-3"
        />
        <input
          aria-label={
            en
              ? "Clan name for manual creation"
              : "Clan-Name für manuelle Anlage"
          }
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={
            en ? "Clan name (manual only)" : "Clan-Name (nur manuell)"
          }
          className="rounded-xl border border-white/10 bg-slate-950 p-3"
        />
        <button
          type="button"
          disabled={isBusy || !tag}
          onClick={() => void onSync(tag)}
          className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          {en ? "Sync API" : "API synchronisieren"}
        </button>
        <button
          type="button"
          disabled={isBusy || !tag || !name}
          onClick={() => void onCreateManual(tag, name)}
          className="rounded-xl border border-white/10 px-4 py-3 font-bold disabled:opacity-40"
        >
          {en ? "Create manually" : "Manuell anlegen"}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900 p-4 md:flex-row md:items-center">
        <input
          aria-label="Clan invite code"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
          placeholder={en ? "Enter invite code" : "Einladungscode eingeben"}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"
        />
        <button
          type="button"
          disabled={isBusy || !inviteCode}
          onClick={() => void onJoinClan(inviteCode)}
          className="rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          {en ? "Join shared clan" : "Gemeinsamem Clan beitreten"}
        </button>
      </div>

      {!selectedClan ? (
        <p className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-400">
          {en
            ? "Create a clan or sync it using the clan tag."
            : "Lege einen Clan an oder synchronisiere ihn über den Clan-Tag."}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [en ? "Members" : "Mitglieder", metrics.memberCount],
              [en ? "Ø Town Hall" : "Ø Rathaus", metrics.averageTownHall],
              [en ? "Donations" : "Spenden", metrics.totalDonations],
              [en ? "CWL ready*" : "CWL-bereit*", metrics.cwlReadyCount],
              [en ? "Low activity*" : "Wenig aktiv*", metrics.inactiveCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {en
              ? "* Heuristic based on Town Hall, trophies and donations; not an official CWL or online status."
              : "* Heuristik aus Rathaus, Trophäen und Spenden; keine offizielle CWL- oder Online-Status-Angabe."}
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">{en ? "Member" : "Mitglied"}</th>
                  <th>{en ? "Role" : "Rolle"}</th>
                  <th>TH</th>
                  <th>{en ? "Trophies" : "Trophäen"}</th>
                  <th>{en ? "Donations" : "Spenden"}</th>
                  <th>{en ? "Activity*" : "Aktivität*"}</th>
                  <th>CWL*</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.playerTag}
                    className="border-t border-white/5"
                  >
                    <td className="p-3">
                      <b>{member.name}</b>
                      <span className="ml-2 text-xs text-slate-500">
                        {member.playerTag}
                      </span>
                    </td>
                    <td>{roleNames[language][member.role]}</td>
                    <td>{member.townHallLevel}</td>
                    <td>{member.trophies}</td>
                    <td>{member.donations}</td>
                    <td>{member.activityScore}%</td>
                    <td>
                      {member.cwlReady
                        ? en
                          ? "Ready"
                          : "Bereit"
                        : en
                          ? "Building"
                          : "Aufbau"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!members.length ? (
              <p className="p-4 text-slate-400">
                {en
                  ? "No members imported yet."
                  : "Noch keine Mitglieder importiert."}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <form
              onSubmit={submitGoal}
              className="rounded-2xl bg-slate-900 p-5"
            >
              <h3 className="font-bold">
                {en ? "Create clan goal" : "Clan-Ziel anlegen"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {en ? "Your role" : "Deine Rolle"}:{" "}
                {ownRole === "leader"
                  ? en
                    ? "Leader"
                    : "Leiter"
                  : ownRole === "co_leader"
                    ? en
                      ? "Co-leader"
                      : "Vize"
                    : en
                      ? "Member"
                      : "Mitglied"}
              </p>
              <div className="mt-3 grid gap-3">
                <input
                  required
                  name="name"
                  placeholder={
                    en
                      ? "e.g. 15 CWL-ready accounts"
                      : "z. B. 15 CWL-bereite Accounts"
                  }
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
                <textarea
                  name="description"
                  placeholder={en ? "Description" : "Beschreibung"}
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="currentValue"
                    min="0"
                    type="number"
                    placeholder={en ? "Current" : "Aktuell"}
                    className="rounded-xl border border-white/10 bg-slate-950 p-3"
                  />
                  <input
                    required
                    name="targetValue"
                    min="1"
                    type="number"
                    placeholder={en ? "Target" : "Ziel"}
                    className="rounded-xl border border-white/10 bg-slate-950 p-3"
                  />
                </div>
                <input
                  name="targetDate"
                  type="date"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
                <button
                  disabled={!canManagePlanning}
                  className="rounded-xl bg-emerald-400 p-3 font-bold text-slate-950 disabled:opacity-40"
                >
                  {en ? "Save goal" : "Ziel speichern"}
                </button>
              </div>
            </form>
            <div className="grid content-start gap-3">
              {goals.map((goal) => (
                <article key={goal.id} className="rounded-2xl bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {goal.description ||
                          (en ? "No description" : "Keine Beschreibung")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteGoal(goal.id)}
                      className="text-sm text-red-300"
                    >
                      {en ? "Delete" : "Löschen"}
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded bg-slate-700">
                    <div
                      className="h-full bg-emerald-400"
                      style={{
                        width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {goal.currentValue} / {goal.targetValue}
                    {goal.targetDate
                      ? ` · ${en ? "by" : "bis"} ${new Date(goal.targetDate).toLocaleDateString(en ? "en-US" : "de-DE")}`
                      : ""}
                  </p>
                </article>
              ))}
              {!goals.length ? (
                <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">
                  {en ? "No clan goals yet." : "Noch keine Clan-Ziele."}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h3 className="font-bold">
              {en ? "Shared planning & roles" : "Gemeinsame Planung & Rollen"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {en
                ? "Leaders create invitations and manage roles. Co-leaders can maintain the member overview and clan goals."
                : "Leiter erstellen Einladungen und verwalten Rollen. Vizes können Mitgliederübersicht und Clan-Ziele pflegen."}
            </p>
            {canManageAccess ? (
              <div className="mt-4 flex flex-col gap-2 md:flex-row">
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as ClanInvite["role"])
                  }
                  className="rounded-xl bg-slate-950 p-3"
                >
                  <option value="member">{en ? "Member" : "Mitglied"}</option>
                  <option value="co_leader">{en ? "Co-leader" : "Vize"}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void onCreateInvite(inviteRole)}
                  className="rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950"
                >
                  {en ? "Create invitation" : "Einladung erstellen"}
                </button>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-bold text-slate-300">
                  {en ? "Active access" : "Aktive Zugriffe"}
                </h4>
                <div className="mt-2 grid gap-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.userId}
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-950 p-3 text-sm"
                    >
                      <span className="mr-auto font-mono text-xs">
                        {collaborator.userId.slice(0, 8)}…
                      </span>
                      <select
                        disabled={!canManageAccess}
                        value={collaborator.role}
                        onChange={(event) =>
                          void onChangeCollaboratorRole(
                            collaborator.userId,
                            event.target.value as ClanCollaborator["role"],
                          )
                        }
                        className="rounded-lg bg-slate-900 p-2"
                      >
                        <option value="member">
                          {en ? "Member" : "Mitglied"}
                        </option>
                        <option value="co_leader">
                          {en ? "Co-leader" : "Vize"}
                        </option>
                        <option value="leader">
                          {en ? "Leader" : "Leiter"}
                        </option>
                      </select>
                      {canManageAccess ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onRemoveCollaborator(collaborator.userId)
                          }
                          className="text-xs font-bold text-red-300"
                        >
                          {en ? "Remove" : "Entfernen"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {!collaborators.length ? (
                    <p className="text-sm text-slate-500">
                      {en
                        ? "No additional users yet."
                        : "Noch keine weiteren Nutzer."}
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">
                  {en ? "Invitations" : "Einladungen"}
                </h4>
                <div className="mt-2 grid gap-2">
                  {invites
                    .filter((invite) => !invite.redeemedAt)
                    .map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-xl bg-slate-950 p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate text-xs text-indigo-200">
                            {invite.inviteCode}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              void navigator.clipboard.writeText(
                                invite.inviteCode,
                              )
                            }
                            className="text-xs font-bold text-indigo-300"
                          >
                            {en ? "Copy" : "Kopieren"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteInvite(invite.id)}
                            className="text-xs font-bold text-red-300"
                          >
                            {en ? "Delete" : "Löschen"}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {en ? "Role" : "Rolle"}:{" "}
                          {invite.role === "co_leader"
                            ? en
                              ? "Co-leader"
                              : "Vize"
                            : en
                              ? "Member"
                              : "Mitglied"}{" "}
                          · {en ? "valid until" : "gültig bis"}{" "}
                          {new Date(invite.expiresAt).toLocaleString(
                            en ? "en-US" : "de-DE",
                          )}
                        </p>
                      </div>
                    ))}
                  {!invites.some((invite) => !invite.redeemedAt) ? (
                    <p className="text-sm text-slate-500">
                      {en
                        ? "No open invitations."
                        : "Keine offenen Einladungen."}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
