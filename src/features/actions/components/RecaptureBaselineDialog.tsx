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

// DLG-2 (spec §15.2 / FR-M06): guards editing the Action Start Date of a started Action — confirming
// re-snapshots every KPI baseline from M-06 history for the new date. Controlled; Cancel reverts the
// field (the parent form does the revert), Confirm applies. Wired into ActionForm edit mode in T100.

export interface RecaptureBaselineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function RecaptureBaselineDialog({ open, onOpenChange, onConfirm }: RecaptureBaselineDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dlg-recapture-baseline">
        <DialogHeader>
          <DialogTitle>{t("actions.dlgRecaptureTitle")}</DialogTitle>
          <DialogDescription>{t("actions.dlgRecaptureBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={onConfirm} data-testid="dlg-recapture-confirm">
            {t("actions.recalculateContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
