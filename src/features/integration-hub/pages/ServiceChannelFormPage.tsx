// SCR-04 Service Channel Create/Edit route wrapper (T037/T039, US1).
//
// Owns data loading + the save round-trip; `ServiceChannelForm` owns the fields and validation.
// `/service-channels/new` → create mode; `/service-channels/:id` → edit mode, pre-filled.

import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { AccessDenied } from "@/features/integration-hub/components/AccessDenied"
import { ServiceChannelForm } from "@/features/integration-hub/components/ServiceChannelForm"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import { useServiceChannelForm } from "@/features/integration-hub/hooks/useServiceChannels"
import type { ServiceChannelSaveInput } from "@/features/integration-hub/api"

export default function ServiceChannelFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  // FR-GBL-05 / T148 — see the note in IntegrationWizardPage.
  const access = useIntegrationHubAccess()
  const { channel, parameters, loading, loadError, saving, save } = useServiceChannelForm(id)

  async function handleSave(input: ServiceChannelSaveInput) {
    // Let the error propagate — the form maps API-05 codes onto its own fields.
    const saved = await save(input)
    toast.success(
      id
        ? t("integrationHub.channelForm.savedToast", { name: saved.nameEn })
        : t("integrationHub.channelForm.createdToast", { name: saved.nameEn }),
    )
    navigate("/integration-hub/service-channels")
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

  if (!access.canManage("serviceChannels")) {
    return <AccessDenied screenName={t("integrationHub.channels.title")} />
  }

  if (loading) {
    return (
      <div className="space-y-5 py-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-5 py-5">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <h2 className="mb-2 text-lg font-bold">
            {t("integrationHub.channelForm.loadErrorTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.channelForm.loadErrorHint")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ServiceChannelForm
      // Remount when switching between create and a specific channel so the form's seeded
      // state is rebuilt rather than carried over from the previous route.
      key={id ?? "new"}
      channel={channel}
      parameters={parameters}
      saving={saving}
      onSave={handleSave}
    />
  )
}
