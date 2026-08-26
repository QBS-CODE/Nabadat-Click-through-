// M-15 Action Management API client — CLICKTHROUGH DEMO build.
//
// This is the in-memory mock replacement for the real fetch-based client. It contacts NO backend:
// there is no `fetch`, no session token, no timezone header — every function reads from / mutates a
// module-level store seeded with realistic demo Actions. The EXACT public export surface of the real
// `api.ts` is preserved (every domain type + `ActionApiError` + every endpoint function with an
// identical name and signature), so the rest of the already-copied feature compiles unchanged.
//
// Dropped from the real file (no wire ⇒ no mapping): the wire interfaces
// (`KpiTargetWire` / `ActionWire` / `ActionListResponseWire` / `ActionSettingsWire`), the transport
// `CallOptions`, and the wire⇄domain mapper helpers. All DOMAIN types consumers import are kept.

// ── Error envelope (API-05) ─────────────────────────────────────────────────

/** The standard error envelope returned on every non-2xx response (API-05). */
export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    correlation_id?: string
    tenant_id?: string
    details?: { field: string; code: string }[]
  }
}

/**
 * Thrown for any non-2xx response from the Action Management API. Carries the HTTP `status` and the
 * API-05 `code` so callers can branch on documented failures — e.g. 409
 * `validation.duplicate_action_name` (VAL-202), 409 `kpi.no_historical_score` (ERR-5), 409
 * `action.read_only` / `action.archived`, 403 (ERR-3).
 */
export class ActionApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string
  readonly details?: ApiErrorEnvelope["error"]["details"]

  constructor(status: number, envelope?: ApiErrorEnvelope) {
    const err = envelope?.error
    super(err?.message ?? `Request failed with status ${status}`)
    this.name = "ActionApiError"
    this.status = status
    this.code = err?.code ?? "unknown_error"
    this.correlationId = err?.correlation_id
    this.details = err?.details
  }
}

// ── Enums / unions ──────────────────────────────────────────────────────────

/** An Action's computed presentation status (never stored — computed day-granularly, FR-102). */
export type ActionStatus = "active" | "planned" | "completed" | "archived"

/** The four All-Actions tabs — same set as `ActionStatus`. */
export type ActionTab = ActionStatus

/** Why a Target is deactivated (`null` while active). */
export type DeactivationSource = "manual" | "forced"

/** A Target's evaluated outcome (BR-O1..O4); `null` until its Target Date has passed. */
export type ActionOutcome = "successful" | "partially_successful" | "unsuccessful"

/**
 * The pace colour of a Target's timer ring (FR-M10). NOT returned by the server — the client
 * computes it from the raw baseline/threshold/date/score inputs (contract note on `GET /actions`).
 */
export type TimerState = "green" | "yellow" | "red" | "grey" | "empty"

/**
 * Server-computed SCR-03 row layout (FR-304..308), present only on the detail response.
 * `completed` covers both a Completed Action's rows and an evaluated Target on a still-Active one.
 */
export type RowVariant = "active_unevaluated" | "completed" | "planned" | "deactivated"

// ── Domain types (camelCase, consumed by components/hooks) ──────────────────

export interface KpiTarget {
  id: string
  kpiId: string
  kpiName: string
  targetDate: string
  lowerThreshold: number
  upperThreshold: number
  active: boolean
  deactivationSource: DeactivationSource | null
  baselineScore: number | null
  /** The date the Baseline was captured for (the Action Start Date at capture time); null if none. */
  baselineCapturedForDate: string | null
  currentScore: number | null
  finalScore: number | null
  outcome: ActionOutcome | null
  /** SCR-03 detail only — server-computed row layout (FR-304..308). */
  variant?: RowVariant
  /** SCR-03 detail only — true on the featured Active row (AC-3.1). */
  isLowestPerforming?: boolean
}

export interface Action {
  id: string
  actionName: string
  status: ActionStatus
  archived: boolean
  actionStartDate: string
  actionEndDate: string
  targetStartDate: string
  latestTargetDate: string
  description: string | null
  targets: KpiTarget[]
  createdAt: string
  /** Echoed back on edit for ERR-8 stale-save detection (US4). */
  updatedAt: string
}

