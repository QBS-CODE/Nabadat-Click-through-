// Action Management data hooks. T040 (US1) ships `useCreateAction`; T068 (US2) adds the
// `useActions` list query to this same file.

import { useCallback, useEffect, useState } from "react"

import { ActionApiError, createAction, listActions, type Action, type ActionSaveInput } from "../api"

// One fetch covers the tenant's Actions (bounded; server clamps to 200). The four tabs are grouped
// client-side from each Action's server-authoritative `status`, and cross-tab search runs over the
// same set (SRS §6.3 / NFR-5).
const FETCH_SIZE = 200

export interface UseActionsResult {
  /** All fetched Actions (across the four tabs). */
  actions: Action[]
  /** True when more Actions existed beyond the fetched page (surfaced, never silent). */
  truncated: boolean
  loading: boolean
  error: boolean
  reload: () => Promise<void>
}

/** Loads the tenant's Actions for the All Actions page (SCR-01). `GET /api/v1/actions`. */
export function useActions(): UseActionsResult {
  const [actions, setActions] = useState<Action[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await listActions({ pageSize: FETCH_SIZE })
      setActions(res.items)
      setTruncated(res.nextPageToken != null)
    } catch {
      setError(true)
      setActions([])
      setTruncated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { actions, truncated, loading, error, reload }
}

export type CreateActionOutcome =
  | { status: "saved"; action: Action }
  | { status: "error"; error: ActionApiError }

export interface UseCreateActionResult {
  /** Runs `POST /api/v1/actions`. Never throws — failures come back as `{ status: "error" }`. */
  create: (input: ActionSaveInput) => Promise<CreateActionOutcome>
  submitting: boolean
  /** The last failure (VAL-202 duplicate, ERR-5, 403, network), or null. */
  error: ActionApiError | null
  reset: () => void
}

/**
 * Create-Action mutation for SCR-02. Owns the `submitting` / `error` state so the page just reacts
 * to the outcome (toast + navigate on "saved"). Mirrors `useKpiSave`.
 */
export function useCreateAction(): UseCreateActionResult {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ActionApiError | null>(null)

  const create = useCallback<UseCreateActionResult["create"]>(async (input) => {
    setSubmitting(true)
    setError(null)
    try {
      const action = await createAction(input)
      return { status: "saved", action }
    } catch (e) {
      const err =
        e instanceof ActionApiError
          ? e
          : new ActionApiError(0, { error: { code: "network_error", message: String(e) } })
      setError(err)
      return { status: "error", error: err }
    } finally {
      setSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => setError(null), [])

  return { create, submitting, error, reset }
}
