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

/** Today as a local calendar date (matches `lib/measurement.todayIso`). */
const todayIso = (): string => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

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
  // ── ACTIVE #1 — in monitoring phase; GREEN + RED live timers ──────────────
  {
    id: "act-ivr-redesign",
    actionName: "IVR Redesign Rollout",
    status: "active",
    archived: false,
    actionStartDate: "2026-03-01",
    actionEndDate: "2026-06-30",
    targetStartDate: "2026-07-01",
    latestTargetDate: "2026-10-31",
    description: "Streamline the IVR menu tree to cut caller effort and lift satisfaction.",
    createdAt: "2026-02-25T09:00:00Z",
    updatedAt: "2026-07-05T11:30:00Z",
    targets: [
      {
        id: "tgt-ivr-nps",
        kpiId: "kpi-nps",
        kpiName: "NPS",
        targetDate: "2026-10-31",
        lowerThreshold: 5,
        upperThreshold: 20,
        active: true,
        deactivationSource: null,
        baselineScore: 30,
        baselineCapturedForDate: "2026-03-01",
        currentScore: 42, // score progress 0.60 > time progress ~0.44 → GREEN
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-ivr-csat",
        kpiId: "kpi-csat",
        kpiName: "CSAT",
        targetDate: "2026-09-30",
        lowerThreshold: 3,
        upperThreshold: 15,
        active: true,
        deactivationSource: null,
        baselineScore: 70,
        baselineCapturedForDate: "2026-03-01",
        currentScore: 74, // score progress 0.27 < time progress ~0.59 → RED (lowest performer)
        finalScore: null,
        outcome: null,
      },
    ],
  },

  // ── ACTIVE #2 — YELLOW (on pace), GREY (no current score), and a deactivated row ──
  {
    id: "act-branch-queue",
    actionName: "Branch Queue Optimization",
    status: "active",
    archived: false,
    actionStartDate: "2026-04-01",
    actionEndDate: "2026-07-15",
    targetStartDate: "2026-07-16",
    latestTargetDate: "2026-12-31",
    description: "Reduce in-branch wait times with a new appointment and triage flow.",
    createdAt: "2026-03-20T08:15:00Z",
    updatedAt: "2026-07-18T14:00:00Z",
    targets: [
      {
        id: "tgt-branch-ces",
        kpiId: "kpi-ces",
        kpiName: "CES",
        targetDate: "2026-10-15",
        lowerThreshold: 2,
        upperThreshold: 14,
        active: true,
        deactivationSource: null,
        baselineScore: 50,
        baselineCapturedForDate: "2026-04-01",
        currentScore: 56, // score progress 0.4286 ≈ time progress 0.4286 → YELLOW
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-branch-fcr",
        kpiId: "kpi-fcr",
        kpiName: "FCR",
        targetDate: "2026-11-30",
        lowerThreshold: 0.05,
        upperThreshold: 0.3,
        active: true,
        deactivationSource: null,
        baselineScore: 0.6,
        baselineCapturedForDate: "2026-04-01",
        currentScore: null, // no current score yet → GREY timer (not comparable)
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-branch-aht",
        kpiId: "kpi-aht",
        kpiName: "AHT",
        targetDate: "2026-12-31",
        lowerThreshold: 5,
        upperThreshold: 15,
        active: false, // force-deactivated → EMPTY timer, "deactivated" row
        deactivationSource: "forced",
        baselineScore: 45,
        baselineCapturedForDate: "2026-04-01",
        currentScore: null,
        finalScore: null,
        outcome: null,
      },
    ],
  },

  // ── PLANNED #1 — starts in the future; all timers EMPTY, no baselines yet ──
  {
    id: "act-mobile-nps",
    actionName: "Mobile App NPS Boost",
    status: "planned",
    archived: false,
    actionStartDate: "2026-09-15",
    actionEndDate: "2026-12-15",
    targetStartDate: "2026-12-16",
    latestTargetDate: "2027-03-31",
    description: "Ship in-app feedback prompts and a redesigned onboarding to raise promoter share.",
    createdAt: "2026-08-10T10:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
    targets: [
      {
        id: "tgt-mobile-nps",
        kpiId: "kpi-nps",
        kpiName: "NPS",
        targetDate: "2027-03-31",
        lowerThreshold: 4,
        upperThreshold: 15,
        active: true,
        deactivationSource: null,
        baselineScore: null,
        baselineCapturedForDate: null,
        currentScore: null,
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-mobile-cxi",
        kpiId: "kpi-cxi",
        kpiName: "CXI",
        targetDate: "2027-02-28",
        lowerThreshold: 3,
        upperThreshold: 10,
        active: true,
        deactivationSource: null,
        baselineScore: null,
        baselineCapturedForDate: null,
        currentScore: null,
        finalScore: null,
        outcome: null,
      },
    ],
  },

  // ── PLANNED #2 ─────────────────────────────────────────────────────────────
  {
    id: "act-vfm-campaign",
    actionName: "Value-for-Money Perception Campaign",
    status: "planned",
    archived: false,
    actionStartDate: "2026-10-01",
    actionEndDate: "2027-01-31",
    targetStartDate: "2027-02-01",
    latestTargetDate: "2027-05-31",
    description: "Reframe pricing communications and bundle clarity to improve perceived value.",
    createdAt: "2026-08-18T13:45:00Z",
    updatedAt: "2026-08-18T13:45:00Z",
    targets: [
      {
        id: "tgt-vfm-vfm",
        kpiId: "kpi-vfm",
        kpiName: "VFM",
        targetDate: "2027-05-31",
        lowerThreshold: 3,
        upperThreshold: 12,
        active: true,
        deactivationSource: null,
        baselineScore: null,
        baselineCapturedForDate: null,
        currentScore: null,
        finalScore: null,
        outcome: null,
      },
    ],
  },

  // ── COMPLETED #1 — successful + partially successful outcomes ──────────────
  {
    id: "act-post-call-survey",
    actionName: "Post-Call Survey Revamp",
    status: "completed",
    archived: false,
    actionStartDate: "2025-09-01",
    actionEndDate: "2025-12-31",
    targetStartDate: "2026-01-01",
    latestTargetDate: "2026-06-30",
    description: "Shorten the post-call survey and switch to a conversational tone.",
    createdAt: "2025-08-20T09:30:00Z",
    updatedAt: "2026-07-01T08:00:00Z",
    targets: [
      {
        id: "tgt-pcs-csat",
        kpiId: "kpi-csat",
        kpiName: "CSAT",
        targetDate: "2026-06-30",
        lowerThreshold: 3,
        upperThreshold: 15,
        active: true,
        deactivationSource: null,
        baselineScore: 68,
        baselineCapturedForDate: "2025-09-01",
        currentScore: 85,
        finalScore: 85,
        outcome: "successful",
      },
      {
        id: "tgt-pcs-aht",
        kpiId: "kpi-aht",
        kpiName: "AHT",
        targetDate: "2026-05-31",
        lowerThreshold: 5,
        upperThreshold: 25,
        active: true,
        deactivationSource: null,
        baselineScore: 55,
        baselineCapturedForDate: "2025-09-01",
        currentScore: 68,
        finalScore: 68,
        outcome: "partially_successful",
      },
    ],
  },

  // ── COMPLETED #2 — unsuccessful + successful outcomes ──────────────────────
  {
    id: "act-fcr-drive",
    actionName: "First-Contact Resolution Drive",
    status: "completed",
    archived: false,
    actionStartDate: "2025-06-01",
    actionEndDate: "2025-09-30",
    targetStartDate: "2025-10-01",
    latestTargetDate: "2026-04-30",
    description: "Empower agents with a knowledge base and expanded resolution authority.",
    createdAt: "2025-05-22T11:00:00Z",
    updatedAt: "2026-05-01T08:00:00Z",
    targets: [
      {
        id: "tgt-fcr-fcr",
        kpiId: "kpi-fcr",
        kpiName: "FCR",
        targetDate: "2026-03-31",
        lowerThreshold: 0.05,
        upperThreshold: 0.25,
        active: true,
        deactivationSource: null,
        baselineScore: 0.55,
        baselineCapturedForDate: "2025-06-01",
        currentScore: 0.62,
        finalScore: 0.62,
        outcome: "unsuccessful",
      },
      {
        id: "tgt-fcr-ces",
        kpiId: "kpi-ces",
        kpiName: "CES",
        targetDate: "2026-04-30",
        lowerThreshold: 3,
        upperThreshold: 15,
        active: true,
        deactivationSource: null,
        baselineScore: 60,
        baselineCapturedForDate: "2025-06-01",
        currentScore: 78,
        finalScore: 78,
        outcome: "successful",
      },
    ],
  },

  // ── ARCHIVED — includes a manually-deactivated Target ──────────────────────
  {
    id: "act-legacy-chatbot",
    actionName: "Legacy Chatbot Pilot",
    status: "archived",
    archived: true,
    // Archived overlay over an action still inside its live monitoring window (2026 dates), so the
    // card renders the full featured-target slider — the Archived badge is the only difference from
    // an active card. `effectiveStatus` derives "active" from these dates; `status` stays "archived".
    actionStartDate: "2026-04-01",
    actionEndDate: "2026-07-15",
    targetStartDate: "2026-07-16",
    latestTargetDate: "2026-10-15",
    description: "Rule-based chatbot pilot, archived after the LLM assistant launched — kept for reference.",
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-08-10T16:20:00Z",
    targets: [
      {
        id: "tgt-legacy-csat",
        kpiId: "kpi-csat",
        kpiName: "CSAT",
        targetDate: "2026-09-30",
        lowerThreshold: 3,
        upperThreshold: 15,
        active: true,
        deactivationSource: null,
        baselineScore: 62,
        baselineCapturedForDate: "2026-07-16",
        currentScore: 68,
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-legacy-nps",
        kpiId: "kpi-nps",
        kpiName: "NPS",
        targetDate: "2026-10-15",
        lowerThreshold: 4,
        upperThreshold: 20,
        active: true,
        deactivationSource: null,
        baselineScore: 20,
        baselineCapturedForDate: "2026-07-16",
        currentScore: 28,
        finalScore: null,
        outcome: null,
      },
      {
        id: "tgt-legacy-fcr",
        kpiId: "kpi-fcr",
        kpiName: "FCR",
        targetDate: "2026-09-30",
        lowerThreshold: 3,
        upperThreshold: 12,
        active: false, // manually deactivated → line-through chip
        deactivationSource: "manual",
        baselineScore: 70,
        baselineCapturedForDate: "2026-07-16",
        currentScore: null,
        finalScore: null,
        outcome: null,
      },
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

  // Newest first, matching a typical server default ordering.
  matched = [...matched].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

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
