import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Inbox, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsIndicator } from "@/components/ui/tabs"
import { useSession } from "@/features/auth/hooks/useSession"
import { listKpis } from "@/features/kpi-management/api"

import { archiveAction, unarchiveAction, type Action } from "../api"
import { ActionCard } from "../components/ActionCard"
import { ActionsFilterToolbar } from "../components/ActionsFilterToolbar"
import type { KpiOption } from "../components/KpiTargetFieldset"
import { useActions } from "../hooks/useActions"

// ── FR-101..111 All Actions page (SCR-01) ────────────────────────────────────
//
// Four date-computed tabs (Active/Planned/Completed/Archived) with count pills, a cross-tab name
// search (FR-106), per-tab empty states, and a skeleton loading state. The KPI/date filter toolbar
// is US8 (T134); archive/unarchive wiring is US6. Grouping + search run client-side over one fetch
// (NFR-5).

type Tab = "active" | "planned" | "completed" | "archived"
const TABS: Tab[] = ["active", "planned", "completed", "archived"]
const TAB_LABEL_KEY: Record<Tab, string> = {
  active: "actions.tabActive",
  planned: "actions.tabPlanned",
  completed: "actions.tabCompleted",
  archived: "actions.tabArchived",
}
/** Per-tab empty-state headline — a distinct key per tab, never an interpolated "No {{tab}} actions". */
const TAB_EMPTY_KEY: Record<Tab, string> = {
  active: "actions.emptyActive",
  planned: "actions.emptyPlanned",
  completed: "actions.emptyCompleted",
  archived: "actions.emptyArchived",
}

const tabOf = (a: Action): Tab => (a.archived ? "archived" : (a.status as Tab))

