// SCR-07's mapping table (T163, US6) — inline add / edit / delete.
//
// FR-S7-03  inline draft add-row; source values unique per parameter (VR-F08, case-insensitive)
// FR-S7-04  row edit and delete, delete behind Dialog D-7; effective at read time immediately
// BR-13     mappings resolve at READ time, so an edit retroactively relabels historical data and
//           a delete reverts those responses to the raw value. The copy says so — this is the
//           single most surprising behaviour on the screen if it isn't spelled out.
//
// There is deliberately no version-history or restore control anywhere: mapping history was
// permanently descoped ([PO-G12]) and the audit trail is the only change record.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IntegrationHubApiError,
  mappingFieldForCode,
  type MappingFieldKey,
  type ParameterMapping,
  type ParameterMappingSaveInput,
} from "@/features/integration-hub/api"

export interface ParameterMappingTableProps {
  items: ParameterMapping[]
  loading: boolean
  saving: boolean
  /** False for a persona with read-only access (FR-GBL-05) — hides every write control. */
  canManage: boolean
  /** Pre-fills a new draft row's source value, set by the queue's "Map now" (FR-S7-02). */
  draftSourceValue?: string
  onDraftConsumed?: () => void
  onCreate: (input: ParameterMappingSaveInput) => Promise<unknown>
  onUpdate: (mappingId: string, input: ParameterMappingSaveInput) => Promise<unknown>
  onDelete: (mappingId: string) => Promise<void>
  /** Rendered as a bar inside the table card, below the rows (count + bulk actions). */
  footerSlot?: React.ReactNode
}

/** Design-system UI Label: small-caps, tracked, muted — the table-header treatment. */
const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

type Draft = { sourceValue: string; displayEn: string; displayAr: string }

const EMPTY_DRAFT: Draft = { sourceValue: "", displayEn: "", displayAr: "" }

