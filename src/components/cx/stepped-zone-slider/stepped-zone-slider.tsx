import { useId } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"
import { trackBounds } from "@/features/actions/lib/measurement"

// ── FR-501 Stepped Zone Slider (§5.1) — card variant ─────────────────────────
//
// Visualises one KPI Target's position against its threshold zones on an adaptive-padded track
// (§3.7). Static / non-interactive (role="img"). Anatomy (top → bottom): tick numbers · a 14px
// fully-rounded track with hard-edged Red [min→B+L] / Yellow [B+L→B+U] / Green [B+U→max] zones ·
// B (navy) and C (card-coloured) markers on the track · B/C letter labels below. The card variant
// omits the SCR-03 L/U reference flags. Planned renders anchor the zones at Current (no B marker).
//
// Until M-06 ships scores (C-01), baseline/current arrive null; the slider then renders a neutral
// track with just the scale — documented degradation, never a crash.

const VBW = 400
const TRACK_X0 = 8
const TRACK_X1 = VBW - 8
const TRACK_W = TRACK_X1 - TRACK_X0
const TRACK_H = 14
// Base vertical layout (no reference flags). The SCR-03 reference variant reserves FLAG_ROOM extra
// px on top for the L/U flag row (label + down-triangle) and shifts everything below it down, so the
// flags never collide with the tick numbers or clip against the viewBox top.
const BASE_TICK_Y = 11
const BASE_TRACK_Y = 18
const BASE_LABEL_Y = 47
const BASE_VBH = 50

const round = (v: number) => Math.round(v)

export interface SteppedZoneSliderProps {
  /** Baseline score (B). Null for a Planned action or before scores exist (C-01). */
  baseline: number | null
  /** Current score (C). */
  current: number | null
  /** Lower Threshold delta (L). */
  lower: number
  /** Upper Threshold delta (U). */
  upper: number
  /** Slider padding (PAD, tenant setting, default 3). */
  pad?: number
  /** Show the B marker (false for Planned — no baseline captured yet). */
  showBaseline?: boolean
  /** SCR-03 reference variant (§5.1): add the L/U reference flags above the ticks (FR-304/306). */
  showReferenceFlags?: boolean
  kpiName?: string
  className?: string
}

