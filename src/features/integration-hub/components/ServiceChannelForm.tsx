// SCR-04 Service Channel Create/Edit (T037, US1).
//
// Four behaviours the acceptance criteria pin down, all implemented here:
//   AC-S4-01  channel ID sanitises live as typed and caps at 19 chars (VR-F04)
//   AC-S4-02  the ID field is read-only once the channel has served its first 2xx request (BR-05)
//   AC-S4-03  Required is enabled only while Supported is on; clearing Supported clears Required
//             (FR-S4-04), and the live contract-summary alert's counts follow
//   VR-F02/F04 duplicate EN name / channel ID are blocked with an inline error
//
// Server errors arrive as an API-05 envelope whose `details` carry one entry per accumulated
// failure, so every inline message can be attached to its own field in one pass rather than
// surfacing only the first.

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Trans, useTranslation } from "react-i18next"
import { Info, Loader2, Plus, Save, Search } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  CHANNEL_ID_MAX_LENGTH,
  IntegrationHubApiError,
  channelFieldForCode,
  sanitizeChannelId,
  type Parameter,
  type ServiceChannel,
  type ServiceChannelSaveInput,
} from "@/features/integration-hub/api"

/** Design-system UI Label: small-caps, tracked, muted — the table-header treatment. */
const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

type FieldKey = "nameEn" | "nameAr" | "channelId"

export interface ServiceChannelFormProps {
  /** Absent in create mode; the pre-filled channel (with its contract) in edit mode. */
  channel?: ServiceChannel
  /** The enabled parameter catalogue — SCR-04 lists only active parameters. */
  parameters: Parameter[]
  saving: boolean
  /** Rejects with `IntegrationHubApiError` so this component can map codes onto fields. */
  onSave: (input: ServiceChannelSaveInput) => Promise<void>
}

interface ContractState {
  supported: boolean
  required: boolean
}

