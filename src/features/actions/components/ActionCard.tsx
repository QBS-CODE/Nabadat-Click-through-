import { useNavigate } from "react-router"
import { MoreVertical } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TimerRing } from "@/components/cx/timer-ring"
import { SteppedZoneSlider } from "@/components/cx/stepped-zone-slider"

import type { Action, ActionOutcome, KpiTarget, TimerState } from "../api"
import {
  clampDisplay,
  featuredTarget,
  paceLabel,
  scoreProgress,
  timeProgress,
  timerStateFor,
  todayIso,
} from "../lib/measurement"
import { fmtDate } from "./target-row-shared"

// ── FR-113..116 ActionCard (SCR-01) ──────────────────────────────────────────
//
// One card per Action, rendered by the underlying date-computed shape (Active / Planned / Completed)
// plus an Archived overlay (badge + Unarchive-only kebab, primary = More Details). Active cards
// spotlight the Lowest-Performing Target with its Timer Ring + Stepped Zone Slider + pace meta line.
// Live pace is client-computed (NFR-5) — Grey/degraded until M-06 scores exist (C-01).
//
// Archive/Unarchive handlers arrive in US6 (T115/T116); this card renders the kebab items and calls
// the optional callbacks.

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  successful: "var(--color-d2)",
  partially_successful: "var(--color-d3)",
  unsuccessful: "var(--color-d5)",
}
const OUTCOME_LABEL_KEY: Record<ActionOutcome, string> = {
  successful: "actions.outcomeSuccessful",
  partially_successful: "actions.outcomePartial",
  unsuccessful: "actions.outcomeUnsuccessful",
}

/**
 * Pace-phrase colour, mirroring the reference's `.pace-ahead` / `.pace-behind`. Uses the *dark* D
 * tokens in light mode so the text clears 4.5:1 on a white card (the base `--d2` green does not),
 * and flips to the light tokens on the dark surface. Grey/empty states stay neutral — there is no
 * pace to report, and colouring them would spend semantic colour on a non-signal.
 */
const PACE_TEXT: Record<TimerState, string> = {
  green: "text-d2-dark dark:text-d2-light",
  yellow: "text-d3-dark dark:text-d3",
  red: "text-d5 dark:text-d5-light",
  grey: "",
  empty: "",
}

/** The date-computed shape of an Action (ignores the archived overlay). */
function effectiveStatus(action: Action): "planned" | "active" | "completed" {
  const now = todayIso()
  if (action.actionStartDate > now) return "planned"
  if (action.latestTargetDate < now) return "completed"
  return "active"
}

export interface ActionCardProps {
  action: Action
  /** Can perform write actions (P-01) — gates the Edit / Archive kebab items. */
  canWrite?: boolean
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
}