export interface ActionListResult {
  items: Action[]
  nextPageToken: string | null
  totalCount: number
  /** `null` unless the request carried a `q` search term. */
  crossTabMatchCount: number | null
}

export interface ActionSettings {
  maxUpperThreshold: number
  sliderPadding: number
}

// ── Request / input types (camelCase) ───────────────────────────────────────

export interface KpiTargetInput {
  /**
   * The stored Target's id — **edit mode only**; omit for a row the form is adding (FR-210).
   * Rows are matched by id, never by position or KPI.
   */
  id?: string
  kpiId: string
  targetDate: string
  lowerThreshold: number
  upperThreshold: number
  /**
   * The FR-207 activation flag — **edit mode only**. Omitted on create (defaults to `true`). A
   * deactivated Target stays in the payload with `active: false`; omitting a row means "unchanged".
   */
  active?: boolean
}

export interface ActionSaveInput {
  actionName: string
  description?: string
  actionStartDate: string
  actionEndDate: string
  /** ≥ 1 target (VAL-207). */
  targets: KpiTargetInput[]
  /**
   * The `updatedAt` the client loaded the Action with, echoed back on edit for ERR-8 stale-save
   * detection (spec R-4: last-write-wins, no locking). Omitted on create.
   */
  updatedAt?: string
}

export interface ActionSettingsInput {
  maxUpperThreshold?: number
  sliderPadding?: number
}

export interface ListActionsParams {
  /** Omit to return all four tabs grouped. */
  tab?: ActionTab
  /** Free-text Action Name substring, cross-tab (FR-106). */
  q?: string
  /** KPI id multi-select (repeatable, FR-107). */
  kpiIds?: string[]
  /** `action_start_date` range lower bound (inclusive), ISO date. */
  startFrom?: string
  /** `action_start_date` range upper bound (inclusive), ISO date. */
  startTo?: string
  /** Page size (server clamps to 1..200; default 50). */
  pageSize?: number
  /** Opaque cursor from a previous page's `nextPageToken` (API-04). */
  pageToken?: string
}

export interface UpdateActionResult {
  action: Action
  /** `true` when the write was accepted despite a stale `updated_at` (ERR-8, last-write-wins). */
  staleSave: boolean
}

// ── Demo helpers ─────────────────────────────────────────────────────────────

/** A tiny artificial latency so the loading skeletons flash briefly (demo realism only). */
const delay = (ms = 180) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Deep clone on the way out so consumers can never mutate the store by reference. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

let idCounter = 100
const genId = (prefix: string) => `${prefix}-${(idCounter += 1)}`

/** KPI catalogue (id → short name) mirroring the M-06 catalogue used across the demo. */
const KPI_CATALOGUE: Record<string, string> = {
  "kpi-nps": "NPS",
  "kpi-csat": "CSAT",
  "kpi-ces": "CES",
  "kpi-fcr": "FCR",
  "kpi-cxi": "CXI",
  "kpi-aht": "AHT",
  "kpi-vfm": "VFM",
}

/**
 * Today, pinned to the ratified M-15 prototype's fixed clock (`NOW = 2026-07-20`) — MUST match
 * `lib/measurement.CLICKTHROUGH_TODAY`. If these two drift apart, the mock's `decorate()` (row
 * variants + featured target) evaluates against a different day than the components' pace/timer,
 * which mislabels rows (e.g. a still-active target rendered as evaluated "—"). Keep them equal.
 */
const todayIso = (): string => "2026-07-20"

/**
 * Recomputes an Action's date-driven status (the real server computes this day-granularly). Archived
 * wins; then Planned before the Start Date; Completed once every Target Date has passed; else Active.
 */
function deriveStatus(action: Action, now = todayIso()): ActionStatus {
  if (action.archived) return "archived"
  if (now < action.actionStartDate) return "planned"
  if (action.targets.length > 0 && action.targets.every((t) => t.targetDate < now)) return "completed"
  return "active"
}

/** Raw Score Progress for ranking the featured Target — mirrors `lib/measurement.scoreProgress`. */
function scoreProgressOf(t: KpiTarget): number | null {
  if (t.baselineScore == null || t.currentScore == null || t.upperThreshold <= 0) return null
  return (t.currentScore - t.baselineScore) / t.upperThreshold
}

