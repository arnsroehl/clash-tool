import type {
  Recommendation,
  RecommendationReason,
  RecommendationReasonCode,
} from "@/features/decision-engine/decision-engine.types";

type Language = "de" | "en";

function number(value: number | undefined, language: Language): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function resourceName(reason: RecommendationReason, language: Language): string {
  const resource = String(reason.metadata?.resource || reason.unit || "resources");
  const labels: Record<string, { de: string; en: string }> = {
    gold: { de: "Gold", en: "Gold" },
    elixir: { de: "Elixier", en: "Elixir" },
    darkElixir: { de: "Dunkles Elixier", en: "Dark Elixir" },
    dark_elixir: { de: "Dunkles Elixier", en: "Dark Elixir" },
  };
  return labels[resource]?.[language] || resource;
}

const STATIC_TEXT: Record<RecommendationReasonCode, { de: string; en: string }> = {
  BASE_PLANNER_VALUE: { de: "Der Grundwert ergibt sich aus Fortschritt, Typ und Upgradepfad.", en: "The base value comes from progress, type and upgrade path." },
  STRATEGY_ALIGNMENT: { de: "Das Upgrade passt gut zur gewählten Strategie.", en: "This upgrade aligns well with the selected strategy." },
  ACTIVE_GOAL_DIRECT: { de: "Das Upgrade ist direkt für ein aktives Ziel erforderlich.", en: "This upgrade is directly required by an active goal." },
  ACTIVE_GOAL_SUPPORT: { de: "Das Upgrade unterstützt ein aktives Ziel in derselben Kategorie.", en: "This upgrade supports an active goal in the same category." },
  GOAL_DEADLINE_URGENCY: { de: "Der Zieltermin ist nah; dieses Upgrade sollte zeitnah eingeplant werden.", en: "The goal deadline is close, so this upgrade should be scheduled soon." },
  NOT_GOAL_RELEVANT: { de: "Das Upgrade ist für kein aktives Ziel direkt notwendig.", en: "This upgrade is not directly required by an active goal." },
  FAST_COMPLETION: { de: "Das Upgrade ist schnell abgeschlossen.", en: "This upgrade completes quickly." },
  LONG_BUILDER_COMMITMENT: { de: "Das Upgrade bindet seinen Slot vergleichsweise lange.", en: "This upgrade occupies its slot for a comparatively long time." },
  TIME_EFFICIENT: { de: "Das Verhältnis aus Dauer und Fortschritt ist günstig.", en: "Its progress-to-duration ratio is favorable." },
  COST_EFFICIENT: { de: "Die Kosten sind im Verhältnis zur Lagerkapazität effizient.", en: "The cost is efficient relative to storage capacity." },
  RESOURCE_AVAILABLE: { de: "Die benötigte Ressource ist bereits vorhanden.", en: "The required resource is already available." },
  RESOURCE_SHORTFALL: { de: "Die benötigte Ressource reicht aktuell nicht aus.", en: "The required resource is currently insufficient." },
  RESOURCE_OVERFLOW_PREVENTION: { de: "Das Upgrade nutzt eine Ressource, deren Lager fast voll ist.", en: "This upgrade spends a resource whose storage is nearly full." },
  PREVENTS_BUILDER_IDLE: { de: "Das Upgrade kann einen aktuell freien Slot direkt nutzen.", en: "This upgrade can use an available slot immediately." },
  UNFAVORABLE_FINISH_TIME: { de: "Die berechnete Fertigstellung liegt in einer ungünstigen Nachtzeit.", en: "The calculated completion falls at an inconvenient overnight time." },
  UNLOCKS_FUTURE_UPGRADES: { de: "Das Upgrade unterstützt Freischaltungen oder eine wichtige Folgeketten.", en: "This upgrade supports unlocks or an important follow-up chain." },
  CATCH_UP_PROGRESS_GAP: { de: "Der Bereich besitzt gegenüber seinem Maximum eine deutliche Fortschrittslücke.", en: "This area has a notable progress gap to its maximum." },
  ACTIVE_EVENT_DISCOUNT: { de: "Ein aktives Event verbessert Kosten oder Dauer.", en: "An active event improves cost or duration." },
  FUTURE_EVENT_OPPORTUNITY: { de: "Ein kommendes Event könnte dieses Upgrade günstiger oder schneller machen.", en: "An upcoming event could make this upgrade cheaper or faster." },
  MAGIC_ITEM_AVAILABLE: { de: "Ein nicht reserviertes Magic Item kann bei diesem Upgrade Zeit sparen.", en: "An unreserved Magic Item can save time on this upgrade." },
  USER_PREFERRED: { de: "Du hast dieses Upgrade manuell bevorzugt.", en: "You manually preferred this upgrade." },
  USER_AVOIDED: { de: "Du möchtest dieses Upgrade möglichst vermeiden.", en: "You prefer to avoid this upgrade." },
  USER_EXCLUDED: { de: "Du hast dieses Upgrade von Empfehlungen ausgeschlossen.", en: "You excluded this upgrade from recommendations." },
  ALREADY_QUEUED: { de: "Dieses Upgrade ist bereits in der Queue.", en: "This upgrade is already in the queue." },
  LOCKED_QUEUE_RESPECTED: { de: "Der gesperrte Queue-Eintrag bleibt unverändert.", en: "The locked queue entry remains unchanged." },
  MISSING_RESOURCE_DATA: { de: "Für eine genaue Ressourcenbewertung fehlen aktuelle Werte.", en: "Current values are missing for an exact resource assessment." },
};

