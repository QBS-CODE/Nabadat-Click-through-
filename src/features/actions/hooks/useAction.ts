// Single-Action data hook for SCR-03 (US3). Fetches `GET /api/v1/actions/{id}` and exposes the
// archive / unarchive mutations (endpoints from T081) that refresh the Action in place.

import { useCallback, useEffect, useState } from "react"

import {
  ActionApiError,
  archiveAction,
  deleteTarget,
  getAction,
  setTargetActive,
  unarchiveAction,
  type Action,
} from "../api"

export interface UseActionResult {
  action: Action | null
  loading: boolean
  /** 404 — missing or foreign-tenant id (ERR-6). */
  notFound: boolean
  /** Any non-404 load failure. */
  error: boolean
  /** True while an archive/unarchive write is in flight. */
  mutating: boolean
  reload: () => Promise<void>
  /** Archives (no confirmation, BR-009); returns true on success and refreshes the Action in place. */
  archive: () => Promise<boolean>
  /** Unarchives; returns true on success and refreshes the (recomputed) Action in place. */
  unarchive: () => Promise<boolean>
  /**
   * US7 — activates/deactivates one Target (`PATCH …/targets/{id}`) then reloads the Action so its
   * rows/status recompute. Returns true on success; false on failure (e.g. 409 `target.kpi_inactive`).
   */
  setTargetActive: (targetId: string, active: boolean) => Promise<boolean>
  /** US7 — deletes a deactivated Target (`DELETE …/targets/{id}`) then reloads the Action in place. */
  deleteTarget: (targetId: string) => Promise<boolean>
}

export function useAction(id: string): UseActionResult {
  const [action, setAction] = useState<Action | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [mutating, setMutating] = useState(false)

  const reload = useCallback(async () => {
    // No-op for an empty id (create mode reuses this hook via a conditional-free call).
    if (!id) {
      setAction(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    setError(false)
    try {
      setAction(await getAction(id))
    } catch (e) {
      if (e instanceof ActionApiError && e.status === 404) setNotFound(true)
      else setError(true)
      setAction(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  const runMutation = useCallback(
    async (fn: (id: string) => Promise<Action>): Promise<boolean> => {
      setMutating(true)
      try {
        setAction(await fn(id))
        return true
      } catch {
        return false
      } finally {
        setMutating(false)
      }
    },
    [id],
  )

  const archive = useCallback(() => runMutation(archiveAction), [runMutation])
  const unarchive = useCallback(() => runMutation(unarchiveAction), [runMutation])

  // Target sub-resource writes don't return the whole Action (PATCH → one Target, DELETE → the
  // remaining list), so instead of splicing them in, re-read the Action so its status, featured row,
  // and derived dates recompute server-side. Reuses the same `mutating` flag as archive/unarchive.
  const runTargetMutation = useCallback(
    async (fn: () => Promise<unknown>): Promise<boolean> => {
      if (!id) return false
      setMutating(true)
      try {
        await fn()
        await reload()
        return true
      } catch {
        return false
      } finally {
        setMutating(false)
      }
    },
    [id, reload],
  )

  const setTargetActiveFn = useCallback(
    (targetId: string, active: boolean) => runTargetMutation(() => setTargetActive(id, targetId, active)),
    [id, runTargetMutation],
  )
  const deleteTargetFn = useCallback(
    (targetId: string) => runTargetMutation(() => deleteTarget(id, targetId)),
    [id, runTargetMutation],
  )

  return {
    action,
    loading,
    notFound,
    error,
    mutating,
    reload,
    archive,
    unarchive,
    setTargetActive: setTargetActiveFn,
    deleteTarget: deleteTargetFn,
  }
}
