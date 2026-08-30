// src/contexts/settings-context.tsx
import { createContext, useContext, useState } from "react"
import {
  INITIAL_ORG_CONFIG,
  INITIAL_SCORING_CONFIG,
  INITIAL_ACTIONS_CONFIG,
  INITIAL_DESIGN_CONFIG,
} from "@/data/mock-settings"
import type { OrgConfig, ScoringConfig, ActionsConfig } from "@/types/settings"
import type { SurveyTheme } from "@/lib/survey-theme"

interface SettingsContextValue {
  orgConfig: OrgConfig
  scoringConfig: ScoringConfig
  actionsConfig: ActionsConfig
  designConfig: SurveyTheme
  saveOrg: (updated: OrgConfig) => void
  saveScoring: (updated: ScoringConfig) => void
  saveActions: (updated: ActionsConfig) => void
  saveDesign: (updated: SurveyTheme) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [orgConfig, setOrgConfig] = useState<OrgConfig>(INITIAL_ORG_CONFIG)
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(INITIAL_SCORING_CONFIG)
  const [actionsConfig, setActionsConfig] = useState<ActionsConfig>(INITIAL_ACTIONS_CONFIG)
  const [designConfig, setDesignConfig] = useState<SurveyTheme>(INITIAL_DESIGN_CONFIG)

  function saveOrg(updated: OrgConfig) {
    setOrgConfig(updated)
  }

  function saveScoring(updated: ScoringConfig) {
    setScoringConfig(updated)
  }

  function saveActions(updated: ActionsConfig) {
    setActionsConfig(updated)
  }

  function saveDesign(updated: SurveyTheme) {
    setDesignConfig(updated)
  }

  return (
    <SettingsContext.Provider
      value={{
        orgConfig,
        scoringConfig,
        actionsConfig,
        designConfig,
        saveOrg,
        saveScoring,
        saveActions,
        saveDesign,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
