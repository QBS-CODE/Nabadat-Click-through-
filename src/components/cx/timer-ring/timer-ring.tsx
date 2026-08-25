import { Timer } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ── FR-503 Timer Ring (§5.3) ─────────────────────────────────────────────────
//
// A 44×44 pace indicator: a muted background ring, a progress arc (radius 15.5, stroke 4.5, rounded
// caps, drawn from 12 o'clock clockwise, fill = displayed Time Progress), and a centred stopwatch
// icon. Colour follows the §3.4 pace state; the icon inherits it. The arc is full for the Grey
// "monitoring complete" state and absent for the Empty (Planned / deactivated) state.

export type TimerRingState = "green" | "yellow" | "red" | "grey" | "empty"

const SIZE = 44
const R = 15.5
const STROKE = 4.5
const C = 2 * Math.PI * R // circumference ≈ 97.39

// Status colours are fixed across themes (D-scale + brand neutral) — allowed as raw tokens in SVG.
const STATE_COLOR: Record<TimerRingState, string> = {
  green: "var(--color-d2)",
  yellow: "var(--color-d3)",
  red: "var(--color-d5)",
  grey: "var(--color-nb-stone)",
  empty: "var(--color-nb-stone)",
}

export interface TimerRingProps {
  state: TimerRingState
  /** Displayed Time Progress, 0–100 (clamped by the caller). */
  timeProgress: number
  /** Displayed Score Progress, 0–100 — woven into the default Active tooltip. */
  scoreProgress?: number
  /** Overrides the derived tooltip (e.g. the deactivated / evaluated wording). */
  tooltip?: string
  className?: string
}

export function TimerRing({ state, timeProgress, scoreProgress, tooltip, className }: TimerRingProps) {
  const { t } = useTranslation()
  const color = STATE_COLOR[state]
  // Empty → no arc; Grey → full ring; otherwise the clamped Time Progress.
  const fillPct = state === "empty" ? 0 : state === "grey" ? 100 : Math.max(0, Math.min(100, timeProgress))
  const dashOffset = C * (1 - fillPct / 100)

  const defaultTooltip = () => {
    if (state === "grey") return t("actions.timerCompleteAllPassed")
    if (state === "empty") return t("actions.timerNotStartedDefault")
    return t("actions.timerActiveDefault", {
      time: Math.round(timeProgress),
      score: Math.round(scoreProgress ?? 0),
    })
  }
  const label = tooltip ?? defaultTooltip()

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={label}
          className={cn(
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden>
            {/* Neutral background ring — theme-aware. */}
            <circle
              className="stroke-muted"
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
            />
            {/* Progress arc — from 12 o'clock, clockwise. */}
            {fillPct > 0 && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            )}
          </svg>
          <Timer className="pointer-events-none absolute size-[17px]" style={{ color }} aria-hidden />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
