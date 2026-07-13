"use client";
import { useState } from "react";
import {
  answerAssistant,
  type AssistantContext,
  type AssistantQuestion,
} from "@/features/personal-assistant/personal-assistant";
type Props = {
  context: AssistantContext;
  language?: "de" | "en";
  onAdd?: (
    r: NonNullable<ReturnType<typeof answerAssistant>["action"]>,
  ) => void;
};
const questionLabels: Record<"de" | "en", [AssistantQuestion, string][]> = {
  de: [
    ["next", "Was soll ich als Nächstes upgraden?"],
    ["town_hall", "Lohnt sich das Rathaus-Upgrade jetzt?"],
    ["heroes_or_defense", "Helden oder Verteidigung zuerst?"],
    ["delay", "Warum verzögert sich mein Plan?"],
    ["save_time", "Wie kann ich Zeit sparen?"],
    ["strategy", "Welche Strategie passt zu mir?"],
    ["biggest_gap", "Wo liegt mein größter Rückstand?"],
  ],
  en: [
    ["next", "What should I upgrade next?"],
    ["town_hall", "Should I upgrade Town Hall now?"],
    ["heroes_or_defense", "Heroes or defenses first?"],
    ["delay", "Why is my plan delayed?"],
    ["save_time", "How can I save time?"],
    ["strategy", "Which strategy fits me?"],
    ["biggest_gap", "What is my biggest gap?"],
  ],
};
export function PersonalAssistant({ context, language = "de", onAdd }: Props) {
  const [selected, setSelected] = useState<AssistantQuestion>("next");
  const en = language === "en";
  const result = answerAssistant(selected, context, language);
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">
          {en ? "Data-based assistant" : "Datenbasierter Assistent"}
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          {en ? "Ask your plan" : "Frag deinen Plan"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {en
            ? "Answers are generated exclusively from your account and planner calculations."
            : "Antworten werden ausschließlich aus deinem Account und den Planerberechnungen erzeugt."}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {questionLabels[language].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`rounded-xl px-3 py-2 text-sm ${selected === id ? "bg-amber-400 font-bold text-slate-950" : "bg-slate-900 text-slate-300"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-slate-900 p-5">
        <h3 className="text-xl font-bold">{result.title}</h3>
        <p className="mt-3 text-slate-200">{result.answer}</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          {result.evidence.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
        {result.action && onAdd ? (
          <button
            onClick={() => onAdd(result.action!)}
            className="mt-5 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"
          >
            {en
              ? "Schedule recommended upgrade"
              : "Empfohlenes Upgrade einplanen"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
