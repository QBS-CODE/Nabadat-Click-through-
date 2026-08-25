import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Archive, ArchiveRestore, ArrowLeft, Inbox, Info, Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/hooks/useSession"

import type { Action, ActionStatus, KpiTarget, RowVariant } from "../api"
import { useAction } from "../hooks/useAction"
import { timerStateFor, todayIso } from "../lib/measurement"
import { TargetRowActive } from "../components/TargetRowActive"
import { TargetRowCompleted } from "../components/TargetRowCompleted"
import { TargetRowPlanned } from "../components/TargetRowPlanned"
import { TargetRowDeactivated } from "../components/TargetRowDeactivated"
import { STATUS_LABEL_KEY, UiLabel, fmtDate } from "../components/target-row-shared"

// ── FR-301..309 Action Details page (SCR-03) ─────────────────────────────────
//
// Full-page drill-down at `/actions/:id`: header (single status badge + Edit/Archive/Unarchive), the
// 4-date timeline (with the Target Start derivation tooltip), and one row per Target rendered by the
// server-computed `variant`. Archive/Unarchive refresh the Action in place (US3 endpoints).

const STATUS_CLASS: Record<ActionStatus, string> = {
  active: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  planned: "bg-nb-navy-100 text-nb-navy dark:bg-nb-navy-700 dark:text-nb-navy-100",
  completed: "bg-muted text-muted-foreground",
  archived: "border-dashed bg-transparent text-muted-foreground",
}

function rowVariant(action: Action, target: KpiTarget): RowVariant {
  if (target.variant) return target.variant
  // Defensive fallback if the server omits it.
  if (!target.active) return "deactivated"
  if (action.status === "planned") return "planned"
  if (target.outcome != null) return "completed"
  return "active_unevaluated"
}

function TargetRow({
  action,
  target,
  canWrite,
  busy,
  onActivate,
  onDelete,
}: {
  action: Action
  target: KpiTarget
  /** P-01 on a non-archived Planned/Active Action → target-lifecycle controls are live (§8.7). */
  canWrite: boolean
  busy: boolean
  onActivate: (targetId: string) => void
  onDelete: (targetId: string) => void
}) {
  const readOnly = action.status === "completed" || action.archived
  switch (rowVariant(action, target)) {
    case "active_unevaluated":
      return <TargetRowActive action={action} target={target} />
    case "completed":
      return <TargetRowCompleted target={target} />
    case "planned":
      return <TargetRowPlanned target={target} />
    case "deactivated":
      return (
        <TargetRowDeactivated
          target={target}
          readOnly={readOnly}
          busy={busy}
          onActivate={canWrite && !readOnly ? () => onActivate(target.id) : undefined}
          onDelete={canWrite && !readOnly ? () => onDelete(target.id) : undefined}
        />
      )
  }
}

