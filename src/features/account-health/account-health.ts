import type {
  AccountHealthInput,
  AccountHealthResult,
  HealthArea,
  HealthAreaId,
  HealthEntity,
  HealthImprovement,
} from "@/features/account-health/account-health.types";

const AREA_IDS: HealthAreaId[] = [
  "offense", "defense", "heroes", "laboratory", "resources", "walls",
  "pets", "equipment", "builderEfficiency", "goalAchievement",
];

const AREA_LABELS: Record<HealthAreaId, { de: string; en: string }> = {
  offense: { de: "Offensive", en: "Offense" },
  defense: { de: "Defensive", en: "Defense" },
  heroes: { de: "Helden", en: "Heroes" },
  laboratory: { de: "Labor", en: "Laboratory" },
  resources: { de: "Ressourcen", en: "Resources" },
  walls: { de: "Mauern", en: "Walls" },
  pets: { de: "Pets", en: "Pets" },
  equipment: { de: "Ausrüstung", en: "Equipment" },
  builderEfficiency: { de: "Builder-Effizienz", en: "Builder efficiency" },
  goalAchievement: { de: "Zielerreichung", en: "Goal achievement" },
};

const STRATEGY_WEIGHTS: Record<AccountHealthInput["strategy"], Partial<Record<HealthAreaId, number>>> = {
  balanced: { offense: 1, defense: 1, heroes: 1, laboratory: 1, resources: 1, walls: 1, pets: 1, equipment: 1 },
  offense: { offense: 2, heroes: 2, laboratory: 1.7, pets: 1.4, equipment: 1.4, defense: 0.35, walls: 0.25 },
  war: { offense: 1.7, defense: 1.4, heroes: 2, laboratory: 1.5, pets: 1.5, equipment: 1.7, walls: 0.6 },
  farming: { resources: 2, offense: 1.4, laboratory: 1.1, heroes: 0.8, defense: 0.5, walls: 0.8 },
  fastest: { offense: 1, defense: 1, heroes: 1, laboratory: 1, resources: 1, walls: 1, pets: 1, equipment: 1 },
  rush_recovery: { offense: 1.6, defense: 1.5, heroes: 1.7, laboratory: 1.7, resources: 1.2, walls: 1.1, pets: 1.2, equipment: 1.2 },
  town_hall_push: { offense: 1.8, heroes: 1.3, laboratory: 1.4, resources: 1.2, defense: 0.3, walls: 0.2 },
  custom: {},
};

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizedText(entity: HealthEntity): string {
  return `${entity.name} ${entity.category}`.toLocaleLowerCase("de");
}

function isOffenseBuilding(entity: HealthEntity): boolean {
  const text = normalizedText(entity);
  return entity.type === "building" && [
    "offens", "armee", "army", "kaserne", "barrack", "labor", "clanburg",
    "clan castle", "zauberfabrik", "spell factory", "werkstatt", "workshop",
    "tierhaus", "pet house", "schmied", "blacksmith",
  ].some((term) => text.includes(term));
}

function isDefenseBuilding(entity: HealthEntity): boolean {
  const text = normalizedText(entity);
  return entity.type === "building" && [
    "verteid", "defen", "falle", "trap", "kanone", "cannon", "turm", "tower",
    "mörser", "mortar", "inferno", "adler", "eagle", "monolith", "tesla",
    "luftabwehr", "air defense", "x-bogen", "x-bow", "scatter", "beschützer",
  ].some((term) => text.includes(term));
}

function isResourceBuilding(entity: HealthEntity): boolean {
  const text = normalizedText(entity);
  return entity.type === "building" && [
    "ressource", "resource", "sammler", "collector", "mine", "bohrer", "drill",
    "lager", "storage", "schatzkammer", "treasury",
  ].some((term) => text.includes(term));
}

