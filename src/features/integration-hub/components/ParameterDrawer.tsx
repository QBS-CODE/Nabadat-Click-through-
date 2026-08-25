// SCR-06 Parameter Editor drawer (T061, US2).
//
// Opens over SCR-05 with a scrim (no route of its own, FR-S6-01). Behaviours pinned by the
// acceptance criteria:
//   AC-S6-01  switching type between Range and List swaps the Range card / List panel
//   AC-S6-02  the API field auto-suggests `snake_case` from the EN name, and stays editable
//             until first use (BR-11)
//   AC-S6-03  a duplicate API field is blocked with an inline error (VR-F06)
//   VR-F07    Range requires Min < Max
//   BR-09     built-ins: API field permanently read-only, data type read-only ([PO-G27])
//   BR-27     Mapping support is derived from the data type — forced on for List, off-by-default
//             but toggleable for Text/Boolean/URL, unavailable otherwise
//
// Sheet scroll pattern (CLAUDE.md): SheetContent is h-full flex flex-col; the body carries
// `min-h-0 flex-1 overflow-y-auto` so only it scrolls and the footer stays pinned.

import { useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Check, Loader2, Minus, Save } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  DATA_TYPES,
  IntegrationHubApiError,
  mappingSupportFor,
  parameterFieldForCode,
  suggestApiField,
  type DataType,
  type Parameter,
  type ParameterFieldKey,
  type ParameterSaveInput,
  type ServiceChannel,
} from "@/features/integration-hub/api"

/** Small-caps UI-label used for in-sheet section headings (design-system UI Label). */
const SECTION_LABEL = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

/** Section heading + a hairline rule that fills the remaining width (prototype pattern). */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <h3 className={cn(SECTION_LABEL, "whitespace-nowrap")}>{children}</h3>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

export interface ParameterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Undefined ⇒ create mode. */
  parameter?: Parameter
  channels: ServiceChannel[]
  saving: boolean
  onSave: (input: ParameterSaveInput, id?: string) => Promise<void>
}

