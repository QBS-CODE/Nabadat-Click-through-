import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { KpiTarget } from "../api"
import { DeleteTargetDialog } from "./DeleteTargetDialog"
import { DateCell, KpiCell, RowGrid, ScoreCell } from "./target-row-shared"

// FR-308 — a deactivated Target. The whole row fades, the KPI name is struck through, and the
// progress cell carries the explanation instead of a slider: there is nothing to measure, so a
// frozen chart would imply the Target is still being tracked. Activate / Delete sit in the pace
// column as links (§8.7); both are hidden on Completed/Archived Actions (BR-023 / BR-009).
export function TargetRowDeactivated({
  target,
  readOnly = false,
  busy = false,
  onActivate,
  onDelete,
}: {
  target: KpiTarget
  /** Completed/Archived actions hide the write controls (the faded row still renders). */
  readOnly?: boolean
  /** True while any Target write on this Action is in flight — disables the controls. */
  busy?: boolean
  onActivate?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const forced = target.deactivationSource === "forced"
  const [confirmOpen, setConfirmOpen] = useState(false)
  const showControls = !readOnly && onActivate != null && onDelete != null

  return (
    <RowGrid className="opacity-[.62] py-4">
      <KpiCell name={target.kpiName} struck badge={t("actions.deactivatedBadge")} badgeDashed />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {forced ? t("actions.deactivatedExplain") : t("actions.rowExcluded")}
      </p>

      <DateCell value={target.targetDate} iso muted />
      <ScoreCell value={null} />

      {showControls ? (
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            disabled={forced || busy}
            title={forced ? t("actions.kpiInactiveHint") : undefined}
            onClick={onActivate}
            className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {t("actions.activate")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed"
          >
            {t("actions.delete")}
          </button>
        </div>
      ) : (
        <span className="text-[13px] text-muted-foreground">—</span>
      )}

      {showControls && (
        <DeleteTargetDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          busy={busy}
          onConfirm={() => {
            setConfirmOpen(false)
            onDelete?.()
          }}
        />
      )}
    </RowGrid>
  )
}