function entityProgress(entity: HealthEntity): number | null {
  if (entity.maxLevel <= 0) return null;
  const currentLevel = clamp(entity.currentLevel, 0, entity.maxLevel);
  const levels = (entity.upgradeLevels || [])
    .filter((level) => level.level <= entity.maxLevel && level.level > 0)
    .sort((a, b) => a.level - b.level);
  const totalTime = levels.reduce((sum, level) => sum + Math.max(0, level.timeHours), 0);
  if (levels.length >= Math.max(1, entity.maxLevel - 1) && totalTime > 0) {
    const completedTime = levels
      .filter((level) => level.level <= currentLevel)
      .reduce((sum, level) => sum + Math.max(0, level.timeHours), 0);
    return round(clamp((completedTime / totalTime) * 100));
  }
  return round((currentLevel / entity.maxLevel) * 100);
}

function createEntityArea(id: HealthAreaId, entities: HealthEntity[]): HealthArea {
  const measured = entities
    .map((entity) => ({ entity, score: entityProgress(entity) }))
    .filter((entry): entry is { entity: HealthEntity; score: number } => entry.score !== null);
  const score = measured.length
    ? round(measured.reduce((sum, entry) => sum + entry.score, 0) / measured.length)
    : null;
  return {
    id,
    score,
    progressScore: score,
    entityCount: entities.length,
    measuredEntityCount: measured.length,
    dataComplete: entities.length > 0 && measured.length === entities.length,
    weakestEntities: measured
      .sort((a, b) => a.score - b.score || a.entity.name.localeCompare(b.entity.name))
      .slice(0, 3)
      .map((entry) => entry.entity.name),
  };
}

function createWallArea(input: AccountHealthInput): HealthArea {
  const count = input.walls.reduce((sum, wall) => sum + Math.max(0, wall.count), 0);
  const score = count > 0 && input.maxWallLevel && input.maxWallLevel > 0
    ? round(clamp(input.walls.reduce((sum, wall) => sum + wall.level * wall.count, 0) / (count * input.maxWallLevel) * 100))
    : null;
  return {
    id: "walls", score, progressScore: score, entityCount: count,
    measuredEntityCount: count, dataComplete: score !== null,
    weakestEntities: score !== null && score < 100 ? ["Mauern"] : [],
  };
}

function createEfficiencyArea(input: AccountHealthInput): HealthArea {
  const planningSlots = input.upgradeSlots.filter((slot) =>
    ["builder", "laboratory", "pet_house", "blacksmith"].includes(slot.slotType));
  let utilization: number | null = null;
  if (planningSlots.length) {
    utilization = planningSlots.filter((slot) => !slot.isAvailable).length / planningSlots.length * 100;
  } else if (input.builderUsagePercent !== null && input.builderUsagePercent !== undefined) {
    utilization = input.builderUsagePercent;
  }
  if (utilization === null) {
    return { id: "builderEfficiency", score: null, progressScore: null, entityCount: 0, measuredEntityCount: 0, dataComplete: false, weakestEntities: [] };
  }
  const queueReadiness = input.queueItemCount > 0 ? 8 : -8;
  const unusedItemsPenalty = Math.min(8, input.unreservedMagicItemCount * 1.5);
  const score = round(clamp(utilization + queueReadiness - unusedItemsPenalty));
  return { id: "builderEfficiency", score, progressScore: score, entityCount: planningSlots.length, measuredEntityCount: planningSlots.length, dataComplete: planningSlots.length > 0, weakestEntities: [] };
}

function createGoalArea(input: AccountHealthInput): HealthArea {
  const goals = input.goals.filter((goal) => goal.status !== "paused");
  if (!goals.length) {
    return { id: "goalAchievement", score: null, progressScore: null, entityCount: 0, measuredEntityCount: 0, dataComplete: false, weakestEntities: [] };
  }
  const entityLevels = new Map(input.entities.map((entity) => [`${entity.type}:${entity.id}`, entity.currentLevel]));
  const scores = goals.map((goal) => {
    if (goal.status === "completed") return 100;
    const current = entityLevels.get(`${goal.itemType}:${goal.itemId}`) ?? goal.currentLevel;
    const distance = Math.max(1, goal.targetLevel - goal.currentLevel);
    return clamp((current - goal.currentLevel) / distance * 100);
  });
  const score = round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  return { id: "goalAchievement", score, progressScore: score, entityCount: goals.length, measuredEntityCount: goals.length, dataComplete: true, weakestEntities: goals.filter((_, index) => scores[index] < 100).slice(0, 3).map((goal) => goal.name) };
}

