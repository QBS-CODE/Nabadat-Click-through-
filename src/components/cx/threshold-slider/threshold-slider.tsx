import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"

// ── FR-502 Threshold Slider (SCR-02, per KPI Target) ─────────────────────────
//
// A custom-SVG dual-thumb slider that expresses a KPI Target's Lower/Upper thresholds as deltas
// over the Baseline, on a 0→X scale (X = tenant "max upper threshold", default 20). Two states:
//
//  • Default (L = 0 AND U = 0): plain grey track; text-only flags "Lower Threshold" / "Upper
//    Threshold" at illustrative 24 % / 76 % positions (AC-2.2).
//  • Set (either ≠ 0): flags read "L +{v}" / "U +{v}"; the track shows hard-edged Red [0→L] /
//    Yellow [L→U] / Green [U→X] zones with no gradient blending (AC-2.3).
//
// Controlled component. It emits already-clamped values (`0 ≤ L ≤ U ≤ X`, AC-2.4) and rounds drag
// to 0.1 / keyboard to 0.5 steps. The BR-004 auto-sync ("U mirrors L until U is independently
// touched") is stateful business logic owned by the parent form (ThresholdAutoSyncCalculator),
// NOT this primitive — the primitive only enforces the L ≤ U ≤ X clamp.
//
// RTL (design-system rule): Lower stays nearer 0 and Upper nearer X semantically; only the visual
// left/right of the value axis flips with the writing direction.

// viewBox geometry (unitless; the SVG scales to 100 % width).
const VBW = 900
const VBH = 92
const TRACK_X0 = 22
const TRACK_X1 = VBW - TRACK_X0
const TRACK_W = TRACK_X1 - TRACK_X0
const TRACK_Y = 46
const TRACK_H = 14
const TRACK_MID = TRACK_Y + TRACK_H / 2
const HANDLE_W = 7
const HANDLE_H = 20
const FLAG_Y = 30
const TICK_TOP = TRACK_Y + TRACK_H + 4
const TICK_LABEL_Y = TICK_TOP + 12

// Illustrative flag/handle positions in the Default state (AC-2.2).
const DEFAULT_LOWER_F = 0.24
const DEFAULT_UPPER_F = 0.76

const round1 = (v: number) => Math.round(v * 10) / 10
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

export interface ThresholdSliderProps {
  /** Lower Threshold delta (L), `0 ≤ L ≤ U`. */
  lower: number
  /** Upper Threshold delta (U), `L ≤ U ≤ X`. */
  upper: number
  /**
   * Whether Lower has been set by the user. `false` → the Lower flag shows as an illustrative
   * placeholder and its red boundary is not drawn (empty-by-default add form). Default `true`.
   */
  lowerSet?: boolean
  /** Whether Upper has been set by the user. Same semantics as `lowerSet`. Default `true`. */
  upperSet?: boolean
  /** Scale maximum X (tenant "max upper threshold", default 20). */
  max?: number
  /** Emitted with clamped values on every drag / keyboard change. Omit for a read-only render. */
  onChange?: (next: { lower: number; upper: number }) => void
  /** Deactivated Target → disabled + faded, no drag / keyboard. */
  disabled?: boolean
  /** KPI name, woven into the accessible labels. */
  kpiName?: string
  className?: string
}

