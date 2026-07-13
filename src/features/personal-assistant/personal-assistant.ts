import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type {
  PlannerResult,
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";
import type { MagicInventoryItem, PlanningEvent } from "@/types/magicItems";
import type { PlanningProfile } from "@/types/planningProfile";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";
import { calculateMagicItemUses } from "@/features/magic-items/magic-item-advisor";

export type AssistantQuestion =
  | "next"
  | "town_hall"
  | "heroes_or_defense"
  | "delay"
  | "save_time"
  | "strategy"
  | "biggest_gap";
export type AssistantAnswer = {
  title: string;
  answer: string;
  evidence: string[];
  action?: UpgradeRecommendation;
};
export type AssistantContext = {
  planner: PlannerResult | null;
  recommendations: UpgradeRecommendation[];
  queue: UpgradeQueueItem[];
  simulation: BuilderSimulationResult;
  resources: ResourceSnapshot;
  inventory: MagicInventoryItem[];
  events: PlanningEvent[];
  profile: PlanningProfile | null;
};
const fmt = (n: number, language: "de" | "en" = "de") =>
  new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE").format(
    Math.round(n),
  );

function calculateTwoWeekSaving(c: AssistantContext) {
  const magic = c.inventory
    .flatMap((item) =>
      item.quantity > 0
        ? calculateMagicItemUses(item, c.queue)
            .slice(0, item.quantity)
            .map((use) => ({ name: item.name, hours: use.timeSavedHours }))
        : [],
    )
    .filter((item) => item.hours > 0);
  const eventPercent = Math.max(
    0,
    ...c.events
      .filter((event) => event.enabled)
      .map((event) => event.timeDiscountPercent),
  );
  const eventHours = (c.simulation.totalDurationHours * eventPercent) / 100;
  const magicHours = magic.reduce((sum, item) => sum + item.hours, 0);
  return {
    magic,
    eventPercent,
    eventHours,
    totalHours: magicHours + eventHours,
    targetHours: 14 * 24,
  };
}

