// Dialogs D-4 (import from Excel) and D-5 (replace all) — T183, US7.
//
// FR-S7-06  Merge / Replace-all modes, all-or-nothing with a row-level report (VR-F09)
// FR-S7-07  Replace-all is irreversible, permission-controlled and audited (BR-13)
// NFR-16    >10,000 rows is rejected before any row is parsed
//
// Two things the copy has to carry, because both are irreversible-adjacent:
//   • Merge is the DEFAULT and is non-destructive — it upserts by source value.
//   • Replace-all deletes the current set. D-5 states the exact count being destroyed and the
//     parameter's name before the user can confirm.
//
// On failure the import applies NOTHING. The row report is rendered in full so the user can fix
// their file rather than guess — that report is the entire point of an all-or-nothing import.

import { useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { AlertTriangle, Loader2, Upload } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MappingImportError,
  type MappingImportMode,
  type MappingImportResult,
  type MappingImportRowError,
} from "@/features/integration-hub/api"

export interface ImportMappingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Name of the parameter being imported into, for the confirmation copy. */
  parameterName: string
  /** Current mapping count — D-5 names it so "replace all" has a concrete consequence. */
  currentCount: number
  onImport: (file: File, mode: MappingImportMode) => Promise<MappingImportResult>
  onReplaceAll: (file: File) => Promise<MappingImportResult>
  /** Mode the dialog opens in — "replace_all" when entered via "Replace all mappings…". */
  initialMode?: MappingImportMode
  /**
   * Lead with the D-5 destruction warning instead of the import form.
   *
   * Set by the footer's "Replace all mappings…", where the user's stated intent is *removal* —
   * so the consequence is shown before they invest in picking a file. The form only appears once
   * the warning is accepted, and it is then NOT re-confirmed on submit (one warning per intent).
   */
  confirmFirst?: boolean
}

