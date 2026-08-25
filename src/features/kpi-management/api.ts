// Clickthrough shim for the M-06 KPI catalogue client. The Action Management screens
// only need the KPI dropdown (id + short name), so this serves a small in-memory
// catalogue instead of calling `GET /api/v1/kpis`. No network.

export type KpiType = "Standard" | "Custom"
export type KpiTypeFilter = "All" | "Standard" | "Custom"

export interface KpiListItem {
  id: string
  shortName: string
  fullName: string
  kpiType: KpiType
  isComposite: boolean
  scale: string | null
  calculationMethod: string
  calculationMethodLabel: string
  scaleLabel: string
  target: number | null
  isActive: boolean
  showOnDashboard: boolean
  createdAt: string
}

export interface KpiListResult {
  items: KpiListItem[]
  nextCursor: string | null
}

export interface ListKpisParams {
  type?: KpiTypeFilter
  activeOnly?: boolean
  search?: string
  cursor?: string
  limit?: number
}

const MOCK_KPIS: KpiListItem[] = [
  mk("kpi-nps", "NPS", "Net Promoter Score", "Standard", "-100..100", -100, 100, 45),
  mk("kpi-csat", "CSAT", "Customer Satisfaction", "Standard", "0..100 %", 0, 100, 85),
  mk("kpi-ces", "CES", "Customer Effort Score", "Standard", "1..7", 1, 7, 5),
  mk("kpi-fcr", "FCR", "First Contact Resolution", "Standard", "0..100 %", 0, 100, 80),
  mk("kpi-cxi", "CXI", "Customer Experience Index", "Standard", "0..100", 0, 100, 78, true),
  mk("kpi-aht", "AHT", "Average Handle Time", "Custom", "seconds", 0, 600, 240),
  mk("kpi-vfm", "VFM", "Value for Money", "Custom", "0..100 %", 0, 100, 70, false, false),
]

function mk(
  id: string,
  shortName: string,
  fullName: string,
  kpiType: KpiType,
  scaleLabel: string,
  _min: number,
  _max: number,
  target: number | null,
  isComposite = false,
  isActive = true,
): KpiListItem {
  return {
    id,
    shortName,
    fullName,
    kpiType,
    isComposite,
    scale: scaleLabel,
    calculationMethod: "average",
    calculationMethodLabel: "Average",
    scaleLabel,
    target,
    isActive,
    showOnDashboard: true,
    createdAt: "2026-01-01T00:00:00Z",
  }
}

/** Lists the tenant's KPI catalogue (clickthrough mock, no network). */
export async function listKpis(params: ListKpisParams = {}): Promise<KpiListResult> {
  let items = MOCK_KPIS
  if (params.activeOnly === true) items = items.filter((k) => k.isActive)
  if (params.type && params.type !== "All") items = items.filter((k) => k.kpiType === params.type)
  const search = params.search?.trim().toLowerCase()
  if (search) {
    items = items.filter(
      (k) =>
        k.shortName.toLowerCase().includes(search) || k.fullName.toLowerCase().includes(search),
    )
  }
  return { items: [...items], nextCursor: null }
}
