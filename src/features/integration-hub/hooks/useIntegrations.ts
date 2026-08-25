// US3 integration data hooks (T089).
//
// Bounded by VR-F13 at ≤200 integrations per tenant, so one 200-row fetch covers a tenant and the
// SCR-01 search/channel filters apply client-side — the shipped controller exposes no `q`/`channel`
// query params yet (those land with US5/T130).

import { useCallback, useEffect, useState } from "react"

import {
  createIntegration,
  generateCredential,
  getIntegration,
  listIntegrations,
  listServiceChannels,
  revokeCredential,
  setIntegrationActive,
  updateIntegration,
  type CredentialInput,
  type GeneratedCredential,
  type Integration,
  type IntegrationCreateInput,
  type IntegrationHealthTiles,
  type IntegrationListItem,
  type IntegrationUpdateInput,
  type ServiceChannel,
} from "@/features/integration-hub/api"

const FETCH_SIZE = 200

export interface UseIntegrationsResult {
  items: IntegrationListItem[]
  /** FR-S1-01 — the three SCR-01 stat tiles, computed server-side over the rolling 24h window. */
  tiles: IntegrationHealthTiles | null
  truncated: boolean
  loading: boolean
  error: boolean
  search: string
  setSearch: (search: string) => void
  /** Service-channel filter, by channel id; `"all"` clears it. */
  channel: string
  setChannel: (channel: string) => void
  /** Distinct channels seen across the unfiltered set, for the filter select. */
  channelOptions: { channelId: string; name: string }[]
  isFiltered: boolean
  clearFilters: () => void
  reload: () => Promise<void>
  /** US10 — Active ⇄ Inactive. Patches the row in place; the tiles are refetched. */
  setActive: (id: string, active: boolean) => Promise<void>
  togglingId: string | null
}

/**
 * SCR-01 list data. Filtering is **server-side** (`q` + `channel`, FR-S1-02) so the tiles and the
 * rows always describe the same set; a debounce keeps the search from firing per keystroke.
 */
export function useIntegrations(): UseIntegrationsResult {
  const [items, setItems] = useState<IntegrationListItem[]>([])
  const [tiles, setTiles] = useState<IntegrationHealthTiles | null>(null)
  const [channelOptions, setChannelOptions] = useState<{ channelId: string; name: string }[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState("")
  const [channel, setChannel] = useState("all")

  // Debounced copy of `search`, so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const page = await listIntegrations({
        q: debouncedSearch || undefined,
        channel: channel === "all" ? undefined : channel,
        limit: FETCH_SIZE,
      })
      setItems(page.items)
      setTiles(page.tiles)
      setTruncated(page.nextCursor != null)
      // Build the channel options from the UNFILTERED set only, so narrowing by channel never
      // strips the very option that is selected.
      if (channel === "all" && !debouncedSearch) {
        const seen = new Map<string, string>()
        for (const item of page.items) {
          if (!seen.has(item.channelId)) seen.set(item.channelId, item.serviceChannelName)
        }
        setChannelOptions([...seen.entries()].map(([channelId, name]) => ({ channelId, name })))
      }
    } catch {
      setError(true)
      setItems([])
      setTiles(null)
      setTruncated(false)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, channel])

  useEffect(() => {
    void reload()
  }, [reload])

  const clearFilters = useCallback(() => {
    setSearch("")
    setChannel("all")
  }, [])

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const setActive = useCallback(
    async (id: string, active: boolean) => {
      setTogglingId(id)
      try {
        const saved = await setIntegrationActive(id, active)
        // Patch the row in place so the badge flips immediately…
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, active: saved.active } : i)),
        )
        // …then refetch, because the "n active" tile is now stale.
        await reload()
      } finally {
        setTogglingId(null)
      }
    },
    [reload],
  )

  return {
    items,
    tiles,
    truncated,
    loading,
    error,
    search,
    setSearch,
    channel,
    setChannel,
    channelOptions,
    isFiltered: search.trim() !== "" || channel !== "all",
    clearFilters,
    reload,
    setActive,
    togglingId,
  }
}

export interface UseIntegrationWizardResult {
  /** Undefined in create mode, or while the edit-mode fetch is in flight. */
  integration: Integration | undefined
  /** Active channels only — FR-S2-02 / BR-07: a deactivated channel is never selectable. */
  channels: ServiceChannel[]
  loading: boolean
  loadError: boolean
  saving: boolean
  create: (input: IntegrationCreateInput) => Promise<{
    integration: Integration
    credential: GeneratedCredential
  }>
  update: (input: IntegrationUpdateInput) => Promise<Integration>
  /** US8's ongoing ops, reachable from the edit wizard's step 2. */
  generate: (input: CredentialInput) => Promise<GeneratedCredential>
  revoke: () => Promise<void>
  /** Re-fetches the integration after a credential op so the masked view refreshes. */
  refresh: () => Promise<void>
}

/**
 * SCR-02 wizard data. `integrationId` undefined ⇒ create mode.
 *
 * The channel list is filtered to **active** channels by the server (`?active=true`, T205). The
 * create/update call independently rejects an inactive channel with `channel.not_active`, so the
 * filter is a convenience, not the only guard.
 */
export function useIntegrationWizard(integrationId?: string): UseIntegrationWizardResult {
  const [integration, setIntegration] = useState<Integration | undefined>(undefined)
  const [channels, setChannels] = useState<ServiceChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [channelPage, loaded] = await Promise.all([
        // FR-S2-02 / BR-07 — active-only, enforced server-side since T205.
        listServiceChannels({ active: true, limit: FETCH_SIZE }),
        integrationId ? getIntegration(integrationId) : Promise.resolve(undefined),
      ])
      setChannels(channelPage.items)
      setIntegration(loaded)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [integrationId])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    if (!integrationId) return
    setIntegration(await getIntegration(integrationId))
  }, [integrationId])

  const create = useCallback(async (input: IntegrationCreateInput) => {
    setSaving(true)
    try {
      return await createIntegration(input)
    } finally {
      setSaving(false)
    }
  }, [])

  const update = useCallback(
    async (input: IntegrationUpdateInput) => {
      if (!integrationId) throw new Error("update called in create mode")
      setSaving(true)
      try {
        const saved = await updateIntegration(integrationId, input)
        setIntegration(saved)
        return saved
      } finally {
        setSaving(false)
      }
    },
    [integrationId],
  )

  const generate = useCallback(
    async (input: CredentialInput) => {
      if (!integrationId) throw new Error("generate called in create mode")
      const result = await generateCredential(integrationId, input)
      await refresh()
      return result
    },
    [integrationId, refresh],
  )

  const revoke = useCallback(async () => {
    if (!integrationId) return
    await revokeCredential(integrationId)
    await refresh()
  }, [integrationId, refresh])

  return { integration, channels, loading, loadError, saving, create, update, generate, revoke, refresh }
}
