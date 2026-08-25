import { useEffect, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/hooks/useSession"
import { listKpis } from "@/features/kpi-management/api"

import { ActionApiError, getActionSettings, updateAction, type ActionSaveInput } from "../api"
import { ActionForm } from "../components/ActionForm"
import type { KpiOption } from "../components/KpiTargetFieldset"
import { useAction } from "../hooks/useAction"
import { useCreateAction } from "../hooks/useActions"

// ── SCR-02 route host: `/actions/new` (create, US1) and `/actions/:id/edit` (edit, US4). ──────────
//
// Program-Manager-only (PERM-01 / §13) — a non-P-01 persona is redirected to `/actions`. Edit mode
// loads the Action (T085's useAction), pre-fills ActionForm via `initialAction`, and submits with
// `PUT /api/v1/actions/{id}`. A Completed or Archived Action can't be edited (BR-023 / FR-209 /
// FR-301): the deep link redirects to the detail page with toast NTF-6.

export default function ActionFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { session } = useSession()
  const { create, submitting: creating, error: createError } = useCreateAction()
  const edit = useAction(id ?? "") // no-op when id is empty (create mode)

  const denied = session != null && session.persona !== "P-01"

  const [kpiOptions, setKpiOptions] = useState<KpiOption[]>([])
  const [loadingKpis, setLoadingKpis] = useState(true)
  // Tenant's configured max Upper Threshold (X, US9) — drives every slider's 0–X scale. Defaults to 20
  // until Settings → Actions is loaded; a failure keeps the default rather than blocking the form.
  const [maxUpperThreshold, setMaxUpperThreshold] = useState(20)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (denied) return
    let cancelled = false
    setLoadingKpis(true)
    Promise.all([
      listKpis({ activeOnly: true, limit: 200 }),
      getActionSettings().catch(() => null), // non-fatal — fall back to the default X
    ])
      .then(([kpis, settings]) => {
        if (cancelled) return
        setKpiOptions(kpis.items.map((k) => ({ id: k.id, name: k.shortName })))
        if (settings) setMaxUpperThreshold(settings.maxUpperThreshold)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(t("actions.toastKpiLoadFailed"))
          setKpiOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingKpis(false)
      })
    return () => {
      cancelled = true
    }
  }, [denied])

  // A loaded Completed/Archived Action is not editable — redirect to detail with NTF-6 (FR-209/301).
  const readOnlyReason =
    isEdit && edit.action
      ? edit.action.archived
        ? t("actions.readOnlyUnarchive")
        : edit.action.status === "completed"
          ? t("actions.readOnlyCompleted")
          : null
      : null
  useEffect(() => {
    if (readOnlyReason) toast.error(readOnlyReason)
  }, [readOnlyReason])

  const handleCreate = async (input: ActionSaveInput) => {
    const outcome = await create(input)
    if (outcome.status === "saved") {
      toast.success(t("actions.toastSaved"))
      navigate("/actions")
    } else {
      toast.error(outcome.error.message)
    }
  }

  const handleEdit = async (input: ActionSaveInput) => {
    if (!id) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      await updateAction(id, input)
      toast.success(t("actions.toastSaved"))
      navigate("/actions")
    } catch (e) {
      const message =
        e instanceof ActionApiError ? e.message : t("actions.toastGenericError")
      setEditError(message)
      toast.error(message)
    } finally {
      setEditSubmitting(false)
    }
  }

  if (denied) return <Navigate to="/actions" replace />

  if (isEdit) {
    if (edit.loading || loadingKpis) return <FormSkeleton />
    if (edit.notFound || edit.error || !edit.action) return <Navigate to={`/actions/${id}`} replace />
    if (readOnlyReason) return <Navigate to={`/actions/${id}`} replace />

    return (
      <ActionForm
        key={id}
        kpiOptions={kpiOptions}
        maxUpperThreshold={maxUpperThreshold}
        initialAction={edit.action}
        submitting={editSubmitting}
        submitError={editError}
        onSubmit={handleEdit}
        onCancel={() => navigate(`/actions/${id}`)}
      />
    )
  }

  if (loadingKpis) return <FormSkeleton />

  return (
    <ActionForm
      kpiOptions={kpiOptions}
      maxUpperThreshold={maxUpperThreshold}
      submitting={creating}
      submitError={createError?.message ?? null}
      onSubmit={handleCreate}
      onCancel={() => navigate("/actions")}
    />
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-5 py-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
