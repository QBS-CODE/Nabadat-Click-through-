// SCR-07 Parameter Mappings (T164, US6).
//
// FR-S7-01  parameter selector lists mapping-enabled parameters only, re-renders on change
// FR-S7-02  unmapped-values alert with "Map now" pre-fill; hidden when the queue is empty
// FR-S7-03/04  the inline table (T163) handles add / edit / delete
// BR-13     read-time resolution — the screen says so up front, because "editing a label changes
//           what historical reports show" is not something a user should discover by accident
//
// FR-S7-05/06/07  Excel export, Merge/Replace-all import (Dialogs D-4/D-5) — US7.

import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, Download, Info, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ImportMappingsDialog } from "@/features/integration-hub/components/ImportMappingsDialog"
import { ParameterMappingTable } from "@/features/integration-hub/components/ParameterMappingTable"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import { useMappings } from "@/features/integration-hub/hooks/useMappings"
import type { ParameterMappingSaveInput } from "@/features/integration-hub/api"

export default function ParameterMappingsPage() {
  const { t } = useTranslation()
  // FR-GBL-05 — P-07 sees mappings read-only (BR-24).
  const canManage = useIntegrationHubAccess().canManage("mappings")
  const {
    mappingParameters,
    selectedParameterId,
    setSelectedParameterId,
    parameter,
    items,
    totalCount,
    unmapped,
    unmappedWindowDays,
    loadingParameters,
    loading,
    error,
    saving,
    create,
    update,
    remove,
    exportCurrent,
    exporting,
    importFile,
    replaceAll,
  } = useMappings()

  const [importOpen, setImportOpen] = useState(false)
  // Which mode the import dialog opens in: "Import from Excel" merges, the footer's
  // "Replace all mappings…" pre-selects replace.
  const [importMode, setImportMode] = useState<"merge" | "replace_all">("merge")
  const [importConfirmFirst, setImportConfirmFirst] = useState(false)

  // The bar reports the newest row timestamp. There is deliberately no "by <user>": `updated_by`
  // is not on the mappings wire, and inventing attribution on an audit-relevant line is worse
  // than omitting it.
  const lastUpdated = useMemo(() => {
    const newest = items.reduce<string | null>(
      (max, m) => (!max || m.updatedAt > max ? m.updatedAt : max),
      null,
    )
    return newest ? new Date(newest).toLocaleString() : null
  }, [items])

  // Set by "Map now" — pre-fills a draft row's source value, then clears so it fires once.
  const [draftSourceValue, setDraftSourceValue] = useState<string | undefined>(undefined)
  const clearDraftSeed = useCallback(() => setDraftSourceValue(undefined), [])

  async function handleCreate(input: ParameterMappingSaveInput) {
    const saved = await create(input)
    toast.success(t("integrationHub.mappings.createdToast", { source: saved.sourceValue }))
    return saved
  }

  async function handleUpdate(mappingId: string, input: ParameterMappingSaveInput) {
    const saved = await update(mappingId, input)
    toast.success(t("integrationHub.mappings.savedToast", { source: saved.sourceValue }))
    return saved
  }

  async function handleImport(file: File, mode: "merge" | "replace_all") {
    const result = await importFile(file, mode)
    toast.success(
      t("integrationHub.import.mergedToast", {
        added: result.rowsAdded,
        updated: result.rowsUpdated,
      }),
    )
    return result
  }

  async function handleReplaceAll(file: File) {
    const result = await replaceAll(file)
    toast.success(
      t("integrationHub.import.replacedToast", {
        removed: result.rowsRemoved,
        added: result.rowsAdded,
      }),
    )
    return result
  }

  async function handleDelete(mappingId: string) {
    await remove(mappingId)
    toast.success(t("integrationHub.mappings.deletedToast"))
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">{t("integrationHub.mappings.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.mappings.description")}
          </p>
        </div>
        {/* Export is safe for anyone who can see the screen; import is a manage action. */}
        {selectedParameterId && (
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={exporting}
              data-testid="export-mappings"
              onClick={() => void exportCurrent()}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("integrationHub.mappings.export")}
            </Button>
            {canManage && (
                <Button
                data-testid="open-import"
                onClick={() => {
                  setImportMode("merge")
                  setImportConfirmFirst(false)
                  setImportOpen(true)
                }}
              >
                <Upload className="size-4" />
                {t("integrationHub.mappings.import")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* BR-13 / F0.5 — read-time resolution is stated up front, not discovered. */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>{t("integrationHub.mappings.readTimeNotice")}</AlertDescription>
      </Alert>

      {loadingParameters ? (
        <Skeleton className="h-16 w-full sm:max-w-md" />
      ) : mappingParameters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <ArrowLeftRight className="mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-bold">
            {t("integrationHub.mappings.noParametersTitle")}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.mappings.noParametersHint")}
          </p>
        </div>
      ) : (
        <>
          {/* FR-S7-01 — only mapping-enabled parameters are offered. */}
          <div className="flex flex-col gap-1.5 sm:max-w-md">
            <Label htmlFor="mapping-parameter">
              {t("integrationHub.mappings.parameterLabel")}
            </Label>
            <Select
              value={selectedParameterId ?? ""}
              onValueChange={(v) => setSelectedParameterId(v ?? undefined)}
            >
              <SelectTrigger
                id="mapping-parameter"
                className="w-full"
                data-testid="parameter-select"
              >
                {/* base-ui's Select.Value renders the RAW value unless given children — which is
                    why this trigger showed the parameter's UUID. `label` is the server-composed
                    "Name — api_field (n values)" string that FR-S7-01 specifies, so use it rather
                    than re-deriving the same text here. */}
                <SelectValue placeholder={t("integrationHub.mappings.parameterPlaceholder")}>
                  {parameter?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mappingParameters.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    data-testid={`parameter-option-${p.apiField}`}
                  >
                    {p.nameEn} — {p.apiField} ({p.mappingsCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("integrationHub.mappings.parameterHelp")}
            </p>
          </div>

          {/* FR-S7-02 — the unmapped-values queue, shown ONLY when non-empty. */}
          {unmapped.length > 0 && (
            <Alert data-testid="unmapped-alert">
              <AlertDescription>
                <span className="font-semibold">
                  {t("integrationHub.mappings.unmappedTitle", {
                    count: unmapped.length,
                    days: unmappedWindowDays,
                  })}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t("integrationHub.mappings.unmappedHint")}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  {unmapped.map((value) => (
                    <Button
                      key={value.id}
                      variant="outline"
                      size="compact"
                      disabled={!canManage}
                      data-testid={`map-now-${value.rawValue}`}
                      onClick={() => setDraftSourceValue(value.rawValue)}
                    >
                      <code dir="ltr" className="font-mono">
                        {value.rawValue}
                      </code>
                      <Badge variant="outline" className="ms-1 text-muted-foreground">
                        ×{value.occurrenceCount}
                      </Badge>
                    </Button>
                  ))}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
              <h2 className="mb-2 text-lg font-bold">
                {t("integrationHub.mappings.errorTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("integrationHub.mappings.errorHint")}
              </p>
            </div>
          ) : (
            <ParameterMappingTable
              // Rebuild table state when the selected parameter changes, so a half-typed draft
              // for one parameter can never be saved against another.
              key={selectedParameterId ?? "none"}
              items={items}
              loading={loading}
              saving={saving}
              canManage={canManage}
              draftSourceValue={draftSourceValue}
              onDraftConsumed={clearDraftSeed}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              footerSlot={
                <>
                  {/* No version history exists — the platform audit trail is the only change
                      record (BR-13, [PO-G12]). `updated_by` is not on the wire, so the bar
                      reports the count and the latest timestamp without attribution. */}
                  <p className="text-xs text-muted-foreground">
                    {t("integrationHub.mappings.footerCount", {
                      count: totalCount,
                      parameter: parameter?.nameEn ?? "",
                    })}
                    {lastUpdated && (
                      <>
                        {" · "}
                        {t("integrationHub.mappings.footerUpdated", { date: lastUpdated })}
                      </>
                    )}
                  </p>
                  {canManage && totalCount > 0 && (
                    // Opens the import dialog pre-set to `replace`: replacing every mapping still
                    // requires a file, so this is an entry point into that flow rather than a
                    // separate destructive action that could wipe the table with one click.
                    <Button
                      variant="outline"
                      size="compact"
                      className="text-destructive hover:text-destructive"
                      data-testid="open-replace-all"
                      onClick={() => {
                        setImportMode("replace_all")
                        setImportConfirmFirst(true)
                        setImportOpen(true)
                      }}
                    >
                      {t("integrationHub.mappings.replaceAll")}
                    </Button>
                  )}
                </>
              }
            />
          )}

          <ImportMappingsDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            parameterName={parameter?.nameEn ?? ""}
            currentCount={totalCount}
            initialMode={importMode}
            confirmFirst={importConfirmFirst}
            onImport={handleImport}
            onReplaceAll={handleReplaceAll}
          />
        </>
      )}
    </div>
  )
}
