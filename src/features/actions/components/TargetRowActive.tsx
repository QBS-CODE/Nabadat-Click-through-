import { useTranslation } from "react-i18next"

import { SteppedZoneSlider } from "@/components/cx/stepped-zone-slider"
import { TimerRing } from "@/components/cx/timer-ring"

import type { Action, KpiTarget } from "../api"
import { clampDisplay, scoreProgress, timeProgress, timerStateFor } from "../lib/measurement"
import { DateCell, KpiCell, RowGrid, ScoreCell } from "./target-row-shared"

// FR-304 — an Active, not-yet-evaluated Target: five cells against the shared table track
// (KPI · progress · target date · score progress · pace). The featured row is marked by RowGrid.
export function TargetRowActive({ action, target }: { action: Action; target: KpiTarget }) {
  const { t: tr } = useTranslation()
  const state = timerStateFor(action, target)
  const time = clampDisplay(timeProgress(action, target))
  const raw = scoreProgress(target)
  const score = raw == null ? null : Math.round(clampDisplay(raw))

  return (
    <RowGrid highlight={target.isLowestPerforming}>
      <KpiCell
        name={target.kpiName}
        badge={target.isLowestPerforming ? tr("actions.lowestPerforming") : undefined}
      />
      <SteppedZoneSlider
        baseline={target.baselineScore}
        current={target.currentScore}
        lower={target.lowerThreshold}
        upper={target.upperThreshold}
        showReferenceFlags
        kpiName={target.kpiName}
        className="h-auto w-full"
      />
      <DateCell value={target.targetDate} iso />
      <ScoreCell value={score} tone={state === "red" ? "behind" : state === "green" ? "ahead" : undefined} />
      <TimerRing state={state} timeProgress={time} scoreProgress={score ?? undefined} />
    </RowGrid>
  )
}
