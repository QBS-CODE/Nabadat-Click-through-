// SCR-02 New/Edit Integration — the 3-step wizard (T085, US3).
//
// Step 1 basics + scenario · Step 2 authentication · Step 3 endpoint + contract + result codes.
// Acceptance criteria implemented here:
//   AC-S2-01  the mechanism radio swaps the API-key / OAuth field sets dynamically (FR-S2-04)
//   AC-S2-04  changing the channel re-renders BOTH the endpoint preview and the accepted-
//             parameters table on step 3 (FR-S2-07/08) — both come from the server
//   BR-02     exactly one scenario, chosen once; immutable in edit mode
//   BR-25     a credential generated mid-wizard is discarded with the draft on Cancel
//   FR-S2-02  only ACTIVE channels are selectable
//   FR-S2-10  Allowed origins (SCN-04) / link-expiry override (SCN-02) appear per scenario
//
// Create mode posts everything in one request at the end, so there is no server round-trip until
// "Create integration" — which is exactly what makes BR-25 trivially true: nothing was persisted.

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Trans, useTranslation } from "react-i18next"
import {
  Check,
  Code2,
  Copy,
  KeyRound,
  ShieldCheck,
  Loader2,
  Plus,
  Frame,
  Inbox,
  Link2,
  Send,
  type LucideIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { WizardStepper } from "@/components/ui/wizard-stepper"
import { cn } from "@/lib/utils"
import {
  IntegrationHubApiError,
  SCENARIOS,
  getServiceChannel,
  SCOPE_BY_SCENARIO,
  integrationFieldForCode,
  type CredentialInput,
  type Integration,
  type IntegrationCreateInput,
  type IntegrationFieldKey,
  type IntegrationUpdateInput,
  type OAuthScope,
  type Scenario,
  type ServiceChannel,
} from "@/features/integration-hub/api"

const ALL_SCOPES: OAuthScope[] = [
  "survey-requests:write",
  "survey-links:read",
  "survey-definitions:read",
  "survey-embed:read",
  "responses:write",
]

/** One icon per scenario — mirrors SCR-01's table so the same concept looks the same everywhere. */
const SCENARIO_ICON: Record<string, LucideIcon> = {
  dispatch: Send,
  redirect_link: Link2,
  json_render: Code2,
  iframe_embed: Frame,
  response_ingestion: Inbox,
}

/**
 * Ruled small-caps section heading with an optional lead-in line (reference layout).
 *
 * Used instead of nesting another `<Card>` inside the step: a card-in-card adds a second box for
 * no information, while the rule groups the block and keeps the step visually flat.
 */
/** A typed placeholder per data type — a shape example, never pretend real data. */
function sampleValue(dataType: string): string {
  switch (dataType) {
    case "number":
    case "range":
      return "12"
    case "boolean":
      return "true"
    case "phone":
      return '"+962790000312"'
    case "email":
      return '"caller@example.com"'
    case "url":
      return '"https://example.gov/case/771204"'
    case "date":
      return '"2026-08-03"'
    case "date_time":
      return '"2026-08-03T10:15:00Z"'
    case "list":
      return '"S002"'
    default:
      return '"TX-2026-771204"'
  }
}

/**
 * The request body as a one-line JSON object of the channel contract's REQUIRED fields. Optional
 * fields are omitted deliberately: this is the MINIMUM a caller must send, and listing everything
 * would obscure that.
 */
function bodyExample(rows: { apiField: string; dataType: string; required: boolean }[]): string {
  const required = rows.filter((r) => r.required)
  if (required.length === 0) return "{ }"
  return `{ ${required.map((r) => `"${r.apiField}": ${sampleValue(r.dataType)}`).join(", ")} }`
}

const WIZ_TH = "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground"

function WizardSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-3">
        <h2 className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      {children && (
        <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  )
}

export interface IntegrationWizardProps {
  /** Undefined ⇒ create mode. */
  integration?: Integration
  channels: ServiceChannel[]
  saving: boolean
  onCreate: (input: IntegrationCreateInput) => Promise<void>
  onUpdate: (input: IntegrationUpdateInput) => Promise<void>
  /** Step-2 slot for the edit-mode revoke/regenerate controls (US8/T196). */
  credentialSlot?: React.ReactNode
}

export function IntegrationWizard({
  integration,
  channels,
  saving,
  onCreate,
  onUpdate,
  credentialSlot,
}: IntegrationWizardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = integration != null

  const [step, setStep] = useState(1)
  const [name, setName] = useState(integration?.name ?? "")
  const [description, setDescription] = useState(integration?.description ?? "")
  // FR-S2-02 default: the first active channel.
  const [serviceChannelId, setServiceChannelId] = useState(
    integration?.serviceChannelId ?? channels[0]?.id ?? "",
  )
  // BR-02: no default selection in create mode — the user must choose exactly one.
  const [scenario, setScenario] = useState<Scenario | "">(integration?.scenario ?? "")
  const [mechanism, setMechanism] = useState<"api_key" | "oauth_client">(
    integration?.credential?.mechanism ?? "api_key",
  )
  // Seed from the existing credential in edit mode so step 2 shows the truth rather than
  // create-mode defaults. `labelOrClientName` is one column discriminated by `mechanism`.
  const [keyLabel, setKeyLabel] = useState(
    integration?.credential?.mechanism === "api_key"
      ? integration.credential.labelOrClientName
      : "",
  )
  const [clientName, setClientName] = useState(
    integration?.credential?.mechanism === "oauth_client"
      ? integration.credential.labelOrClientName
      : "",
  )
  const [scopes, setScopes] = useState<OAuthScope[]>(
    integration?.credential?.scopes?.length
      ? integration.credential.scopes
      : ["survey-requests:write"],
  )
  // True once the user has hand-picked scopes — stops the scenario default from overwriting them.
  const [scopesTouched, setScopesTouched] = useState(false)
  const [allowedOrigins, setAllowedOrigins] = useState(
    (integration?.allowedOrigins ?? []).join("\n"),
  )
  const [linkExpiry, setLinkExpiry] = useState(
    integration?.linkExpiryOverrideHours?.toString() ?? "",
  )
  const [errors, setErrors] = useState<Partial<Record<IntegrationFieldKey, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Pre-select the scope matching the chosen scenario, so the common case needs no thought.
  //
  // This must NOT clobber a hand-picked selection: without the `scopesTouched` guard it re-ran on
  // every scenario change, so stepping back to step 1 and picking a different scenario silently
  // wiped the user's scopes. Once they touch the list, it is theirs.
  useEffect(() => {
    if (scenario && !isEdit && !scopesTouched) setScopes([SCOPE_BY_SCENARIO[scenario]])
  }, [scenario, isEdit, scopesTouched])

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === serviceChannelId),
    [channels, serviceChannelId],
  )

  // AC-S2-04 — step 3's accepted-parameters table is the SELECTED channel's contract, and list
  // rows carry no contract (only `GET /service-channels/{id}` does). Fetch the detail whenever the
  // selection changes so switching channels re-renders the table, in create mode too.
  const [channelDetail, setChannelDetail] = useState<ServiceChannel | undefined>(undefined)
  // Latches after a successful copy so the button can confirm it worked.
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!serviceChannelId) {
      setChannelDetail(undefined)
      return
    }
    let cancelled = false
    void getServiceChannel(serviceChannelId)
      .then((detail) => {
        if (!cancelled) setChannelDetail(detail)
      })
      .catch(() => {
        // A contract we can't load just renders an empty table — never blocks the wizard.
        if (!cancelled) setChannelDetail(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [serviceChannelId])

  function toggleScope(scope: OAuthScope) {
    setScopesTouched(true)
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }

  function validateStep1(): boolean {
    const next: Partial<Record<IntegrationFieldKey, string>> = {}
    if (!name.trim()) next.name = t("integrationHub.wizard.errors.nameRequired")
    else if (name.length > 120) next.name = t("integrationHub.wizard.errors.nameTooLong")
    if (!serviceChannelId) next.serviceChannelId = t("integrationHub.wizard.errors.channelRequired")
    if (!scenario) next.scenario = t("integrationHub.wizard.errors.scenarioRequired")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function validateStep2(): boolean {
    if (isEdit) return true // credentials are managed by their own controls in edit mode (US8).
    const next: Partial<Record<IntegrationFieldKey, string>> = {}
    if (mechanism === "api_key") {
      if (!keyLabel.trim()) next.keyLabel = t("integrationHub.wizard.errors.keyLabelRequired")
    } else {
      if (!clientName.trim()) next.clientName = t("integrationHub.wizard.errors.clientNameRequired")
      if (scopes.length === 0) next.scopes = t("integrationHub.wizard.errors.scopesRequired")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goNext() {
    setFormError(null)
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((s) => Math.min(3, s + 1))
  }

  function parsedOrigins(): string[] {
    return allowedOrigins
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter(Boolean)
  }

  function credentialInput(): CredentialInput {
    return mechanism === "api_key"
      ? { mechanism: "api_key", keyLabel: keyLabel.trim() }
      : { mechanism: "oauth_client", clientName: clientName.trim(), scopes }
  }

  function applyServerErrors(error: unknown) {
    if (!(error instanceof IntegrationHubApiError)) {
      setFormError(t("integrationHub.wizard.errors.unexpected"))
      return
    }
    const next: Partial<Record<IntegrationFieldKey, string>> = {}
    const codes: string[] = error.details?.length ? error.details.map((d) => d.code) : [error.code]
    for (const code of codes) {
      const field = integrationFieldForCode(code)
      if (field) {
        next[field] = t(`integrationHub.wizard.serverErrors.${code}`, {
          defaultValue: error.message,
        })
      }
    }
    setErrors(next)
    if (Object.keys(next).length === 0) setFormError(error.message)
    // Send the user back to the step that owns the failing field.
    if (next.name || next.serviceChannelId || next.scenario) setStep(1)
    else if (next.keyLabel || next.clientName || next.scopes) setStep(2)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!validateStep1() || !validateStep2()) return

    try {
      if (isEdit) {
        await onUpdate({
          name: name.trim(),
          description: description.trim() || undefined,
          serviceChannelId,
          // BR-02 — sent unchanged; the server 409s on an actual change.
          scenario: integration.scenario,
          allowedOrigins: scenario === "iframe_embed" ? parsedOrigins() : undefined,
          linkExpiryOverrideHours:
            scenario === "redirect_link" && linkExpiry.trim() ? Number(linkExpiry) : undefined,
        })
      } else {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          serviceChannelId,
          scenario: scenario as Scenario,
          allowedOrigins: scenario === "iframe_embed" ? parsedOrigins() : undefined,
          linkExpiryOverrideHours:
            scenario === "redirect_link" && linkExpiry.trim() ? Number(linkExpiry) : undefined,
          credential: credentialInput(),
        })
      }
    } catch (error) {
      applyServerErrors(error)
    }
  }

  const steps = [1, 2, 3]

  return (
    <div className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {isEdit ? t("integrationHub.wizard.editTitle") : t("integrationHub.wizard.createTitle")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.wizard.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          data-testid="wizard-cancel"
          // BR-25 — nothing was persisted in create mode, so leaving discards the draft and any
          // credential generated with it.
          onClick={() => navigate("/integration-hub/integrations")}
        >
          {t("common.cancel")}
        </Button>
      </div>

      {/* Step indicator (FR-S2-01) — the app's shared wizard bar, not a local one.
          Steps carry NO onClick: this wizard gates forward movement on per-step validation, and
          the stepper deliberately never invents its own gating. */}
      <WizardStepper
        testId="wizard-steps"
        ariaLabel={t("integrationHub.wizard.stepsAria")}
        steps={steps.map((s) => ({
          label: t(`integrationHub.wizard.step${s}Title`),
          state: step === s ? "active" : step > s ? "done" : "todo",
          testId: `step-indicator-${s}`,
        }))}
      />

      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* ── Step 1 — basics + scenario ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5" data-testid="wizard-step-1">
          {/* No card header: the page title already says what this is, and the reference drops it
              so the first field is the first thing you meet. */}
          <Card>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="integration-name">
                  {t("integrationHub.wizard.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="integration-name"
                  value={name}
                  maxLength={120}
                  placeholder={t("integrationHub.wizard.namePlaceholder")}
                  aria-invalid={errors.name ? true : undefined}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {t("integrationHub.wizard.nameHelp")}
                </p>
                {errors.name && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="integration-channel">
                  {t("integrationHub.wizard.channel")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={serviceChannelId}
                  onValueChange={(v) => setServiceChannelId(v ?? "")}
                >
                  <SelectTrigger
                    id="integration-channel"
                    className="w-full"
                    data-testid="channel-select"
                  >
                    <SelectValue placeholder={t("integrationHub.wizard.channelPlaceholder")}>
                      {selectedChannel
                        ? `${selectedChannel.nameEn} — ${selectedChannel.channelId}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* FR-S2-02 / BR-07 — only active channels are offered. */}
                    {channels.map((channel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id}
                        data-testid={`channel-option-${channel.channelId}`}
                      >
                        {channel.nameEn} — {channel.channelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t("integrationHub.wizard.channelHelp")}
                </p>
                {errors.serviceChannelId && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.serviceChannelId}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="integration-description">
                  {t("integrationHub.wizard.description")}
                </Label>
                <Textarea
                  id="integration-description"
                  value={description}
                  rows={2}
                  placeholder={t("integrationHub.wizard.descriptionPlaceholder")}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <WizardSection title={t("integrationHub.wizard.scenarioTitle")}>
            {isEdit
              ? t("integrationHub.wizard.scenarioImmutable")
              : t("integrationHub.wizard.scenarioDescription")}
          </WizardSection>
          {/* Five across on wide screens (reference), collapsing to 2 then 1. Cards rather than a
              card-in-card: the ruled section header already groups them. */}
          <div
            role="radiogroup"
            aria-label={t("integrationHub.wizard.scenarioTitle")}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
              {/* BR-02 — radio semantics: exactly one, never a multi-select. */}
              {SCENARIOS.map((option) => {
                const selected = scenario === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    // Immutable after create — the cards render but don't respond in edit mode.
                    disabled={isEdit}
                    data-testid={`scenario-${option}`}
                    onClick={() => setScenario(option)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-md border bg-card p-4 text-start transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      selected
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:bg-muted/50",
                      isEdit && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {/* Icon tile + radio dot on one row, then label, then description — the icon
                        makes the five options distinguishable before any text is read. */}
                    <span className="flex w-full items-start justify-between gap-2">
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md transition-colors",
                          selected
                            ? "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {(() => {
                          const Icon = SCENARIO_ICON[option] ?? Send
                          return <Icon className="size-4" />
                        })()}
                      </span>
                      {/* A filled check when chosen, an empty ring otherwise — the radio state is
                          visible without relying on the border colour alone. */}
                      {selected ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" aria-hidden />
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="size-5 shrink-0 rounded-full border border-input"
                        />
                      )}
                    </span>
                    <span className="font-semibold">
                      {t(`integrationHub.scenarios.${option}.label`)}
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {t(`integrationHub.scenarios.${option}.description`)}
                    </span>
                  </button>
                )
              })}
          </div>
          {errors.scenario && (
            <p className="text-sm text-destructive" role="alert">
              {errors.scenario}
            </p>
          )}

          {/* FR-S2-10 — conditional security config, shown only for the scenario that needs it. */}
          {scenario === "iframe_embed" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("integrationHub.wizard.allowedOriginsTitle")}</CardTitle>
                <CardDescription>
                  {t("integrationHub.wizard.allowedOriginsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="allowed-origins">
                    {t("integrationHub.wizard.allowedOrigins")}
                  </Label>
                  <Textarea
                    id="allowed-origins"
                    dir="ltr"
                    rows={3}
                    className="font-mono"
                    value={allowedOrigins}
                    placeholder="https://portal.example.com"
                    data-testid="allowed-origins"
                    onChange={(e) => setAllowedOrigins(e.target.value)}
                  />
                  {errors.allowedOrigins && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.allowedOrigins}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {scenario === "redirect_link" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("integrationHub.wizard.linkExpiryTitle")}</CardTitle>
                <CardDescription>
                  {t("integrationHub.wizard.linkExpiryDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5 sm:max-w-xs">
                  <Label htmlFor="link-expiry">{t("integrationHub.wizard.linkExpiry")}</Label>
                  <Input
                    id="link-expiry"
                    type="number"
                    min={1}
                    value={linkExpiry}
                    placeholder="24"
                    data-testid="link-expiry"
                    onChange={(e) => setLinkExpiry(e.target.value)}
                  />
                  {errors.linkExpiryOverrideHours && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.linkExpiryOverrideHours}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Step 2 — authentication ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5" data-testid="wizard-step-2">
          <WizardSection title={t("integrationHub.wizard.authTitle")}>
            {t("integrationHub.wizard.authDescription")}
          </WizardSection>

          {/* Two mechanism cards, same shape as step 1's scenario cards so the wizard reads as one
              system: icon tile, radio dot, label, description. */}
          <div
            role="radiogroup"
            aria-label={t("integrationHub.wizard.authTitle")}
            className="grid gap-3 md:grid-cols-2"
          >
            {(["api_key", "oauth_client"] as const).map((option) => {
              const selected = mechanism === option
              const Icon = option === "oauth_client" ? ShieldCheck : KeyRound
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  // The mechanism is fixed at first generation (credential.mechanism_immutable).
                  disabled={isEdit}
                  data-testid={`mechanism-${option}`}
                  onClick={() => setMechanism(option)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-md border bg-card p-4 text-start transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    selected
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:bg-muted/50",
                    isEdit && "cursor-not-allowed opacity-70",
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md transition-colors",
                        selected
                          ? "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {selected ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden />
                      </span>
                    ) : (
                      <span aria-hidden className="size-5 shrink-0 rounded-full border border-input" />
                    )}
                  </span>
                  <span className="font-semibold">
                    {t(`integrationHub.wizard.mechanisms.${option}.label`)}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {t(`integrationHub.wizard.mechanisms.${option}.description`)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* AC-S2-01 — the visible field set switches with the mechanism. The chosen mechanism's
              configuration gets its own ruled section + card, so the page reads
              "pick a mechanism → configure THAT mechanism" rather than one undifferentiated block. */}
          <WizardSection
            title={t(`integrationHub.wizard.mechanisms.${mechanism}.configTitle`)}
          />

          {mechanism === "api_key" ? (
            <Card data-testid="api-key-fields">
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="key-label">
                    {t("integrationHub.wizard.keyLabel")}{" "}
                    {!isEdit && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="key-label"
                    value={keyLabel}
                    // Edit mode: the update request carries no credential — rotation happens in
                    // the panel below — so this reflects the current key rather than inviting an
                    // edit that would be silently ignored.
                    readOnly={isEdit}
                    className={cn("text-xs md:text-xs", isEdit && "bg-muted text-muted-foreground")}
                    placeholder={t("integrationHub.wizard.keyLabelPlaceholder")}
                    aria-invalid={errors.keyLabel ? true : undefined}
                    data-testid="key-label"
                    onChange={(e) => setKeyLabel(e.target.value)}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {isEdit
                      ? t("integrationHub.wizard.credentialReadOnlyHelp")
                      : t("integrationHub.wizard.keyLabelHelp")}
                  </p>
                  {errors.keyLabel && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.keyLabel}
                    </p>
                  )}
                </div>
                {credentialSlot}
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="oauth-fields">
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="client-name">
                      {t("integrationHub.wizard.clientName")}{" "}
                      {!isEdit && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="client-name"
                      value={clientName}
                      readOnly={isEdit}
                      className={cn("text-xs md:text-xs", isEdit && "bg-muted text-muted-foreground")}
                      placeholder={t("integrationHub.wizard.clientNamePlaceholder")}
                      aria-invalid={errors.clientName ? true : undefined}
                      data-testid="client-name"
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    {isEdit && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("integrationHub.wizard.credentialReadOnlyHelp")}
                      </p>
                    )}
                    {errors.clientName && (
                      <p className="text-sm text-destructive" role="alert">
                        {errors.clientName}
                      </p>
                    )}
                  </div>

                  {/* BR-17 — the token endpoint and lifetime are fixed in code. Shown as a
                      read-only field so the caller can copy the URL, and deliberately NOT a real
                      input: it is not configurable (guarded by a field-set test). */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="token-endpoint">
                      {t("integrationHub.wizard.tokenEndpoint")}
                    </Label>
                    <Input
                      id="token-endpoint"
                      readOnly
                      dir="ltr"
                      value={t("integrationHub.wizard.tokenEndpointValue")}
                      className="bg-muted font-mono text-xs text-muted-foreground md:text-xs"
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <Trans
                        i18nKey="integrationHub.wizard.oauthFixedHint"
                        components={{ b: <span className="font-semibold text-foreground" /> }}
                      />
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("integrationHub.wizard.scopes")}</Label>
                  {/* Chips, not a stacked checkbox list: the five scopes are short, peer options —
                      a vertical column made a two-line decision look like a long form. */}
                  <div className="flex flex-wrap gap-2">
                    {ALL_SCOPES.map((scope) => {
                      const checked = scopes.includes(scope)
                      return (
                        <label
                          key={scope}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs transition-colors",
                            checked
                              ? "border-nb-cyan-300 bg-nb-cyan-100 text-nb-cyan-900 dark:border-nb-cyan-700 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100"
                              : "border-border bg-card",
                            isEdit ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted",
                          )}
                        >
                          <Checkbox
                            id={`scope-${scope}`}
                            checked={checked}
                            // Read-only in edit mode for the same reason as the name fields:
                            // scopes are set at generation and change only by rotating.
                            disabled={isEdit}
                            data-testid={`scope-${scope}`}
                            onCheckedChange={() => toggleScope(scope)}
                          />
                          {scope}
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("integrationHub.wizard.scopesHelp")}
                  </p>
                  {errors.scopes && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.scopes}
                    </p>
                  )}
                </div>
                {credentialSlot}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5" data-testid="wizard-step-3">
          <WizardSection title={t("integrationHub.wizard.reviewTitle")}>
            {t("integrationHub.wizard.reviewDescription")}
          </WizardSection>
          <Card>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("integrationHub.wizard.name")}
                  </dt>
                  <dd className="font-semibold">{name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("integrationHub.wizard.channel")}
                  </dt>
                  {/* Name and channel ID are BOTH free-form and are often both numeric, so they
                      need a visible separator — a bare space renders "1312312313123 222333" as one
                      unreadable number. Mirrors the em-dash the select uses, and tints the ID so
                      the two read as distinct values even when neither has letters. */}
                  <dd
                    className="flex flex-wrap items-center gap-1.5 font-semibold"
                    data-testid="review-channel"
                  >
                    <span className="min-w-0 break-words">{selectedChannel?.nameEn}</span>
                    <span aria-hidden className="text-muted-foreground">
                      —
                    </span>
                    <code
                      dir="ltr"
                      className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-sm font-normal text-muted-foreground"
                    >
                      {selectedChannel?.channelId}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("integrationHub.wizard.scenarioTitle")}
                  </dt>
                  <dd className="font-semibold">
                    {scenario && t(`integrationHub.scenarios.${scenario}.label`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("integrationHub.wizard.requiredScope")}
                  </dt>
                  <dd>
                    <code dir="ltr" className="font-mono text-sm">
                      {scenario && SCOPE_BY_SCENARIO[scenario]}
                    </code>
                  </dd>
                </div>
              </dl>

              {/* AC-S2-04 — in create mode the server hasn't generated the endpoint yet, so the
                  preview is derived from the selected channel; in edit mode it is the server's
                  own `endpoint` object. Both re-render when the channel changes. */}
            </CardContent>
          </Card>

          <WizardSection title={t("integrationHub.wizard.generatedEndpoint")} />
          {/* A dark code block, because this is the one thing on the page the integrator copies
              verbatim into their client — it should look like a terminal, not like prose. Fixed
              dark surface in BOTH themes on purpose: code blocks read as code. */}
          <div
            dir="ltr"
            className="overflow-hidden rounded-md bg-nb-navy-800 text-sm dark:bg-nb-dark"
            data-testid="endpoint-preview"
          >
            <div className="flex items-start justify-between gap-3 p-4">
              <p className="min-w-0 font-mono break-all text-nb-cloud">
                <span className="me-2 rounded-sm bg-nb-mint/20 px-1.5 py-0.5 text-xs font-semibold text-nb-mint">
                  {integration?.endpoint.method ?? "POST"}
                </span>
                {/* Host muted, path bright, channel ID highlighted — the caller needs the whole
                    URL, and the only variable part is the channel segment. */}
                <span className="text-nb-stone">{t("integrationHub.wizard.apiHost")}</span>
                {integration
                  ? integration.endpoint.path
                  : `/v1/${scenarioPathSegment(scenario)}/`}
                {!integration && (
                  <span className="rounded-sm bg-nb-cyan/25 px-1 text-nb-cyan-200">
                    {selectedChannel?.channelId ?? "{channelId}"}
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                className="shrink-0 text-nb-stone-lt hover:bg-white/10 hover:text-nb-cloud"
                data-testid="copy-endpoint"
                onClick={() => {
                  const path = integration
                    ? integration.endpoint.path
                    : `/v1/${scenarioPathSegment(scenario)}/${selectedChannel?.channelId ?? ""}`
                  void navigator.clipboard
                    ?.writeText(`${t("integrationHub.wizard.apiHost")}${path}`)
                    .then(
                      () => setCopied(true),
                      () => undefined,
                    )
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t("integrationHub.wizard.copied") : t("integrationHub.wizard.copy")}
              </Button>
            </div>

            {/* Request-body shape, derived from the channel's REQUIRED parameters. Values are typed
                placeholders, not real data — this shows the shape the caller must send. */}
            <div className="border-t border-white/10 p-4 font-mono text-xs leading-relaxed">
              <p className="text-nb-stone">{t("integrationHub.wizard.bodyComment")}</p>
              <p className="mt-1 break-all text-nb-cloud">
                {bodyExample(acceptedRows(integration, channelDetail))}
              </p>
            </div>
          </div>

          {/* Side by side (reference): the parameter contract and the result codes are the two
              halves of "what this API accepts and answers", and reading them together is the point. */}
          <div className="grid gap-5 lg:grid-cols-2">
          {/* FR-S2-08 — accepted parameters, inherited from the channel contract. */}
          <Card>
            <CardHeader>
              <CardTitle>{t("integrationHub.wizard.acceptedTitle")}</CardTitle>
              <CardDescription>
                {t("integrationHub.wizard.acceptedDescription", {
                  channel: selectedChannel?.nameEn ?? "",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                      <TableHead className={WIZ_TH}>
                        {t("integrationHub.wizard.colParameter")}
                      </TableHead>
                      <TableHead className={WIZ_TH}>
                        {t("integrationHub.wizard.colApiField")}
                      </TableHead>
                      <TableHead className={WIZ_TH}>{t("integrationHub.wizard.colType")}</TableHead>
                      <TableHead className={WIZ_TH}>{t("integrationHub.wizard.colRule")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acceptedRows(integration, channelDetail).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          {t("integrationHub.wizard.noAccepted")}
                        </TableCell>
                      </TableRow>
                    )}
                    {acceptedRows(integration, channelDetail).map((row) => (
                      <TableRow key={row.parameterId} data-testid={`accepted-${row.apiField}`}>
                        <TableCell className="font-medium">{row.nameEn}</TableCell>
                        <TableCell>
                          <code
                            dir="ltr"
                            className="inline-block rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                          >
                            {row.apiField}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t(`integrationHub.dataTypes.${row.dataType}`)}
                          {row.dataType === "list" && (
                            <span> · {t("integrationHub.wizard.mapped")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.required ? (
                            <Badge className="bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
                              {t("integrationHub.wizard.required")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t("integrationHub.wizard.optional")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* FR-S2-09 — the normative result-code catalogue. */}
          <Card>
            <CardHeader>
              <CardTitle>{t("integrationHub.wizard.resultCodesTitle")}</CardTitle>
              <CardDescription>
                {t("integrationHub.wizard.resultCodesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={cn(WIZ_TH, "w-16")}>
                        {t("integrationHub.wizard.colHttp")}
                      </TableHead>
                      <TableHead className={cn(WIZ_TH, "w-28")}>
                        {t("integrationHub.wizard.colCode")}
                      </TableHead>
                      <TableHead className={WIZ_TH}>
                        {t("integrationHub.wizard.colMeaning")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RESULT_CODES.map(({ code, http }) => (
                      <TableRow key={code} data-testid={`result-code-${code}`}>
                        <TableCell>
                          <Badge className={cn("font-mono tabular-nums", httpBadgeClass(http))}>
                            {http}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code
                            dir="ltr"
                            className="inline-block rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                          >
                            {code === "202"
                              ? "ACCEPTED"
                              : code === "200"
                                ? "OK"
                                : code}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs leading-relaxed text-muted-foreground">
                          {t(`integrationHub.resultCodes.${code}`)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* Wizard controls (FR-S2-01) */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          data-testid="wizard-back"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          {t("integrationHub.wizard.back")}
        </Button>

        {step < 3 ? (
          <Button type="button" data-testid="wizard-continue" onClick={goNext}>
            {t("integrationHub.wizard.continue")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving}
            data-testid="wizard-submit"
            onClick={() => void handleSubmit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isEdit ? t("integrationHub.wizard.save") : t("integrationHub.wizard.create")}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The normative result catalogue, ordered success-first then by HTTP status.
 *
 * `http` is carried here rather than derived: the mapping is a backend contract, not a rule the UI
 * gets to infer. Includes `E-1413` and `E-1500`, which the prototype's table omits but our
 * catalogue defines — dropping real codes from the reference an integrator codes against would be
 * worse than matching the mock exactly.
 */
const RESULT_CODES: readonly { code: string; http: string }[] = [
  { code: "202", http: "202" },
  { code: "200", http: "200" },
  { code: "E-1002", http: "400" },
  { code: "E-1401", http: "401" },
  { code: "E-1001", http: "404" },
  { code: "E-1004", http: "409" },
  { code: "E-1413", http: "413" },
  { code: "E-1003", http: "422" },
  { code: "E-1429", http: "429" },
  { code: "E-1500", http: "500" },
]

/**
 * HTTP class → D-band. This IS a status signal (did the call succeed?), so the semantic D-scale is
 * correct here and brand colours would be wrong: 2xx good, 4xx caller-fixable, 5xx ours.
 */
function httpBadgeClass(http: string): string {
  if (http.startsWith("2")) return "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light"
  if (http.startsWith("5")) return "bg-d4-light text-d4-dark dark:bg-d4-dark/25 dark:text-d4-light"
  return "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light"
}

/** Illustrative path segment per scenario (F0.1) — the server owns the real path. */
function scenarioPathSegment(scenario: Scenario | ""): string {
  switch (scenario) {
    case "dispatch":
      return "survey-requests"
    case "redirect_link":
      return "survey-links"
    case "json_render":
      return "survey-definitions"
    case "iframe_embed":
      return "survey-embed"
    case "response_ingestion":
      return "responses"
    default:
      return "…"
  }
}

/**
 * Step 3's accepted-parameters rows. In edit mode the server supplies them; in create mode the
 * integration doesn't exist yet, so they're projected from the selected channel's own contract —
 * which is why `useIntegrationWizard` loads channels with their contract rows.
 */
function acceptedRows(integration: Integration | undefined, channel: ServiceChannel | undefined) {
  if (integration && integration.serviceChannelId === channel?.id) {
    return integration.acceptedParameters
  }
  return (channel?.contract ?? [])
    .filter((row) => row.supported)
    .map((row) => ({
      parameterId: row.parameterId,
      apiField: row.apiField,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      dataType: "text" as const,
      required: row.required,
    }))
}
