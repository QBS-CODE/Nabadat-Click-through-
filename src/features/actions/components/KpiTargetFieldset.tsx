import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { DatePicker } from "@/components/cx/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThresholdSlider } from "@/components/cx/threshold-slider"
import { cn } from "@/lib/utils"

// ── FR-204 / FR-205 / FR-206: one KPI Target subsection inside the Add/Edit Action form ──
//
// Renders a single Target's fields — KPI select (with cross-Target disable), Target Date,
// Lower/Upper Threshold number inputs, the FR-502 ThresholdSlider (two-way bound to the inputs),
// and the FR-206 Current-score / Baseline label above the slider.
//
// BR-004 auto-sync lives HERE (not in the slider primitive): from L's first change off 0, U
// mirrors L until U is independently set; afterwards `0 ≤ L ≤ U ≤ X` is clamped in both
// directions. The slider and the number inputs both route through the same handlers, so the flags
// and fields stay in sync (FR-502 two-way binding).

export interface KpiOption {
  id: string
  name: string
}

export interface KpiTargetDraft {
  /** KPI id, "" until one is chosen. */
  kpiId: string
  /** ISO yyyy-MM-dd, "" until picked. */
  targetDate: string
  /** Lower Threshold delta over baseline (L), `0 ≤ L ≤ U`. */
  lowerThreshold: number
  /** Upper Threshold delta over baseline (U), `L ≤ U ≤ X`, `> 0` to save (VAL-210). */
  upperThreshold: number
}

export interface KpiTargetFieldErrors {
  kpiId?: string
  targetDate?: string
  upperThreshold?: string
}

export interface KpiTargetFieldsetProps {
  /** 1-based display number for the "Target {n}" header (renumbered on delete by the parent). */
  index: number
  value: KpiTargetDraft
  onChange: (next: KpiTargetDraft) => void
  /** Tenant's Active KPIs (M-06). */
  kpiOptions: KpiOption[]
  /** KPI ids already chosen in *other* Targets of this Action — disabled here (FR-205, VAL-211). */
  disabledKpiIds?: string[]
  /** Scale maximum X (tenant "max upper threshold", default 20). */
  max?: number
  /** Selected KPI's live/historical score for the FR-206 label; null when unavailable (C-01). */
  currentScore?: number | null
  /** true when the Action Start Date is ≤ today → label reads "Baseline"; else "Current Score". */
  startDateInPast?: boolean
  errors?: KpiTargetFieldErrors
  /** Deactivated Target → faded + inert body (FR-207); header stays operable. */
  disabled?: boolean
  /**
   * Edit mode on an already-stored Target: its KPI is **immutable** server-side — `PUT /actions/{id}`
   * refuses a differing `kpi_id` with `validation.target_kpi_immutable` (TODO-M15-008), because the
   * Baseline is anchored to the KPI and the audit vocabulary (`EditableField`) has no member to record
   * a swap with. The select stays prefilled and readable but cannot be operated, and a hint names the
   * supported route (delete this Target, add one for the new KPI — which passes through BR-012 / R-17
   * and takes a fresh `baseline.captured`). Rendering an operable select here would hand the user a
   * 400 they could not act on.
   */
  kpiLocked?: boolean
  /** Active toggle + Delete button, injected by the form in later stories (US7). */
  headerActions?: ReactNode
  className?: string
}

const round1 = (v: number) => Math.round(v * 10) / 10
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fmtScore = (s: number | null | undefined) =>
  s == null ? "—" : Number.isInteger(s) ? String(s) : s.toFixed(1)