export function ImportMappingsDialog({
  open,
  onOpenChange,
  parameterName,
  currentCount,
  onImport,
  onReplaceAll,
  initialMode = "merge",
  confirmFirst = false,
}: ImportMappingsDialogProps) {
  const { t } = useTranslation()

  const [file, setFile] = useState<File | null>(null)
  // FR-S7-06 — Merge is pre-selected: the non-destructive option must be the default.
  const [mode, setMode] = useState<MappingImportMode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [rowErrors, setRowErrors] = useState<MappingImportRowError[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  // D-5 — the destructive confirm, interposed before a Replace-all actually runs.
  const [confirmReplace, setConfirmReplace] = useState(false)
  // True once the up-front D-5 warning has been accepted, which both reveals the form and
  // suppresses the post-submit confirmation.
  const [warningAccepted, setWarningAccepted] = useState(false)

  function reset() {
    setFile(null)
    setMode(initialMode)
    setWarningAccepted(false)
    setRowErrors([])
    setFormError(null)
    setConfirmReplace(false)
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  async function runImport() {
    if (!file) {
      setFormError(t("integrationHub.import.errors.fileRequired"))
      return
    }
    setBusy(true)
    setRowErrors([])
    setFormError(null)
    try {
      if (mode === "replace_all") {
        await onReplaceAll(file)
      } else {
        await onImport(file, "merge")
      }
      close()
    } catch (error) {
      if (error instanceof MappingImportError) {
        // All-or-nothing: nothing was applied. Show every failing row so the file can be fixed.
        setRowErrors(error.rows)
        setFormError(
          t(`integrationHub.import.serverErrors.${error.code}`, { defaultValue: error.message }),
        )
      } else {
        setFormError(t("integrationHub.import.errors.unexpected"))
      }
      setConfirmReplace(false)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit() {
    // Replace-all never runs straight from D-4 — it goes through D-5 first (FR-S7-07).
    if (mode === "replace_all" && !confirmReplace && !warningAccepted) {
      setConfirmReplace(true)
      return
    }
    void runImport()
  }

  return (
    <>
      <Dialog
        open={open && (!confirmFirst || warningAccepted)}
        onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      >
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg" data-testid="import-dialog">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("integrationHub.import.title")}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              <Trans
                i18nKey="integrationHub.import.columnsHint"
                components={{
                  c: (
                    <code className="mx-0.5 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wide text-foreground" />
                  ),
                }}
              />
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-file">{t("integrationHub.import.fileLabel")}</Label>
              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input bg-card px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <Upload className="size-5 text-muted-foreground" />
                {file ? (
                  <bdi dir="ltr" className="max-w-full truncate text-sm font-medium">
                    {file.name}
                  </bdi>
                ) : (
                  <span className="text-sm font-medium">
                    {t("integrationHub.import.chooseFile")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {file
                    ? t("integrationHub.import.replaceFileHint")
                    : t("integrationHub.import.fileTypeHint")}
                </span>
              </label>
              <input
                id="import-file"
                type="file"
                accept=".xlsx"
                className="sr-only"
                data-testid="import-file"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setRowErrors([])
                  setFormError(null)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("integrationHub.import.modeLabel")}</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => {
                  setMode((v ?? "merge") as MappingImportMode)
                  setConfirmReplace(false)
                }}
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="merge" id="mode-merge" data-testid="mode-merge" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="mode-merge">{t("integrationHub.import.modeMerge")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("integrationHub.import.modeMergeHelp")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="replace_all"
                    id="mode-replace"
                    data-testid="mode-replace_all"
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="mode-replace">{t("integrationHub.import.modeReplace")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("integrationHub.import.modeReplaceHelp")}
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {formError && (
              <Alert variant="destructive" role="alert" data-testid="import-error">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  {formError}{" "}
                  <span className="font-semibold">{t("integrationHub.import.nothingApplied")}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* VR-F09's row-level report — the whole reason an import is all-or-nothing. */}
            {rowErrors.length > 0 && (
              <div
                className="overflow-hidden rounded-md border border-border"
                data-testid="import-row-report"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("integrationHub.import.colRow")}</TableHead>
                      <TableHead>{t("integrationHub.import.colColumn")}</TableHead>
                      <TableHead>{t("integrationHub.import.colReason")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowErrors.map((rowError, index) => (
                      <TableRow key={`${rowError.row}-${rowError.column}-${index}`}>
                        <TableCell className="tabular-nums">{rowError.row}</TableCell>
                        <TableCell>
                          <code dir="ltr" className="font-mono text-sm">
                            {rowError.column}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rowError.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-2">
            <Button variant="outline" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={busy || !file}
              variant={mode === "replace_all" ? "destructive" : "default"}
              data-testid="import-submit"
              onClick={handleSubmit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {mode === "replace_all"
                ? t("integrationHub.import.replaceAction")
                : t("integrationHub.import.importAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog D-5 — names the exact count being destroyed and the parameter (FR-S7-07). */}
      <Dialog
        open={confirmReplace || (open && confirmFirst && !warningAccepted)}
        onOpenChange={(next) => {
          if (next) return
          // Dismissing the up-front warning abandons the whole flow; dismissing the post-submit
          // one only steps back to the form.
          if (confirmFirst && !warningAccepted) close()
          else setConfirmReplace(false)
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="replace-all-dialog">
          <DialogHeader>
            <DialogTitle>{t("integrationHub.import.replaceTitle")}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="integrationHub.import.replaceBody"
                // `n`, not `count`: i18next treats `count` as the PLURAL SELECTOR rather than a
                // value to format (CLAUDE.md, "Why {{n}}, not {{count}}").
                values={{ n: currentCount, parameter: parameterName }}
                components={{ b: <span className="font-semibold text-foreground" /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (confirmFirst && !warningAccepted) close()
                else setConfirmReplace(false)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              data-testid="confirm-replace-all"
              onClick={() => {
                // Up-front warning: accept it and reveal the form to choose the file.
                if (confirmFirst && !warningAccepted) {
                  setWarningAccepted(true)
                  setConfirmReplace(false)
                  return
                }
                void runImport()
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("integrationHub.import.replaceConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