/** Server-computed SCR-03 row layout for a Target (FR-304..308). */
function computeVariant(action: Action, target: KpiTarget, now: string): RowVariant {
  if (!target.active) return "deactivated"
  if (action.status === "planned") return "planned"
  if (action.status === "completed" || target.outcome != null || target.targetDate < now) return "completed"
  return "active_unevaluated"
}

/**
 * Decorates a (cloned) Action with the detail-only fields the SCR-03 page reads: each Target's row
 * `variant` and the single `isLowestPerforming` flag on the featured Active row (AC-3.1 — lowest raw
 * Score Progress among eligible active, not-yet-evaluated Targets; Planned actions rank by current
 * score). List responses do NOT carry these — only the single-Action reads do.
 */
function decorate(action: Action, now = todayIso()): Action {
  for (const t of action.targets) {
    t.variant = computeVariant(action, t, now)
    t.isLowestPerforming = false
  }
  const eligible = action.targets.filter((t) => t.active && t.targetDate >= now && t.outcome == null)
  if (eligible.length > 0) {
    const planned = action.status === "planned"
    const featured = [...eligible].sort((a, b) => {
      const ka = planned ? (a.currentScore ?? Infinity) : (scoreProgressOf(a) ?? Infinity)
      const kb = planned ? (b.currentScore ?? Infinity) : (scoreProgressOf(b) ?? Infinity)
      if (ka !== kb) return ka - kb
      if (a.targetDate !== b.targetDate) return a.targetDate < b.targetDate ? -1 : 1
      return a.kpiName.localeCompare(b.kpiName)
    })[0]
    featured.isLowestPerforming = true
  }
  return action
}

// ── In-memory store ──────────────────────────────────────────────────────────

// Seeded so every screen renders variety: statuses (2 active / 2 planned / 2 completed / 1 archived),
// every RowVariant, every TimerState (green/yellow/red/grey/empty), every ActionOutcome, both
// DeactivationSources, and dates around 2026-08-24 (execution vs monitoring vs evaluated phases).

let settings: ActionSettings = { maxUpperThreshold: 50, sliderPadding: 5 }