export default function AllActionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useSession()
  const canWrite = session?.persona === "P-01"
  const { actions, loading, error, reload } = useActions()

  // Archive/Unarchive from the card kebab (BR-009 — no confirmation). Reloading regroups the card
  // into the Archived tab (or back) and updates the count pills.
  const handleArchive = async (id: string) => {
    try {
      await archiveAction(id)
      toast.success(t("actions.toastArchived"))
      await reload()
    } catch {
      toast.error(t("actions.toastUpdateFailed"))
    }
  }
  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveAction(id)
      toast.success(t("actions.toastUnarchived"))
      await reload()
    } catch {
      toast.error(t("actions.toastUpdateFailed"))
    }
  }

  // Preview-only: renders the local fixture with NO fetch so the design can be reviewed while C-01
  // leaves every real score null. OFF by default — never a fallback for the live data.
  const [tab, setTab] = useState<Tab>("active")
  const [query, setQuery] = useState("")

  // US8 filters (client-side, AND-combined with search — NFR-5). No Status/Created-by (BR-021).
  const [kpiOptions, setKpiOptions] = useState<KpiOption[]>([])
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([])
  const [startFrom, setStartFrom] = useState("")
  const [startTo, setStartTo] = useState("")

  useEffect(() => {
    let cancelled = false
    listKpis({ activeOnly: false, limit: 200 })
      .then((res) => {
        if (!cancelled) setKpiOptions(res.items.map((k) => ({ id: k.id, name: k.shortName })))
      })
      .catch(() => {
        /* a filter that can't list KPIs simply shows none — never blocks the page */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleKpi = (id: string) =>
    setSelectedKpiIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const hasActiveFilters = selectedKpiIds.length > 0 || startFrom !== "" || startTo !== ""
  const clearFilters = () => {
    setSelectedKpiIds([])
    setStartFrom("")
    setStartTo("")
  }

  const trimmed = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      actions.filter((a) => {
        // Search (name) AND KPI any-match AND Start-Date range — each blank clause matches everything.
        if (trimmed && !a.actionName.toLowerCase().includes(trimmed)) return false
        if (selectedKpiIds.length > 0 && !a.targets.some((t) => selectedKpiIds.includes(t.kpiId)))
          return false
        if (startFrom && a.actionStartDate < startFrom) return false
        if (startTo && a.actionStartDate > startTo) return false
        return true
      }),
    [actions, trimmed, selectedKpiIds, startFrom, startTo],
  )

  // Per-tab counts are the UNFILTERED totals (FR-106); the grids show the filtered set.
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { active: 0, planned: 0, completed: 0, archived: 0 }
    for (const a of actions) c[tabOf(a)] += 1
    return c
  }, [actions])

  const byTab = (which: Tab) => filtered.filter((a) => tabOf(a) === which)

  return (
    <div className="space-y-5 py-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-bold">{t("actions.pageTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("actions.pageSubtitle")}</p>
        </div>
        {canWrite && (
          <Button className="shrink-0" onClick={() => navigate("/actions/new")}>
            <Plus className="size-4" />
            {t("actions.addAction")}
          </Button>
        )}
      </div>

      {/* Toolbar — search + US8 filters, one `sm:items-end` row (CLAUDE.md Filter/Toolbar pattern) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Search — bounded so it groups with the filters instead of sprawling */}
          <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="actions-search">{t("actions.searchLabel")}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3" />
              <Input
                id="actions-search"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder={t("actions.searchPlaceholder")}
                className="ps-9"
                aria-label={t("actions.searchAria")}
              />
            </div>
          </div>
          <ActionsFilterToolbar
            kpiOptions={kpiOptions}
            selectedKpiIds={selectedKpiIds}
            onToggleKpi={toggleKpi}
            startFrom={startFrom}
            startTo={startTo}
            onStartFromChange={setStartFrom}
            onStartToChange={setStartTo}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        </div>
        {trimmed && (
          <p className="text-sm text-muted-foreground" role="status">
            {t(
              filtered.length === 1 ? "actions.searchMatchesOne" : "actions.searchMatchesOther",
              { n: filtered.length },
            )}
          </p>
        )}
      </div>

      {error ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("actions.loadError")}</p>
          <Button variant="outline" className="mt-4" onClick={() => void reload()}>
            {t("actions.tryAgain")}
          </Button>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          {/* Same segmented control the Survey Library uses, so the two list pages read as one
              system. `variant="line"` keeps each trigger's own active background transparent and
              lets the sliding TabsIndicator be the single moving highlight; the modifier-prefixed
              overrides are required because the base list pins `h-8` / `rounded-none` at a higher
              specificity than plain utilities. */}
          <TabsList
            variant="line"
            className="h-auto gap-1 rounded-lg border border-border bg-muted p-1 group-data-horizontal/tabs:h-auto data-[variant=line]:rounded-lg"
          >
            <TabsIndicator />
            {TABS.map((which) => (
              <TabsTrigger
                key={which}
                value={which}
                className="gap-1.5 px-3.5 py-1.5 after:hidden"
              >
                {t(TAB_LABEL_KEY[which])}
                <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground in-data-active:bg-primary/10 in-data-active:text-primary">
                  {counts[which]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((which) => (
            <TabsContent key={which} value={which} className="mt-4">
              {loading ? (
                <CardGridSkeleton />
              ) : byTab(which).length === 0 ? (
                <EmptyState
                  tab={which}
                  showCta={which !== "archived" && canWrite}
                  onAdd={() => navigate("/actions/new")}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {byTab(which).map((a) => (
                    <ActionCard
                      key={a.id}
                      action={a}
                      canWrite={canWrite}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="space-y-3 p-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ tab, showCta, onAdd }: { tab: Tab; showCta: boolean; onAdd: () => void }) {
  const { t } = useTranslation()

  return (
    // A dashed, card-tinted panel rather than bare text on the page background: the empty tab then
    // occupies the same visual slot the card grid would, so switching tabs doesn't collapse the
    // layout. Icon sits in a soft muted disc to give the block a focal point.
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold">{t(TAB_EMPTY_KEY[tab])}</h3>
      {showCta && (
        <>
          <p className="mt-1.5 mb-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("actions.emptyCta")}
          </p>
          <Button onClick={onAdd}>
            <Plus className="size-4" />
            {t("actions.addAction")}
          </Button>
        </>
      )}
    </div>
  )
}