export function ParameterDrawer({
  open,
  onOpenChange,
  parameter,
  channels,
  saving,
  onSave,
}: ParameterDrawerProps) {
  const { t } = useTranslation()
  const isEdit = parameter != null
  const isBuiltIn = parameter?.origin === "built_in"

  const [nameEn, setNameEn] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [apiField, setApiField] = useState("")
  // Once the user edits the API field by hand, stop overwriting it from the EN name (AC-S6-02).
  const [apiFieldTouched, setApiFieldTouched] = useState(false)
  const [dataType, setDataType] = useState<DataType>("text")
  const [rangeMin, setRangeMin] = useState("")
  const [rangeMax, setRangeMax] = useState("")
  const [rangeUnit, setRangeUnit] = useState("")
  const [validationRule, setValidationRule] = useState("")
  const [requiredByDefault, setRequiredByDefault] = useState(false)
  const [filterable, setFilterable] = useState(true)
  const [reportingVisibility, setReportingVisibility] = useState(true)
  const [dashboardVisibility, setDashboardVisibility] = useState(false)
  const [mappingSupport, setMappingSupport] = useState(false)
  const [channelIds, setChannelIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Partial<Record<ParameterFieldKey, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Reset the whole form whenever the drawer opens (FR-S2-01's "state reset on re-entry" applied
  // to the drawer): base-ui mounts panels eagerly, so a stale edit must never leak into create.
  useEffect(() => {
    if (!open) return
    setNameEn(parameter?.nameEn ?? "")
    setNameAr(parameter?.nameAr ?? "")
    setApiField(parameter?.apiField ?? "")
    setApiFieldTouched(parameter != null)
    setDataType(parameter?.dataType ?? "text")
    setRangeMin(parameter?.rangeMin?.toString() ?? "")
    setRangeMax(parameter?.rangeMax?.toString() ?? "")
    setRangeUnit(parameter?.rangeUnit ?? "")
    setValidationRule(parameter?.validationRule ?? "")
    setRequiredByDefault(parameter?.requiredByDefault ?? false)
    setFilterable(parameter?.filterable ?? true)
    setReportingVisibility(parameter?.reportingVisibility ?? true)
    setDashboardVisibility(parameter?.dashboardVisibility ?? false)
    setMappingSupport(parameter?.mappingSupport ?? mappingSupportFor("text").enabled)
    setChannelIds(parameter?.channelIds ?? [])
    setErrors({})
    setFormError(null)
  }, [open, parameter])

  // BR-27 — the data type dictates mapping capability; re-derive whenever the type changes.
  const mappingRule = useMemo(() => mappingSupportFor(dataType), [dataType])
  useEffect(() => {
    if (!mappingRule.changeable) setMappingSupport(mappingRule.enabled)
  }, [mappingRule])

  function handleNameEnChange(value: string) {
    setNameEn(value)
    // AC-S6-02 — auto-suggest until the user takes over, and never on a locked field (BR-11).
    if (!apiFieldTouched && !parameter?.apiFieldLocked) setApiField(suggestApiField(value))
  }

  function validate(): boolean {
    const next: Partial<Record<ParameterFieldKey, string>> = {}
    if (!nameEn.trim()) next.nameEn = t("integrationHub.parameterDrawer.errors.nameEnRequired")
    if (!nameAr.trim()) next.nameAr = t("integrationHub.parameterDrawer.errors.nameArRequired")
    if (!apiField.trim()) next.apiField = t("integrationHub.parameterDrawer.errors.apiFieldRequired")
    else if (!/^[a-z][a-z0-9_]*$/.test(apiField))
      next.apiField = t("integrationHub.parameterDrawer.errors.apiFieldFormat")

    if (dataType === "range") {
      // VR-F07 — both bounds required, Min strictly less than Max.
      const min = Number(rangeMin)
      const max = Number(rangeMax)
      if (rangeMin.trim() === "") next.rangeMin = t("integrationHub.parameterDrawer.errors.rangeMinRequired")
      else if (rangeMax.trim() === "")
        next.rangeMax = t("integrationHub.parameterDrawer.errors.rangeMaxRequired")
      else if (Number.isNaN(min) || Number.isNaN(max) || min >= max)
        next.rangeMin = t("integrationHub.parameterDrawer.errors.rangeMinMax")
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return

    try {
      await onSave(
        {
          nameEn: nameEn.trim(),
          nameAr: nameAr.trim(),
          apiField: apiField.trim(),
          dataType,
          rangeMin: dataType === "range" ? Number(rangeMin) : undefined,
          rangeMax: dataType === "range" ? Number(rangeMax) : undefined,
          rangeUnit: dataType === "range" && rangeUnit.trim() ? rangeUnit.trim() : undefined,
          validationRule: validationRule.trim() || undefined,
          requiredByDefault,
          filterable,
          reportingVisibility,
          dashboardVisibility,
          mappingSupport,
          channelIds,
        },
        parameter?.id,
      )
    } catch (error) {
      if (!(error instanceof IntegrationHubApiError)) {
        setFormError(t("integrationHub.parameterDrawer.errors.unexpected"))
        return
      }
      const next: Partial<Record<ParameterFieldKey, string>> = {}
      const codes: string[] = error.details?.length
        ? error.details.map((d) => d.code)
        : [error.code]
      for (const code of codes) {
        const field = parameterFieldForCode(code)
        if (field) {
          next[field] = t(`integrationHub.parameterDrawer.serverErrors.${code}`, {
            defaultValue: error.message,
          })
        }
      }
      setErrors(next)
      if (Object.keys(next).length === 0) setFormError(error.message)
    }
  }

  function toggleChannel(channelId: string) {
    setChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId],
    )
  }

  const flags: {
    key: string
    checked: boolean
    set: (v: boolean) => void
    disabled?: boolean
    testId: string
    spanFull?: boolean
  }[] = [
    { key: "requiredByDefault", checked: requiredByDefault, set: setRequiredByDefault, testId: "flag-required" },
    { key: "filterable", checked: filterable, set: setFilterable, testId: "flag-filterable" },
    { key: "reportingVisibility", checked: reportingVisibility, set: setReportingVisibility, testId: "flag-reporting" },
    { key: "dashboardVisibility", checked: dashboardVisibility, set: setDashboardVisibility, testId: "flag-dashboard" },
    {
      key: "mappingSupport",
      checked: mappingSupport,
      set: setMappingSupport,
      // BR-27 — only Text/Boolean/URL may be toggled; List is forced on, everything else off.
      disabled: !mappingRule.changeable,
      testId: "flag-mapping",
      spanFull: true,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg"
        data-testid="parameter-drawer"
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>
              {isEdit
                ? t("integrationHub.parameterDrawer.editTitle")
                : t("integrationHub.parameterDrawer.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {t("integrationHub.parameterDrawer.subtitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-4">
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {isBuiltIn && (
              <Alert data-testid="builtin-notice">
                <AlertDescription className="text-xs leading-relaxed">
                  {t("integrationHub.parameterDrawer.builtInNotice")}
                </AlertDescription>
              </Alert>
            )}

            {/* Names side by side (prototype layout) — they are peers, and pairing them keeps the
                three full-width identity fields below from reading as one long column. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="param-name-en">
                  {t("integrationHub.parameterDrawer.nameEn")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="param-name-en"
                  value={nameEn}
                  maxLength={50}
                  dir="ltr"
                  className="text-xs md:text-xs"
                  placeholder={t("integrationHub.parameterDrawer.nameEnPlaceholder")}
                  aria-invalid={errors.nameEn ? true : undefined}
                  onChange={(e) => handleNameEnChange(e.target.value)}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("integrationHub.parameterDrawer.nameEnHelp")}
                </p>
                {errors.nameEn && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.nameEn}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="param-name-ar">
                  {t("integrationHub.parameterDrawer.nameAr")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="param-name-ar"
                  value={nameAr}
                  maxLength={50}
                  dir="rtl"
                  lang="ar"
                  className="text-xs md:text-xs"
                  placeholder={t("integrationHub.parameterDrawer.nameArPlaceholder")}
                  aria-invalid={errors.nameAr ? true : undefined}
                  onChange={(e) => setNameAr(e.target.value)}
                />
                {errors.nameAr && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.nameAr}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="param-api-field">
                {t("integrationHub.parameterDrawer.apiField")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="param-api-field"
                value={apiField}
                dir="ltr"
                // BR-09/BR-11 — permanently read-only for built-ins, and for any parameter whose
                // first request has already been received.
                readOnly={isBuiltIn || (parameter?.apiFieldLocked ?? false)}
                className={cn(
                  "font-mono text-xs md:text-xs",
                  (isBuiltIn || parameter?.apiFieldLocked) && "bg-muted text-muted-foreground",
                )}
                placeholder={t("integrationHub.parameterDrawer.apiFieldPlaceholder")}
                aria-invalid={errors.apiField ? true : undefined}
                data-testid="param-api-field"
                onChange={(e) => {
                  setApiFieldTouched(true)
                  setApiField(e.target.value)
                }}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isBuiltIn || parameter?.apiFieldLocked
                  ? t("integrationHub.parameterDrawer.apiFieldLocked")
                  : t("integrationHub.parameterDrawer.apiFieldHelp")}
              </p>
              {errors.apiField && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.apiField}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="param-type">
                {t("integrationHub.parameterDrawer.dataType")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={dataType}
                // [PO-G27] — a built-in's data type is read-only.
                disabled={isBuiltIn}
                onValueChange={(v) => setDataType((v ?? "text") as DataType)}
              >
                <SelectTrigger id="param-type" className="w-full" data-testid="param-type">
                  <SelectValue>{t(`integrationHub.dataTypes.${dataType}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Exactly the 13 ratified types — never Duration or Identifier ([PO-G17]). */}
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type} value={type} data-testid={`type-option-${type}`}>
                      {t(`integrationHub.dataTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* The read-only caveat is bolded because it is the one clause that changes what the
                  control DOES; the rest is orientation. */}
              <p className="text-xs leading-relaxed text-muted-foreground">
                <Trans
                  i18nKey="integrationHub.parameterDrawer.dataTypeHelp"
                  components={{ b: <span className="font-semibold text-foreground" /> }}
                />
              </p>
              {errors.dataType && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.dataType}
                </p>
              )}
            </div>

            {/* AC-S6-01 — the Range card and the List panel are mutually exclusive. */}
            {dataType === "range" && (
              <div className="space-y-3 rounded-md border border-border p-4" data-testid="range-card">
                <h3 className={SECTION_LABEL}>{t("integrationHub.parameterDrawer.rangeTitle")}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="param-range-min">
                      {t("integrationHub.parameterDrawer.rangeMin")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="param-range-min"
                      type="number"
                      value={rangeMin}
                      className="text-xs md:text-xs"
                      data-testid="param-range-min"
                      aria-invalid={errors.rangeMin ? true : undefined}
                      onChange={(e) => setRangeMin(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="param-range-max">
                      {t("integrationHub.parameterDrawer.rangeMax")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="param-range-max"
                      type="number"
                      value={rangeMax}
                      className="text-xs md:text-xs"
                      data-testid="param-range-max"
                      aria-invalid={errors.rangeMax ? true : undefined}
                      onChange={(e) => setRangeMax(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="param-range-unit">
                      {t("integrationHub.parameterDrawer.rangeUnit")}
                    </Label>
                    <Input
                      id="param-range-unit"
                      value={rangeUnit}
                      className="text-xs md:text-xs"
                      placeholder={t("integrationHub.parameterDrawer.rangeUnitPlaceholder")}
                      onChange={(e) => setRangeUnit(e.target.value)}
                    />
                  </div>
                </div>
                {(errors.rangeMin || errors.rangeMax) && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.rangeMin ?? errors.rangeMax}
                  </p>
                )}
              </div>
            )}

            {dataType === "list" && (
              <Alert data-testid="list-panel">
                <AlertDescription className="text-xs leading-relaxed">
                  {t("integrationHub.parameterDrawer.listPanel")}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="param-validation-rule">
                {t("integrationHub.parameterDrawer.validationRule")}
              </Label>
              <Input
                id="param-validation-rule"
                value={validationRule}
                dir="ltr"
                className="font-mono text-xs md:text-xs"
                placeholder={t("integrationHub.parameterDrawer.validationRulePlaceholder")}
                onChange={(e) => setValidationRule(e.target.value)}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("integrationHub.parameterDrawer.validationRuleHelp")}
              </p>
            </div>

            {/* Five usage flags — Searchable was removed ([PO-G26]). Two columns under a ruled
                section label, rather than a bordered card: the rule groups them without adding a
                second box inside an already-boxed sheet. */}
            <SectionHeading>{t("integrationHub.parameterDrawer.flagsTitle")}</SectionHeading>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {flags.map((flag) => (
                <div
                  key={flag.key}
                  className={cn("flex items-start gap-3", flag.spanFull && "sm:col-span-2")}
                >
                  <Switch
                    id={`param-${flag.key}`}
                    checked={flag.checked}
                    disabled={flag.disabled}
                    className="mt-0.5 shrink-0"
                    data-testid={flag.testId}
                    onCheckedChange={(checked) => flag.set(checked === true)}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Label htmlFor={`param-${flag.key}`} className="font-semibold">
                      {t(`integrationHub.parameterDrawer.flags.${flag.key}.label`)}
                    </Label>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(`integrationHub.parameterDrawer.flags.${flag.key}.help`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Channel assignment — adds the parameter as *supported* (FR-S6-05). */}
            <SectionHeading>{t("integrationHub.parameterDrawer.channelsTitle")}</SectionHeading>
            {channels.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("integrationHub.parameterDrawer.noChannels")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {channels.map((channel) => {
                  const selected = channelIds.includes(channel.id)
                  return (
                    // A real checkbox in a chip, not a toggle-button Badge: the control is a
                    // multi-select, and a checkbox says so to both the eye and the a11y tree.
                    <label
                      key={channel.id}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        selected
                          ? "border-nb-cyan-300 bg-nb-cyan-100 text-nb-cyan-900 dark:border-nb-cyan-700 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        data-testid={`channel-pill-${channel.channelId}`}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                      <bdi dir="ltr">{channel.nameEn}</bdi>
                    </label>
                  )
                })}
              </div>
            )}
            {/* Help sits AFTER the chips (prototype): it explains the consequence of a choice you
                have just made, so it reads as a footnote rather than a preamble. */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              <Trans
                i18nKey="integrationHub.parameterDrawer.channelsHelp"
                components={{ b: <span className="font-semibold text-foreground" /> }}
              />
            </p>
          </div>

          <SheetFooter className="shrink-0 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving} data-testid="param-save">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isEdit
                ? t("integrationHub.parameterDrawer.save")
                : t("integrationHub.parameterDrawer.create")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Read-only yes/no glyph for the SCR-05 flag columns (FR-S5-02: check / dash).
 *
 * Lucide icons, **not** the literal `"✓"` / `"—"` characters this used to render: text glyphs
 * come from whatever font falls back, so they arrived hairline-thin, vertically off-centre, and
 * inconsistent between the Latin and Arabic font stacks.
 *
 * The "on" tick is **brand cyan, deliberately not semantic green.** A capability flag
 * ("filterable: yes") is not a health state, and the Two-Palette Rule reserves green for KPI
 * status — spending it here would weaken it where it actually means "good". Shape carries the
 * meaning too (tick vs dash), so the columns stay readable without relying on colour.
 */
export function FlagGlyph({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={`${label}: ${on ? "yes" : "no"}`}
      title={label}
      className="inline-flex"
    >
      {on ? (
        <Check className="size-4 text-nb-cyan-700 dark:text-nb-cyan-300" strokeWidth={3} />
      ) : (
        <Minus className="size-4 text-muted-foreground/40" strokeWidth={2.5} />
      )}
    </span>
  )
}
