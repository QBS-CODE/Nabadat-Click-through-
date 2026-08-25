import { Check, ChevronDown, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/cx/date-picker"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { KpiOption } from "./KpiTargetFieldset"

// ── FR-107 / US8 — All Actions filter toolbar (SCR-01) ───────────────────────
//
// KPI multi-select (any-match) + Start-Date range (both bounds optional). AND-combines with the name
// search and the tab grouping, all client-side over the one fetch (NFR-5) — the parent owns the state.
// **No Status / No Created-by control** (BR-021) — deliberately absent, and the E2E asserts that.
//
// Returns a Fragment of flex items so the parent can lay it out in the same `sm:items-end` filter row
// as the search input (the "Filter / Toolbar Row" pattern in CLAUDE.md).

export interface ActionsFilterToolbarProps {
  /** Tenant KPIs to filter by (the multi-select options). */
  kpiOptions: KpiOption[]
  selectedKpiIds: string[]
  onToggleKpi: (id: string) => void
  /** Start-Date range (ISO yyyy-MM-dd), "" when unset. */
  startFrom: string
  startTo: string
  onStartFromChange: (v: string) => void
  onStartToChange: (v: string) => void
  /** True when any of KPI / from / to is set — shows the Clear button. */
  hasActiveFilters: boolean
  onClear: () => void
}

export function ActionsFilterToolbar({
  kpiOptions,
  selectedKpiIds,
  onToggleKpi,
  startFrom,
  startTo,
  onStartFromChange,
  onStartToChange,
  hasActiveFilters,
  onClear,
}: ActionsFilterToolbarProps) {
  const { t } = useTranslation()

  const kpiLabel =
    selectedKpiIds.length === 0
      ? t("actions.filterAllKpis")
      : selectedKpiIds.length === 1
        ? (kpiOptions.find((k) => k.id === selectedKpiIds[0])?.name ?? t("actions.filterOneSelected"))
        : t("actions.filterNSelected", { n: selectedKpiIds.length })

  return (
    <>
      {/* KPI multi-select (any-match, FR-107 / BR-020) */}
      <div className="flex flex-col gap-1.5 sm:w-56">
        <Label htmlFor="filter-kpi">{t("actions.filterKpisLabel")}</Label>
        <Popover>
          {/* A FIELD, not a button: the `outline` button variant is the borderless soft-grey
              dismiss look (CLAUDE.md § Button Variants), which read here as a shaded blob rather
              than an input. Fields are `bg-card` + `border-input` at the 40px/12px control size, so
              this trigger now matches the Search input, the Selects and the DatePickers beside it. */}
          <PopoverTrigger
            id="filter-kpi"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm",
              "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              selectedKpiIds.length === 0 && "text-muted-foreground",
            )}
            aria-label={t("actions.filterKpiAria")}
            data-testid="filter-kpi-trigger"
          >
            <span className="truncate">{kpiLabel}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1" data-testid="filter-kpi-popover">
            {kpiOptions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">{t("actions.filterNoKpis")}</p>
            ) : (
              kpiOptions.map((k) => {
                const checked = selectedKpiIds.includes(k.id)
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => onToggleKpi(k.id)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-start text-sm hover:bg-accent"
                    data-testid={`filter-kpi-option-${k.id}`}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{k.name}</span>
                  </button>
                )
              })
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Start-Date range — both bounds optional (BR-020). `min`/`max` stop an inverted range. */}
      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-40">
        <Label htmlFor="filter-start-from">{t("actions.filterStartFrom")}</Label>
        <DatePicker
          id="filter-start-from"
          value={startFrom}
          max={startTo || undefined}
          onChange={onStartFromChange}
          aria-label={t("actions.filterStartFrom")}
          data-testid="filter-start-from"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-40">
        <Label htmlFor="filter-start-to">{t("actions.filterStartTo")}</Label>
        <DatePicker
          id="filter-start-to"
          value={startTo}
          min={startFrom || undefined}
          onChange={onStartToChange}
          aria-label={t("actions.filterStartTo")}
          data-testid="filter-start-to"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={onClear}
          className="sm:w-auto"
          data-testid="filter-clear"
        >
          <X className="size-4" />
          {t("actions.filterClear")}
        </Button>
      )}
    </>
  )
}