export function ThresholdSlider({
  lower,
  upper,
  lowerSet = true,
  upperSet = true,
  max = 20,
  onChange,
  disabled = false,
  kpiName,
  className,
}: ThresholdSliderProps) {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef<"lower" | "upper" | null>(null)
  const clipId = useId()

  const interactive = !disabled && !!onChange
  // Each threshold is drawn independently: a red boundary appears once Lower is set, a green one
  // once Upper is set, and the yellow band only when BOTH are set. Unset flags rest at illustrative
  // positions (draggable to set them), so nothing renders as a degenerate L = U shape.
  const lowerF = lowerSet ? lower / max : DEFAULT_LOWER_F
  const upperF = upperSet ? upper / max : DEFAULT_UPPER_F

  // fraction (0..1 of X) → viewBox x, flipping the visual axis in RTL.
  const xOf = (fraction: number) => {
    const f = clamp(fraction, 0, 1)
    return TRACK_X0 + (isRtl ? 1 - f : f) * TRACK_W
  }


  // Map a pointer's clientX to a rounded (0.1) value on the X scale, honouring RTL.
  const valueFromClientX = (clientX: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return null
    const vbX = ((clientX - rect.left) / rect.width) * VBW
    let f = clamp((vbX - TRACK_X0) / TRACK_W, 0, 1)
    if (isRtl) f = 1 - f
    return round1(f * max)
  }

  // Each thumb is clamped only to the scale bounds [0, max]; the `L ≤ U` ordering and the BR-004
  // auto-sync (U mirrors L until U is independently touched) are enforced by the consumer
  // (KpiTargetFieldset), because the mirror needs to move U *up* when L is dragged in the default
  // state — an ordering clamp here would pin L at 0 and defeat it.
  const emit = (which: "lower" | "upper", raw: number) => {
    if (!onChange) return
    const v = clamp(raw, 0, max)
    if (which === "lower") onChange({ lower: v, upper })
    else onChange({ lower, upper: v })
  }

  const onHandlePointerDown = (which: "lower" | "upper") => (e: PointerEvent<SVGGElement>) => {
    if (!interactive) return
    e.preventDefault()
    draggingRef.current = which
    // Position on press FIRST so a click always moves the flag, then try to capture the pointer.
    // Capture is best-effort: if it throws (some synthetic pointer sources do), the press still
    // registered — don't let it abort the drag.
    const v = valueFromClientX(e.clientX)
    if (v != null) emit(which, v)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture is an optimisation, not a requirement */
    }
  }

  const onHandlePointerMove = (e: PointerEvent<SVGGElement>) => {
    const which = draggingRef.current
    if (!which || !interactive) return
    const v = valueFromClientX(e.clientX)
    if (v != null) emit(which, v)
  }

  const endDrag = (e: PointerEvent<SVGGElement>) => {
    if (draggingRef.current == null) return
    draggingRef.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onHandleKeyDown = (which: "lower" | "upper") => (e: KeyboardEvent<SVGGElement>) => {
    if (!interactive) return
    const current = which === "lower" ? lower : upper
    let next: number | null = null
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = current + 0.5
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = current - 0.5
        break
      case "Home":
        next = 0
        break
      case "End":
        next = max
        break
      default:
        return
    }
    e.preventDefault()
    emit(which, round1(next))
  }

  // Zone rect between two X-scale values, resolved through xOf so it flips correctly in RTL.
  const zoneRect = (fromF: number, toF: number, fill: string, key: string) => {
    const a = xOf(fromF)
    const b = xOf(toF)
    const x = Math.min(a, b)
    const w = Math.abs(b - a)
    if (w <= 0) return null
    return <rect key={key} x={x} y={TRACK_Y} width={w} height={TRACK_H} fill={fill} />
  }

  const ticks: number[] = []
  for (let v = 0; v <= max + 1e-9; v += 2) ticks.push(Math.round(v))

  const ariaLabel = (edge: "lower" | "upper") =>
    kpiName
      ? t(edge === "lower" ? "actions.sliderLowerAriaFor" : "actions.sliderUpperAriaFor", { kpi: kpiName })
      : t(edge === "lower" ? "actions.sliderLowerAria" : "actions.sliderUpperAria")

  const renderHandle = (which: "lower" | "upper") => {
    const isLower = which === "lower"
    const f = isLower ? lowerF : upperF
    const value = isLower ? lower : upper
    const cx = xOf(f)
    const fillVar = isLower ? "var(--color-d5)" : "var(--color-d2)"
    return (
      <g
        role="slider"
        tabIndex={interactive ? 0 : -1}
        aria-label={ariaLabel(isLower ? "lower" : "upper")}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`+${fmt(value)}`}
        aria-disabled={!interactive || undefined}
        // `pointer-events: all` makes the whole group (incl. the transparent hit rect) a pointer
        // target — SVG's default `visiblePainted` does NOT hit-test a transparent fill, which was
        // silently swallowing every drag (pointerdown never fired). Keyboard/inputs were unaffected.
        style={{ pointerEvents: interactive ? "all" : "none" }}
        className={cn(
          "outline-none",
          interactive
            ? "cursor-ew-resize focus-visible:[&>rect.stem]:stroke-primary"
            : "cursor-default",
        )}
        onPointerDown={onHandlePointerDown(which)}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onHandleKeyDown(which)}
      >
        {/* Wider transparent hit area for easy grabbing / touch. */}
        <rect
          x={cx - 9}
          y={TRACK_MID - HANDLE_H / 2 - 3}
          width={18}
          height={HANDLE_H + 6}
          fill="transparent"
        />
        {/* 7×20 white-bordered stem overlapping the track. */}
        <rect
          className="stem stroke-card transition-[stroke]"
          x={cx - HANDLE_W / 2}
          y={TRACK_MID - HANDLE_H / 2}
          width={HANDLE_W}
          height={HANDLE_H}
          rx={3}
          fill={fillVar}
          strokeWidth={2}
        />
      </g>
    )
  }

  return (
    <div
      className={cn("w-full", disabled && "pointer-events-none opacity-50 grayscale", className)}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className="touch-none select-none"
        role="group"
        aria-label={
          kpiName
            ? t("actions.thresholdSliderAriaFor", { kpi: kpiName, max })
            : t("actions.thresholdSliderAria", { max })
        }
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={TRACK_X0} y={TRACK_Y} width={TRACK_W} height={TRACK_H} rx={TRACK_H / 2} />
          </clipPath>
        </defs>

        {/* Neutral track base — theme-aware (never a hardcoded slate). */}
        <rect
          className="fill-muted"
          x={TRACK_X0}
          y={TRACK_Y}
          width={TRACK_W}
          height={TRACK_H}
          rx={TRACK_H / 2}
        />

        {/* Hard-edged zones, clipped to the rounded track — each drawn only once its threshold is
            set: Red [0→L] with Lower, Green [U→X] with Upper, Yellow [L→U] only when both exist. */}
        <g clipPath={`url(#${clipId})`}>
          {lowerSet && zoneRect(0, lower / max, "var(--color-d5)", "z-red")}
          {lowerSet && upperSet && zoneRect(lower / max, upper / max, "var(--color-d3)", "z-yellow")}
          {upperSet && zoneRect(upper / max, 1, "var(--color-d2)", "z-green")}
        </g>

        {/* Tick marks + numbers (0…X step 2) — theme-aware neutral chrome. */}
        {ticks.map((tv) => {
          const tx = xOf(tv / max)
          return (
            <g key={`tick-${tv}`} aria-hidden="true">
              <line
                className="stroke-muted-foreground/40"
                x1={tx}
                y1={TICK_TOP}
                x2={tx}
                y2={TICK_TOP + 4}
                strokeWidth={1}
              />
              <text
                className="fill-muted-foreground"
                x={tx}
                y={TICK_LABEL_Y}
                textAnchor="middle"
                fontSize={8}
              >
                {tv}
              </text>
            </g>
          )
        })}

        {/* Flags above the track. Default → text-only; Set → "L +v" / "U +v". */}
        <text
          x={xOf(lowerF)}
          y={FLAG_Y}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--color-d5)"
        >
          {lowerSet ? `L +${fmt(lower)}` : t("actions.fieldLower")}
        </text>
        <text
          x={xOf(upperF)}
          y={FLAG_Y}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--color-d2)"
        >
          {upperSet ? `U +${fmt(upper)}` : t("actions.fieldUpper")}
        </text>

        {/* Draggable stem handles (rendered last so they sit above the zones). */}
        {renderHandle("lower")}
        {renderHandle("upper")}
      </svg>
    </div>
  )
}
