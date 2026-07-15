import type { HealthAreaId } from "@/features/account-health/account-health.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { AccountAnalysisAction, AccountAnalysisFinding, AccountAnalysisInput, AccountAnalysisResult } from "@/features/account-analysis/account-analysis.types";

const labels: Record<HealthAreaId, { de: string; en: string }> = { offense: { de: "Offensive", en: "Offense" }, defense: { de: "Verteidigung", en: "Defense" }, heroes: { de: "Helden", en: "Heroes" }, laboratory: { de: "Labor", en: "Laboratory" }, resources: { de: "Ressourceninfrastruktur", en: "Resource infrastructure" }, walls: { de: "Mauern", en: "Walls" }, pets: { de: "Pets", en: "Pets" }, equipment: { de: "Ausrüstung", en: "Equipment" }, builderEfficiency: { de: "Upgradeeffizienz", en: "Upgrade efficiency" }, goalAchievement: { de: "Zielerreichung", en: "Goal achievement" } };
const key = (item: UpgradeRecommendation) => `${item.itemType}:${item.itemId}`;
function recommendationFor(area: HealthAreaId, items: UpgradeRecommendation[]) {
  const match = (item: UpgradeRecommendation) => { const text = `${item.name} ${item.category}`.toLocaleLowerCase("de"); if (area === "heroes") return item.itemType === "hero"; if (area === "laboratory") return item.itemType !== "building"; if (area === "defense") return item.itemType === "building" && /defen|verteid|kanone|turm|tesla|inferno|mörser|mortar/.test(text); if (area === "resources") return /lager|sammler|mine|bohrer|storage|collector|drill/.test(text); if (area === "offense") return item.itemType !== "building" || /labor|kaserne|armeelager|clanburg|army camp|barracks/.test(text); return false; };
  return items.find(match) || null;
}
function actionFor(area: HealthAreaId, score: number | null, items: UpgradeRecommendation[]): AccountAnalysisAction | null {
  if (score === null || score >= 80) return null; const item = recommendationFor(area, items);
  if (item) return { type: score < 60 ? "create_goal" : "add_queue", itemKey: key(item), de: score < 60 ? `${item.name} als Aufholziel anlegen` : `${item.name} zur Queue hinzufügen`, en: score < 60 ? `Create a catch-up goal for ${item.name}` : `Add ${item.name} to the queue` };
  if (area === "resources") return { type: "open_resources", de: "Ressourcenprofil anpassen", en: "Adjust resource profile" };
  if (area === "equipment" || area === "pets") return { type: "open_magic", de: "Magic Items und Reservierungen prüfen", en: "Review Magic Items and reservations" };
  return null;
}

export function analyzeAccountStructure(input: AccountAnalysisInput): AccountAnalysisResult {
  const findings: AccountAnalysisFinding[] = input.health.areas.map((area) => {
    const label = labels[area.id]; const status = area.score === null ? "unknown" : area.score >= 82 ? "strength" : area.score < 65 ? "weakness" : "balanced";
    const entity = area.weakestEntities[0];
    return { id: `area:${area.id}`, area: area.id, score: area.score, status,
      statementDe: area.score === null ? `${label.de}: Daten fehlen.` : status === "strength" ? `${label.de} ist mit ${area.score}% eine Stärke.` : status === "weakness" ? `${label.de} liegt mit ${area.score}% strukturell zurück.` : `${label.de} liegt mit ${area.score}% im mittleren Bereich.`,
      statementEn: area.score === null ? `${label.en}: data is missing.` : status === "strength" ? `${label.en} is a strength at ${area.score}%.` : status === "weakness" ? `${label.en} structurally lags at ${area.score}%.` : `${label.en} is in the middle range at ${area.score}%.`,
      reasonDe: area.score === null ? "Fehlende Werte werden nicht negativ bewertet." : `${area.measuredEntityCount}/${area.entityCount} Objekte gemessen${entity ? `; schwächster Eintrag: ${entity}` : ""}.`,
      reasonEn: area.score === null ? "Missing values are not scored negatively." : `${area.measuredEntityCount}/${area.entityCount} entities measured${entity ? `; weakest entry: ${entity}` : ""}.`,
      action: actionFor(area.id, area.score, input.recommendations) };
  });
  findings.push({ id: "strategy-fit", area: "strategyFit", score: input.health.strategyFitScore, status: input.health.strategyFitScore < 60 ? "weakness" : input.health.strategyFitScore >= 82 ? "strength" : "balanced", statementDe: `Strategiepassung ${input.health.strategyFitScore}%.`, statementEn: `Strategy fit ${input.health.strategyFitScore}%.`, reasonDe: `Die Teilbereiche wurden für die aktive Strategie ${input.strategy} neu gewichtet.`, reasonEn: `Areas were reweighted for the active ${input.strategy} strategy.`, action: input.health.strategyFitScore < 60 ? { type: "set_strategy", strategy: "balanced", de: "Auf ausgewogene Strategie wechseln", en: "Switch to balanced strategy" } : null });
  findings.push({ id: "rush-risk", area: "rushRisk", score: 100 - input.health.rushRiskScore, status: input.health.rushRiskScore >= 60 ? "weakness" : input.health.rushRiskScore <= 30 ? "strength" : "balanced", statementDe: `Rush-Risiko ${input.health.rushRiskScore}/100.`, statementEn: `Rush risk ${input.health.rushRiskScore}/100.`, reasonDe: `Ermittelt aus Offensive, Helden, Labor, Verteidigung und fehlenden Gebäuden.`, reasonEn: `Derived from offense, heroes, laboratory, defense and missing buildings.`, action: input.health.rushRiskScore >= 60 ? { type: "set_strategy", strategy: "rush_recovery", de: "Rush-Ausgleich aktivieren", en: "Activate rush recovery" } : null });
  findings.push({ id: "town-hall", area: "townHallReadiness", score: input.townHall.score, status: input.townHall.score >= 70 ? "strength" : input.townHall.score < 50 ? "weakness" : "balanced", statementDe: `Rathausbereitschaft ${input.townHall.score}% (${input.townHall.recommendation}).`, statementEn: `Town Hall readiness ${input.townHall.score}% (${input.townHall.recommendation}).`, reasonDe: `Confidence ${input.townHall.confidence}%; Strategie, Ziele, Restzeiten, Events und Magic Items einbezogen.`, reasonEn: `Confidence ${input.townHall.confidence}%; strategy, goals, remaining time, events and Magic Items included.`, action: null });
  const resourceInsight = input.insights.find((item) => item.category === "resource_overflow" || item.category === "resource_shortfall");
  if (resourceInsight) findings.push({ id: "resource-plan", area: "resourcePlanning", score: null, status: "balanced", statementDe: resourceInsight.messageDe, statementEn: resourceInsight.messageEn, reasonDe: resourceInsight.explanationDe, reasonEn: resourceInsight.explanationEn, action: { type: "open_resources", de: "Ressourcenprofil öffnen", en: "Open resource profile" } });
  const scored = findings.filter((item): item is AccountAnalysisFinding & { score: number } => item.score !== null);
  return { findings, strongest: [...scored].sort((a,b)=>b.score-a.score)[0] || null, weakest: [...scored].sort((a,b)=>a.score-b.score)[0] || null, actions: findings.flatMap((item) => item.action ? [item.action] : []), calculationVersion: "account-analysis-v1.0.0" };
}
