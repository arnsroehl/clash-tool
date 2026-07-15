import { createScenarioDraft, evaluatePlanningScenario } from "@/features/planning-scenarios/planning-scenario.engine";
import type { ScenarioTownHallMode } from "@/types/planningScenario";
import type { TownHallDecisionAnalysis, TownHallDecisionInput, TownHallEntity, TownHallReason, TownHallRecommendation, TownHallVariant } from "@/features/town-hall-decision/town-hall-decision.types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 10) / 10;
const scoreEntities = (entities: TownHallEntity[]) => entities.length ? entities.reduce((sum, item) => sum + item.currentLevel / Math.max(1, item.maxLevel) * 100, 0) / entities.length : null;
const includes = (item: TownHallEntity, ...terms: string[]) => terms.some((term) => `${item.name} ${item.category}`.toLocaleLowerCase("de").includes(term));
const reason = (code: string, positive: boolean, value: number, de: string, en: string): TownHallReason => ({ code, positive, value: round(value), de, en });
const area = (input: TownHallDecisionInput, id: string) => input.health?.areas.find((item) => item.id === id)?.score ?? null;

function strategyWeights(strategy: TownHallDecisionInput["strategy"]) {
  if (strategy === "war") return { offense: .22, heroes: .23, laboratory: .18, key: .15, resources: .04, defense: .10, goals: .08 };
  if (strategy === "farming") return { offense: .20, heroes: .08, laboratory: .13, key: .17, resources: .22, defense: .05, goals: .05 };
  if (strategy === "town_hall_push" || strategy === "fastest") return { offense: .27, heroes: .10, laboratory: .12, key: .20, resources: .10, defense: .03, goals: .03 };
  if (strategy === "rush_recovery") return { offense: .15, heroes: .15, laboratory: .15, key: .12, resources: .08, defense: .25, goals: .10 };
  return { offense: .20, heroes: .16, laboratory: .16, key: .16, resources: .10, defense: .14, goals: .08 };
}

function recommendation(score: number, spread: number, strategy: TownHallDecisionInput["strategy"]): TownHallRecommendation {
  if (spread >= 28 && !["town_hall_push", "fastest"].includes(strategy)) return "strategy_dependent";
  if (score < 48) return "not_recommended";
  if (score < 64) return "possible";
  if (score < 79) return "recommended";
  return ["town_hall_push", "fastest"].includes(strategy) ? "urgent" : "recommended";
}

function variant(input: TownHallDecisionInput, mode: ScenarioTownHallMode, id: TownHallVariant["id"]): TownHallVariant {
  const draft = createScenarioDraft(input.context, { horizonDays: 365, goalPercent: 100, strategyWeights: { building: 50, hero: 50, troop: 50, spell: 50, siege_machine: 50 } });
  draft.strategy = input.strategy; draft.assumptions.townHallMode = mode; draft.assumptions.townHallTargetLevel = Math.min(18, input.context.townHallLevel + 1); draft.assumptions.townHallUpgradeAt = mode === "scheduled" ? input.scheduledAt : null;
  const result = evaluatePlanningScenario(draft, input.context).results;
  const heroBase = area(input, "heroes") ?? input.health?.generalProgressScore ?? 0; const offenseBase = area(input, "offense") ?? input.health?.generalProgressScore ?? 0;
  const newTierPenalty = mode === "unchanged" ? 0 : 7; const gain = Math.min(12, result.completedUpgradesInHorizon / Math.max(1, result.queueLength) * 12);
  return { id, nameDe: id === "max_current" ? "Aktuelles Rathaus weiter maxen" : id === "upgrade_now" ? "Rathaus sofort upgraden" : "Rathaus zum gewählten Datum upgraden", nameEn: id === "max_current" ? "Keep maxing current Town Hall" : id === "upgrade_now" ? "Upgrade Town Hall now" : "Upgrade Town Hall on selected date", totalDurationHours: result.totalDurationHours, resourcesRequired: result.resourcesRequired, heroProgress: round(clamp(heroBase + gain - newTierPenalty)), offenseProgress: round(clamp(offenseBase + gain - newTierPenalty)), rushRisk: round(clamp((input.health?.rushRiskScore ?? 50) + newTierPenalty * 1.5 - gain / 2)), goalsAchievable: result.goalsAchievable, startsAt: result.simulatedAt, isEstimate: true };
}

