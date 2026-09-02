// M-10 Audit Log API client — CLICKTHROUGH MOCK.
//
// Serves from the shared in-memory store in `@/data/mock-user-management` and never contacts a
// backend. Export surface identical to the real `features/audit-log/api.ts`.
//
// Read-only, like the real trail — but it does reflect actions taken elsewhere in the clickthrough
// this session (inviting a user, editing permissions), because the user-management mock appends to
// the same store.

import { auditStore, delay } from "@/data/mock-user-management"
import type { AuditLogResponse, ListAuditEventsParams } from "./dto"

export type * from "./dto"
export { AuditLogApiError } from "./audit-log-api-error"

/** Lists the tenant's audit events (cursor-paginated) with optional type/date/actor/entity filters. */
export async function listAuditEvents(params: ListAuditEventsParams = {}): Promise<AuditLogResponse> {
  const from = params.from ? Date.parse(params.from) : null
  const to = params.to ? Date.parse(params.to) : null

  const filtered = auditStore.filter((e) => {
    if (params.eventType && e.eventType !== params.eventType) return false
    if (params.actorId && e.actorId !== params.actorId) return false
    if (params.entityId && e.entityId !== params.entityId) return false
    const at = Date.parse(e.occurredAtUtc)
    if (from !== null && at < from) return false
    if (to !== null && at > to) return false
    return true
  })

  const size = params.pageSize ?? 25
  const start = params.pageToken ? Number(params.pageToken) : 0
  const page = filtered.slice(start, start + size)
  const next = start + size < filtered.length ? String(start + size) : null

  return delay({ items: page, nextPageToken: next, totalCount: filtered.length })
}
