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
//
// The snapshot below exists for the ported User & Role Management (M-10) screens, which
// gate on `permissionSnapshot.modules["UserManagement"]` rather than on the persona alone.
// It carries the same shape as the real `PermissionSnapshot` dto so those pages compile and
// branch unchanged; only P-01 and P-07 hold UserManagement, mirroring the Permissions Matrix.

import { usePersona } from "@/contexts/persona-context"

const PERSONA_TO_MATRIX: Record<string, string> = {
  cx_manager: "P-01",
  tenant_admin: "P-07",
}

/** Mirrors the real `features/auth/dto/permission-snapshot.ts` shape. */
export interface MockPermissionSnapshot {
  version: number
  modules: Record<string, string[]>
  customActions: string[]
  scopeAssignments: Record<string, string[]>
  hierarchyNodeId: string | null
  hierarchyDescendantIds: string[]
}

export interface MockSession {
  userId: string
  persona: string
  permissionSnapshot: MockPermissionSnapshot
}

/** Personas that hold the UserManagement module (Permissions Matrix): P-01 manage, P-07 full. */
const USER_MANAGEMENT_MODES: Record<string, string[]> = {
  "P-01": ["View", "Manage"],
  "P-07": ["View", "Manage", "Full"],
}

function snapshotFor(persona: string): MockPermissionSnapshot {
  const userManagement = USER_MANAGEMENT_MODES[persona]
  return {
    version: 1,
    modules: {
      // Every clickthrough persona can see the CX modules the prototype demonstrates; only
      // P-01/P-07 additionally hold UserManagement, so the Users / Audit Log screens are
      // reachable for them and correctly hidden for everyone else.
      SurveyBuilder: ["View", "Manage"],
      AnalyticsAndReporting: ["View"],
      TenantConfiguration: persona === "P-01" || persona === "P-07" ? ["View", "Manage"] : ["View"],
      ...(userManagement ? { UserManagement: userManagement } : {}),
    },
    customActions: [],
    scopeAssignments: {},
    hierarchyNodeId: null,
    hierarchyDescendantIds: [],
  }
}

export interface SessionState {
  session: MockSession | null
  loading: boolean
}

export function useSession(): SessionState {
  const { persona } = usePersona()
  const mapped = PERSONA_TO_MATRIX[persona.id] ?? persona.id
  return {
    session: {
      userId: `clickthrough:${persona.id}`,
      persona: mapped,
      permissionSnapshot: snapshotFor(mapped),
    },
    loading: false,
  }
}