function answerAssistantEnglish(
  question: AssistantQuestion,
  c: AssistantContext,
): AssistantAnswer {
  const top = c.recommendations[0];
  const longest = [...c.queue]
    .filter((q) => q.status === "planned" || q.status === "active")
    .sort((a, b) => b.durationHours - a.durationHours)[0];
  if (question === "next")
    return top
      ? {
          title: "Next upgrade",
          answer: `${top.name} to level ${top.nextLevel} is currently the strongest recommendation.`,
          evidence: [
            `Priority 1 of ${c.recommendations.length} possible upgrades`,
            `${fmt(top.nextLevelTime.hours, "en")} hours`,
            `${top.missingLevels} levels remaining to the current maximum`,
          ],
          action: top,
        }
      : {
          title: "Next upgrade",
          answer: "No possible upgrade was found right now.",
          evidence: ["All available items are maxed or blocked by Town Hall."],
        };
  if (question === "town_hall") {
    const th = c.recommendations.find((r) => /rathaus|town hall/i.test(r.name));
    const progress = c.planner?.summary.progressPercent || 0;
    return {
      title: "Town Hall decision",
      answer:
        th && progress >= 75
          ? `The Town Hall step to level ${th.nextLevel} is reasonable.`
          : th
            ? "I would not prioritize Town Hall yet."
            : "No Town Hall upgrade is currently available as a valid next step.",
      evidence: [
        `Overall progress ${fmt(progress, "en")}%`,
        `${c.planner?.summary.remainingLevels || 0} remaining levels`,
        th
          ? `Town Hall priority ${c.recommendations.indexOf(th) + 1}`
          : "Town Hall is not among possible upgrades",
      ],
      action: th,
    };
  }
  if (question === "heroes_or_defense") {
    const hero = c.recommendations.find((r) => r.itemType === "hero");
    const defense =
      c.recommendations.find(
        (r) =>
          r.itemType === "building" &&
          /defen|verteid|kanone|turm|mörser|inferno|adler|monolith/i.test(
            `${r.category} ${r.name}`,
          ),
      ) || c.recommendations.find((r) => r.itemType === "building");
    const choice =
      !defense ||
      (hero &&
        c.recommendations.indexOf(hero) < c.recommendations.indexOf(defense))
        ? hero
        : defense;
    return choice
      ? {
          title: "Heroes or defenses",
          answer: `${choice.itemType === "hero" ? "Heroes" : "Defenses"} first: ${choice.name} to level ${choice.nextLevel}.`,
          evidence: [
            hero
              ? `Best hero: priority ${c.recommendations.indexOf(hero) + 1}`
              : "No hero upgrade available",
            defense
              ? `Best defense: priority ${c.recommendations.indexOf(defense) + 1}`
              : "No defense available",
          ],
          action: choice,
        }
      : {
          title: "Heroes or defenses",
          answer: "Neither system has an available upgrade.",
          evidence: [],
        };
  }
  if (question === "delay")
    return {
      title: "Why is the plan delayed?",
      answer: !c.queue.length
        ? "The queue is empty, so the plan cannot simulate progress."
        : c.simulation.idleTimeHours > 0
          ? "The delay mainly comes from builder idle time and the current queue distribution."
          : "The queue is fully utilized; the remaining duration comes from the scheduled upgrade times.",
      evidence: [
        `${c.queue.length} queue entries`,
        `${fmt(c.simulation.totalDurationHours, "en")} total hours`,
        `${fmt(c.simulation.idleTimeHours, "en")} calculated idle hours`,
        `${c.events.filter((e) => e.enabled).length} enabled event settings`,
      ],
    };
  if (question === "save_time") {
    const saving = calculateTwoWeekSaving(c);
    return {
      title: "How can I save two weeks?",
      answer: !c.queue.length
        ? "Schedule upgrades in the queue first so savings can be calculated."
        : saving.totalHours >= saving.targetHours
          ? `Your entered items and event settings can save about ${fmt(saving.totalHours, "en")} hours, reaching the two-week target.`
          : `The current plan can verify about ${fmt(saving.totalHours, "en")} saved hours. Another ${fmt(saving.targetHours - saving.totalHours, "en")} hours are needed for two full weeks.`,
      evidence: [
        ...saving.magic
          .slice(0, 4)
          .map((item) => `${item.name}: up to ${fmt(item.hours, "en")} hours`),
        `Active event discount ${saving.eventPercent}%: about ${fmt(saving.eventHours, "en")} hours`,
        longest
          ? `Longest queued upgrade: ${longest.name}, ${fmt(longest.durationHours, "en")} hours`
          : "Queue empty",
      ],
    };
  }
  if (question === "strategy") {
    const style = c.profile?.playStyle || "ambitious";
    const labels = {
      casual: "casual player",
      ambitious: "ambitious player",
      hardcore: "hardcore player",
    };
    return {
      title: "Matching strategy",
      answer: `Your profile is “${labels[style]}”. ${style === "casual" ? "A balanced plan with a few clear steps fits best." : style === "hardcore" ? "Custom weights, scenarios and full queue control fit best." : "Use strategy, goals, queue and resource planning together."}`,
      evidence: [
        `Saved play style: ${labels[style]}`,
        `${c.recommendations.length} possible upgrades`,
        `${c.simulation.builderCount} builders in the simulation`,
      ],
    };
  }
  const gap = [...(c.planner?.possibleUpgrades || [])].sort(
    (a, b) => b.missingLevels - a.missingLevels,
  )[0];
  return gap
    ? {
        title: "Biggest gap",
        answer: `${gap.name} has the largest detected gap with ${gap.missingLevels} missing levels.`,
        evidence: [
          `Current level ${gap.currentLevel}`,
          `Maximum level ${gap.maxLevel}`,
          `${fmt(gap.remainingTime.hours, "en")} remaining upgrade hours`,
        ],
        action: c.recommendations.find((r) => r.itemId === gap.itemId),
      }
    : {
        title: "Biggest gap",
        answer: "No gap found.",
        evidence: ["All available items are maxed."],
      };
}