export function ServiceChannelForm({
  channel,
  parameters,
  saving,
  onSave,
}: ServiceChannelFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = channel != null

  const [nameEn, setNameEn] = useState(channel?.nameEn ?? "")
  const [nameAr, setNameAr] = useState(channel?.nameAr ?? "")
  const [channelId, setChannelId] = useState(channel?.channelId ?? "")
  const [description, setDescription] = useState(channel?.description ?? "")
  const [active, setActive] = useState(channel?.active ?? true)
  const [filter, setFilter] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Contract state keyed by parameter id, seeded from the channel's existing contract.
  const [contract, setContract] = useState<Record<string, ContractState>>(() => {
    const seed: Record<string, ContractState> = {}
    for (const row of channel?.contract ?? []) {
      seed[row.parameterId] = { supported: row.supported, required: row.required }
    }
    return seed
  })

  // BR-05: the ID is permanently locked once the channel has served a 2xx request.
  const idLocked = channel?.channelIdLocked ?? false

  const nameEnRef = useRef<HTMLInputElement>(null)
  const nameArRef = useRef<HTMLInputElement>(null)
  const channelIdRef = useRef<HTMLInputElement>(null)
  const refs: Record<FieldKey, React.RefObject<HTMLInputElement | null>> = useMemo(
    () => ({ nameEn: nameEnRef, nameAr: nameArRef, channelId: channelIdRef }),
    [],
  )

  // Auto-focus the first invalid field on submit failure (design system: Forms).
  useEffect(() => {
    const first = (["nameEn", "nameAr", "channelId"] as FieldKey[]).find((key) => errors[key])
    if (first) refs[first].current?.focus()
  }, [errors, refs])

  const supportedCount = useMemo(
    () => Object.values(contract).filter((row) => row.supported).length,
    [contract],
  )
  const requiredCount = useMemo(
    () => Object.values(contract).filter((row) => row.supported && row.required).length,
    [contract],
  )

  const visibleParameters = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return parameters
    return parameters.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.toLowerCase().includes(q) ||
        p.apiField.toLowerCase().includes(q),
    )
  }, [parameters, filter])

  function setSupported(parameterId: string, supported: boolean) {
    setContract((prev) => ({
      ...prev,
      // FR-S4-04: clearing Supported force-clears Required in the same update.
      [parameterId]: { supported, required: supported ? (prev[parameterId]?.required ?? false) : false },
    }))
  }

  function setRequired(parameterId: string, required: boolean) {
    setContract((prev) => {
      const row = prev[parameterId]
      if (!row?.supported) return prev // Required is only meaningful while Supported is on.
      return { ...prev, [parameterId]: { supported: true, required } }
    })
  }

  /** Client-side pre-validation (VR-F02/F03/F04). The server re-validates all of it. */
  function validate(): boolean {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!nameEn.trim()) next.nameEn = t("integrationHub.channelForm.errors.nameEnRequired")
    else if (nameEn.length > 50) next.nameEn = t("integrationHub.channelForm.errors.nameEnTooLong")
    if (!nameAr.trim()) next.nameAr = t("integrationHub.channelForm.errors.nameArRequired")
    if (!channelId.trim()) next.channelId = t("integrationHub.channelForm.errors.channelIdRequired")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return

    try {
      await onSave({
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        channelId,
        description: description.trim() || undefined,
        active,
        contract: Object.entries(contract)
          .filter(([, row]) => row.supported)
          .map(([parameterId, row]) => ({
            parameterId,
            supported: true,
            required: row.required,
          })),
      })
    } catch (error) {
      if (!(error instanceof IntegrationHubApiError)) {
        setFormError(t("integrationHub.channelForm.errors.unexpected"))
        return
      }
      // API-05 `details` carries every accumulated failure; attach each to its own field.
      const next: Partial<Record<FieldKey, string>> = {}
      const codes: string[] = error.details?.length
        ? error.details.map((d) => d.code)
        : [error.code]
      for (const code of codes) {
        const field = channelFieldForCode(code)
        if (field) {
          next[field] = t(`integrationHub.channelForm.serverErrors.${code}`, {
            defaultValue: error.message,
          })
        }
      }
      setErrors(next)
      if (Object.keys(next).length === 0) setFormError(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {isEdit
              ? t("integrationHub.channelForm.editTitle")
              : t("integrationHub.channelForm.createTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("integrationHub.channelForm.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/integration-hub/service-channels")}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={saving} data-testid="channel-save">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit
              ? t("integrationHub.channelForm.save")
              : t("integrationHub.channelForm.create")}
          </Button>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Two columns, matching the ratified prototype: identity + the live summary on the start
          side, the contract table on the end side. The summary sits beside the toggles that move
          it, so a change and its consequence are visible together without scrolling. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          {/* Identity — FR-S4-01. No section header: the page title already says what this is,
              and the prototype's baseline drops it. */}
          <Card>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="channel-name-en">
                  {t("integrationHub.channelForm.nameEn")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="channel-name-en"
                  ref={nameEnRef}
                  value={nameEn}
                  maxLength={50}
                  dir="ltr"
                  className="text-xs md:text-xs"
                  placeholder={t("integrationHub.channelForm.nameEnPlaceholder")}
                  aria-invalid={errors.nameEn ? true : undefined}
                  onChange={(e) => setNameEn(e.target.value)}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("integrationHub.channelForm.nameEnHelp")}
                </p>
                {errors.nameEn && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.nameEn}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="channel-name-ar">
                  {t("integrationHub.channelForm.nameAr")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="channel-name-ar"
                  ref={nameArRef}
                  value={nameAr}
                  maxLength={50}
                  dir="rtl"
                  lang="ar"
                  className="text-xs md:text-xs"
                  placeholder={t("integrationHub.channelForm.nameArPlaceholder")}
                  aria-invalid={errors.nameAr ? true : undefined}
                  onChange={(e) => setNameAr(e.target.value)}
                />
                {errors.nameAr && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.nameAr}
                  </p>
                )}
              </div>

              {/* Full width below the names — the ID's help text is long enough that a half-width
                  column wraps it to four lines. */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="channel-id">
                  {t("integrationHub.channelForm.channelId")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="channel-id"
                  ref={channelIdRef}
                  value={channelId}
                  dir="ltr"
                  readOnly={idLocked}
                  maxLength={CHANNEL_ID_MAX_LENGTH}
                  className={cn(
                    "font-mono text-xs md:text-xs",
                    idLocked && "bg-muted text-muted-foreground",
                  )}
                  placeholder={t("integrationHub.channelForm.channelIdPlaceholder")}
                  aria-invalid={errors.channelId ? true : undefined}
                  data-testid="channel-id-input"
                  // AC-S4-01 — strip disallowed characters live and cap at 19.
                  onChange={(e) => setChannelId(sanitizeChannelId(e.target.value))}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {idLocked
                    ? t("integrationHub.channelForm.channelIdLocked")
                    : t("integrationHub.channelForm.channelIdHelp")}
                </p>
                {errors.channelId && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.channelId}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="channel-description">
                  {t("integrationHub.channelForm.description")}
                </Label>
                <Textarea
                  id="channel-description"
                  value={description}
                  rows={3}
                  className="text-xs md:text-xs"
                  placeholder={t("integrationHub.channelForm.descriptionPlaceholder")}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <Switch
                  id="channel-active"
                  checked={active}
                  data-testid="channel-active"
                  onCheckedChange={(checked) => setActive(checked === true)}
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="channel-active">{t("integrationHub.channelForm.active")}</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("integrationHub.channelForm.activeHelp")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live contract summary — FR-S4-03. An info-tinted banner rather than a bare bordered
              strip: it reports a consequence (E-1002 rejections), so it should read as guidance. */}
          <div
            className="flex items-start gap-3 rounded-md border border-nb-cyan-200 bg-nb-cyan-100/60 p-4 dark:border-nb-cyan-800 dark:bg-nb-cyan-900/25"
            data-testid="contract-summary"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-nb-cyan-800 dark:text-nb-cyan-200" />
            <p className="text-xs leading-relaxed text-foreground">
              <span className="font-semibold">
                {t("integrationHub.channelForm.contractSummaryLabel")}
              </span>{" "}
              {t("integrationHub.channelForm.contractSummary", {
                supported: supportedCount,
                required: requiredCount,
              })}
            </p>
          </div>
        </div>

        {/* Parameter contract — FR-S4-04 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("integrationHub.channelForm.contractTitle")}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              <Trans
                i18nKey="integrationHub.channelForm.contractDescription"
                components={{
                  s: <span className="font-semibold text-foreground" />,
                  r: <span className="font-medium text-foreground" />,
                }}
              />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search-affordance filter: the magnifier carries the meaning, so the label is
                screen-reader-only (the accessible name is still present). */}
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contract-filter"
                className="ps-9 text-xs md:text-xs"
                value={filter}
                aria-label={t("integrationHub.channelForm.filterLabel")}
                placeholder={t("integrationHub.channelForm.filterPlaceholder")}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className={cn(TH, "w-[40%]")}>
                      {t("integrationHub.channelForm.colParameter")}
                    </TableHead>
                    <TableHead className={cn(TH, "w-[24%]")}>
                      {t("integrationHub.channelForm.colType")}
                    </TableHead>
                    <TableHead className={cn(TH, "w-[18%]")}>
                      {t("integrationHub.channelForm.colSupported")}
                    </TableHead>
                    <TableHead className={cn(TH, "w-[18%]")}>
                      {t("integrationHub.channelForm.colRequired")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleParameters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        {t("integrationHub.channelForm.noParameters")}
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleParameters.map((parameter) => {
                    const row = contract[parameter.id] ?? { supported: false, required: false }
                    return (
                      <TableRow key={parameter.id} className="hover:bg-muted/50">
                        <TableCell>
                          {/* Name over the API field it maps to. The API field is what the
                              integrator actually puts in a payload, so it belongs next to the
                              name — the Arabic name that used to sit here duplicated the primary
                              and pushed the useful identifier into its own column. */}
                          <div className="flex min-w-0 flex-col items-start gap-0.5">
                            <bdi dir="ltr" className="max-w-full truncate font-medium">
                              {parameter.nameEn}
                            </bdi>
                            <code
                              dir="ltr"
                              className="max-w-full truncate font-mono text-xs text-muted-foreground"
                            >
                              {parameter.apiField}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t(`integrationHub.dataTypes.${parameter.dataType}`)}
                        </TableCell>
                        <TableCell>
                          {/* A toggle, not a checkbox: Supported turns a capability on/off for
                              this channel, and it gates Required beside it. Required stays a
                              checkbox — it qualifies the row rather than switching it on. */}
                          <Switch
                            checked={row.supported}
                            aria-label={t("integrationHub.channelForm.supportedFor", {
                              name: parameter.nameEn,
                            })}
                            data-testid={`supported-${parameter.apiField}`}
                            onCheckedChange={(checked) =>
                              setSupported(parameter.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={row.supported && row.required}
                            // AC-S4-03 — Required is disabled while Supported is off.
                            disabled={!row.supported}
                            aria-label={t("integrationHub.channelForm.requiredFor", {
                              name: parameter.nameEn,
                            })}
                            data-testid={`required-${parameter.apiField}`}
                            onCheckedChange={(checked) =>
                              setRequired(parameter.id, checked === true)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </form>
  )
}

/** Small helper used by the list page's empty state so both entry points share one label. */
export function NewChannelButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button onClick={onClick} data-testid="new-channel">
      <Plus className="size-4" />
      {t("integrationHub.channels.newChannel")}
    </Button>
  )
}