function calculateBalance(areas: HealthArea[]): number {
  const scores = areas
    .filter((area) => !["builderEfficiency", "goalAchievement"].includes(area.id))
    .flatMap((area) => area.score === null ? [] : [area.score]);
  if (scores.length < 2) return scores.length ? 100 : 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const standardDeviation = Math.sqrt(scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length);
  return round(clamp(100 - standardDeviation * 2.2));
}

function calculateRushRisk(input: AccountHealthInput, areas: HealthArea[]): number {
  const byId = new Map(areas.map((area) => [area.id, area.score]));
  let risk = 0;
  const penalizeBelow = (id: HealthAreaId, threshold: number, maximum: number) => {
    const score = byId.get(id);
    if (score !== null && score !== undefined && score < threshold)
      risk += (threshold - score) / threshold * maximum;
  };
  penalizeBelow("offense", 60, 18);
  penalizeBelow("heroes", 55, 20);
  penalizeBelow("laboratory", 55, 18);
  penalizeBelow("defense", 45, 16);
  const unbuilt = input.entities.filter((entity) => entity.currentLevel === 0).length;
  if (input.entities.length) risk += unbuilt / input.entities.length * 20;
  const groups = new Map<string, HealthEntity[]>();
  input.entities.filter((entity) => entity.instanceGroupId).forEach((entity) => {
    const group = groups.get(entity.instanceGroupId as string) || [];
    group.push(entity);
    groups.set(entity.instanceGroupId as string, group);
  });
  const unevenGroups = [...groups.values()].filter((group) =>
    group.length > 1 && Math.max(...group.map((item) => item.currentLevel)) - Math.min(...group.map((item) => item.currentLevel)) >= 3).length;
  risk += Math.min(8, unevenGroups * 2);
  if (input.townHallLevel >= 14) risk *= 1.08;
  return round(clamp(risk));
}

function strategyFit(input: AccountHealthInput, areas: HealthArea[]): number {
  const available = areas.filter((area) => area.score !== null && !["builderEfficiency", "goalAchievement"].includes(area.id));
  if (!available.length) return 0;
  const defaults = STRATEGY_WEIGHTS[input.strategy];
  const customTypeWeights: Partial<Record<HealthAreaId, number>> = input.strategy === "custom" ? {
    defense: input.strategyWeights?.building || 0,
    heroes: input.strategyWeights?.hero || 0,
    laboratory: ((input.strategyWeights?.troop || 0) + (input.strategyWeights?.spell || 0) + (input.strategyWeights?.siege_machine || 0)) / 3,
    offense: ((input.strategyWeights?.hero || 0) + (input.strategyWeights?.troop || 0)) / 2,
  } : {};
  const weightFor = (id: HealthAreaId) => Math.max(0.1, input.strategy === "custom" ? (customTypeWeights[id] || 10) : (defaults[id] || 0.5));
  const totalWeight = available.reduce((sum, area) => sum + weightFor(area.id), 0);
  return round(available.reduce((sum, area) => sum + (area.score as number) * weightFor(area.id), 0) / totalWeight);
}

function improvementFor(area: HealthArea): HealthImprovement {
  const label = AREA_LABELS[area.id];
  const entity = area.weakestEntities[0] || null;
  if (area.id === "builderEfficiency") return { areaId: area.id, entityName: null, reasonCode: "KEEP_SLOTS_BUSY", de: "Halte freie Builder-, Labor-, Pet- oder Schmiedeplätze mit einer vorbereiteten Queue beschäftigt.", en: "Keep free builder, laboratory, pet or blacksmith slots busy with a prepared queue." };
  if (area.id === "goalAchievement") return { areaId: area.id, entityName: entity, reasonCode: "PLAN_ACTIVE_GOAL", de: `Plane den nächsten Schritt für dein Ziel${entity ? ` „${entity}“` : ""} fest in der Queue ein.`, en: `Add the next step for your goal${entity ? ` “${entity}”` : ""} to the queue.` };
  return {
    areaId: area.id,
    entityName: entity,
    reasonCode: entity ? "UPGRADE_WEAK_ENTITY" : "CATCH_UP_AREA",
    de: entity ? `Verbessere ${entity}, um den Bereich ${label.de} gezielt aufzuholen.` : `Hole den Bereich ${label.de} mit einem passenden Upgrade auf.`,
    en: entity ? `Upgrade ${entity} to catch up the ${label.en} area.` : `Catch up the ${label.en} area with a suitable upgrade.`,
  };
}

