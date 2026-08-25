import { useTranslation } from "react-i18next"

import { SteppedZoneSlider } from "@/components/cx/stepped-zone-slider"
import { TimerRing } from "@/components/cx/timer-ring"
import { cn } from "@/lib/utils"

import type { ActionOutcome, KpiTarget } from "../api"
import { DateCell, KpiCell, RowGrid, ScoreCell } from "./target-row-shared"

// FR-305 / FR-306 — an evaluated Target. Renders identically whether the Action itself is Completed
// or the Target's own date simply passed on a still-Active Action (§8.4 (b)).

const OUTCOME_TEXT: Record<ActionOutcome, string> = {
  successful: "text-d2-dark dark:text-d2-light",
  partially_successful: "text-d3-dark dark:text-d3",
  unsuccessful: "text-d5 dark:text-d5-light",
}
const OUTCOME_DOT: Record<ActionOutcome, string> = {
  successful: "bg-d2",
  partially_successful: "bg-d3",
  unsuccessful: "bg-d5",
}
export const OUTCOME_LABEL_KEY: Record<ActionOutcome, string> = {
  successful: "actions.outcomeSuccessful",
  partially_successful: "actions.outcomePartial",
  unsuccessful: "actions.outcomeUnsuccessful",
}
const OUTCOME_SENTENCE_KEY: Record<ActionOutcome, string> = {
  successful: "actions.outcomeSuccessfulSentence",
  partially_successful: "actions.outcomePartialSentence",
  unsuccessful: "actions.outcomeUnsuccessfulSentence",
}

export function TargetRowCompleted({ target }: { target: KpiTarget }) {
  const { t } = useTranslation()
  const outcome = target.outcome

  return (
    <RowGrid>
      <KpiCell name={target.kpiName}>
        {outcome && (
          <span
            className={cn("flex items-center gap-1.5 text-xs font-bold", OUTCOME_TEXT[outcome])}
            title={t(OUTCOME_SENTENCE_KEY[outcome])}
          >
            <span className={cn("size-2 shrink-0 rounded-full", OUTCOME_DOT[outcome])} />
            {t(OUTCOME_LABEL_KEY[outcome])}
          </span>
        )}
      </KpiCell>
      <SteppedZoneSlider
        baseline={target.baselineScore}
        current={target.finalScore ?? target.currentScore}
        lower={target.lowerThreshold}
        upper={target.upperThreshold}
        showReferenceFlags
        kpiName={target.kpiName}
        className="h-auto w-full"
      />
      {/* Monitoring is over, so the date reads as "evaluated on", the ring is full-but-grey, and
          pace no longer applies — the outcome beside the KPI name is the verdict now. */}
      <DateCell value={target.targetDate} iso />
      <ScoreCell value={null} />
      <TimerRing state="grey" timeProgress={100} tooltip={t("actions.timerComplete")} />
    </RowGrid>
  )
}
