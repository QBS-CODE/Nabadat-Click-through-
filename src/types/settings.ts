// src/types/settings.ts

export type Industry =
  | "Banking"
  | "Telecommunications"
  | "Government"
  | "Automotive"
  | "Entertainment"
  | "Services"

export interface OrgConfig {
  name: string         // max 150 chars, required
  logoUrl: string | null
  industry: Industry
}

export interface ScoringConfig {
  alpha: number          // 0.000–1.000; β = 1 − α (never stored)
  motMultiplier: number  // 1.0–2.0
  nFloor: number         // integer ≥ 1
  flagPercentile: number // integer 1–49
  rollingWindowDays: number // integer ≥ 7
}

// Action Management tenant parameters (SET-1 / SET-2).
export interface ActionsConfig {
  /** SET-1 — max value X on every KPI Target threshold slider (0 → X). One decimal, > 0. */
  maxUpperThreshold: number
  /** SET-2 — extra points of track shown beyond the coloured zones. Integer ≥ 1. */
  sliderPadding: number
}
