import { create } from "zustand";
import type {
  CalculationSchema,
  ConditionGroup,
  AndAllRule,
  OrAnyRule,
  PercentageThresholdRule,
  CountThresholdRule,
  MatchValueRule,
  BBIFunctionalityCheckRule,
  ConditionGroupRulesItem,
} from "@sinag/shared";

/**
 * Type alias for all calculation rule types
 * Matches the discriminated union from the backend
 */
export type CalculationRule = ConditionGroupRulesItem;

/**
 * Calculation Rule Builder state interface for managing calculation schema construction
 */
interface CalculationRuleBuilderState {
  /** The complete calculation schema being built */
  schema: CalculationSchema | null;

  /** ID of the currently selected rule or condition group (for properties panel) */
  selectedRuleId: string | null;

  /** Whether there are unsaved changes */
  isDirty: boolean;

  // Actions
  /** Initialize a new empty schema */
  initializeSchema: () => void;

  /** Load an existing schema */
  loadSchema: (schema: CalculationSchema) => void;

  /** Clear the entire schema */
  clearSchema: () => void;

  /** Add a new condition group */
  addConditionGroup: (group: ConditionGroup) => void;

  /** Update a condition group by index */
  updateConditionGroup: (index: number, updates: Partial<ConditionGroup>) => void;

  /** Delete a condition group by index */
  deleteConditionGroup: (index: number) => void;

  /** Add a rule to a condition group */
  addRuleToGroup: (groupIndex: number, rule: CalculationRule) => void;

  /** Update a rule within a condition group */
  updateRuleInGroup: (
    groupIndex: number,
    ruleIndex: number,
    updates: Partial<CalculationRule>
  ) => void;

  /** Delete a rule from a condition group */
  deleteRuleFromGroup: (groupIndex: number, ruleIndex: number) => void;

  /** Set output status on pass */
  setOutputStatusOnPass: (status: "PASS" | "FAIL") => void;

  /** Set output status on fail */
  setOutputStatusOnFail: (status: "PASS" | "FAIL") => void;

  /** Select a rule for editing */
  selectRule: (ruleId: string | null) => void;

  /** Mark as saved (no unsaved changes) */
  markAsSaved: () => void;

  // Selectors
  /** Get condition group by index */
  getConditionGroup: (index: number) => ConditionGroup | undefined;

  /** Get rule from condition group */
  getRule: (groupIndex: number, ruleIndex: number) => CalculationRule | undefined;

  /** Check if schema is valid (has at least one condition group) */
  isSchemaValid: () => boolean;
}

/**
 * Zustand store for managing calculation rule builder state
 *
 * This store manages the construction of calculation schemas with nested
 * condition groups and rules for auto-calculable indicators.
 *
 * Note: Does not use persistence to avoid conflicts with indicator editing.
 * State is managed per-session and should be saved explicitly via API.
 */
