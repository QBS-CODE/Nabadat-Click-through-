import { useTranslation } from "react-i18next"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// FR-207 / US7 — the per-Target activate/deactivate toggle shown in the Add/Edit form's Target header
// (KpiTargetFieldset `headerActions`). Toggling **off** manually deactivates the Target (faded + inert
// body, excluded from validation and results); toggling **on** reactivates it. A **force-deactivated**
// Target (its KPI was deactivated in M-06, BR-011) cannot be manually reactivated — the switch is
// disabled with the "KPI is inactive in M-06" hint (AC-3.6) until M-06 reactivates the KPI.
//
// Presentational + controlled: the parent owns `active` and applies the change (in the form it is a
// draft flag saved on PUT; the switch never calls the API itself).

export interface TargetActiveToggleProps {
  /** 1-based Target number, for the accessible label + testid. */
  index: number
  active: boolean
  /** Force-deactivated (KPI inactive in M-06) — the switch is locked off (BR-011). */
  forced?: boolean
  onActiveChange: (next: boolean) => void
  /** Suspends the control while a related write is in flight. */
  disabled?: boolean
}

export function TargetActiveToggle({
  index,
  active,
  forced = false,
  onActiveChange,
  disabled = false,
}: TargetActiveToggleProps) {
  const { t } = useTranslation()
  // A force-deactivated Target can never be switched back on from here (BR-011).
  const locked = disabled || (forced && !active)
  const id = `target-${index}-active`

  return (
    <div
      className="flex items-center gap-2"
      title={forced && !active ? t("actions.kpiInactiveHint") : undefined}
    >
      <Switch
        id={id}
        checked={active}
        disabled={locked}
        onCheckedChange={(next) => onActiveChange(next)}
        aria-label={t("actions.toggleAria", { n: index })}
        data-testid={`target-${index}-active-toggle`}
      />
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {active ? t("actions.toggleActive") : t("actions.toggleDeactivated")}
      </Label>
    </div>
  )
}
