import { Loader2 } from "lucide-react"
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

// DLG-1 (spec §15.2 / §7.7, AC "Delete confirmation"): confirms deleting a *deactivated* KPI Target
// (BR-012 — a Target must be deactivated before it can be deleted; R-17 refuses the last one). Copy is
// verbatim from the spec. Controlled — Cancel dismisses, Delete confirms; the host removes the Target,
// renumbers the rest, frees the KPI in other selects, and fires toast NTF-3 "Target removed".
//
// The spec's original DLG-1 named a "ghost" Cancel, but the binding design system (CLAUDE.md) makes
// every Cancel/dismiss a borderless soft-grey `variant="outline"` — never ghost (invisible under the
// filled primary). We follow the design system.

export interface DeleteTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  /** True while the DELETE call is in flight — disables both buttons and spins the confirm. */
  busy?: boolean
}

export function DeleteTargetDialog({ open, onOpenChange, onConfirm, busy = false }: DeleteTargetDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dlg-delete-target">
        <DialogHeader>
          <DialogTitle>{t("actions.dlgDeleteTitle")}</DialogTitle>
          <DialogDescription>{t("actions.dlgDeleteBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
            data-testid="dlg-delete-target-confirm"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
