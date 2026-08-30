// src/data/mock-settings.ts
import type { OrgConfig, ScoringConfig, ActionsConfig } from "@/types/settings"
import { TENANT_THEME, type SurveyTheme } from "@/lib/survey-theme"

export const INITIAL_ORG_CONFIG: OrgConfig = {
  name: "Nabadat Demo Tenant",
  logoUrl: null,
  industry: "Banking",
}

// n_floor default: 500 (resolved for this UI as high-volume tenant default;
// M-16 SRS specifies 5 — reconcile before production deployment, Q-S1)
export const INITIAL_SCORING_CONFIG: ScoringConfig = {
  alpha: 0.5,
  motMultiplier: 1.5,
  nFloor: 500,
  flagPercentile: 25,
  rollingWindowDays: 30,
}

// Action Management defaults — X = 20, PAD = 3 (SET-1 / SET-2 mockup defaults).
export const ACTIONS_DEFAULTS: ActionsConfig = {
  maxUpperThreshold: 20,
  sliderPadding: 3,
}

export const INITIAL_ACTIONS_CONFIG: ActionsConfig = { ...ACTIONS_DEFAULTS }

/**
 * SET-1 guard floor — the largest Upper Threshold currently saved across this
 * tenant's Actions. X can never be lowered below it, or an existing Target would
 * fall off its own scale.
 */
export const LARGEST_SAVED_UPPER = 6.5

// Tenant Design Guidelines — the org-wide brand system every survey inherits.
export const INITIAL_DESIGN_CONFIG: SurveyTheme = { ...TENANT_THEME }