export function calculateAccountHealth(input: AccountHealthInput): AccountHealthResult {
  const areas: HealthArea[] = [
    createEntityArea("offense", input.entities.filter(isOffenseBuilding)),
    createEntityArea("defense", input.entities.filter(isDefenseBuilding)),
    createEntityArea("heroes", input.entities.filter((entity) => entity.type === "hero")),
    createEntityArea("laboratory", input.entities.filter((entity) => ["troop", "spell", "siege_machine"].includes(entity.type))),
    createEntityArea("resources", input.entities.filter(isResourceBuilding)),
    createWallArea(input),
    createEntityArea("pets", input.entities.filter((entity) => entity.type === "pet")),
    createEntityArea("equipment", input.entities.filter((entity) => entity.type === "equipment")),
    createEfficiencyArea(input),
    createGoalArea(input),
  ];
  const progressAreas = areas.filter((area) => area.score !== null && !["builderEfficiency", "goalAchievement"].includes(area.id));
  const generalProgressScore = progressAreas.length
    ? round(progressAreas.reduce((sum, area) => sum + (area.score as number), 0) / progressAreas.length)
    : 0;
  const balanceScore = calculateBalance(areas);
  const efficiencyScore = areas.find((area) => area.id === "builderEfficiency")?.score ?? null;
  const goalScore = areas.find((area) => area.id === "goalAchievement")?.score ?? null;
  const rushRiskScore = calculateRushRisk(input, areas);
  const strategyFitScore = strategyFit(input, areas);
  const healthParts = [
    { value: generalProgressScore, weight: 0.55 },
    { value: balanceScore, weight: 0.15 },
    { value: efficiencyScore, weight: efficiencyScore === null ? 0 : 0.1 },
    { value: goalScore, weight: goalScore === null ? 0 : 0.05 },
    { value: 100 - rushRiskScore, weight: 0.1 },
    { value: strategyFitScore, weight: 0.05 },
  ];
  const totalWeight = healthParts.reduce((sum, part) => sum + part.weight, 0);
  const score = round(healthParts.reduce((sum, part) => sum + (part.value || 0) * part.weight, 0) / totalWeight);
  const scoredAreas = areas.filter((area): area is HealthArea & { score: number } => area.score !== null);
  const sortedAreas = [...scoredAreas].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const missingData = AREA_IDS.filter((id) => areas.find((area) => area.id === id)?.score === null).map((id) => AREA_LABELS[id].de);
  const improvements = [...scoredAreas]
    .filter((area) => area.score < 85)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(improvementFor);
  if (improvements.length < 3 && input.unreservedMagicItemCount > 0) {
    improvements.push({ areaId: "builderEfficiency", entityName: null, reasonCode: "USE_MAGIC_ITEMS", de: `Prüfe ${input.unreservedMagicItemCount} nicht reservierte Magic Items für ein langes Upgrade.`, en: `Review ${input.unreservedMagicItemCount} unreserved Magic Items for a long upgrade.` });
  }
  return {
    accountId: input.accountId,
    score,
    generalProgressScore,
    balanceScore,
    efficiencyScore,
    strategyFitScore,
    strategy: input.strategy,
    rushRiskScore,
    rushRiskLevel: rushRiskScore >= 60 ? "high" : rushRiskScore >= 30 ? "medium" : "low",
    areas,
    strongestArea: sortedAreas[0] || null,
    weakestArea: sortedAreas.at(-1) || null,
    largestProgressGap: sortedAreas.length > 1 ? round(sortedAreas[0].score - sortedAreas.at(-1)!.score) : 0,
    improvements: improvements.slice(0, 3),
    missingData,
    dataCompletenessPercent: round((areas.length - missingData.length) / areas.length * 100),
    generatedAt: input.generatedAt || new Date().toISOString(),
    calculationVersion: "health-v1.0.0",
  };
}

export { AREA_LABELS as accountHealthAreaLabels };
