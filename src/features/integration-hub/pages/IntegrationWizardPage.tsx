// SCR-02 New/Edit Integration route wrapper (T085/T088, US3).
//
// Owns data loading, the create/update round-trip, and the show-once credential dialog;
// `IntegrationWizard` owns the three steps and their validation.
//
// The show-once secret (BR-16) lives in this component's state ONLY, from the moment the create
// response lands until the user dismisses D-1/D-2 — then it is dropped and navigation proceeds.
// It is never written to storage and never re-fetchable.

import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { AccessDenied } from "@/features/integration-hub/components/AccessDenied"
import { CredentialGeneratedDialog } from "@/features/integration-hub/components/CredentialGeneratedDialog"
import { CredentialManagementPanel } from "@/features/integration-hub/components/CredentialManagementPanel"
import { IntegrationWizard } from "@/features/integration-hub/components/IntegrationWizard"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import { useIntegrationWizard } from "@/features/integration-hub/hooks/useIntegrations"
import type {
  CredentialInput,
  GeneratedCredential,
  IntegrationCreateInput,
  IntegrationUpdateInput,
} from "@/features/integration-hub/api"

export default function IntegrationWizardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  // FR-GBL-05 / T148 — the wizard IS a manage action, so a direct-URL hit by a read-only persona
  // gets the access-denied state rather than a form whose submit the server will 403 anyway.
  const access = useIntegrationHubAccess()
  const { integration, channels, loading, loadError, saving, create, update, generate, revoke } =
    useIntegrationWizard(id)

  // Held here only while D-1/D-2 is open. Dismissing clears it — there is no way back to it.
  const [generated, setGenerated] = useState<GeneratedCredential | null>(null)
  // True while a US8 credential op is in flight, so both buttons disable together.
  const [credentialBusy, setCredentialBusy] = useState(false)

  async function handleCreate(input: IntegrationCreateInput) {
    // Errors propagate — the wizard maps API-05 codes onto its own fields and steps back.
    const result = await create(input)
    setGenerated(result.credential)
    toast.success(t("integrationHub.wizard.createdToast", { name: result.integration.name }))
  }

  async function handleUpdate(input: IntegrationUpdateInput) {
    const saved = await update(input)
    toast.success(t("integrationHub.wizard.savedToast", { name: saved.name }))
    navigate("/integration-hub/integrations")
  }

  function handleCredentialDone() {
    // Drop the plaintext (BR-16). In create mode there is nowhere left to be, so leave; in edit
    // mode stay put so the refreshed credential panel is visible right behind the dialog.
    setGenerated(null)
    if (!id) navigate("/integration-hub/integrations")
  }

  /** US8 — generate a replacement, which implicitly revokes the current active one (BR-16). */
  async function handleGenerateCredential(input: CredentialInput) {
    setCredentialBusy(true)
    try {
      setGenerated(await generate(input))
      toast.success(t("integrationHub.credentials.generatedToast"))
    } catch {
      toast.error(t("integrationHub.credentials.generateError"))
    } finally {
      setCredentialBusy(false)
    }
  }

  /** US8 — standalone revoke, without generating a replacement. Immediate and irreversible. */
  async function handleRevokeCredential() {
    setCredentialBusy(true)
    try {
      await revoke()
      toast.success(t("integrationHub.credentials.revokedToast"))
    } catch {
      toast.error(t("integrationHub.credentials.revokeError"))
    } finally {
      setCredentialBusy(false)
    }
  }

  // Hydration guard first — see `ready` in useIntegrationHubAccess.
  if (!access.ready) {
    return (
      <div className="space-y-5 py-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!access.canManage("integrations")) {
    return <AccessDenied screenName={t("integrationHub.integrations.title")} />
  }

  if (loading) {
    return (
      <div className="space-y-5 py-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-5 py-5">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <h2 className="mb-2 text-lg font-bold">{t("integrationHub.wizard.loadErrorTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.wizard.loadErrorHint")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <IntegrationWizard
        // Rebuild the wizard's seeded state when switching between create and a specific
        // integration, rather than carrying the previous route's values over.
        key={id ?? "new"}
        integration={integration}
        channels={channels}
        saving={saving}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        // US8 — ongoing revoke/regenerate, edit mode only. In create mode the credential is
        // issued atomically with the integration, so there is nothing to manage yet.
        credentialSlot={
          integration ? (
            <CredentialManagementPanel
              credential={integration.credential}
              mechanism={integration.credential?.mechanism ?? "api_key"}
              scopes={integration.credential?.scopes ?? []}
              busy={credentialBusy}
              onGenerate={handleGenerateCredential}
              onRevoke={handleRevokeCredential}
            />
          ) : undefined
        }
      />
      <CredentialGeneratedDialog credential={generated} onDone={handleCredentialDone} />
    </>
  )
}
