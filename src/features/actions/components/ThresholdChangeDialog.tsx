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

// DLG-3 (spec §15.2 / FR-M06): guards editing a Target's thresholds mid-monitoring — confirming
// recomputes that Target's progress/outcome. Controlled; Cancel reverts, Apply confirms. Wired into
// ActionForm edit mode in T100.

export interface ThresholdChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ThresholdChangeDialog({ open, onOpenChange, onConfirm }: ThresholdChangeDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dlg-threshold-change">
        <DialogHeader>
          <DialogTitle>{t("actions.dlgThresholdTitle")}</DialogTitle>
          <DialogDescription>{t("actions.dlgThresholdBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={onConfirm} data-testid="dlg-threshold-confirm">
            {t("actions.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
