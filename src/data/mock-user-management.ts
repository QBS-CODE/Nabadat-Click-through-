// M-10 User & Role Management — CLICKTHROUGH MOCK DATA.
//
// One in-memory store shared by the four mocked M-10 api clients (users, data-scope,
// persona-baselines, audit-log) so the screens stay consistent with each other: editing a user's
// permissions on /users/:id shows up in the audit log, and a user's scope hangs off the same id.
//
// The shape is taken verbatim from the running dev backend (same fields, same wire values, same
// persona/status vocabulary). The *values* are curated: the dev tenant is ~85% automated-test
// residue (rows like `e2e-scope-invalid-5a0029da…@example.com`, all P-03 / pending-enrollment),
// which is meaningless to a client walking through the product. These are a realistic tenant of
// the same shape and the same distribution of personas, statuses and MFA states.
//
// Mutations are in-memory only and reset on refresh — the clickthrough has no database.

import { PERMISSION_MODULES } from "@/lib/permission-modules"
import type { ModuleAssignment, Persona, UserDetail, UserStatus, UserSummary } from "@/features/users/dto"
import type { PersonaBaseline } from "@/features/persona-baselines/dto"
import type { AuditLogEntry } from "@/features/audit-log/dto"
import type { CustomRule, DataScopeAssignment } from "@/features/data-scope/dto"

// ── helpers ──────────────────────────────────────────────────────────────────

