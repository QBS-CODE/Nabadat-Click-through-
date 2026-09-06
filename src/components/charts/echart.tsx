// Apache ECharts wrapper for Nabadat — on-demand imports (echarts/core), SVG renderer,
// and a theme bridge that reads the live design tokens (so tenant themes and dark mode
// re-skin every chart with zero chart code). Charts stay LTR internally (time flows
// left→right); the container pins `direction:ltr` so RTL pages don't mirror SVG text.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import * as echarts from "echarts/core"
import { BarChart, FunnelChart, GaugeChart, LineChart, PieChart, RadarChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
} from "echarts/components"
import { LabelLayout, UniversalTransition } from "echarts/features"
import { SVGRenderer } from "echarts/renderers"
import type { ComposeOption } from "echarts/core"
import type {
  BarSeriesOption,
  FunnelSeriesOption,
  GaugeSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  RadarSeriesOption,
} from "echarts/charts"
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from "echarts/components"
import { cn } from "@/lib/utils"

echarts.use([
  LineChart, BarChart, PieChart, GaugeChart, RadarChart, FunnelChart,
  GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkPointComponent,
  LabelLayout, UniversalTransition, SVGRenderer,
])

export type EChartsOption = ComposeOption<
  | LineSeriesOption | BarSeriesOption | PieSeriesOption | GaugeSeriesOption | RadarSeriesOption | FunnelSeriesOption
  | GridComponentOption | TooltipComponentOption | LegendComponentOption
>
export { echarts }

// ─── Token bridge ──────────────────────────────────────────

/** Resolve any CSS color (hex, rgb, oklch, or a `var(--x)` reference) to an rgb() string ECharts can parse. */
export function resolveCssColor(value: string): string {
  if (typeof document === "undefined") return value
  let v = value.trim()
  const m = /^var\((--[^,)]+)(?:,\s*([^)]+))?\)$/.exec(v)
  if (m) v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || m[2] || v
  const el = document.createElement("span")
  el.style.color = v
  document.body.appendChild(el)
  const out = getComputedStyle(el).color
  el.remove()
  return out || v
}

/** Same as resolveCssColor but with an alpha override (0–1). */
export function withAlpha(value: string, alpha: number): string {
  const rgb = resolveCssColor(value)
  const m = /rgba?\(([^)]+)\)/.exec(rgb)
  if (!m) return rgb
  const [r, g, b] = m[1].split(",").map((s) => s.trim())
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface ChartTokens {
  dark: boolean
  fg: string
  muted: string
  border: string
  card: string
  popover: string
  chart: [string, string, string, string, string]
  d1: string; d2: string; d3: string; d4: string; d5: string
  stoneLt: string
  fontFamily: string
}

function readTokens(dark: boolean): ChartTokens {
  const v = (n: string) => resolveCssColor(`var(${n})`)
  return {
    dark,
    fg: v("--foreground"),
    muted: v("--muted-foreground"),
    border: v("--border"),
    card: v("--card"),
    popover: v("--popover"),
    chart: [v("--chart-1"), v("--chart-2"), v("--chart-3"), v("--chart-4"), v("--chart-5")],
    d1: v("--color-d1"), d2: v("--color-d2"), d3: v("--color-d3"), d4: v("--color-d4"), d5: v("--color-d5"),
    stoneLt: v("--color-nb-stone-lt"),
    fontFamily: getComputedStyle(document.body).fontFamily,
  }
}

/** True when `<html class="dark">` — the app's theme switch (next-themes, attribute="class"). */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
  useEffect(() => {
    const el = document.documentElement
    const mo = new MutationObserver(() => setDark(el.classList.contains("dark")))
    mo.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => mo.disconnect()
  }, [])
  return dark
}

/** Resolved design tokens for building chart options; recomputed when the theme flips. */
export function useChartTokens(): ChartTokens {
  const dark = useIsDark()
  return useMemo(() => readTokens(dark), [dark])
}

function buildTheme(t: ChartTokens) {
  const axisLabel = { color: t.muted, fontSize: 11, fontFamily: t.fontFamily }
  return {
    color: t.chart,
    backgroundColor: "transparent",
    textStyle: { fontFamily: t.fontFamily, color: t.fg },
    categoryAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel, splitLine: { show: false } },
    valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel, splitLine: { lineStyle: { color: withAlpha(t.border, 0.7) } } },
    legend: { textStyle: { color: t.muted, fontSize: 11 }, itemWidth: 10, itemHeight: 10, icon: "circle" },
    tooltip: {
      backgroundColor: t.popover,
      borderColor: t.border,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: t.fg, fontSize: 12, fontFamily: t.fontFamily },
      extraCssText: "border-radius:12px;box-shadow:0 8px 24px -8px rgba(30,34,53,.18);",
    },
    radar: {
      axisName: { color: t.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: withAlpha(t.border, 0.7) } },
      axisLine: { lineStyle: { color: withAlpha(t.border, 0.5) } },
      splitArea: { show: false },
    },
  }
}

// ─── Component ─────────────────────────────────────────────

export function EChart({
  option,
  className,
  style,
  ariaLabel,
  onEvents,
}: {
  option: EChartsOption
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  onEvents?: Record<string, (params: unknown) => void>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const tokens = useChartTokens()

  // (Re)create the instance whenever the theme flips — theme is baked in at init.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    echarts.registerTheme("nabadat", buildTheme(tokens))
    const chart = echarts.init(el, "nabadat", { renderer: "svg" })
    chartRef.current = chart
    chart.setOption(option, { notMerge: true })
    if (onEvents) for (const [ev, fn] of Object.entries(onEvents)) chart.on(ev, fn)
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens])

  useEffect(() => {
    chartRef.current?.setOption(option, { replaceMerge: ["series", "xAxis", "yAxis", "legend"], lazyUpdate: true })
  }, [option])

  return <div ref={ref} role="img" aria-label={ariaLabel} className={cn("w-full min-h-0", className)} style={{ direction: "ltr", ...style }} />
}
