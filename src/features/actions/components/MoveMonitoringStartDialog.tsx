import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// DLG-4 (spec §15.2 / FR-M06): guards editing the Action End Date of a started Action — confirming
// moves the Target Start Date (End + 1) and recomputes every Target's Time Progress. Controlled;
// Cancel reverts, Confirm applies. Wired into ActionForm edit mode in T100.

export interface MoveMonitoringStartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function MoveMonitoringStartDialog({
  open,
  onOpenChange,
  onConfirm,
}: MoveMonitoringStartDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dlg-move-monitoring-start">
        <DialogHeader>
          <DialogTitle>{t("actions.dlgMoveStartTitle")}</DialogTitle>
          <DialogDescription>{t("actions.dlgMoveStartBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={onConfirm} data-testid="dlg-move-start-confirm">
            {t("actions.recalculateContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
