// US6 parameter-mapping data hook (T165).
//
// Two things this owns beyond plain CRUD:
//   • The **mapping-enabled parameter list** for SCR-07's selector (FR-S7-01). The parameters
//     endpoint has no `mapping_enabled` filter, so the filtering is client-side on
//     `parameter.mappingSupport` — which BR-27 derives from the data type.
//   • The **unmapped-values queue** (FR-S7-02), refreshed alongside the table so that creating a
//     mapping visibly drains the queue in the same interaction.

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createMapping,
  deleteMapping,
  exportMappings,
  importMappings,
  replaceAllMappings,
  listMappings,
  listParameters,
  listUnmappedValues,
  updateMapping,
  type MappingImportMode,
  type MappingImportResult,
  type MappingParameter,
  type Parameter,
  type ParameterMapping,
  type ParameterMappingSaveInput,
  type UnmappedValue,
} from "@/features/integration-hub/api"

const FETCH_SIZE = 200

export interface UseMappingsResult {
  /** Mapping-enabled parameters only — the SCR-07 selector's options (FR-S7-01). */
  mappingParameters: Parameter[]
  selectedParameterId: string | undefined
  setSelectedParameterId: (parameterId: string | undefined) => void
  /** Header block for the selected parameter, as the server composed it. */
  parameter: MappingParameter | null
  items: ParameterMapping[]
  totalCount: number
  /** Values seen in the trailing 7 days with no mapping (FR-S7-02). */
  unmapped: UnmappedValue[]
  unmappedWindowDays: number
  loadingParameters: boolean
  loading: boolean
  error: boolean
  saving: boolean
  reload: () => Promise<void>
  create: (input: ParameterMappingSaveInput) => Promise<ParameterMapping>
  update: (mappingId: string, input: ParameterMappingSaveInput) => Promise<ParameterMapping>
  remove: (mappingId: string) => Promise<void>
  /** US7 — downloads the 3-column workbook for the selected parameter (FR-S7-05). */
  exportCurrent: () => Promise<void>
  exporting: boolean
  /** US7 — Merge or Replace-all; rejects with `MappingImportError` carrying the row report. */
  importFile: (file: File, mode: MappingImportMode) => Promise<MappingImportResult>
  replaceAll: (file: File) => Promise<MappingImportResult>
}

export function useMappings(): UseMappingsResult {
  const [allParameters, setAllParameters] = useState<Parameter[]>([])
  const [loadingParameters, setLoadingParameters] = useState(true)
  const [selectedParameterId, setSelectedParameterId] = useState<string | undefined>(undefined)

  const [parameter, setParameter] = useState<MappingParameter | null>(null)
  const [items, setItems] = useState<ParameterMapping[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unmapped, setUnmapped] = useState<UnmappedValue[]>([])
  const [unmappedWindowDays, setUnmappedWindowDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load the catalogue once and keep only the mapping-enabled entries (BR-27).
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingParameters(true)
      try {
        const page = await listParameters({ limit: FETCH_SIZE })
        if (cancelled) return
        const enabled = page.items.filter((p) => p.mappingSupport)
        setAllParameters(enabled)
        // Select the first mapping-enabled parameter so the screen is never empty on arrival.
        setSelectedParameterId((current) => current ?? enabled[0]?.id)
      } catch {
        if (!cancelled) setAllParameters([])
      } finally {
        if (!cancelled) setLoadingParameters(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const reload = useCallback(async () => {
    if (!selectedParameterId) {
      setParameter(null)
      setItems([])
      setUnmapped([])
      setTotalCount(0)
      return
    }
    setLoading(true)
    setError(false)
    try {
      // Table and queue together: adding a mapping must visibly drain the queue in one go.
      const [page, queue] = await Promise.all([
        listMappings(selectedParameterId, { limit: FETCH_SIZE }),
        listUnmappedValues(selectedParameterId),
      ])
      setParameter(page.parameter)
      setItems(page.items)
      setTotalCount(page.totalCount)
      setUnmapped(queue.items)
      setUnmappedWindowDays(queue.windowDays)
    } catch {
      setError(true)
      setItems([])
      setUnmapped([])
    } finally {
      setLoading(false)
    }
  }, [selectedParameterId])

  useEffect(() => {
    void reload()
  }, [reload])

  const create = useCallback(
    async (input: ParameterMappingSaveInput) => {
      if (!selectedParameterId) throw new Error("no parameter selected")
      setSaving(true)
      try {
        const saved = await createMapping(selectedParameterId, input)
        // Refetch rather than splicing: the new mapping may have drained a queue entry, and the
        // server owns that decision (case-insensitive match against the raw value).
        await reload()
        return saved
      } finally {
        setSaving(false)
      }
    },
    [selectedParameterId, reload],
  )

  const update = useCallback(
    async (mappingId: string, input: ParameterMappingSaveInput) => {
      if (!selectedParameterId) throw new Error("no parameter selected")
      setSaving(true)
      try {
        const saved = await updateMapping(selectedParameterId, mappingId, input)
        setItems((prev) => prev.map((m) => (m.id === mappingId ? saved : m)))
        return saved
      } finally {
        setSaving(false)
      }
    },
    [selectedParameterId],
  )

  const remove = useCallback(
    async (mappingId: string) => {
      if (!selectedParameterId) return
      setSaving(true)
      try {
        await deleteMapping(selectedParameterId, mappingId)
        // A deleted mapping means its source value is unmapped again, so the queue may repopulate
        // on the next inbound request — refetch rather than assuming.
        await reload()
      } finally {
        setSaving(false)
      }
    },
    [selectedParameterId, reload],
  )

  const [exporting, setExporting] = useState(false)

  const exportCurrent = useCallback(async () => {
    if (!selectedParameterId) return
    setExporting(true)
    try {
      const { blob, filename } = await exportMappings(selectedParameterId)
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
  }, [selectedParameterId])

  const importFile = useCallback(
    async (file: File, mode: MappingImportMode) => {
      if (!selectedParameterId) throw new Error("no parameter selected")
      const result = await importMappings(selectedParameterId, file, mode)
      // Refetch: an import can add, update AND drain queue entries in one go.
      await reload()
      return result
    },
    [selectedParameterId, reload],
  )

  const replaceAll = useCallback(
    async (file: File) => {
      if (!selectedParameterId) throw new Error("no parameter selected")
      const result = await replaceAllMappings(selectedParameterId, file)
      await reload()
      return result
    },
    [selectedParameterId, reload],
  )

  const mappingParameters = useMemo(() => allParameters, [allParameters])

  return {
    mappingParameters,
    selectedParameterId,
    setSelectedParameterId,
    parameter,
    items,
    totalCount,
    unmapped,
    unmappedWindowDays,
    loadingParameters,
    loading,
    error,
    saving,
    reload,
    create,
    update,
    remove,
    exportCurrent,
    exporting,
    importFile,
    replaceAll,
  }
}
