// US2 parameter-catalogue data hook (T064).
//
// The catalogue is bounded by VR-F13 at 23 built-ins + ≤200 custom parameters, so one 200-row
// fetch covers a tenant and the origin/type/search filters apply client-side. That matters for
// AC-S5-01: the **origin-tab counts stay global** (they come from the server's `counts` block and
// are never narrowed by the type filter or the search box), while the rows themselves are filtered
// by all three combined with AND.

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createParameter,
  listParameters,
  listServiceChannels,
  setParameterEnabled,
  updateParameter,
  type DataType,
  type Parameter,
  type ParameterCounts,
  type ParameterOrigin,
  type ParameterPatchResult,
  type ParameterSaveInput,
  type ServiceChannel,
} from "@/features/integration-hub/api"

const FETCH_SIZE = 200

/** SCR-05's origin tabs — `all` is the default and is not a server `origin` value. */
export type OriginTab = "all" | ParameterOrigin

export interface UseParametersResult {
  /** Rows after origin + type + search, AND-combined (FR-S5-01). */
  items: Parameter[]
  /** Global per-origin counts from the server — never narrowed by the filters (AC-S5-01). */
  counts: ParameterCounts
  /** Every fetched row, unfiltered. */
  allItems: Parameter[]
  /** Active service channels, for the SCR-06 channel-assignment pills (FR-S6-05). */
  channels: ServiceChannel[]
  truncated: boolean
  loading: boolean
  error: boolean
  origin: OriginTab
  setOrigin: (origin: OriginTab) => void
  type: DataType | "all"
  setType: (type: DataType | "all") => void
  search: string
  setSearch: (search: string) => void
  isFiltered: boolean
  clearFilters: () => void
  reload: () => Promise<void>
  /** Create or update; resolves to the saved row. Rejects with `IntegrationHubApiError`. */
  save: (input: ParameterSaveInput, id?: string) => Promise<Parameter>
  saving: boolean
  /**
   * BR-10 two-step disable. Returns the patch result: when `requiresConfirmation` is true the
   * server changed nothing and supplied the reference list for Dialog D-6 — call again with
   * `confirm = true` to apply. Updates the local cache in place on a real change (no refetch).
   */
  toggleEnabled: (id: string, enabled: boolean, confirm?: boolean) => Promise<ParameterPatchResult>
}

export function useParameters(): UseParametersResult {
  const [allItems, setAllItems] = useState<Parameter[]>([])
  const [counts, setCounts] = useState<ParameterCounts>({ all: 0, builtIn: 0, custom: 0 })
  const [channels, setChannels] = useState<ServiceChannel[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  const [origin, setOrigin] = useState<OriginTab>("all")
  const [type, setType] = useState<DataType | "all">("all")
  const [search, setSearch] = useState("")

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      // Fetch the whole catalogue unfiltered so the tab counts and the filtered view are both
      // driven from one round-trip; the channel list feeds SCR-06's assignment pills.
      const [page, channelPage] = await Promise.all([
        listParameters({ limit: FETCH_SIZE }),
        listServiceChannels({ limit: FETCH_SIZE }),
      ])
      setAllItems(page.items)
      setCounts(page.counts)
      setTruncated(page.nextCursor != null)
      setChannels(channelPage.items.filter((c) => c.active))
    } catch {
      setError(true)
      setAllItems([])
      setTruncated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter((p) => {
      if (origin !== "all" && p.origin !== origin) return false
      if (type !== "all" && p.dataType !== type) return false
      if (q && !`${p.nameEn} ${p.nameAr} ${p.apiField}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [allItems, origin, type, search])

  const clearFilters = useCallback(() => {
    setOrigin("all")
    setType("all")
    setSearch("")
  }, [])

  const save = useCallback(async (input: ParameterSaveInput, id?: string) => {
    setSaving(true)
    try {
      const saved = id ? (await updateParameter(id, input)).parameter : await createParameter(input)
      setAllItems((prev) => {
        const next = prev.some((p) => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved]
        return next
      })
      if (!id) {
        // A new row is always custom — keep the global tab counts honest without a refetch.
        setCounts((prev) => ({ ...prev, all: prev.all + 1, custom: prev.custom + 1 }))
      }
      return saved
    } finally {
      setSaving(false)
    }
  }, [])

  const toggleEnabled = useCallback(async (id: string, enabled: boolean, confirm = false) => {
    const result = await setParameterEnabled(id, enabled, confirm)
    // Only patch the cache when the server actually changed something — a confirmation-pending
    // response left the parameter untouched (BR-10).
    if (!result.requiresConfirmation) {
      setAllItems((prev) => prev.map((p) => (p.id === id ? result.parameter : p)))
    }
    return result
  }, [])

  return {
    items,
    counts,
    allItems,
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
    isFiltered: origin !== "all" || type !== "all" || search.trim() !== "",
    clearFilters,
    reload,
    save,
    saving,
    toggleEnabled,
  }
}