export function ParameterMappingTable({
  items,
  loading,
  saving,
  canManage,
  draftSourceValue,
  onDraftConsumed,
  onCreate,
  onUpdate,
  onDelete,
  footerSlot,
}: ParameterMappingTableProps) {
  const { t } = useTranslation()

  // The add-row is a client-only "Draft" until saved — no draft row is ever persisted.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Partial<Record<MappingFieldKey, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState<ParameterMapping | null>(null)

  // "Map now" from the unmapped-values alert opens a draft with the raw value pre-filled.
  // In an effect, not during render — setting state mid-render is a re-render loop.
  useEffect(() => {
    if (!draftSourceValue) return
    setDraft({ ...EMPTY_DRAFT, sourceValue: draftSourceValue })
    setErrors({})
    onDraftConsumed?.()
  }, [draftSourceValue, onDraftConsumed])

  function applyServerErrors(error: unknown): boolean {
    if (!(error instanceof IntegrationHubApiError)) return false
    const next: Partial<Record<MappingFieldKey, string>> = {}
    const codes: string[] = error.details?.length ? error.details.map((d) => d.code) : [error.code]
    for (const code of codes) {
      const field = mappingFieldForCode(code)
      if (field) {
        next[field] = t(`integrationHub.mappings.serverErrors.${code}`, {
          defaultValue: error.message,
        })
      }
    }
    setErrors(next)
    return Object.keys(next).length > 0
  }

  function validate(value: Draft): boolean {
    const next: Partial<Record<MappingFieldKey, string>> = {}
    if (!value.sourceValue.trim())
      next.sourceValue = t("integrationHub.mappings.errors.sourceValueRequired")
    if (!value.displayEn.trim())
      next.displayEn = t("integrationHub.mappings.errors.displayEnRequired")
    if (!value.displayAr.trim())
      next.displayAr = t("integrationHub.mappings.errors.displayArRequired")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function saveDraft() {
    if (!draft || !validate(draft)) return
    try {
      await onCreate({
        sourceValue: draft.sourceValue.trim(),
        displayEn: draft.displayEn.trim(),
        displayAr: draft.displayAr.trim(),
      })
      setDraft(null)
      setErrors({})
    } catch (error) {
      if (!applyServerErrors(error)) {
        setErrors({ sourceValue: t("integrationHub.mappings.errors.unexpected") })
      }
    }
  }

  async function saveEdit(mappingId: string) {
    if (!validate(editDraft)) return
    try {
      await onUpdate(mappingId, {
        sourceValue: editDraft.sourceValue.trim(),
        displayEn: editDraft.displayEn.trim(),
        displayAr: editDraft.displayAr.trim(),
      })
      setEditingId(null)
      setErrors({})
    } catch (error) {
      if (!applyServerErrors(error)) {
        setErrors({ sourceValue: t("integrationHub.mappings.errors.unexpected") })
      }
    }
  }

  function startEdit(mapping: ParameterMapping) {
    setEditingId(mapping.id)
    setEditDraft({
      sourceValue: mapping.sourceValue,
      displayEn: mapping.displayEn,
      displayAr: mapping.displayAr,
    })
    setErrors({})
  }

  async function confirmDeleteNow() {
    if (!confirmDelete) return
    await onDelete(confirmDelete.id)
    setConfirmDelete(null)
  }

  const columnCount = canManage ? 5 : 4

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={cn(TH, "w-[22%]")}>
                {t("integrationHub.mappings.colSourceValue")}
              </TableHead>
              <TableHead className={cn(TH, "w-[26%]")}>
                {t("integrationHub.mappings.colDisplayEn")}
              </TableHead>
              <TableHead className={cn(TH, "w-[26%]")}>
                {t("integrationHub.mappings.colDisplayAr")}
              </TableHead>
              <TableHead className={cn(TH, "w-[12%]")}>
                {t("integrationHub.mappings.colStatus")}
              </TableHead>
              {canManage && (
                <TableHead className="w-36">
                  <span className="sr-only">{t("integrationHub.mappings.colActions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={columnCount}>
                    <div className="h-6 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && items.length === 0 && draft === null && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                    <h3 className="mb-2 text-lg font-bold">
                      {t("integrationHub.mappings.emptyTitle")}
                    </h3>
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                      {t("integrationHub.mappings.emptyHint")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              items.map((mapping) =>
                editingId === mapping.id ? (
                  <TableRow key={mapping.id} data-testid={`mapping-edit-${mapping.sourceValue}`}>
                    <TableCell>
                      <Input
                        dir="ltr"
                        className="font-mono text-xs md:text-xs"
                        value={editDraft.sourceValue}
                        aria-label={t("integrationHub.mappings.colSourceValue")}
                        data-testid="edit-source-value"
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, sourceValue: e.target.value })
                        }
                      />
                      {errors.sourceValue && (
                        <p className="mt-1 text-sm text-destructive" role="alert">
                          {errors.sourceValue}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        dir="ltr"
                        value={editDraft.displayEn}
                        aria-label={t("integrationHub.mappings.colDisplayEn")}
                        data-testid="edit-display-en"
                        onChange={(e) => setEditDraft({ ...editDraft, displayEn: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        dir="rtl"
                        lang="ar"
                        value={editDraft.displayAr}
                        aria-label={t("integrationHub.mappings.colDisplayAr")}
                        data-testid="edit-display-ar"
                        onChange={(e) => setEditDraft({ ...editDraft, displayAr: e.target.value })}
                      />
                    </TableCell>
                    <TableCell />
                    <TableCell className="w-36">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="compact"
                          disabled={saving}
                          data-testid="save-edit"
                          onClick={() => void saveEdit(mapping.id)}
                        >
                          {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          {t("integrationHub.mappings.save")}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={t("common.cancel")}
                          title={t("common.cancel")}
                          onClick={() => {
                            setEditingId(null)
                            setErrors({})
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={mapping.id}
                    className="hover:bg-muted/50"
                    data-testid={`mapping-row-${mapping.sourceValue}`}
                  >
                    <TableCell>
                      <code
                        dir="ltr"
                        className="inline-block rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                      >
                        {mapping.sourceValue}
                      </code>
                    </TableCell>
                    <TableCell>
                      <bdi dir="ltr">{mapping.displayEn}</bdi>
                    </TableCell>
                    <TableCell>
                      <bdi dir="rtl" lang="ar">
                        {mapping.displayAr}
                      </bdi>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light">
                        {t("integrationHub.mappings.statusActive")}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="w-36">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={t("integrationHub.mappings.edit")}
                            title={t("integrationHub.mappings.edit")}
                            data-testid={`edit-${mapping.sourceValue}`}
                            onClick={() => startEdit(mapping)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={t("integrationHub.mappings.delete")}
                            title={t("integrationHub.mappings.delete")}
                            data-testid={`delete-${mapping.sourceValue}`}
                            onClick={() => setConfirmDelete(mapping)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}

            {/* FR-S7-03 — the inline draft add-row, badged "Draft" until saved. */}
            {draft !== null && (
              <TableRow data-testid="mapping-draft-row">
                <TableCell>
                  <Input
                    dir="ltr"
                    className="font-mono text-xs md:text-xs"
                    value={draft.sourceValue}
                    placeholder={t("integrationHub.mappings.sourcePlaceholder")}
                    aria-label={t("integrationHub.mappings.colSourceValue")}
                    aria-invalid={errors.sourceValue ? true : undefined}
                    data-testid="draft-source-value"
                    onChange={(e) => setDraft({ ...draft, sourceValue: e.target.value })}
                  />
                  {errors.sourceValue && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                      {errors.sourceValue}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    dir="ltr"
                    value={draft.displayEn}
                    placeholder={t("integrationHub.mappings.displayEnPlaceholder")}
                    aria-label={t("integrationHub.mappings.colDisplayEn")}
                    aria-invalid={errors.displayEn ? true : undefined}
                    data-testid="draft-display-en"
                    onChange={(e) => setDraft({ ...draft, displayEn: e.target.value })}
                  />
                  {errors.displayEn && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                      {errors.displayEn}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    dir="rtl"
                    lang="ar"
                    value={draft.displayAr}
                    placeholder={t("integrationHub.mappings.displayArPlaceholder")}
                    aria-label={t("integrationHub.mappings.colDisplayAr")}
                    aria-invalid={errors.displayAr ? true : undefined}
                    data-testid="draft-display-ar"
                    onChange={(e) => setDraft({ ...draft, displayAr: e.target.value })}
                  />
                  {errors.displayAr && (
                    <p className="mt-1 text-sm text-destructive" role="alert">
                      {errors.displayAr}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("integrationHub.mappings.statusDraft")}
                  </Badge>
                </TableCell>
                <TableCell className="w-36">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="compact"
                      disabled={saving}
                      data-testid="save-draft"
                      onClick={() => void saveDraft()}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      {t("integrationHub.mappings.save")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t("common.cancel")}
                      title={t("common.cancel")}
                      data-testid="cancel-draft"
                      onClick={() => {
                        setDraft(null)
                        setErrors({})
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {footerSlot && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {footerSlot}
          </div>
        )}
      </div>

      {canManage && draft === null && (
        <Button variant="secondary" data-testid="add-mapping" onClick={() => setDraft(EMPTY_DRAFT)}>
          <Plus className="size-4" />
          {t("integrationHub.mappings.addValue")}
        </Button>
      )}

      {/* Dialog D-7 — names the mapping and states the read-time consequence (BR-13). */}
      <Dialog open={confirmDelete != null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md" data-testid="delete-mapping-dialog">
          <DialogHeader>
            <DialogTitle>{t("integrationHub.mappings.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("integrationHub.mappings.deleteBody", {
                source: confirmDelete?.sourceValue ?? "",
                display: confirmDelete?.displayEn ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              data-testid="confirm-delete-mapping"
              onClick={() => void confirmDeleteNow()}
            >
              {t("integrationHub.mappings.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
