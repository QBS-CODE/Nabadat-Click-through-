// SCR-05 Parameters list (T062, US2), with the SCR-06 drawer (T061) opening over it.
//
// FR-S5-01  origin tabs (live GLOBAL counts) + name/API-field search + type filter, AND-combined
// FR-S5-02  table: parameter (dimmed when disabled) · API field chip · type · origin badge ·
//           Enabled toggle · Required/Filterable/Reporting/Dashboard glyphs · Mapping · channels
// FR-S5-03  inline enable/disable, guarded by Dialog D-6's impact warning (BR-10)
// FR-S5-04  New parameter → drawer; the "Mapped" link → SCR-07
//
// AC-S5-01 is the subtle one: the tab counts come from the server's `counts` block and stay
// GLOBAL — applying the type filter or the search box narrows the rows but never the counts.

import { useState } from "react"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, Eye, Pencil, Plus, Search, Table2 } from "lucide-react"
import { toast } from "sonner"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsCountPill, TabsListSegmented, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { FlagGlyph, ParameterDrawer } from "@/features/integration-hub/components/ParameterDrawer"
import { useParameters, type OriginTab } from "@/features/integration-hub/hooks/useParameters"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import {
  DATA_TYPES,
  type DataType,
  type Parameter,
  type ParameterReference,
  type ParameterSaveInput,
} from "@/features/integration-hub/api"

/** Design-system UI Label: small-caps, tracked, muted — the table-header treatment. */
const TH =
  "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground"