let store: Action[] = [
  // ────────────────────────────────────────────────────────────────────────────────────────────
  // Seed data ported VERBATIM from the ratified M-15 prototype
  // (nabadat-m15-action-management-mockup_1.html) so the clickthrough reproduces it exactly.
  // The clock is pinned to 2026-07-20 (see measurement.ts CLICKTHROUGH_TODAY); tab assignment,
  // pace, timer fill and featured target are all derived from these dates against that fixed today.
  // ────────────────────────────────────────────────────────────────────────────────────────────

  // ── Active (start ≤ today, latest target date ≥ today) ──
  {
    id: "act-training-agents",
    actionName: "Training of Call Center Agents",
    status: "active",
    archived: false,
    actionStartDate: "2026-05-01",
    actionEndDate: "2026-05-03",
    targetStartDate: "2026-05-04",
    latestTargetDate: "2026-09-15",
    description:
      "Two-day coaching program for the call-center team focused on first-contact resolution and empathy scripting. Baseline captured 1 May; monitoring runs to the latest target date.",
    createdAt: "2026-04-25T09:00:00Z",
    updatedAt: "2026-05-04T09:00:00Z",
    targets: [
      { id: "tgt-training-nps", kpiId: "kpi-nps", kpiName: "NPS", targetDate: "2026-08-04", lowerThreshold: 3, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: 69, baselineCapturedForDate: "2026-05-01", currentScore: 73, finalScore: null, outcome: null },
      { id: "tgt-training-csat", kpiId: "kpi-csat", kpiName: "CSAT", targetDate: "2026-09-15", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: 78, baselineCapturedForDate: "2026-05-01", currentScore: 84, finalScore: null, outcome: null },
      { id: "tgt-training-ces", kpiId: "kpi-ces", kpiName: "CES", targetDate: "2026-08-20", lowerThreshold: 2, upperThreshold: 4, active: false, deactivationSource: "manual", baselineScore: 71, baselineCapturedForDate: "2026-05-01", currentScore: 72, finalScore: null, outcome: null },
    ],
  },
  {
    id: "act-ivr-menu",
    actionName: "IVR Menu Redesign",
    status: "active",
    archived: false,
    actionStartDate: "2026-06-10",
    actionEndDate: "2026-06-15",
    targetStartDate: "2026-06-16",
    latestTargetDate: "2026-09-30",
    description:
      "Simplify the IVR tree from 6 levels to 3 and add a callback option to cut caller effort.",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-16T09:00:00Z",
    targets: [
      { id: "tgt-ivrmenu-ces", kpiId: "kpi-ces", kpiName: "CES", targetDate: "2026-09-30", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: 62, baselineCapturedForDate: "2026-06-10", currentScore: 66, finalScore: null, outcome: null },
    ],
  },

  // ── Planned (start date is in the future; no baseline captured yet) ──
  {
    id: "act-branch-coaching",
    actionName: "Branch Staff Coaching — Eastern Region",
    status: "planned",
    archived: false,
    actionStartDate: "2026-08-01",
    actionEndDate: "2026-08-05",
    targetStartDate: "2026-08-06",
    latestTargetDate: "2026-11-01",
    description:
      "On-site coaching for the eight Eastern-Region branches with the lowest teller satisfaction.",
    createdAt: "2026-07-10T09:00:00Z",
    updatedAt: "2026-07-10T09:00:00Z",
    targets: [
      { id: "tgt-coaching-csat", kpiId: "kpi-csat", kpiName: "CSAT", targetDate: "2026-11-01", lowerThreshold: 3, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 71, finalScore: null, outcome: null },
      { id: "tgt-coaching-fcr", kpiId: "kpi-fcr", kpiName: "FCR", targetDate: "2026-11-01", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 76, finalScore: null, outcome: null },
    ],
  },
  {
    id: "act-whatsapp-feedback",
    actionName: "WhatsApp Feedback Channel Launch",
    status: "planned",
    archived: false,
    actionStartDate: "2026-09-01",
    actionEndDate: "2026-09-10",
    targetStartDate: "2026-09-11",
    latestTargetDate: "2026-12-15",
    description:
      "Open a WhatsApp survey channel for post-interaction feedback with Arabic-first templates.",
    createdAt: "2026-07-15T09:00:00Z",
    updatedAt: "2026-07-15T09:00:00Z",
    targets: [
      { id: "tgt-whatsapp-nps", kpiId: "kpi-nps", kpiName: "NPS", targetDate: "2026-12-15", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 64, finalScore: null, outcome: null },
      { id: "tgt-whatsapp-chs", kpiId: "kpi-chs", kpiName: "CHS", targetDate: "2026-12-15", lowerThreshold: 3, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 70, finalScore: null, outcome: null },
    ],
  },
  {
    id: "act-onboarding-kit",
    actionName: "Onboarding Welcome-Kit Revamp",
    status: "planned",
    archived: false,
    actionStartDate: "2026-08-15",
    actionEndDate: "2026-08-18",
    targetStartDate: "2026-08-19",
    latestTargetDate: "2026-11-20",
    description:
      "Redesign the new-customer welcome kit and first-week follow-up call script.",
    createdAt: "2026-07-12T09:00:00Z",
    updatedAt: "2026-07-12T09:00:00Z",
    targets: [
      { id: "tgt-onboarding-vfm", kpiId: "kpi-vfm", kpiName: "VFM", targetDate: "2026-11-20", lowerThreshold: 2, upperThreshold: 4, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 68, finalScore: null, outcome: null },
      { id: "tgt-onboarding-csat", kpiId: "kpi-csat", kpiName: "CSAT", targetDate: "2026-11-20", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: null, baselineCapturedForDate: null, currentScore: 74, finalScore: null, outcome: null },
    ],
  },

  // ── Completed (latest target date has passed; current = final score on the target date) ──
  {
    id: "act-mystery-shopper",
    actionName: "Mystery Shopper Program — Q1",
    status: "completed",
    archived: false,
    actionStartDate: "2026-01-05",
    actionEndDate: "2026-01-20",
    targetStartDate: "2026-01-21",
    latestTargetDate: "2026-04-20",
    description: "Quarterly mystery-shopper visits across flagship branches.",
    createdAt: "2025-12-20T09:00:00Z",
    updatedAt: "2026-04-20T09:00:00Z",
    targets: [
      { id: "tgt-mystery-nps", kpiId: "kpi-nps", kpiName: "NPS", targetDate: "2026-04-20", lowerThreshold: 3, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: 60, baselineCapturedForDate: "2026-01-05", currentScore: 67, finalScore: 67, outcome: "successful" },
      { id: "tgt-mystery-ces", kpiId: "kpi-ces", kpiName: "CES", targetDate: "2026-04-10", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: 65, baselineCapturedForDate: "2026-01-05", currentScore: 68, finalScore: 68, outcome: "partially_successful" },
      { id: "tgt-mystery-csat", kpiId: "kpi-csat", kpiName: "CSAT", targetDate: "2026-03-30", lowerThreshold: 3, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: 72, baselineCapturedForDate: "2026-01-05", currentScore: 73, finalScore: 73, outcome: "unsuccessful" },
    ],
  },
  {
    id: "act-complaint-hotline",
    actionName: "Complaint Hotline Fast-Track",
    status: "completed",
    archived: false,
    actionStartDate: "2025-10-01",
    actionEndDate: "2025-10-05",
    targetStartDate: "2025-10-06",
    latestTargetDate: "2026-02-01",
    description:
      "Dedicated fast-track queue for repeat complaints with a 24-hour resolution promise.",
    createdAt: "2025-09-20T09:00:00Z",
    updatedAt: "2026-02-01T09:00:00Z",
    targets: [
      { id: "tgt-complaint-fcr", kpiId: "kpi-fcr", kpiName: "FCR", targetDate: "2026-01-15", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: 70, baselineCapturedForDate: "2025-10-01", currentScore: 77, finalScore: 77, outcome: "successful" },
      { id: "tgt-complaint-nps", kpiId: "kpi-nps", kpiName: "NPS", targetDate: "2026-02-01", lowerThreshold: 3, upperThreshold: 7, active: true, deactivationSource: null, baselineScore: 55, baselineCapturedForDate: "2025-10-01", currentScore: 59, finalScore: 59, outcome: "partially_successful" },
    ],
  },
  {
    id: "act-queue-pilot",
    actionName: "Branch Queue Management Pilot",
    status: "completed",
    archived: false,
    actionStartDate: "2025-12-01",
    actionEndDate: "2025-12-10",
    targetStartDate: "2025-12-11",
    latestTargetDate: "2026-03-01",
    description: "Ticket-less virtual queue pilot in three high-traffic branches.",
    createdAt: "2025-11-20T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
    targets: [
      { id: "tgt-queue-ces", kpiId: "kpi-ces", kpiName: "CES", targetDate: "2026-03-01", lowerThreshold: 2, upperThreshold: 6, active: true, deactivationSource: null, baselineScore: 58, baselineCapturedForDate: "2025-12-01", currentScore: 57, finalScore: 57, outcome: "unsuccessful" },
      { id: "tgt-queue-csat", kpiId: "kpi-csat", kpiName: "CSAT", targetDate: "2026-02-20", lowerThreshold: 2, upperThreshold: 4, active: true, deactivationSource: null, baselineScore: 66, baselineCapturedForDate: "2025-12-01", currentScore: 70, finalScore: 70, outcome: "successful" },
    ],
  },

  // ── Archived (flag only — an Active action still running normally, shown in the Archived tab) ──
  {
    id: "act-loyalty-tier",
    actionName: "Loyalty Tier Benefits Review",
    status: "archived",
    archived: true,
    actionStartDate: "2026-06-01",
    actionEndDate: "2026-06-05",
    targetStartDate: "2026-06-06",
    latestTargetDate: "2026-10-01",
    description:
      "Review and rebalance loyalty tier perks based on redemption feedback. Archived from view; measurement continues normally.",
    createdAt: "2026-05-25T09:00:00Z",
    updatedAt: "2026-06-06T09:00:00Z",
    targets: [
      { id: "tgt-loyalty-nps", kpiId: "kpi-nps", kpiName: "NPS", targetDate: "2026-10-01", lowerThreshold: 2, upperThreshold: 5, active: true, deactivationSource: null, baselineScore: 66, baselineCapturedForDate: "2026-06-01", currentScore: 68, finalScore: null, outcome: null },
    ],
  },
]

