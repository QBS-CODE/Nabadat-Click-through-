// US5 request-log data hook (T135).
//
// Unlike every other M-13 list, this one filters **server-side**: the log table is high-volume and
// monthly-partitioned, so status class / integration / time window all go to the API, which also
// returns the per-chip counts scoped to the window (FR-S8-01) and echoes the filter it applied.
// Re-fetching on every filter change is the point — the counts must track the window.

import { useCallback, useEffect, useState } from "react"

import {
  exportRequestLogs,
  listRequestLogs,
  type LogStatusClass,
  type LogWindow,
  type RequestLog,
  type RequestLogAppliedFilter,
  type RequestLogCounts,
} from "@/features/integration-hub/api"

const PAGE_SIZE = 50

const EMPTY_COUNTS: RequestLogCounts = { all: 0, success: 0, clientError: 0, serverError: 0 }

export interface UseRequestLogsResult {
  items: RequestLog[]
  counts: RequestLogCounts
  appliedFilter: RequestLogAppliedFilter | null
  loading: boolean
  error: boolean
  /** True when the caller lacks `m13.log.view` — P-01 always (BR-24). Drives the denied state. */
  forbidden: boolean
  statusClass: LogStatusClass
  setStatusClass: (statusClass: LogStatusClass) => void
  integrationId: string | undefined
  setIntegrationId: (integrationId: string | undefined) => void
  window: LogWindow
  setWindow: (window: LogWindow) => void
  /** Cursor-paginated: appends the next page rather than replacing. */
  hasMore: boolean
  loadMore: () => Promise<void>
  loadingMore: boolean
  reload: () => Promise<void>
  /** Exports exactly the current filtered view, PII masked identically (FR-S8-04). */
  exportCurrentView: () => Promise<void>
  exporting: boolean
}

export function useRequestLogs(): UseRequestLogsResult {
  const [items, setItems] = useState<RequestLog[]>([])
  const [counts, setCounts] = useState<RequestLogCounts>(EMPTY_COUNTS)
  const [appliedFilter, setAppliedFilter] = useState<RequestLogAppliedFilter | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [statusClass, setStatusClass] = useState<LogStatusClass>("all")
  const [integrationId, setIntegrationId] = useState<string | undefined>(undefined)
  // FR-S8-01 default: Last 24 hours.
  const [window, setWindow] = useState<LogWindow>("24h")

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    setForbidden(false)
    try {
      const page = await listRequestLogs({
        statusClass,
        integrationId,
        window,
        limit: PAGE_SIZE,
      })
      setItems(page.items)
      setCounts(page.counts)
      setAppliedFilter(page.appliedFilter)
      setNextCursor(page.nextCursor)
    } catch (caught) {
      // A 403 is not a failure to retry — it means this persona has no log grant at all (BR-24),
      // so the page renders the access-denied state instead of an error-with-retry.
      if (
        typeof caught === "object" &&
        caught !== null &&
        "status" in caught &&
        (caught as { status: number }).status === 403
      ) {
        setForbidden(true)
      } else {
        setError(true)
      }
      setItems([])
      setCounts(EMPTY_COUNTS)
      setNextCursor(null)
    } finally {
      setLoading(false)
    }
  }, [statusClass, integrationId, window])

  // Re-fetch whenever any filter changes — the counts are window-scoped, so they must follow.
  useEffect(() => {
    void reload()
  }, [reload])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listRequestLogs({
        statusClass,
        integrationId,
        window,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      })
      setItems((prev) => [...prev, ...page.items])
      setNextCursor(page.nextCursor)
    } catch {
      // Leave the already-loaded rows in place; the user can retry with the button.
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, statusClass, integrationId, window])

  const exportCurrentView = useCallback(async () => {
    setExporting(true)
    try {
      const { blob, filename } = await exportRequestLogs({ statusClass, integrationId, window })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [statusClass, integrationId, window])

  return {
    items,
    counts,
    appliedFilter,
    loading,
    error,
    forbidden,
    statusClass,
    setStatusClass,
    integrationId,
    setIntegrationId,
    window,
    setWindow,
    hasMore: nextCursor != null,
    loadMore,
    loadingMore,
    reload,
    exportCurrentView,
    exporting,
  }
}