export function analyzeTownHallDecision(input: TownHallDecisionInput): TownHallDecisionAnalysis {
  const offense = area(input, "offense"); const heroes = area(input, "heroes"); const laboratory = area(input, "laboratory"); const resources = area(input, "resources"); const defense = area(input, "defense"); const goals = area(input, "goalAchievement");
  const keyEntities = input.entities.filter((item) => includes(item, "clanburg", "clan castle", "armeelager", "army camp", "labor", "spell factory", "zauberfabrik", "kaserne", "barracks", "lager", "storage"));
  const key = scoreEntities(keyEntities);
  const factors = { offense, heroes, laboratory, key, resources, defense, goals };
  const weights = strategyWeights(input.strategy); const known = Object.entries(factors).filter((entry): entry is [keyof typeof weights, number] => entry[1] !== null);
  const weighted = known.reduce((sum, [name, value]) => sum + value * weights[name], 0) / Math.max(.01, known.reduce((sum, [name]) => sum + weights[name], 0));
  const remainingLabHours = input.entities.filter((item) => item.type !== "building").reduce((sum, item) => sum + item.remainingHours, 0);
  const remainingAllHours = input.entities.reduce((sum, item) => sum + item.remainingHours, 0);
  const upcomingEvent = input.context.events.some((item) => item.enabled && item.startsAt && new Date(item.startsAt).getTime() > new Date(input.context.simulationStartsAt).getTime() && new Date(item.startsAt).getTime() - new Date(input.context.simulationStartsAt).getTime() <= 14 * 86_400_000);
  const magicCount = input.context.magicItems.reduce((sum, item) => sum + item.quantity, 0);
  const nextTownHallLevel = input.context.townHallLevel >= 18 ? null : input.context.townHallLevel + 1;
  const benefitBonus = nextTownHallLevel ? (["town_hall_push", "fastest", "farming"].includes(input.strategy) ? 7 : 3) : -20;
  const eventBonus = upcomingEvent ? 3 : 0; const magicBonus = Math.min(4, magicCount); const timePenalty = Math.min(12, Math.log10(1 + remainingAllHours / 24) * 4);
  const score = round(clamp(weighted + benefitBonus + eventBonus + magicBonus - timePenalty));
  const values = known.map(([, value]) => value); const spread = values.length ? Math.max(...values) - Math.min(...values) : 100;
  const positives: TownHallReason[] = []; const negatives: TownHallReason[] = [];
  if ((offense ?? 0) >= 80) positives.push(reason("OFFENSE_READY", true, offense as number, `Offensive zu ${offense}% abgeschlossen.`, `Offense is ${offense}% complete.`)); else negatives.push(reason("OFFENSE_GAP", false, offense ?? 0, `Offensive erst zu ${offense ?? "?"}% abgeschlossen.`, `Offense is only ${offense ?? "?"}% complete.`));
  if ((key ?? 0) >= 85) positives.push(reason("KEY_BUILDINGS_READY", true, key as number, "Armeelager, Clanburg und andere Schlüsselgebäude sind weit entwickelt.", "Army Camps, Clan Castle and other key buildings are well developed.")); else negatives.push(reason("KEY_BUILDINGS_GAP", false, key ?? 0, "Offensive Schlüsselgebäude besitzen noch Rückstand.", "Key offensive buildings still lag behind."));
  if ((heroes ?? 0) < 75) negatives.push(reason("HERO_GAP", false, heroes ?? 0, `Helden erst zu ${heroes ?? "?"}% abgeschlossen.`, `Heroes are only ${heroes ?? "?"}% complete.`)); else positives.push(reason("HERO_READY", true, heroes as number, `Heldenstand ${heroes}%.`, `Hero progress ${heroes}%.`));
  if (remainingLabHours > 24 * 30) negatives.push(reason("LAB_TIME", false, remainingLabHours, `Labor besitzt noch rund ${Math.ceil(remainingLabHours / 24)} Tage Restzeit.`, `The laboratory has roughly ${Math.ceil(remainingLabHours / 24)} days remaining.`));
  if (upcomingEvent) positives.push(reason("UPCOMING_EVENT", true, 3, "Ein wichtiges Event beginnt innerhalb der nächsten 14 Tage.", "An important event starts within the next 14 days."));
  if (magicCount) positives.push(reason("MAGIC_ITEMS", true, magicCount, `${magicCount} Magic Items können den Übergang unterstützen.`, `${magicCount} Magic Items can support the transition.`));
  if (!nextTownHallLevel) negatives.push(reason("MAX_TOWN_HALL", false, 100, "Das höchste unterstützte Rathaus ist bereits erreicht.", "The highest supported Town Hall is already reached."));
  const missingData = Object.entries(factors).filter(([, value]) => value === null).map(([name]) => name);
  if (!keyEntities.length) missingData.push("keyBuildings");
  const confidence = round(clamp((input.health?.dataCompletenessPercent ?? 35) * (known.length / Object.keys(factors).length) * (input.entities.length ? 1 : .5)));
  return { decision: { recommendation: nextTownHallLevel ? recommendation(score, spread, input.strategy) : "not_recommended", score, confidence, nextTownHallLevel, positives, negatives, strategy: input.strategy, missingData, calculationVersion: "town-hall-v1.0.0" }, variants: [variant(input, "unchanged", "max_current"), variant(input, "immediate", "upgrade_now"), variant(input, "scheduled", "upgrade_scheduled")] };
}