// ── Endpoint functions ──────────────────────────────────────────────────────

/** Lists the tenant's Actions, honouring tab / search / KPI / date filters and cursor pagination. */
export async function listActions(params: ListActionsParams = {}): Promise<ActionListResult> {
  await delay()

  const q = params.q?.trim().toLowerCase()
  // Cross-tab match count (FR-106) — computed over the whole set, before tab/paging narrow it.
  const crossTabMatchCount = q
    ? store.filter((a) => a.actionName.toLowerCase().includes(q)).length
    : null

  let matched = store.filter((a) => {
    if (params.tab && a.status !== params.tab) return false
    if (q && !a.actionName.toLowerCase().includes(q)) return false
    if (params.kpiIds && params.kpiIds.length > 0) {
      if (!a.targets.some((t) => params.kpiIds!.includes(t.kpiId))) return false
    }
    if (params.startFrom && a.actionStartDate < params.startFrom) return false
    if (params.startTo && a.actionStartDate > params.startTo) return false
    return true
  })

  // Preserve store order (seeds are laid out to match the ratified prototype's per-tab order);
  // newly-created actions are prepended to the store, so they still surface first.

  const totalCount = matched.length
  const pageSize = params.pageSize != null ? Math.max(1, Math.min(200, params.pageSize)) : 50
  const offset = params.pageToken ? Number.parseInt(params.pageToken, 10) || 0 : 0
  const page = matched.slice(offset, offset + pageSize)
  const nextOffset = offset + pageSize
  const nextPageToken = nextOffset < totalCount ? String(nextOffset) : null

  return {
    items: page.map((a) => clone(a)),
    nextPageToken,
    totalCount,
    crossTabMatchCount,
  }
}