export function explainRecommendationReason(
  reason: RecommendationReason,
  language: Language,
): string {
  if (reason.code === "RESOURCE_SHORTFALL")
    return language === "en"
      ? `${number(reason.value, language)} ${resourceName(reason, language)} are currently missing.`
      : `Aktuell fehlen ${number(reason.value, language)} ${resourceName(reason, language)}.`;
  if (reason.code === "RESOURCE_AVAILABLE")
    return language === "en"
      ? `${number(reason.value, language)} ${resourceName(reason, language)} required — already available.`
      : `${number(reason.value, language)} ${resourceName(reason, language)} benötigt – bereits vorhanden.`;
  if (reason.code === "FAST_COMPLETION" || reason.code === "LONG_BUILDER_COMMITMENT" || reason.code === "TIME_EFFICIENT")
    return `${STATIC_TEXT[reason.code][language]} ${number(reason.value, language)} h.`;
  if (reason.code === "ACTIVE_EVENT_DISCOUNT")
    return language === "en"
      ? `${String(reason.metadata?.event || "Event")}: up to ${number(reason.value, language)}% discount.`
      : `${String(reason.metadata?.event || "Event")}: bis zu ${number(reason.value, language)} % Vorteil.`;
  if (reason.code === "FUTURE_EVENT_OPPORTUNITY")
    return language === "en"
      ? `${String(reason.metadata?.event || "Event")} starts in about ${number(reason.value, language)} hours.`
      : `${String(reason.metadata?.event || "Event")} beginnt in etwa ${number(reason.value, language)} Stunden.`;
  return STATIC_TEXT[reason.code][language];
}

export function shortRecommendationExplanation(
  recommendation: Recommendation,
  language: Language,
): string {
  return recommendation.positiveFactors
    .slice(0, 2)
    .map((entry) => explainRecommendationReason(entry, language))
    .join(" ");
}

export function compareRecommendationExplanation(
  recommendation: Recommendation,
  alternative: Recommendation["alternatives"][number],
  language: Language,
): string {
  const decisive = explainRecommendationReason({
    code: alternative.decisiveReasonCode,
    polarity: "neutral",
    impact: 0,
  }, language);
  if (language === "en")
    return `${recommendation.name} ranks ${Math.abs(alternative.scoreDifference)} points ${alternative.scoreDifference >= 0 ? "ahead of" : "behind"} ${alternative.name}. Main difference: ${decisive}`;
  return `${recommendation.name} liegt ${Math.abs(alternative.scoreDifference)} Punkte ${alternative.scoreDifference >= 0 ? "vor" : "hinter"} ${alternative.name}. Wichtigster Unterschied: ${decisive}`;
}
