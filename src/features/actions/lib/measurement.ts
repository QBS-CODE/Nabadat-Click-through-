// Client-side pace computation for M-15 (NFR-5): the server is authoritative for evaluation-time
// facts (baseline, final_score, outcome) but the LIVE pace values — Score Progress, Time Progress,
// timer state, lowest-performing selection — are computed here from the raw inputs the API delivers.
// Mirrors the backend Measurement calculators (SRS §3.4 / §3.6 / §3.7); keep the two in sync.
//
// Until M-06 ships score computation (C-01 / TODO-M15-001), `currentScore`/`baselineScore` arrive
// null, so `scoreProgress` returns null and the timer resolves to the non-comparable Grey state —
// documented degradation, never a crash.

import type { Action, KpiTarget, TimerState } from "../api"

const MS_PER_DAY = 86_400_000

/**
 * Today as a **local** calendar date — the tenant's day, matching how the server resolves it: the
 * browser sends its IANA zone on every request (`X-Nabadat-Timezone`) and `TimezoneDayBoundary`
 * evaluates every day-granular rule in it (BR-022 / NFR-8). A UTC date
 * (`toISOString().slice(0, 10)`) disagrees with that for part of every day at any non-zero offset,
 * which showed as Time Progress off by one day, a timer ring still coloured on the day it should
 * read Grey, and `featuredTarget()` still counting a Target whose Date the server considers passed
 * (TODO-M15-019). Exported so `ActionForm` and `ActionCard` share this one definition instead of
 * each keeping a copy — the module previously held three, two of them UTC.
 */
// CLICKTHROUGH: the clock is pinned to a fixed "today" so the demo is deterministic and matches the
// ratified M-15 prototype exactly (which fixes `NOW = 2026-07-20`). Every pace %, timer fill, tab
// assignment and featured-target selection is computed against this date, so the seeded Score/Time
// figures reproduce the prototype screenshots on any machine, regardless of the real wall clock.
export const CLICKTHROUGH_TODAY = "2026-07-20"
export const todayIso = (): string => CLICKTHROUGH_TODAY

const dayDiff = (fromIso: string, toIso: string) =>
  (Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY

/**
 * Score Progress (SRS §3.4, raw & unclamped): `(Current − Baseline) ÷ U`, where `U` is the Upper
 * Threshold delta. `null` when not computable (no baseline, no current score, or `U ≤ 0`).
 */
export function scoreProgress(t: KpiTarget): number | null {
  if (t.baselineScore == null || t.currentScore == null || t.upperThreshold <= 0) return null
  return (t.currentScore - t.baselineScore) / t.upperThreshold
}

/**
 * Time Progress (SRS §3.4, raw): `(now − Target Start) ÷ (Target Date − Target Start)`. Returns 0
 * during the execution phase (`now ≤ Action End Date`, BR-F1). Can exceed 1 (client clamps display).
 */
export function timeProgress(action: Action, target: KpiTarget, now = todayIso()): number {
  if (now <= action.actionEndDate) return 0
  const full = dayDiff(action.targetStartDate, target.targetDate)
  if (full <= 0) return 0
  return dayDiff(action.targetStartDate, now) / full
}

/** Clamp a raw ratio to a 0–100 display percentage (BR-F2). `null` → 0. */
export function clampDisplay(raw: number | null): number {
  if (raw == null) return 0
  return Math.max(0, Math.min(100, raw * 100))
}

const isEvaluated = (t: KpiTarget, now: string) => t.outcome != null || t.targetDate < now

/**
 * Timer pace state (SRS §3.4 table): Green (Score > Time), Yellow (|Score − Time| ≤ 0.005, BR-015),
 * Red (Score < Time); Grey when monitoring is complete or not comparable; Empty for Planned /
 * deactivated targets.
 */
export function timerStateFor(action: Action, target: KpiTarget, now = todayIso()): TimerState {
  if (!target.active) return "empty"
  if (action.status === "planned") return "empty"
  if (action.status === "completed" || isEvaluated(target, now)) return "grey"
  const s = scoreProgress(target)
  if (s == null) return "grey" // no baseline / no current score → not comparable
  const t = timeProgress(action, target, now)
  if (Math.abs(s - t) <= 0.005) return "yellow"
  return s > t ? "green" : "red"
}

/**
 * i18n key for the pace phrase on an Active card's meta line. Returns a **key**, not copy, so this
 * module stays free of `react-i18next` (it is pure calculation, mirrored 1:1 against the backend
 * calculators) — the caller resolves it with `t()`.
 */
export function paceLabel(state: TimerState): string {
  if (state === "green") return "actions.paceAhead"
  if (state === "red") return "actions.paceBehind"
  return "actions.paceOn"
}

/**
 * The Target to feature on a card (SRS §3.6). Eligible = active, not yet evaluated, Target Date not
 * past. Active actions rank by lowest raw Score Progress; Planned actions rank by lowest current
 * score (the M-06 normalised index is not yet delivered — TODO-M15-005). Ties break on earliest
 * Target Date, then KPI name. Returns `null` when nothing is eligible (FR-111 fallback).
 */
export function featuredTarget(action: Action, now = todayIso()): KpiTarget | null {
  const candidates = action.targets.filter((t) => t.active && t.targetDate >= now && t.outcome == null)
  if (candidates.length === 0) return null
  const planned = action.status === "planned"
  return [...candidates].sort((a, b) => {
    const ka = planned ? (a.currentScore ?? Infinity) : (scoreProgress(a) ?? Infinity)
    const kb = planned ? (b.currentScore ?? Infinity) : (scoreProgress(b) ?? Infinity)
    if (ka !== kb) return ka - kb
    if (a.targetDate !== b.targetDate) return a.targetDate < b.targetDate ? -1 : 1
    return a.kpiName.localeCompare(b.kpiName)
  })[0]
}

/** The latest remaining (non-evaluated) Target Date, for the FR-111 zero-eligible timer fallback. */
export function latestRemainingTargetDate(action: Action, now = todayIso()): string | null {
  const remaining = action.targets
    .filter((t) => t.active && t.targetDate >= now)
    .map((t) => t.targetDate)
    .sort()
  return remaining.length ? remaining[remaining.length - 1] : null
}

export interface TrackBounds {
  min: number
  max: number
}

/**
 * Adaptive zone-slider track bounds (SRS §3.7): `min = min(A, Current) − PAD`,
 * `max = max(A + U, Current) + PAD`, where the anchor `A` is the Baseline (or Current for a Planned
 * provisional render). Falls back to a symmetric 0…U+2·PAD range when neither value exists.
 */
export function trackBounds(
  baseline: number | null,
  current: number | null,
  upper: number,
  pad: number,
): TrackBounds {
  const anchor = baseline ?? current
  if (anchor == null) return { min: 0, max: Math.max(upper, 1) + 2 * pad }
  const c = current ?? anchor
  return { min: Math.min(anchor, c) - pad, max: Math.max(anchor + upper, c) + pad }
}