/** Creates an Action with ≥ 1 KPI Target. Auto-derives status from its dates. */
export async function createAction(input: ActionSaveInput): Promise<Action> {
  await delay()

  const now = todayIso()
  const nowIso = new Date().toISOString()
  const targets: KpiTarget[] = input.targets.map((t) => ({
    id: t.id ?? genId("tgt"),
    kpiId: t.kpiId,
    kpiName: KPI_CATALOGUE[t.kpiId] ?? t.kpiId,
    targetDate: t.targetDate,
    lowerThreshold: t.lowerThreshold,
    upperThreshold: t.upperThreshold,
    active: t.active ?? true,
    deactivationSource: null,
    baselineScore: null,
    baselineCapturedForDate: null,
    currentScore: null,
    finalScore: null,
    outcome: null,
  }))

  const targetDates = targets.map((t) => t.targetDate).sort()
  const latestTargetDate = targetDates[targetDates.length - 1]

  const action: Action = {
    id: genId("act"),
    actionName: input.actionName,
    status: "active",
    archived: false,
    actionStartDate: input.actionStartDate,
    actionEndDate: input.actionEndDate,
    targetStartDate: input.actionEndDate,
    latestTargetDate,
    description: input.description ?? null,
    targets,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  action.status = deriveStatus(action, now)

  store = [action, ...store]
  return decorate(clone(action), now)
}

/** Reads one Action's full breakdown. Throws `ActionApiError(404)` for an unknown id (ERR-6). */
export async function getAction(id: string): Promise<Action> {
  await delay()
  const found = store.find((a) => a.id === id)
  if (!found) {
    throw new ActionApiError(404, {
      error: { code: "action.not_found", message: `Action ${id} was not found.` },
    })
  }
  return decorate(clone(found))
}

/**
 * Edits a Planned or Active Action (last-write-wins). Targets are matched by id: id-bearing inputs
 * update the matching stored Target, id-less inputs are appended, and omitted Targets stay unchanged.
 * A stale `updatedAt` echo does not block the write — it only flags `staleSave` (ERR-8).
 */
export async function updateAction(id: string, input: ActionSaveInput): Promise<UpdateActionResult> {
  await delay()

  const existing = store.find((a) => a.id === id)
  if (!existing) {
    throw new ActionApiError(404, {
      error: { code: "action.not_found", message: `Action ${id} was not found.` },
    })
  }

  const staleSave = input.updatedAt != null && input.updatedAt !== existing.updatedAt

  const merged: KpiTarget[] = input.targets.map((t) => {
    const prev = t.id ? existing.targets.find((p) => p.id === t.id) : undefined
    if (prev) {
      return {
        ...prev,
        kpiId: t.kpiId,
        kpiName: KPI_CATALOGUE[t.kpiId] ?? t.kpiId,
        targetDate: t.targetDate,
        lowerThreshold: t.lowerThreshold,
        upperThreshold: t.upperThreshold,
        active: t.active ?? prev.active,
        deactivationSource: (t.active ?? prev.active) ? null : (prev.deactivationSource ?? "manual"),
      }
    }
    return {
      id: t.id ?? genId("tgt"),
      kpiId: t.kpiId,
      kpiName: KPI_CATALOGUE[t.kpiId] ?? t.kpiId,
      targetDate: t.targetDate,
      lowerThreshold: t.lowerThreshold,
      upperThreshold: t.upperThreshold,
      active: t.active ?? true,
      deactivationSource: null,
      baselineScore: null,
      baselineCapturedForDate: null,
      currentScore: null,
      finalScore: null,
      outcome: null,
    }
  })

  existing.actionName = input.actionName
  existing.description = input.description ?? null
  existing.actionStartDate = input.actionStartDate
  existing.actionEndDate = input.actionEndDate
  existing.targetStartDate = input.actionEndDate
  existing.targets = merged
  const mergedDates = merged.map((t) => t.targetDate).sort()
  existing.latestTargetDate = mergedDates[mergedDates.length - 1]
  existing.updatedAt = new Date().toISOString()
  existing.status = deriveStatus(existing)

  return { action: decorate(clone(existing)), staleSave }
}

/** Archives an Action (no body, no confirmation — BR-009). */
export async function archiveAction(id: string): Promise<Action> {
  await delay()
  const found = store.find((a) => a.id === id)
  if (!found) {
    throw new ActionApiError(404, {
      error: { code: "action.not_found", message: `Action ${id} was not found.` },
    })
  }
  found.archived = true
  found.status = "archived"
  found.updatedAt = new Date().toISOString()
  return decorate(clone(found))
}

/** Unarchives an Action, returning its recomputed date-driven status. */
export async function unarchiveAction(id: string): Promise<Action> {
  await delay()
  const found = store.find((a) => a.id === id)
  if (!found) {
    throw new ActionApiError(404, {
      error: { code: "action.not_found", message: `Action ${id} was not found.` },
    })
  }
  found.archived = false
  found.status = deriveStatus(found)
  found.updatedAt = new Date().toISOString()
  return decorate(clone(found))
}

/** Activates or deactivates one KPI Target; returns the updated Target (FR-207 / US7). */
export async function setTargetActive(
  actionId: string,
  targetId: string,
  active: boolean,
): Promise<KpiTarget> {
  await delay()
  const action = store.find((a) => a.id === actionId)
  const target = action?.targets.find((t) => t.id === targetId)
  if (!action || !target) {
    throw new ActionApiError(404, {
      error: { code: "target.not_found", message: `Target ${targetId} was not found.` },
    })
  }
  target.active = active
  target.deactivationSource = active ? null : "manual"
  action.status = deriveStatus(action)
  action.updatedAt = new Date().toISOString()
  return clone(target)
}

/** Deletes a deactivated KPI Target; returns the Action's remaining Targets (BR-012 / R-17 / US7). */
export async function deleteTarget(actionId: string, targetId: string): Promise<KpiTarget[]> {
  await delay()
  const action = store.find((a) => a.id === actionId)
  if (!action) {
    throw new ActionApiError(404, {
      error: { code: "action.not_found", message: `Action ${actionId} was not found.` },
    })
  }
  action.targets = action.targets.filter((t) => t.id !== targetId)
  action.updatedAt = new Date().toISOString()
  action.status = deriveStatus(action)
  return action.targets.map((t) => clone(t))
}

/** Reads the tenant's Action settings (X + PAD). */
export async function getActionSettings(): Promise<ActionSettings> {
  await delay()
  return { ...settings }
}

/** Updates the tenant's Action settings (merge + return). */
export async function updateActionSettings(input: ActionSettingsInput): Promise<ActionSettings> {
  await delay()
  settings = {
    maxUpperThreshold: input.maxUpperThreshold ?? settings.maxUpperThreshold,
    sliderPadding: input.sliderPadding ?? settings.sliderPadding,
  }
  return { ...settings }
}