export function SteppedZoneSlider({
  baseline,
  current,
  lower,
  upper,
  pad = 3,
  showBaseline = true,
  showReferenceFlags = false,
  kpiName,
  className,
}: SteppedZoneSliderProps) {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const clipId = useId()

  // Reference variant reserves a top band for the L/U flags; every y below shifts down by it.
  const FLAG_ROOM = showReferenceFlags ? 16 : 0
  const TICK_Y = BASE_TICK_Y + FLAG_ROOM
  const TRACK_Y = BASE_TRACK_Y + FLAG_ROOM
  const TRACK_MID = TRACK_Y + TRACK_H / 2
  const LABEL_Y = BASE_LABEL_Y + FLAG_ROOM
  const VBH = BASE_VBH + FLAG_ROOM

  const anchor = baseline ?? current // A (Baseline; Current for Planned provisional)
  const { min, max } = trackBounds(baseline, current, upper, pad)
  const span = max - min

  const xOf = (value: number) => {
    const f = span > 0 ? (value - min) / span : 0
    const clamped = Math.max(0, Math.min(1, f))
    return TRACK_X0 + (isRtl ? 1 - clamped : clamped) * TRACK_W
  }

  // Zone rect between two absolute values, resolved through xOf (flips in RTL).
  const zoneRect = (from: number, to: number, fill: string, key: string) => {
    const a = xOf(from)
    const b = xOf(to)
    const x = Math.min(a, b)
    const w = Math.abs(b - a)
    if (w <= 0) return null
    return <rect key={key} x={x} y={TRACK_Y} width={w} height={TRACK_H} fill={fill} />
  }

  // Tick step from the span (SRS §5.1).
  const step = span <= 16 ? 1 : span <= 32 ? 2 : 4
  const ticks: number[] = []
  for (let v = Math.ceil(min); v <= max; v += step) ticks.push(v)
  // Marker x-positions (B/C). A tick that collides with a marker is dropped so the marker's own
  // bold value label owns that slot — the score sits directly above its marker (reference §5.1).
  const markerXs: number[] = []
  if (showBaseline && baseline != null) markerXs.push(xOf(baseline))
  if (current != null) markerXs.push(xOf(current))
  const nearMarker = (tx: number) => markerXs.some((mx) => Math.abs(mx - tx) < 9)

  const hasZones = anchor != null
  const redEnd = anchor != null ? anchor + lower : 0
  const yellowEnd = anchor != null ? anchor + upper : 0

  const ariaLabel =
    (kpiName ? t("actions.zoneSliderAriaFor", { kpi: kpiName }) : t("actions.zoneSliderAria")) +
    (baseline != null ? t("actions.zoneSliderBaseline", { value: baseline }) : "") +
    (current != null ? t("actions.zoneSliderCurrent", { value: current }) : "") +
    (hasZones ? t("actions.zoneSliderThresholds", { lower: redEnd, upper: yellowEnd }) : "")

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className={cn("select-none", className)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={TRACK_X0} y={TRACK_Y} width={TRACK_W} height={TRACK_H} rx={TRACK_H / 2} />
        </clipPath>
      </defs>

      {/* Neutral base track (shown alone when no scores exist). */}
      <rect
        className="fill-muted"
        x={TRACK_X0}
        y={TRACK_Y}
        width={TRACK_W}
        height={TRACK_H}
        rx={TRACK_H / 2}
      />

      {/* Hard-edged zones, clipped to the rounded track. */}
      {hasZones && (
        <g clipPath={`url(#${clipId})`}>
          {zoneRect(min, redEnd, "var(--color-d5)", "z-red")}
          {zoneRect(redEnd, yellowEnd, "var(--color-d3)", "z-yellow")}
          {zoneRect(yellowEnd, max, "var(--color-d2)", "z-green")}
        </g>
      )}

      {/* Reference variant (SCR-03): L/U threshold-point flags in the reserved top band — each a
          coloured label above a down-triangle pointing at its threshold position on the track. */}
      {showReferenceFlags && anchor != null && (
        <g aria-hidden>
          <text x={xOf(anchor + lower)} y={7} textAnchor="middle" fontSize={7} fontWeight={700} fill="var(--color-d5)">
            {`L ${round(anchor + lower)}`}
          </text>
          <path
            d={`M ${xOf(anchor + lower) - 3} 9 L ${xOf(anchor + lower) + 3} 9 L ${xOf(anchor + lower)} 14 Z`}
            fill="var(--color-d5)"
          />
          <text x={xOf(anchor + upper)} y={7} textAnchor="middle" fontSize={7} fontWeight={700} fill="var(--color-d2)">
            {`U ${round(anchor + upper)}`}
          </text>
          <path
            d={`M ${xOf(anchor + upper) - 3} 9 L ${xOf(anchor + upper) + 3} 9 L ${xOf(anchor + upper)} 14 Z`}
            fill="var(--color-d2)"
          />
        </g>
      )}

      {/* Tick numbers close above the track. A tick sitting under a B/C marker is dropped so the
          marker's bold value label (below) takes that spot without overlap. */}
      {ticks.map((tv) => {
        const tx = xOf(tv)
        if (nearMarker(tx)) return null
        return (
          <text
            key={`t-${tv}`}
            className="fill-muted-foreground"
            x={tx}
            y={TICK_Y}
            textAnchor="middle"
            fontSize={8}
            fontWeight={400}
            aria-hidden
          >
            {tv}
          </text>
        )
      })}

      {/* B marker (navy bar) — omitted for Planned. */}
      {showBaseline && baseline != null && (
        <>
          <rect
            className="fill-foreground"
            x={xOf(baseline) - 2.5}
            y={TRACK_MID - 11}
            width={5}
            height={22}
            rx={2}
          />
          <text className="fill-foreground" x={xOf(baseline)} y={TICK_Y} textAnchor="middle" fontSize={9} fontWeight={700} aria-hidden>
            {round(baseline)}
          </text>
          <text className="fill-foreground" x={xOf(baseline)} y={LABEL_Y} textAnchor="middle" fontSize={9} fontWeight={700} aria-hidden>
            B
          </text>
        </>
      )}

      {/* C marker (card-coloured bar, navy border). */}
      {current != null && (
        <>
          <rect
            className="fill-card stroke-foreground"
            x={xOf(current) - 2.5}
            y={TRACK_MID - 11}
            width={5}
            height={22}
            rx={2}
            strokeWidth={1.5}
          />
          <text className="fill-foreground" x={xOf(current)} y={TICK_Y} textAnchor="middle" fontSize={9} fontWeight={700} aria-hidden>
            {round(current)}
          </text>
          <text className="fill-foreground" x={xOf(current)} y={LABEL_Y} textAnchor="middle" fontSize={9} fontWeight={700} aria-hidden>
            C
          </text>
        </>
      )}
    </svg>
  )
}
