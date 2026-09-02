// M-10 Persona Baselines API client — CLICKTHROUGH MOCK.
//
// Serves from the shared in-memory store in `@/data/mock-user-management` and never contacts a
// backend. Export surface identical to the real `features/persona-baselines/api.ts`.

import { baselineStore, delay, recordEvent } from "@/data/mock-user-management"
import { PersonaBaselinesApiError } from "./persona-baselines-api-error"
import type {
  PersonaBaselineListResponse,
  UpdatePersonaBaselineData,
  UpdatePersonaBaselineResponse,
} from "./dto"

export type * from "./dto"
export { PersonaBaselinesApiError } from "./persona-baselines-api-error"

/** Lists all persona authorization-matrix baselines for the tenant (P-01..P-08). */
export async function listPersonaBaselines(): Promise<PersonaBaselineListResponse> {
  return delay({ items: baselineStore.map((b) => ({ ...b })) })
}

/**
 * Replaces a persona baseline's module assignments (P-01/P-07; a P-07 actor including
 * a CX-domain module is rejected with 403). Flips the baseline to customised.
 */
export async function updatePersonaBaseline(
  personaId: string,
  data: UpdatePersonaBaselineData,
): Promise<UpdatePersonaBaselineResponse> {
  const baseline = baselineStore.find((b) => b.personaId === personaId)
  if (!baseline) {
    throw new PersonaBaselinesApiError(404, {
      error: { code: "persona_baseline.not_found", message: "Persona baseline not found" },
    })
  }
  const before = baseline.permissionModuleAssignments.length
  baseline.permissionModuleAssignments = data.permissionModuleAssignments
  baseline.isCustomised = true
  baseline.updatedAt = new Date().toISOString()
  recordEvent({
    eventType: "persona_baseline.updated", entityType: "PersonaBaseline", entityId: personaId,
    oldValue: { modules: before }, newValue: { modules: data.permissionModuleAssignments.length },
  })
  return delay({
    baselineId: baseline.baselineId,
    personaId: baseline.personaId,
    isCustomised: true,
    updatedAt: baseline.updatedAt,
  })
}