export const useCalculationRuleStore = create<CalculationRuleBuilderState>((set, get) => ({
  // Initial state
  schema: null,
  selectedRuleId: null,
  isDirty: false,

  // Actions
  initializeSchema: () => {
    set({
      schema: {
        condition_groups: [],
        output_status_on_pass: "PASS",
        output_status_on_fail: "FAIL",
      },
      selectedRuleId: null,
      isDirty: false,
    });
  },

  loadSchema: (schema: CalculationSchema) => {
    set({
      schema,
      selectedRuleId: null,
      isDirty: false,
    });
  },

  clearSchema: () => {
    set({
      schema: null,
      selectedRuleId: null,
      isDirty: false,
    });
  },

  addConditionGroup: (group: ConditionGroup) => {
    set((state) => {
      if (!state.schema) return state;

      return {
        schema: {
          ...state.schema,
          condition_groups: [...state.schema.condition_groups, group],
        },
        isDirty: true,
      };
    });
  },

  updateConditionGroup: (index: number, updates: Partial<ConditionGroup>) => {
    set((state) => {
      if (!state.schema) return state;

      const newGroups = [...state.schema.condition_groups];
      newGroups[index] = { ...newGroups[index], ...updates };

      return {
        schema: {
          ...state.schema,
          condition_groups: newGroups,
        },
        isDirty: true,
      };
    });
  },

  deleteConditionGroup: (index: number) => {
    set((state) => {
      if (!state.schema) return state;

      return {
        schema: {
          ...state.schema,
          condition_groups: state.schema.condition_groups.filter((_, i) => i !== index),
        },
        isDirty: true,
      };
    });
  },

  addRuleToGroup: (groupIndex: number, rule: CalculationRule) => {
    set((state) => {
      if (!state.schema) return state;

      const newGroups = [...state.schema.condition_groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        rules: [...newGroups[groupIndex].rules, rule],
      };

      return {
        schema: {
          ...state.schema,
          condition_groups: newGroups,
        },
        isDirty: true,
      };
    });
  },

  updateRuleInGroup: (groupIndex: number, ruleIndex: number, updates: Partial<CalculationRule>) => {
    set((state) => {
      if (!state.schema) return state;

      const newGroups = [...state.schema.condition_groups];
      const newRules = [...newGroups[groupIndex].rules];
      newRules[ruleIndex] = { ...newRules[ruleIndex], ...updates } as CalculationRule;
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        rules: newRules,
      };

      return {
        schema: {
          ...state.schema,
          condition_groups: newGroups,
        },
        isDirty: true,
      };
    });
  },

  deleteRuleFromGroup: (groupIndex: number, ruleIndex: number) => {
    set((state) => {
      if (!state.schema) return state;

      const newGroups = [...state.schema.condition_groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        rules: newGroups[groupIndex].rules.filter((_, i) => i !== ruleIndex),
      };

      return {
        schema: {
          ...state.schema,
          condition_groups: newGroups,
        },
        isDirty: true,
      };
    });
  },

  setOutputStatusOnPass: (status: "PASS" | "FAIL") => {
    set((state) => {
      if (!state.schema) return state;

      return {
        schema: {
          ...state.schema,
          output_status_on_pass: status,
        },
        isDirty: true,
      };
    });
  },

  setOutputStatusOnFail: (status: "PASS" | "FAIL") => {
    set((state) => {
      if (!state.schema) return state;

      return {
        schema: {
          ...state.schema,
          output_status_on_fail: status,
        },
        isDirty: true,
      };
    });
  },

  selectRule: (ruleId: string | null) => {
    set({ selectedRuleId: ruleId });
  },

  markAsSaved: () => {
    set({ isDirty: false });
  },

  // Selectors
  getConditionGroup: (index: number) => {
    const { schema } = get();
    if (!schema) return undefined;
    return schema.condition_groups[index];
  },

  getRule: (groupIndex: number, ruleIndex: number) => {
    const { schema } = get();
    if (!schema) return undefined;
    const group = schema.condition_groups[groupIndex];
    if (!group) return undefined;
    return group.rules[ruleIndex];
  },

  isSchemaValid: () => {
    const { schema } = get();
    if (!schema) return false;
    return schema.condition_groups.length > 0;
  },
}));

/**
 * Helper to generate a unique rule ID for tracking
 */
export const generateRuleId = (ruleType: string): string => {
  return `${ruleType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Type guards for rule types
 */
export const isAndAllRule = (rule: CalculationRule): rule is AndAllRule => {
  return rule.rule_type === "AND_ALL";
};

export const isOrAnyRule = (rule: CalculationRule): rule is OrAnyRule => {
  return rule.rule_type === "OR_ANY";
};

export const isPercentageThresholdRule = (
  rule: CalculationRule
): rule is PercentageThresholdRule => {
  return rule.rule_type === "PERCENTAGE_THRESHOLD";
};

export const isCountThresholdRule = (rule: CalculationRule): rule is CountThresholdRule => {
  return rule.rule_type === "COUNT_THRESHOLD";
};

export const isMatchValueRule = (rule: CalculationRule): rule is MatchValueRule => {
  return rule.rule_type === "MATCH_VALUE";
};

export const isBBIFunctionalityCheckRule = (
  rule: CalculationRule
): rule is BBIFunctionalityCheckRule => {
  return rule.rule_type === "BBI_FUNCTIONALITY_CHECK";
};

/**
 * Helper to create a default rule of a given type
 */
export const createDefaultRule = (ruleType: string): CalculationRule | null => {
  switch (ruleType) {
    case "PERCENTAGE_THRESHOLD":
      return {
        rule_type: "PERCENTAGE_THRESHOLD",
        field_id: "",
        operator: ">=",
        threshold: 75,
        description: undefined,
      } as PercentageThresholdRule;

    case "COUNT_THRESHOLD":
      return {
        rule_type: "COUNT_THRESHOLD",
        field_id: "",
        operator: ">=",
        threshold: 1,
        description: undefined,
      } as CountThresholdRule;

    case "MATCH_VALUE":
      return {
        rule_type: "MATCH_VALUE",
        field_id: "",
        operator: "==",
        expected_value: "",
        description: undefined,
      } as MatchValueRule;

    case "BBI_FUNCTIONALITY_CHECK":
      return {
        rule_type: "BBI_FUNCTIONALITY_CHECK",
        bbi_id: 0,
        expected_status: "Functional",
        description: undefined,
      } as BBIFunctionalityCheckRule;

    case "AND_ALL":
      return {
        rule_type: "AND_ALL",
        conditions: [],
        description: undefined,
      } as AndAllRule;

    case "OR_ANY":
      return {
        rule_type: "OR_ANY",
        conditions: [],
        description: undefined,
      } as OrAnyRule;

    default:
      return null;
  }
};

/**
 * Helper to create a default condition group
 */
export const createDefaultConditionGroup = (): ConditionGroup => {
  return {
    operator: "AND",
    rules: [],
  };
};