export function ActionCard({ action, canWrite = false, onArchive, onUnarchive }: ActionCardProps) {
  // `tr`, not `t` — `t` is the Target loop variable in this component's `targets.map(...)` callbacks.
  const { t: tr } = useTranslation()
  const navigate = useNavigate()
  const shape = effectiveStatus(action)
  const archived = action.archived
  const featured = featuredTarget(action)

  const goDetails = () => navigate(`/actions/${action.id}`)
  const goEdit = () => navigate(`/actions/${action.id}/edit`)

  const activeTargets = action.targets.filter((t) => t.active)

  // ── header (name + archived badge + timer + kebab) ──
  const timer = renderTimer()
  function renderTimer() {
    if (shape === "planned")
      return <TimerRing state="empty" timeProgress={0} />
    if (shape === "completed")
      return (
        <TimerRing state="grey" timeProgress={100} tooltip={tr("actions.timerCompleteAllPassed")} />
      )
    // active
    if (!featured)
      return <TimerRing state="grey" timeProgress={100} tooltip={tr("actions.noActiveTargets")} />
    const state = timerStateFor(action, featured)
    const t = clampDisplay(timeProgress(action, featured))
    const s = clampDisplay(scoreProgress(featured))
    return <TimerRing state={state} timeProgress={t} scoreProgress={s} />
  }

  const kebab = (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}
        aria-label={tr("actions.cardMenuAria")}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {archived ? (
          <DropdownMenuItem disabled={!canWrite} onClick={() => onUnarchive?.(action.id)}>
            {tr("actions.unarchive")}
          </DropdownMenuItem>
        ) : (
          <>
            {shape === "planned" ? (
              <DropdownMenuItem onClick={goDetails}>{tr("actions.moreDetails")}</DropdownMenuItem>
            ) : (
              canWrite &&
              shape === "active" && (
                <DropdownMenuItem onClick={goEdit}>{tr("actions.edit")}</DropdownMenuItem>
              )
            )}
            {canWrite && (
              <DropdownMenuItem onClick={() => onArchive?.(action.id)}>
                {tr("actions.archive")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── mini KPI labels ("Targets:" + one chip per KPI) ──
  const miniLabels = (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium">{tr("actions.targetsLabel")}</span>
      {action.targets.map((t) => (
        <span
          key={t.id}
          className={cn(
            "rounded-sm border border-border px-2 py-0.5 text-xs font-medium",
            !t.active && "text-muted-foreground/60 line-through",
          )}
          title={t.active ? tr("actions.targetActiveTitle") : tr("actions.targetExcludedTitle")}
        >
          {t.kpiName}
        </span>
      ))}
    </div>
  )

  return (
    <Card className="flex flex-col gap-0 hover:shadow-md motion-safe:transition-shadow dark:hover:border-primary/30">
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-bold">{action.actionName}</h3>
            {archived && (
              <Badge variant="outline" className="shrink-0 border-dashed text-muted-foreground">
                {tr("actions.statusArchived")}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {timer}
            {kebab}
          </div>
        </div>

        {/* Body by shape */}
        {shape === "completed" ? (
          <div className="flex flex-wrap gap-2">
            {action.targets.map((t) => (
              <OutcomeChip key={t.id} target={t} />
            ))}
          </div>
        ) : featured ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-accent px-3 py-1 text-sm font-bold">
                {featured.kpiName}
              </Badge>
              <span className="rounded-sm border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                {shape === "planned"
                  ? tr("actions.lowestCurrentScore")
                  : tr("actions.lowestPerformingTarget")}
              </span>
            </div>
            <SteppedZoneSlider
              baseline={shape === "planned" ? null : featured.baselineScore}
              current={featured.currentScore}
              lower={featured.lowerThreshold}
              upper={featured.upperThreshold}
              showBaseline={shape !== "planned"}
              kpiName={featured.kpiName}
              className="h-auto w-full"
            />
          </>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">{tr("actions.noActiveTargets")}</p>
        )}

        {shape !== "completed" && miniLabels}

        {/* Meta line */}
        <p className="text-sm leading-relaxed text-muted-foreground tabular-nums">{renderMeta()}</p>

        {/* Footer — one primary per card. Deliberately INSIDE CardContent: as a sibling `<div>` it
            carried its own `pb-4` on top of the Card's `py-4`, so the card sat 32px deep at the
            bottom against 16px at the top (the doubled-padding trap in CLAUDE.md § Cards), and its
            separate `px-6` made the button edge miss the copy above it. Inside, it inherits the same
            horizontal padding as the text and the card's own `py-4` is the only vertical padding.
            `mt-auto` still pins it to the foot so buttons line up across a ragged row. */}
        <div className="mt-auto">
          {!archived && shape === "planned" ? (
            <Button className="w-full" onClick={goEdit}>
              {tr("actions.edit")}
            </Button>
          ) : (
            <Button className="w-full" onClick={goDetails}>
              {tr("actions.moreDetails")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  function renderMeta() {
    if (shape === "planned")
      return tr("actions.metaPlanned", { date: fmtDate(action.actionStartDate) })
    if (shape === "completed")
      return tr("actions.metaCompleted", { date: fmtDate(action.latestTargetDate) })
    if (!featured)
      return activeTargets.length === 0
        ? tr("actions.metaAllDeactivated")
        : tr("actions.metaMonitoring")
    const state = timerStateFor(action, featured)
    const s = Math.round(clampDisplay(scoreProgress(featured)))
    const time = Math.round(clampDisplay(timeProgress(action, featured)))
    // The pace phrase is rendered as its OWN element so it can carry the D-scale colour (green when
    // ahead, red when behind) the way the reference does. `actions.metaActive` bakes `{{pace}}` into
    // one interpolated string, which leaves nothing to style — hence the pace-free `metaActiveStats`
    // sibling key. This is semantic colour on a KPI pace state, so the D-scale is correct here.
    return (
      <>
        {tr("actions.metaActiveStats", { date: fmtDate(featured.targetDate), score: s, time })}
        {" · "}
        <span className={cn("font-semibold", PACE_TEXT[state])}>{tr(paceLabel(state))}</span>
      </>
    )
  }
}

function OutcomeChip({ target }: { target: KpiTarget }) {
  const { t } = useTranslation()
  const outcome = target.outcome
  const color = outcome ? OUTCOME_COLOR[outcome] : "var(--color-nb-stone)"
  const label = outcome ? t(OUTCOME_LABEL_KEY[outcome]) : t("actions.outcomeNotEvaluated")
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs"
      title={`${target.kpiName} — ${label}`}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {target.kpiName}
    </span>
  )
}