export default function AllParametersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // FR-GBL-05 — P-07 sees the catalogue read-only (BR-24).
  const canManage = useIntegrationHubAccess().canManage("parameters")
  const {
    items,
    counts,
    channels,
    truncated,
    loading,
    error,
    origin,
    setOrigin,
    type,
    setType,
    search,
    setSearch,
    isFiltered,
    clearFilters,
    save,
    saving,
    toggleEnabled,
  } = useParameters()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Parameter | undefined>(undefined)

  // Dialog D-6 — BR-10's impact warning, shown only when the server reports references.
  const [impact, setImpact] = useState<{
    parameter: Parameter
    references: ParameterReference[]
  } | null>(null)

  function openCreate() {
    setEditing(undefined)
    setDrawerOpen(true)
  }

  function openEdit(parameter: Parameter) {
    setEditing(parameter)
    setDrawerOpen(true)
  }

  async function handleSave(input: ParameterSaveInput, id?: string) {
    const saved = await save(input, id)
    toast.success(
      id
        ? t("integrationHub.parameterDrawer.savedToast", { name: saved.nameEn })
        : t("integrationHub.parameterDrawer.createdToast", { name: saved.nameEn }),
    )
    setDrawerOpen(false)
  }

  async function handleToggle(parameter: Parameter, enabled: boolean) {
    try {
      const result = await toggleEnabled(parameter.id, enabled)
      if (result.requiresConfirmation) {
        // Server changed nothing and handed back the reference list — ask first (BR-10).
        setImpact({ parameter, references: result.references })
        return
      }
      toast.success(
        enabled
          ? t("integrationHub.parameters.enabledToast", { name: parameter.nameEn })
          : t("integrationHub.parameters.disabledToast", { name: parameter.nameEn }),
      )
    } catch {
      toast.error(t("integrationHub.parameters.toggleError"))
    }
  }

  async function confirmDisable() {
    if (!impact) return
    try {
      await toggleEnabled(impact.parameter.id, false, true)
      toast.success(
        t("integrationHub.parameters.disabledToast", { name: impact.parameter.nameEn }),
      )
    } catch {
      toast.error(t("integrationHub.parameters.toggleError"))
    } finally {
      setImpact(null)
    }
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {t("integrationHub.parameters.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.parameters.description")}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/integration-hub/mappings")}
            data-testid="manage-mappings"
          >
            <ArrowLeftRight className="size-4" />
            {t("integrationHub.parameters.manageMappings")}
          </Button>
          {canManage && (
            <Button onClick={openCreate} data-testid="new-parameter">
              <Plus className="size-4" />
              {t("integrationHub.parameters.newParameter")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs + filters on ONE row (prototype layout). Tab counts stay GLOBAL — never narrowed
          by the search/type filters beside them (AC-S5-01); a count that moved when you typed
          would read as a bug. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
      <Tabs value={origin} onValueChange={(v) => setOrigin((v ?? "all") as OriginTab)}>
        <TabsListSegmented>
          <TabsTrigger value="all" data-testid="tab-all">
            {t("integrationHub.parameters.tabAll")}
            <TabsCountPill count={counts.all} />
          </TabsTrigger>
          <TabsTrigger value="built_in" data-testid="tab-built-in">
            {t("integrationHub.parameters.tabBuiltIn")}
            <TabsCountPill count={counts.builtIn} />
          </TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom">
            {t("integrationHub.parameters.tabCustom")}
            <TabsCountPill count={counts.custom} />
          </TabsTrigger>
        </TabsListSegmented>
      </Tabs>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Label htmlFor="param-search" className="sr-only">
              {t("integrationHub.parameters.searchLabel")}
            </Label>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="param-search"
              className="ps-9 text-xs md:text-xs"
              value={search}
              placeholder={t("integrationHub.parameters.searchPlaceholder")}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* `gap`, not `space-y`: base-ui's Select renders a trailing hidden node, and
              `space-y-*` would latch a stray 6px margin onto the trigger and break the
              items-center alignment with the search input beside it. */}
          <div className="flex flex-col gap-1.5 sm:w-44">
            <Label htmlFor="param-type-filter" className="sr-only">
              {t("integrationHub.parameters.typeLabel")}
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "all") as DataType | "all")}
            >
              <SelectTrigger id="param-type-filter" className="w-full" data-testid="type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("integrationHub.parameters.typeAll")}</SelectItem>
                {DATA_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {t(`integrationHub.dataTypes.${dt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isFiltered && (
            <Button variant="outline" onClick={clearFilters} data-testid="clear-filters">
              {t("integrationHub.parameters.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <h2 className="mb-2 text-lg font-bold">{t("integrationHub.parameters.errorTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.parameters.errorHint")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
          <Table className="min-w-[1000px]">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className={cn(TH, "min-w-40")}>
                  {t("integrationHub.parameters.colParameter")}
                </TableHead>
                <TableHead className={cn(TH, "min-w-36")}>
                  {t("integrationHub.parameters.colApiField")}
                </TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colType")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colOrigin")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colEnabled")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colRequired")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colFilterable")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colReporting")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colDashboard")}</TableHead>
                <TableHead className={TH}>{t("integrationHub.parameters.colMapping")}</TableHead>
                <TableHead className={cn(TH, "text-end")}>
                  {t("integrationHub.parameters.colChannels")}
                </TableHead>
                {/* Edit sits directly in the row — accessible name kept, visible label dropped. */}
                <TableHead className="w-16 text-center">
                  <span className="sr-only">{t("integrationHub.parameters.colActions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={12}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Table2 className="mb-4 size-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-bold">
                        {isFiltered
                          ? t("integrationHub.parameters.emptyFilteredTitle")
                          : t("integrationHub.parameters.emptyTitle")}
                      </h3>
                      <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {isFiltered
                          ? t("integrationHub.parameters.emptyFilteredHint")
                          : t("integrationHub.parameters.emptyHint")}
                      </p>
                      {isFiltered ? (
                        <Button variant="outline" onClick={clearFilters}>
                          {t("integrationHub.parameters.clearFilters")}
                        </Button>
                      ) : (
                        canManage && (
                          <Button onClick={openCreate}>
                            <Plus className="size-4" />
                            {t("integrationHub.parameters.newParameter")}
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                items.map((parameter) => (
                  <TableRow
                    key={parameter.id}
                    className={cn(
                      "hover:bg-muted/50",
                      // Dim the whole row, not just its name — but keep the Enabled toggle at
                      // full contrast (see below) since that is how you turn it back on.
                      !parameter.enabled && "[&>td:not(:nth-child(5))]:opacity-60",
                    )}
                    data-testid={`param-row-${parameter.apiField}`}
                  >
                    <TableCell>
                      <bdi dir="ltr" className="block max-w-full font-semibold">
                        {parameter.nameEn}
                      </bdi>
                    </TableCell>
                    <TableCell>
                      {/* Same chip as SCR-03's Channel ID — one identifier treatment app-wide. */}
                      <code
                        dir="ltr"
                        className="inline-block rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                      >
                        {parameter.apiField}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t(`integrationHub.dataTypes.${parameter.dataType}`)}
                    </TableCell>
                    <TableCell>
                      {/* Brand cyan, never mint — mint reads as the D2 "Good" state. */}
                      <Badge
                        className={
                          parameter.origin === "built_in"
                            ? "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"
                            : ""
                        }
                        variant={parameter.origin === "built_in" ? "default" : "outline"}
                      >
                        {t(`integrationHub.parameters.origin.${parameter.origin}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={parameter.enabled}
                        // Enable/disable is a manage action (FR-S5-03).
                        disabled={!canManage}
                        aria-label={t("integrationHub.parameters.enabledFor", {
                          name: parameter.nameEn,
                        })}
                        data-testid={`enabled-${parameter.apiField}`}
                        onCheckedChange={(checked) =>
                          void handleToggle(parameter, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FlagGlyph
                        on={parameter.requiredByDefault}
                        label={t("integrationHub.parameters.colRequired")}
                      />
                    </TableCell>
                    <TableCell>
                      <FlagGlyph
                        on={parameter.filterable}
                        label={t("integrationHub.parameters.colFilterable")}
                      />
                    </TableCell>
                    <TableCell>
                      <FlagGlyph
                        on={parameter.reportingVisibility}
                        label={t("integrationHub.parameters.colReporting")}
                      />
                    </TableCell>
                    <TableCell>
                      <FlagGlyph
                        on={parameter.dashboardVisibility}
                        label={t("integrationHub.parameters.colDashboard")}
                      />
                    </TableCell>
                    <TableCell>
                      {parameter.mappingSupport ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          data-testid={`mapped-${parameter.apiField}`}
                          onClick={() => navigate("/integration-hub/mappings")}
                        >
                          {t("integrationHub.parameters.mapped")}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {parameter.channelIds.length}
                    </TableCell>
                    <TableCell className="w-16 text-center">
                      {/* Edit is the only row action — built-ins are never deleted (BR-09). */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={
                          canManage
                            ? t("integrationHub.parameters.edit")
                            : t("integrationHub.parameters.view")
                        }
                        title={
                          canManage
                            ? t("integrationHub.parameters.edit")
                            : t("integrationHub.parameters.view")
                        }
                        data-testid={
                          canManage ? `edit-${parameter.apiField}` : `view-${parameter.apiField}`
                        }
                        onClick={() => openEdit(parameter)}
                      >
                        {canManage ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {truncated && (
        <p className="text-sm text-muted-foreground">{t("integrationHub.parameters.truncated")}</p>
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("integrationHub.parameters.footerNote")}
      </p>

      <ParameterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        parameter={editing}
        channels={channels}
        saving={saving}
        onSave={handleSave}
      />

      {/* Dialog D-6 — impact warning listing every reference before anything changes (BR-10). */}
      <Dialog open={impact != null} onOpenChange={(open) => !open && setImpact(null)}>
        <DialogContent className="sm:max-w-lg" data-testid="impact-dialog">
          <DialogHeader>
            <DialogTitle>{t("integrationHub.parameters.impactTitle")}</DialogTitle>
            <DialogDescription>
              {t("integrationHub.parameters.impactDescription", {
                name: impact?.parameter.nameEn ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {impact?.references.map((reference, index) => (
              <li key={`${reference.kind}-${index}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {t(`integrationHub.parameters.referenceKinds.${reference.kind}`, {
                    defaultValue: reference.kind,
                  })}
                </Badge>
                <span>{reference.name}</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setImpact(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-disable"
              onClick={() => void confirmDisable()}
            >
              {t("integrationHub.parameters.disableAnyway")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
