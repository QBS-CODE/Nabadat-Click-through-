// Integration Hub access gate.
//
// CLICKTHROUGH BUILD: RBAC is intentionally DISABLED. The real app gates each M-13 screen by the
// Permissions Matrix (P-01 CX Manager owns the data model read-only on integrations/no logs; P-07
// Tenant IT Admin owns integrations + logs). For the client clickthrough we want every screen and
// every write control visible no matter which persona is active, so every area resolves to full
// "manage" access here. Restore the persona-driven MATRIX from git history to re-enable gating.

import { useMemo } from "react"

/** The five M-13 screens the matrix is keyed by (`IntegrationHubArea`). */
export type IntegrationHubArea =
  | "integrations"
  | "requestLogs"
  | "serviceChannels"
  | "parameters"
  | "mappings"

/** `AccessLevel` — None (screen not offered at all) / ReadOnly / Manage. */
export type AccessLevel = "none" | "readOnly" | "manage"

export interface IntegrationHubAccess {
  /** Raw level for an area. */
  levelFor: (area: IntegrationHubArea) => AccessLevel
  /** True when the screen may be rendered at all (ReadOnly or Manage). */
  canView: (area: IntegrationHubArea) => boolean
  /** True when write controls should be offered (Manage only). */
  canManage: (area: IntegrationHubArea) => boolean
  /** True when the screen renders but every write control is hidden (FR-GBL-05). */
  isReadOnly: (area: IntegrationHubArea) => boolean
  /** Always true in the clickthrough — there is no session to wait on. */
  ready: boolean
  persona: string | undefined
}

export function useIntegrationHubAccess(): IntegrationHubAccess {
  // Clickthrough: grant full access everywhere so the client can walk the whole module.
  return useMemo(
    () => ({
      levelFor: () => "manage",
      canView: () => true,
      canManage: () => true,
      isReadOnly: () => false,
      ready: true,
      persona: "clickthrough",
    }),
    [],
  )
}
