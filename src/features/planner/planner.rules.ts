import { RULE_NAMES } from "@/features/planner/planner.constants";
import type {
  PlannerRule,
  PlannerRuleId,
  RuleContext,
  RuleResult,
} from "@/features/planner/planner.types";

/** Rule factory helpers keep rule definitions small and testable. */
function createPassResult(ruleId: PlannerRuleId): RuleResult {
  return {
    passed: true,
    ruleId,
    severity: "info",
  };
}

function createBlockingResult(
  ruleId: PlannerRuleId,
  reason: string,
): RuleResult {
  return {
    passed: false,
    ruleId,
    severity: "blocking",
    reason,
  };
}

export const TownHallRule: PlannerRule = {
  id: "town-hall",
  name: RULE_NAMES["town-hall"],
  enabledByDefault: true,
  evaluate: ({ account, building }: RuleContext) => {
    if (building.unlockTownHallLevel > account.townHallLevel) {
      return createBlockingResult(
        "town-hall",
        `${building.name} wird erst ab Rathaus ${building.unlockTownHallLevel} freigeschaltet.`,
      );
    }

    return createPassResult("town-hall");
  },
};

export const LaborRule: PlannerRule = {
  id: "labor",
  name: RULE_NAMES.labor,
  enabledByDefault: false,
  evaluate: () => createPassResult("labor"),
};

export const HeroRule: PlannerRule = {
  id: "hero",
  name: RULE_NAMES.hero,
  enabledByDefault: false,
  evaluate: () => createPassResult("hero"),
};

export const BuilderRule: PlannerRule = {
  id: "builder",
  name: RULE_NAMES.builder,
  enabledByDefault: false,
  evaluate: ({ builderAvailability }) => {
    if (builderAvailability.availableBuilders <= 0) {
      return createBlockingResult(
        "builder",
        "Es ist aktuell kein Bauarbeiter verfügbar.",
      );
    }

    return createPassResult("builder");
  },
};

export const StorageRule: PlannerRule = {
  id: "storage",
  name: RULE_NAMES.storage,
  enabledByDefault: false,
  evaluate: () => createPassResult("storage"),
};

export const WarRule: PlannerRule = {
  id: "war",
  name: RULE_NAMES.war,
  enabledByDefault: false,
  evaluate: () => createPassResult("war"),
};

export const ResourceOverflowRule: PlannerRule = {
  id: "resource-overflow",
  name: RULE_NAMES["resource-overflow"],
  enabledByDefault: false,
  evaluate: () => createPassResult("resource-overflow"),
};

export const PriorityRule: PlannerRule = {
  id: "priority",
  name: RULE_NAMES.priority,
  enabledByDefault: false,
  evaluate: () => createPassResult("priority"),
};

export const DEFAULT_RULES: PlannerRule[] = [
  TownHallRule,
  LaborRule,
  HeroRule,
  BuilderRule,
  StorageRule,
  WarRule,
  ResourceOverflowRule,
  PriorityRule,
];

export function getActivePlannerRules(
  enabledRuleIds?: PlannerRuleId[],
): PlannerRule[] {
  if (!enabledRuleIds) {
    return DEFAULT_RULES.filter((rule) => rule.enabledByDefault);
  }

  const enabledRuleIdsSet = new Set<PlannerRuleId>(enabledRuleIds);

  return DEFAULT_RULES.filter((rule) => enabledRuleIdsSet.has(rule.id));
}
