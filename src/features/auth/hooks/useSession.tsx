// Clickthrough session shim. The real app hydrates an M-10 session over the network;
// here we synthesize one from the clickthrough persona switcher so the ported Action
// Management (M-15) and Integration Hub (M-13) screens keep their persona-based
// rendering gates (useIntegrationHubAccess) without any backend.
//
// Persona mapping mirrors the server's Permissions Matrix personas:
//   cx_manager   → P-01 (CX Manager — owns the IH data model)
//   tenant_admin → P-07 (Tenant IT Administrator — owns integrations + logs)
// Every other clickthrough persona keeps its own id, which matches no matrix row, so
// the IH screens correctly fall back to Access-denied when deep-linked.

import { usePersona } from "@/contexts/persona-context"

const PERSONA_TO_MATRIX: Record<string, string> = {
  cx_manager: "P-01",
  tenant_admin: "P-07",
}

export interface MockSession {
  userId: string
  persona: string
}

export interface SessionState {
  session: MockSession | null
  loading: boolean
}

export function useSession(): SessionState {
  const { persona } = usePersona()
  const mapped = PERSONA_TO_MATRIX[persona.id] ?? persona.id
  return {
    session: { userId: `clickthrough:${persona.id}`, persona: mapped },
    loading: false,
  }
}