export function KpiTargetFieldset({
  index,
  value,
  onChange,
  kpiOptions,
  disabledKpiIds = [],
  max = 20,
  currentScore,
  startDateInPast = false,
  errors,
  disabled = false,
  kpiLocked = false,
  headerActions,
  className,
}: KpiTargetFieldsetProps) {
  const { t } = useTranslation()
  // Both thresholds start EMPTY. Entering the Lower bound auto-fills the Upper with the SAME value
  // at the same time (BR-004 auto-sync) and keeps mirroring it until the user edits Upper on its
  // own (`upperTouched`). A prefilled Target (edit mode) seeds both as touched so existing values
  // show. `lowerTouched` only governs whether the (mirrored) fields are shown vs blank.
  const prefilled = !(value.lowerThreshold === 0 && value.upperThreshold === 0)
  const [lowerTouched, setLowerTouched] = useState(prefilled)
  const [upperTouched, setUpperTouched] = useState(prefilled)

  const changeLower = (rawLower: number) => {
    setLowerTouched(true)
    const l = clamp(round1(rawLower), 0, max)
    if (!upperTouched) {
      // U mirrors L until U is independently set — filled with the same value at the same time.
      onChange({ ...value, lowerThreshold: l, upperThreshold: l })
    } else {
      // Clamp L ≤ U once Upper has been set on its own (AC-2.4).
      onChange({ ...value, lowerThreshold: Math.min(l, value.upperThreshold) })
    }
  }

  const changeUpper = (rawUpper: number) => {
    setUpperTouched(true)
    const u = clamp(round1(rawUpper), 0, max)
    // Clamp U ≥ L only once Lower has been set.
    onChange({ ...value, upperThreshold: lowerTouched ? Math.max(u, value.lowerThreshold) : u })
  }

  const selectedKpi = kpiOptions.find((o) => o.id === value.kpiId)
  const showScoreLabel = value.kpiId !== ""
  const scoreLabel = startDateInPast ? t("actions.labelBaseline") : t("actions.labelCurrentScore")

  const fieldId = `target-${index}`

  return (
    <div
      data-testid={`kpi-target-${index}`}
      className={cn("rounded-md border border-border bg-card p-4", className)}
    >
      {/* Header row: Target {n} + optional actions (Active toggle / Delete, US7) */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold">{t("actions.targetHeading", { n: index })}</h3>
        {headerActions}
      </div>

      {/* Body — faded + inert when the Target is deactivated */}
      <div className={cn("space-y-4", disabled && "pointer-events-none opacity-50 grayscale")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* KPI select — cross-Target disable */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-kpi`}>
              {t("actions.fieldKpi")}
              <span className="text-destructive"> *</span>
            </Label>
            <Select
              value={value.kpiId || undefined}
              disabled={kpiLocked}
              onValueChange={(v) => onChange({ ...value, kpiId: (v as string | null) ?? "" })}
            >
              <SelectTrigger
                id={`${fieldId}-kpi`}
                className="w-full"
                disabled={kpiLocked}
                data-testid={`${fieldId}-kpi`}
              >
                <SelectValue>{() => selectedKpi?.name ?? t("actions.selectPlaceholder")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kpiOptions.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    disabled={opt.id !== value.kpiId && disabledKpiIds.includes(opt.id)}
                  >
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kpiLocked && (
              <p className="text-sm text-muted-foreground">{t("actions.kpiLockedHint")}</p>
            )}
            {errors?.kpiId && (
              <p className="text-sm text-destructive" role="alert">
                {errors.kpiId}
              </p>
            )}
          </div>

          {/* Target Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-date`}>
              {t("actions.fieldTargetDate")}
              <span className="text-destructive"> *</span>
            </Label>
            <DatePicker
              id={`${fieldId}-date`}
              value={value.targetDate}
              onChange={(next) => onChange({ ...value, targetDate: next })}
              aria-label={t("actions.fieldTargetDate")}
              data-testid={`${fieldId}-date`}
            />
            {errors?.targetDate && (
              <p className="text-sm text-destructive" role="alert">
                {errors.targetDate}
              </p>
            )}
          </div>

          {/* Lower Threshold */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-lower`}>
              {t("actions.fieldLower")}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {t("actions.pointsOverBaseline")}
              </span>
            </Label>
            <Input
              id={`${fieldId}-lower`}
              type="number"
              inputMode="decimal"
              step={0.5}
              min={0}
              max={max}
              // Empty until the user sets it.
              value={lowerTouched ? value.lowerThreshold : ""}
              placeholder={t("actions.lowerThresholdPlaceholder")}
              onChange={(e) => {
                const n = e.currentTarget.valueAsNumber
                changeLower(Number.isNaN(n) ? 0 : n)
              }}
              data-testid={`${fieldId}-lower`}
            />
          </div>

          {/* Upper Threshold */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-upper`}>
              {t("actions.fieldUpper")}
              <span className="text-destructive"> *</span>
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {t("actions.pointsOverBaseline")}
              </span>
            </Label>
            <Input
              id={`${fieldId}-upper`}
              type="number"
              inputMode="decimal"
              step={0.5}
              min={0}
              max={max}
              // Empty until the user sets it (upperTouched) — no auto-filled mirror of Lower.
              // Shows the mirrored value once Lower is entered (auto-synced), or the user's own.
              value={upperTouched || lowerTouched ? value.upperThreshold : ""}
              placeholder={t("actions.upperThresholdPlaceholder")}
              onChange={(e) => {
                const n = e.currentTarget.valueAsNumber
                changeUpper(Number.isNaN(n) ? 0 : n)
              }}
              data-testid={`${fieldId}-upper`}
            />
            {errors?.upperThreshold && (
              <p className="text-sm text-destructive" role="alert">
                {errors.upperThreshold}
              </p>
            )}
          </div>
        </div>

        {/* Full-width slider block: FR-206 score label + Threshold Slider + scale note */}
        <div className="space-y-2">
          {showScoreLabel && (
            <div>
              <p className="text-sm">
                <span className="font-medium text-foreground">{scoreLabel}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-mono tabular-nums text-foreground">
                  {fmtScore(currentScore)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{t("actions.baselineCaption")}</p>
            </div>
          )}
          <ThresholdSlider
            lower={value.lowerThreshold}
            upper={value.upperThreshold}
            lowerSet={lowerTouched}
            upperSet={upperTouched || lowerTouched}
            max={max}
            onChange={(next) => {
              if (next.lower !== value.lowerThreshold) changeLower(next.lower)
              else if (next.upper !== value.upperThreshold) changeUpper(next.upper)
            }}
            disabled={disabled}
            kpiName={selectedKpi?.name}
          />
          <p className="text-xs text-muted-foreground">{t("actions.scaleNote", { max })}</p>
        </div>
      </div>
    </div>
  )
}