export function answerAssistant(
  question: AssistantQuestion,
  c: AssistantContext,
  language: "de" | "en" = "de",
): AssistantAnswer {
  if (language === "en") return answerAssistantEnglish(question, c);
  const top = c.recommendations[0];
  const longest = [...c.queue]
    .filter((q) => q.status === "planned" || q.status === "active")
    .sort((a, b) => b.durationHours - a.durationHours)[0];
  if (question === "next")
    return top
      ? {
          title: "Nächstes Upgrade",
          answer: `${top.name} auf Level ${top.nextLevel} ist aktuell die stärkste Empfehlung.`,
          evidence: [
            `Priorität 1 von ${c.recommendations.length} möglichen Upgrades`,
            `Dauer ${fmt(top.nextLevelTime.hours)} Stunden`,
            `Noch ${top.missingLevels} Level bis zum aktuellen Maximum`,
            top.recommendationReason,
          ],
          action: top,
        }
      : {
          title: "Nächstes Upgrade",
          answer: "Aktuell wurde kein mögliches Upgrade gefunden.",
          evidence: [
            "Alle verfügbaren Items sind maximal oder durch das Rathaus gesperrt.",
          ],
        };
  if (question === "town_hall") {
    const th = c.recommendations.find((r) => /rathaus|town hall/i.test(r.name));
    const progress = c.planner?.summary.progressPercent || 0;
    return {
      title: "Rathaus-Entscheidung",
      answer:
        th && progress >= 75
          ? `Der Rathaus-Schritt auf Level ${th.nextLevel} ist vertretbar.`
          : th
            ? "Ich würde das Rathaus noch nicht vorziehen."
            : "Aktuell ist kein Rathaus-Upgrade als zulässiger nächster Schritt vorhanden.",
      evidence: [
        `Gesamtfortschritt ${fmt(progress)} %`,
        `${c.planner?.summary.remainingLevels || 0} Restlevel`,
        th
          ? `Rathaus steht auf Priorität ${c.recommendations.indexOf(th) + 1}`
          : "Rathaus nicht in den möglichen Upgrades",
      ],
      action: th,
    };
  }
  if (question === "heroes_or_defense") {
    const hero = c.recommendations.find((r) => r.itemType === "hero");
    const defense =
      c.recommendations.find(
        (r) =>
          r.itemType === "building" &&
          /defen|verteid|kanone|turm|mörser|inferno|adler|monolith/i.test(
            `${r.category} ${r.name}`,
          ),
      ) || c.recommendations.find((r) => r.itemType === "building");
    const choice =
      !defense ||
      (hero &&
        c.recommendations.indexOf(hero) < c.recommendations.indexOf(defense))
        ? hero
        : defense;
    return choice
      ? {
          title: "Helden oder Verteidigung",
          answer: `${choice.itemType === "hero" ? "Helden" : "Verteidigung"} zuerst: ${choice.name} auf Level ${choice.nextLevel}.`,
          evidence: [
            hero
              ? `Bester Held: Priorität ${c.recommendations.indexOf(hero) + 1}`
              : "Kein Heldenupgrade verfügbar",
            defense
              ? `Beste Verteidigung: Priorität ${c.recommendations.indexOf(defense) + 1}`
              : "Keine Verteidigung verfügbar",
          ],
          action: choice,
        }
      : {
          title: "Helden oder Verteidigung",
          answer:
            "Keines der beiden Systeme hat aktuell ein mögliches Upgrade.",
          evidence: [],
        };
  }
  if (question === "delay") {
    const hours = c.simulation.totalDurationHours;
    const idle = c.simulation.idleTimeHours;
    return {
      title: "Warum verzögert sich der Plan?",
      answer: !c.queue.length
        ? "Der Plan hat keine Queue und kann deshalb keinen Fortschritt simulieren."
        : idle > 0
          ? "Die Verzögerung kommt vor allem durch Bauarbeiter-Leerlauf und die aktuelle Queue-Verteilung."
          : "Die Queue ist ausgelastet; die verbleibende Dauer entsteht aus den eingeplanten Upgradezeiten.",
      evidence: [
        `${c.queue.length} Queue-Einträge`,
        `${fmt(hours)} Stunden Gesamtdauer`,
        `${fmt(idle)} Stunden berechneter Leerlauf`,
        `${c.events.filter((e) => e.enabled).length} aktive Event-Einstellungen`,
      ],
    };
  }
  if (question === "save_time") {
    const saving = calculateTwoWeekSaving(c);
    return {
      title: "Wie kann ich zwei Wochen sparen?",
      answer: !c.queue.length
        ? "Plane zuerst Upgrades in der Queue ein, damit die Ersparnis berechnet werden kann."
        : saving.totalHours >= saving.targetHours
          ? `Deine eingetragenen Gegenstände und Events sparen rechnerisch etwa ${fmt(saving.totalHours)} Stunden und erreichen damit zwei Wochen.`
          : `Der aktuelle Plan weist etwa ${fmt(saving.totalHours)} Stunden Ersparnis nach. Für volle zwei Wochen fehlen noch ${fmt(saving.targetHours - saving.totalHours)} Stunden.`,
      evidence: [
        ...saving.magic
          .slice(0, 4)
          .map((item) => `${item.name}: bis zu ${fmt(item.hours)} Stunden`),
        `Aktiver Event-Rabatt ${saving.eventPercent} %: ca. ${fmt(saving.eventHours)} Stunden`,
        longest
          ? `Längstes Queue-Upgrade: ${longest.name}, ${fmt(longest.durationHours)} Stunden`
          : "Queue leer",
      ],
    };
  }
  if (question === "strategy") {
    const style = c.profile?.playStyle || "ambitious";
    const labels = {
      casual: "Gelegenheitsspieler",
      ambitious: "ambitionierter Spieler",
      hardcore: "Hardcore-Spieler",
    };
    return {
      title: "Passende Strategie",
      answer: `Dein Profil ist „${labels[style]}“. ${style === "casual" ? "Eine ausgewogene Planung mit wenigen klaren Schritten passt am besten." : style === "hardcore" ? "Eigene Gewichtungen, Szenarien und vollständige Queue-Kontrolle passen am besten." : "Strategie, Ziele, Queue und Ressourcenplanung sollten gemeinsam verwendet werden."}`,
      evidence: [
        `Gespeicherter Spielstil: ${labels[style]}`,
        `${c.recommendations.length} mögliche Upgrades`,
        `Builder-Auslastung über ${c.simulation.builderCount} Bauarbeiter`,
      ],
    };
  }
  const gap = [...(c.planner?.possibleUpgrades || [])].sort(
    (a, b) => b.missingLevels - a.missingLevels,
  )[0];
  return gap
    ? {
        title: "Größter Rückstand",
        answer: `${gap.name} hat mit ${gap.missingLevels} fehlenden Leveln den größten erkannten Rückstand.`,
        evidence: [
          `Aktuell Level ${gap.currentLevel}`,
          `Maximum Level ${gap.maxLevel}`,
          `${fmt(gap.remainingTime.hours)} Stunden verbleibende Upgradezeit`,
        ],
        action: c.recommendations.find((r) => r.itemId === gap.itemId),
      }
    : {
        title: "Größter Rückstand",
        answer: "Kein Rückstand gefunden.",
        evidence: ["Alle verfügbaren Items sind maximal."],
      };
}