/** Stable pseudo-GUID so ids look like the real ones without pulling in a uuid dep. */
export function mockId(seed: string): string {
  let h = 0x811c9dc5
  const hex: string[] = []
  for (let i = 0; i < 32; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 0x01000193) >>> 0
    hex.push((h % 16).toString(16))
  }
  const s = hex.join("")
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`
}

/** ISO timestamp `days` ago, so the data always looks recent however long the demo sits unused. */
function daysAgo(days: number, hour = 9, minute = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

const ALL_MODES = ["View", "Manage", "Full"]
const CX_MODULES = PERMISSION_MODULES.filter((m) => m.cx).map((m) => m.id)

function modules(ids: string[], modes: string[] = ALL_MODES): ModuleAssignment[] {
  return ids.map((moduleId) => ({ moduleId, allowedModes: modes }))
}

// ── users ────────────────────────────────────────────────────────────────────

interface SeedUser {
  username: string
  persona: Persona
  status: UserStatus
  mfa: boolean
  node: string | null
  created: number
  updated: number
  assignments: ModuleAssignment[]
}

// A realistic tenant: a CX programme team, analysts across branches, a couple of admins, and
// a tail of newly-invited staff who have not enrolled MFA yet.
const SEED: SeedUser[] = [
  { username: "sara.alomar@nabadat.sa",      persona: "P-01", status: "active",             mfa: true,  node: "HQ",              created: 420, updated: 2,   assignments: modules(PERMISSION_MODULES.map((m) => m.id)) },
  { username: "khalid.mansouri@nabadat.sa",  persona: "P-01", status: "active",             mfa: true,  node: "HQ",              created: 388, updated: 5,   assignments: modules([...CX_MODULES, "TenantConfiguration"]) },
  { username: "huda.qasim@nabadat.sa",       persona: "P-02", status: "active",             mfa: true,  node: "HQ",              created: 351, updated: 1,   assignments: modules(CX_MODULES, ["View", "Manage"]) },
  { username: "omar.haddad@nabadat.sa",      persona: "P-02", status: "active",             mfa: true,  node: "Riyadh-Central",  created: 340, updated: 9,   assignments: modules(CX_MODULES, ["View", "Manage"]) },
  { username: "laila.nasser@nabadat.sa",     persona: "P-02", status: "active",             mfa: true,  node: "Jeddah-West",     created: 322, updated: 14,  assignments: modules(CX_MODULES, ["View", "Manage"]) },
  { username: "yousef.tamimi@nabadat.sa",    persona: "P-03", status: "active",             mfa: true,  node: "Riyadh-Central",  created: 298, updated: 3,   assignments: modules(["AnalyticsAndReporting", "CaseManagement"], ["View"]) },
  { username: "mona.saleh@nabadat.sa",       persona: "P-03", status: "active",             mfa: true,  node: "Riyadh-Central",  created: 291, updated: 21,  assignments: modules(["AnalyticsAndReporting", "CaseManagement"], ["View"]) },
  { username: "faisal.otaibi@nabadat.sa",    persona: "P-03", status: "active",             mfa: true,  node: "Dammam-East",     created: 276, updated: 7,   assignments: modules(["AnalyticsAndReporting", "CaseManagement"], ["View"]) },
  { username: "reem.shammari@nabadat.sa",    persona: "P-03", status: "locked",             mfa: true,  node: "Dammam-East",     created: 270, updated: 0,   assignments: modules(["AnalyticsAndReporting"], ["View"]) },
  { username: "tariq.zahrani@nabadat.sa",    persona: "P-03", status: "active",             mfa: true,  node: "Jeddah-West",     created: 264, updated: 30,  assignments: modules(["AnalyticsAndReporting", "CaseManagement"], ["View"]) },
  { username: "nour.abdullah@nabadat.sa",    persona: "P-04", status: "active",             mfa: true,  node: "HQ",              created: 245, updated: 11,  assignments: modules(["CaseManagement", "AlertsAndNotifications"], ["View", "Manage"]) },
  { username: "bandar.harbi@nabadat.sa",     persona: "P-04", status: "active",             mfa: true,  node: "Riyadh-Central",  created: 238, updated: 26,  assignments: modules(["CaseManagement", "AlertsAndNotifications"], ["View", "Manage"]) },
  { username: "aisha.balushi@nabadat.sa",    persona: "P-05", status: "active",             mfa: true,  node: "Jeddah-West",     created: 219, updated: 4,   assignments: modules(["ChannelManagement", "AudienceManagement"], ["View", "Manage"]) },
  { username: "majed.dosari@nabadat.sa",     persona: "P-05", status: "inactive",           mfa: false, node: "Jeddah-West",     created: 210, updated: 48,  assignments: [] },
  { username: "dana.khoury@nabadat.sa",      persona: "P-06", status: "active",             mfa: true,  node: "HQ",              created: 198, updated: 6,   assignments: modules(["AnalyticsAndReporting", "KpiConfiguration"], ["View"]) },
  { username: "ibrahim.suwaidi@nabadat.sa",  persona: "P-06", status: "active",             mfa: true,  node: "HQ",              created: 186, updated: 19,  assignments: modules(["AnalyticsAndReporting", "KpiConfiguration"], ["View"]) },
  { username: "salma.rashid@nabadat.sa",     persona: "P-07", status: "active",             mfa: true,  node: "HQ",              created: 401, updated: 1,   assignments: modules(["UserManagement", "TenantConfiguration"]) },
  { username: "waleed.ghamdi@nabadat.sa",    persona: "P-07", status: "active",             mfa: true,  node: "HQ",              created: 372, updated: 13,  assignments: modules(["UserManagement", "TenantConfiguration"], ["View", "Manage"]) },
  { username: "hessa.kuwari@nabadat.sa",     persona: "P-08", status: "active",             mfa: true,  node: "HQ",              created: 160, updated: 33,  assignments: modules(["AnalyticsAndReporting"], ["View"]) },
  { username: "rakan.juhani@nabadat.sa",     persona: "P-03", status: "pending-enrollment", mfa: false, node: "Dammam-East",     created: 12,  updated: 12,  assignments: [] },
  { username: "shaikha.marri@nabadat.sa",    persona: "P-03", status: "pending-enrollment", mfa: false, node: "Riyadh-Central",  created: 9,   updated: 9,   assignments: [] },
  { username: "adel.qahtani@nabadat.sa",     persona: "P-04", status: "pending-enrollment", mfa: false, node: "Jeddah-West",     created: 5,   updated: 5,   assignments: [] },
  { username: "lina.baroudi@nabadat.sa",     persona: "P-02", status: "pending-enrollment", mfa: false, node: "HQ",              created: 3,   updated: 3,   assignments: [] },
  { username: "zaid.masri@nabadat.sa",       persona: "P-03", status: "pending-enrollment", mfa: false, node: "Dammam-East",     created: 1,   updated: 1,   assignments: [] },
]

export interface MockUserRecord extends UserDetail {}

function toRecord(seed: SeedUser): MockUserRecord {
  return {
    userId: mockId(seed.username),
    username: seed.username,
    persona: seed.persona,
    status: seed.status,
    isMfaEnrolled: seed.mfa,
    organizationNodeId: seed.node,
    createdAt: daysAgo(seed.created, 8, 30),
    updatedAt: daysAgo(seed.updated, 14, 15),
    lastPermissionSnapshotVersion: seed.assignments.length > 0 ? 3 : 1,
    permissionModuleAssignments: seed.assignments,
  }
}

/** The live store. Mutated by the mock api clients; reset on page refresh. */
export const userStore: MockUserRecord[] = SEED.map(toRecord)

export function summaryOf(u: MockUserRecord): UserSummary {
  return {
    userId: u.userId,
    username: u.username,
    persona: u.persona,
    status: u.status,
    isMfaEnrolled: u.isMfaEnrolled,
    organizationNodeId: u.organizationNodeId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

// ── persona baselines ────────────────────────────────────────────────────────
// Genuine tenant configuration read from the dev backend — not test residue, so it is
// reproduced as-is. P-01 holds all nine modules; P-07 holds the two non-CX modules.

export const baselineStore: PersonaBaseline[] = [
  { baselineId: mockId("baseline-P-01"), personaId: "P-01", permissionModuleAssignments: modules(PERMISSION_MODULES.map((m) => m.id)), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-02"), personaId: "P-02", permissionModuleAssignments: modules(CX_MODULES, ["View", "Manage"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-03"), personaId: "P-03", permissionModuleAssignments: modules(["AnalyticsAndReporting", "CaseManagement"], ["View"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-04"), personaId: "P-04", permissionModuleAssignments: modules(["CaseManagement", "AlertsAndNotifications"], ["View", "Manage"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-05"), personaId: "P-05", permissionModuleAssignments: modules(["ChannelManagement", "AudienceManagement"], ["View", "Manage"]), defaultDataScopeRules: {}, isCustomised: true, updatedAt: daysAgo(37, 11, 20) },
  { baselineId: mockId("baseline-P-06"), personaId: "P-06", permissionModuleAssignments: modules(["AnalyticsAndReporting", "KpiConfiguration"], ["View"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-07"), personaId: "P-07", permissionModuleAssignments: modules(["UserManagement", "TenantConfiguration"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
  { baselineId: mockId("baseline-P-08"), personaId: "P-08", permissionModuleAssignments: modules(["AnalyticsAndReporting"], ["View"]), defaultDataScopeRules: {}, isCustomised: false, updatedAt: daysAgo(420, 8, 0) },
]

// ── data scope ───────────────────────────────────────────────────────────────

export interface MockScopeRecord {
  organizationNodeId: string | null
  dataScopeAssignments: DataScopeAssignment[]
  customRules: CustomRule[]
}

/** Scope per user id. A user with no entry gets an empty scope (inherits their persona baseline). */
export const scopeStore = new Map<string, MockScopeRecord>()

function seedScope(username: string, record: MockScopeRecord) {
  scopeStore.set(mockId(username), record)
}

seedScope("omar.haddad@nabadat.sa", {
  organizationNodeId: "Riyadh-Central",
  dataScopeAssignments: [
    { parameterName: "branch", allowedValues: ["Riyadh-Olaya", "Riyadh-Malaz", "Riyadh-Nakheel"] },
    { parameterName: "channel_type", allowedValues: ["Branch", "Call Center"] },
  ],
  customRules: [
    {
      ruleId: mockId("rule-omar-1"),
      allowedActions: ["case.reassign", "case.escalate"],
      parameterScopeAssignments: { branch: ["Riyadh-Olaya"], customer_type: ["Corporate"] },
    },
  ],
})

seedScope("laila.nasser@nabadat.sa", {
  organizationNodeId: "Jeddah-West",
  dataScopeAssignments: [{ parameterName: "branch", allowedValues: ["Jeddah-Tahlia", "Jeddah-Corniche"] }],
  customRules: [],
})

seedScope("yousef.tamimi@nabadat.sa", {
  organizationNodeId: "Riyadh-Central",
  dataScopeAssignments: [
    { parameterName: "branch", allowedValues: ["Riyadh-Olaya"] },
    { parameterName: "department", allowedValues: ["Retail Banking"] },
  ],
  customRules: [],
})

// ── audit log ────────────────────────────────────────────────────────────────
// Realistic recent activity across the module: sign-ins, permission edits, invitations,
// a lockout, and tenant configuration changes.

interface SeedEvent {
  type: string
  actor: string | null
  entityType: string | null
  entity: string | null
  days: number
  hour: number
  minute: number
  oldValue?: unknown
  newValue?: unknown
}

const EVENT_SEED: SeedEvent[] = [
  { type: "user.permissions.updated", actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "yousef.tamimi@nabadat.sa", days: 0, hour: 9, minute: 42, oldValue: { allowedModes: ["View"] }, newValue: { allowedModes: ["View", "Manage"] } },
  { type: "session.created",          actor: "sara.alomar@nabadat.sa",  entityType: "AuthSession", entity: null, days: 0, hour: 8, minute: 12 },
  { type: "user.locked",              actor: null,                       entityType: "User", entity: "reem.shammari@nabadat.sa", days: 0, hour: 7, minute: 55, newValue: { reason: "failed_attempts", attempts: 5 } },
  { type: "session.created",          actor: "salma.rashid@nabadat.sa", entityType: "AuthSession", entity: null, days: 0, hour: 7, minute: 30 },
  { type: "user.invited",             actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "zaid.masri@nabadat.sa", days: 1, hour: 15, minute: 8, newValue: { persona: "P-03" } },
  { type: "scope.updated",            actor: "sara.alomar@nabadat.sa",  entityType: "UserScope", entity: "omar.haddad@nabadat.sa", days: 1, hour: 13, minute: 24, oldValue: { branch: ["Riyadh-Olaya"] }, newValue: { branch: ["Riyadh-Olaya", "Riyadh-Malaz", "Riyadh-Nakheel"] } },
  { type: "session.revoked",          actor: "salma.rashid@nabadat.sa", entityType: "AuthSession", entity: "majed.dosari@nabadat.sa", days: 2, hour: 16, minute: 40 },
  { type: "user.deactivated",         actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "majed.dosari@nabadat.sa", days: 2, hour: 16, minute: 39, oldValue: { status: "active" }, newValue: { status: "inactive" } },
  { type: "custom_rule.created",      actor: "sara.alomar@nabadat.sa",  entityType: "CustomRule", entity: "omar.haddad@nabadat.sa", days: 3, hour: 11, minute: 5, newValue: { allowedActions: ["case.reassign", "case.escalate"] } },
  { type: "session.created",          actor: "huda.qasim@nabadat.sa",   entityType: "AuthSession", entity: null, days: 3, hour: 8, minute: 2 },
  { type: "persona_baseline.updated", actor: "sara.alomar@nabadat.sa",  entityType: "PersonaBaseline", entity: "P-05", days: 4, hour: 10, minute: 17, oldValue: { modules: 3 }, newValue: { modules: 2 } },
  { type: "user.mfa_reset",           actor: "waleed.ghamdi@nabadat.sa", entityType: "User", entity: "majed.dosari@nabadat.sa", days: 5, hour: 9, minute: 48 },
  { type: "user.invited",             actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "lina.baroudi@nabadat.sa", days: 5, hour: 9, minute: 12, newValue: { persona: "P-02" } },
  { type: "user.password_reset",      actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "tariq.zahrani@nabadat.sa", days: 6, hour: 14, minute: 33 },
  { type: "session.created",          actor: "dana.khoury@nabadat.sa",  entityType: "AuthSession", entity: null, days: 6, hour: 8, minute: 21 },
  { type: "user.persona_changed",     actor: "sara.alomar@nabadat.sa",  entityType: "User", entity: "hessa.kuwari@nabadat.sa", days: 8, hour: 12, minute: 0, oldValue: { persona: "P-03" }, newValue: { persona: "P-08" } },
  { type: "tenant_config.updated",    actor: "waleed.ghamdi@nabadat.sa", entityType: "TenantConfiguration", entity: "session_timeout", days: 9, hour: 17, minute: 26, oldValue: { minutes: 30 }, newValue: { minutes: 20 } },
  { type: "user.invited",             actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "adel.qahtani@nabadat.sa", days: 10, hour: 10, minute: 44, newValue: { persona: "P-04" } },
  { type: "user.reactivated",         actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "tariq.zahrani@nabadat.sa", days: 12, hour: 11, minute: 9, oldValue: { status: "inactive" }, newValue: { status: "active" } },
  { type: "scope.updated",            actor: "sara.alomar@nabadat.sa",  entityType: "UserScope", entity: "laila.nasser@nabadat.sa", days: 14, hour: 15, minute: 51, newValue: { branch: ["Jeddah-Tahlia", "Jeddah-Corniche"] } },
  { type: "user.permissions.updated", actor: "salma.rashid@nabadat.sa", entityType: "User", entity: "nour.abdullah@nabadat.sa", days: 16, hour: 9, minute: 3, oldValue: { modules: 1 }, newValue: { modules: 2 } },
  { type: "session.created",          actor: "khalid.mansouri@nabadat.sa", entityType: "AuthSession", entity: null, days: 18, hour: 8, minute: 47 },
  { type: "user.unlocked",            actor: "waleed.ghamdi@nabadat.sa", entityType: "User", entity: "faisal.otaibi@nabadat.sa", days: 21, hour: 13, minute: 15 },
  { type: "persona_baseline.updated", actor: "sara.alomar@nabadat.sa",  entityType: "PersonaBaseline", entity: "P-03", days: 26, hour: 10, minute: 30, oldValue: { modules: 3 }, newValue: { modules: 2 } },
]

function toEvent(e: SeedEvent, i: number): AuditLogEntry {
  return {
    eventId: mockId(`${e.type}-${e.entity ?? "none"}-${i}`),
    eventType: e.type,
    actorId: e.actor ? mockId(e.actor) : null,
    actorUsername: e.actor,
    entityType: e.entityType,
    entityId: e.entity ? mockId(e.entity) : null,
    oldValue: e.oldValue ?? null,
    newValue: e.newValue ?? null,
    occurredAtUtc: daysAgo(e.days, e.hour, e.minute),
    correlationId: mockId(`corr-${i}`),
  }
}

/** Newest-first, matching the real endpoint's default ordering. */
export const auditStore: AuditLogEntry[] = EVENT_SEED.map(toEvent)

/**
 * Appends an event so an action taken in the clickthrough shows up on the Audit Log screen —
 * the cross-screen consistency that makes the walkthrough believable.
 */
export function recordEvent(entry: {
  eventType: string
  actorUsername?: string | null
  entityType?: string | null
  entityId?: string | null
  oldValue?: unknown
  newValue?: unknown
}): void {
  auditStore.unshift({
    eventId: mockId(`live-${entry.eventType}-${auditStore.length}-${Date.now()}`),
    eventType: entry.eventType,
    actorId: entry.actorUsername ? mockId(entry.actorUsername) : null,
    actorUsername: entry.actorUsername ?? "sara.alomar@nabadat.sa",
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    occurredAtUtc: new Date().toISOString(),
    correlationId: mockId(`corr-live-${auditStore.length}`),
  })
}

/** Mimics the small round-trip delay the real client has, so loading states are visible. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