export default function ActionDetailsPage() {
  // `tr`, not `t` — `t` is the Target loop variable in this page's `action.targets.map(...)`.
  const { t: tr } = useTranslation()
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { session } = useSession()
  const canWrite = session?.persona === "P-01"
  const { action, loading, notFound, error, mutating, archive, unarchive, setTargetActive, deleteTarget } =
    useAction(id)

  // US7 — Target lifecycle from the deactivated row: reactivate (BR-011 guards it server-side) or
  // delete after DLG-1 (NTF-3). Both re-read the Action in place via useAction.
  const onActivateTarget = async (targetId: string) => {
    if (!(await setTargetActive(targetId, true)))
      toast.error(tr("actions.toastTargetActivateFailed"))
  }
  const onDeleteTarget = async (targetId: string) => {
    if (await deleteTarget(targetId)) toast.success(tr("actions.toastTargetRemoved"))
    else toast.error(tr("actions.toastTargetDeleteFailed"))
  }

  const onArchive = async () => {
    if (await archive()) toast.success(tr("actions.toastArchived"))
    else toast.error(tr("actions.toastUpdateFailed"))
  }
  const onUnarchive = async () => {
    if (await unarchive()) toast.success(tr("actions.toastUnarchived"))
    else toast.error(tr("actions.toastUpdateFailed"))
  }

  if (loading) {
    return (
      <div className="space-y-5 py-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (notFound || error || !action) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-lg font-bold">
          {notFound ? tr("actions.notFound") : tr("actions.detailLoadError")}
        </h1>
        <Button variant="outline" onClick={() => navigate("/actions")}>
          <ArrowLeft className="size-4" />
          {tr("actions.backToActions")}
        </Button>
      </div>
    )
  }

  const status = action.status
  const canEdit = canWrite && !action.archived && (status === "planned" || status === "active")

  // Composition + headline pace, both derived client-side from the targets already loaded (NFR-5).
  // `behindCount` reuses the same `timerStateFor` the rows and cards use, so the chip can never
  // disagree with the timer rings underneath it.
  // Timeline progress. `reached` fills the nodes; `segFill` is how far the rail has travelled
  // through each gap (0–1), so the blue line stops exactly where "now" sits — mid-gap when the next
  // date is still ahead — instead of snapping to the last node it passed.
  const today = todayIso()
  const stops = [action.actionStartDate, action.actionEndDate, action.targetStartDate, action.latestTargetDate]
  const reached = stops.filter((d) => today >= d).length
  const nowMs = Date.parse(today)
  const segFill = [0, 1, 2].map((i) => {
    const from = Date.parse(stops[i])
    const to = Date.parse(stops[i + 1])
    if (nowMs >= to) return 1
    if (nowMs <= from || to <= from) return 0
    return (nowMs - from) / (to - from)
  })

  const activeCount = action.targets.filter((t) => t.active).length
  const excludedCount = action.targets.length - activeCount
  const behindCount = action.targets.filter(
    (t) => t.active && timerStateFor(action, t) === "red",
  ).length

  return (
    <div className="space-y-5 py-5">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 ps-2 text-muted-foreground"
        onClick={() => navigate("/actions")}
      >
        <ArrowLeft className="size-4" />
        {tr("actions.backToActions")}
      </Button>

      {/* Header */}
      {/* `overflow-hidden` so the full-bleed timeline strip below clips to the card radius instead
          of squaring off the bottom corners. */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-heading font-bold tracking-[-0.01em]">
                {action.actionName}
              </h1>
              <Badge variant="outline" className={cn("shrink-0", STATUS_CLASS[status])}>
                {tr(STATUS_LABEL_KEY[status])}
              </Badge>
              {/* The page's headline answer: how many targets are losing the race, stated before the
                  user reads a single row. D5 because "behind pace" IS a KPI state, so the semantic
                  scale is the correct palette (Two-Palette Rule). Hidden at zero — a chip that
                  always shows would stop meaning anything. */}
              {behindCount > 0 && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-transparent bg-d5-light text-d5-dark dark:bg-d5-dark/30 dark:text-d5-light"
                >
                  {tr(behindCount === 1 ? "actions.detailBehindOne" : "actions.detailBehindOther", {
                    n: behindCount,
                  })}
                </Badge>
              )}
            </div>
            {canWrite && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {canEdit && (
                  <Button variant="outline" onClick={() => navigate(`/actions/${action.id}/edit`)}>
                    <Pencil className="size-4" />
                    {tr("actions.edit")}
                  </Button>
                )}
                {action.archived ? (
                  <Button variant="outline" disabled={mutating} onClick={onUnarchive}>
                    <ArchiveRestore className="size-4" />
                    {tr("actions.unarchive")}
                  </Button>
                ) : (
                  <Button variant="outline" disabled={mutating} onClick={onArchive}>
                    <Archive className="size-4" />
                    {tr("actions.archive")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {action.description && (
            <p className="max-w-180 text-[13px] leading-relaxed text-muted-foreground">
              {action.description}
            </p>
          )}

          {/* 4-date timeline, rendered as an ordered WALK (Start → End → Target Start → Latest)
              rather than four loose numbers: the rail shows they are a sequence, and the derived
              node is marked so it reads as system-computed, not user-entered (BR-006). The rail is
              inset to the first and last node centres (7px = half the 14px dot) so it never
              overruns; `inset-s`/`inset-e` keep that correct in RTL. */}
          {/* `-mb-4` cancels the Card's own `py-4` so the tinted strip runs flush to the bottom
              edge (a stray white band under it read as a rendering bug); `-mx-6` does the same for
              the wrapper's horizontal padding, and the Card's `overflow-hidden` clips the corners. */}
          <ol className="relative -mx-6 -mb-4 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border bg-muted px-6 pb-5.5 pt-4.5 sm:grid-cols-4">
            <TimelineDate
              label={tr("actions.timelineStart")}
              value={fmtDate(action.actionStartDate)}
              done={reached > 0}
              current={reached === 1}
              fill={segFill[0]}
              first
            />
            <TimelineDate
              label={tr("actions.timelineEnd")}
              value={fmtDate(action.actionEndDate)}
              done={reached > 1}
              current={reached === 2}
              fill={segFill[1]}
            />
            <TimelineDate
              label={tr("actions.timelineTargetStart")}
              value={fmtDate(action.targetStartDate)}
              primary
              done={reached > 2}
              current={reached === 3}
              fill={segFill[2]}
              title={tr("actions.timelineTargetStartTitle")}
              hint={tr("actions.timelineDerivedHint")}
            />
            <TimelineDate
              label={tr("actions.timelineLatestTarget")}
              value={fmtDate(action.latestTargetDate)}
              done={reached > 3}
              current={reached === 4}
              fill={0}
              last
            />
          </ol>
        </div>
      </Card>

      {/* Target rows */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">{tr("actions.targetsHeading")}</h2>
          {/* Composition of the list up front, so "why is one row faded?" is answered before the
              user starts reading rows. Derived client-side from the targets already loaded. */}
          <span className="text-sm text-muted-foreground tabular-nums">
            {/* `count` (not `total`) so i18next picks the plural form — "1 target", "3 targets",
                and Arabic's six-way counted-noun agreement. Safe here because these are small
                integers, not thousands-formatted values (which must use a plain `{{n}}`). */}
            {excludedCount > 0
              ? tr("actions.detailTargetsSummary", {
                  count: action.targets.length,
                  active: activeCount,
                  excluded: excludedCount,
                })
              : tr("actions.detailTargetsSummaryNoExcluded", {
                  count: action.targets.length,
                  active: activeCount,
                })}
          </span>
        </div>

        {/* One table shell for the whole list: a muted header band that labels the columns once,
            then rows separated by dividers. Previously each row was its own bordered card, which
            doubled the chrome and let the columns drift out of alignment with their labels.
            `overflow-hidden` clips the rows to the container radius (CLAUDE.md § Tables). */}
        <div className="overflow-hidden rounded-lg border border-border shadow-sm dark:shadow-none">
          {/* Header band — hidden below md, where the rows stack to one column (FR-303) and
              per-row labels carry the meaning instead. Mirrors RowGrid's md track exactly. */}
          <div className="hidden gap-4.5 border-b border-border bg-muted px-5 py-2.5 md:grid md:grid-cols-[180px_minmax(0,1fr)_130px_120px_130px]">
            <UiLabel>{tr("actions.colKpi")}</UiLabel>
            <UiLabel>{tr("actions.colProgressBar")}</UiLabel>
            <UiLabel>{tr("actions.colTargetDate")}</UiLabel>
            <UiLabel>{tr("actions.colScoreProgress")}</UiLabel>
            <UiLabel>{tr("actions.colTimer")}</UiLabel>
          </div>

          <div className="divide-y divide-border">
            {action.targets.map((t) => (
              <TargetRow
                key={t.id}
                action={action}
                target={t}
                canWrite={canWrite}
                busy={mutating}
                onActivate={onActivateTarget}
                onDelete={onDeleteTarget}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * One node on the 4-date timeline: rail dot, caption, date, and (for the derived node) a one-line
 * explainer. The dot carries `bg-card` so it punches a clean hole in the rail behind it. `primary`
 * marks the DERIVED Target Start (BR-006) — the only date the user did not type — and that node also
 * owns the "System-derived…" tooltip.
 */
function TimelineDate({
  label,
  value,
  primary,
  done,
  current,
  fill = 0,
  first,
  last,
  title,
  hint,
}: {
  label: string
  value: string
  primary?: boolean
  /** The date has passed — the node fills in, so the rail reads as progress, not just structure. */
  done?: boolean
  /** The most recent date that has passed: where the Action stands right now. */
  current?: boolean
  /** 0–1: how far the rail leaving this node has been travelled. */
  fill?: number
  /** First / last node — the rail runs edge-to-edge, so these two stretch to the strip's margins. */
  first?: boolean
  last?: boolean
  title?: string
  hint?: string
}) {
  return (
    <li className="relative flex flex-col gap-1.5" title={title}>
      {/* Each node draws its own rail segment rather than the whole rail being absolutely positioned
          bars over the grid. The old approach mispositioned the filled bar — its end inset came from
          a raw percentage that ignored the container padding and the column gap, so the "progress"
          line stopped nowhere near the node it was meant to reach. A per-node segment is anchored to
          real geometry instead: it starts at this dot's centre (7px in) and ends at the next dot's
          centre, one 16px gap plus 7px past this cell's end edge. The first and last segments run to
          the strip's own margins so the rail spans the full width rather than stopping dead on the
          outer dots. RTL-correct for free, since every offset is a logical inset. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1.5 hidden h-0.5 bg-border sm:block",
          first ? "inset-s-0" : "inset-s-1.75",
          last ? "inset-e-0" : "-inset-e-5.75",
        )}
      >
        {/* The travelled part, as a fraction of this segment — so the blue ends exactly at "now",
            mid-gap when the next date is still ahead, instead of jumping node to node. */}
        {fill > 0 && (
          <span
            className="absolute inset-y-0 bg-primary inset-s-0"
            style={{ width: `${fill * 100}%` }}
          />
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative size-3.5 rounded-full border-2",
          // Every node carries the brand blue: solid once reached, a quiet primary outline before —
          // a grey ring made the untravelled part of the walk read as disabled rather than upcoming.
          done ? "border-primary bg-primary" : "border-primary/35 bg-card",
          // "You are here": the newest passed date gets a haloed marker so the eye lands on where
          // the Action actually stands. The halo is a brand tint, never a D-scale colour — position
          // on a timeline is chrome, not a KPI status (Two-Palette Rule).
          current && "ring-4 ring-primary/20",
          // The derived Target Start keeps a full-strength primary edge even before it is reached, so
          // the one system-computed date stays identifiable at every point in the lifecycle (BR-006).
          primary && !done && "border-primary bg-card",
        )}
      />
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11px] text-muted-foreground",
          primary && "text-primary/80",
        )}
      >
        {label}
        {/* The derived node carries a visible ⓘ, not just a `title` — a tooltip nobody can see
            they can hover is not an affordance. The whole `<li>` still holds the tooltip text. */}
        {primary && <Info aria-hidden className="size-3 shrink-0" />}
      </span>
      <span className={cn("text-[13px] font-bold tabular-nums", primary && "text-primary")}>
        {value}
      </span>
      {hint && <span className="text-[10px] leading-snug text-muted-foreground">{hint}</span>}
    </li>
  )
}
