import { SteppedZoneSlider } from "@/components/cx/stepped-zone-slider"
import { TimerRing } from "@/components/cx/timer-ring"

import type { KpiTarget } from "../api"
import { DateCell, KpiCell, RowGrid, ScoreCell } from "./target-row-shared"

// FR-307 — a Planned Action's Target: no Baseline captured yet (BR-B3), so the slider anchors
// provisionally at Current and there is no pace or score to report.
export function TargetRowPlanned({ target }: { target: KpiTarget }) {
  return (
    <RowGrid>
      <KpiCell name={target.kpiName} />
      <SteppedZoneSlider
        baseline={null}
        current={target.currentScore}
        lower={target.lowerThreshold}
        upper={target.upperThreshold}
        showBaseline={false}
        kpiName={target.kpiName}
        className="h-auto w-full"
      />
      <DateCell value={target.targetDate} iso />
      <ScoreCell value={null} />
      <TimerRing state="empty" timeProgress={0} />
    </RowGrid>
  )
}
