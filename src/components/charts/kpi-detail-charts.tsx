// KPI detail page charts on Apache ECharts — single-KPI trend, response distribution,
// and segment (branch) breakdown. Tokens come from the live theme via useChartTokens.

import { useMemo } from "react"
import { perfColor } from "@/components/cx/kpi-flip-card"
import { EChart, echarts, resolveCssColor, useChartTokens, withAlpha, type EChartsOption } from "./echart"

const EASE = "cubicOut" as const

/** 12-week trend for one KPI: gradient area, point markers, dashed average line, labelled last value. */
export function SingleTrendChart({
  values, labels, color, unit = "", className,
}: {
  values: number[]; labels: string[]; color: string; unit?: string; className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const c = resolveCssColor(color)
    const min = Math.min(...values), max = Math.max(...values)
    const last = values.length - 1
    return {
      animationDuration: 900,
      animationEasing: EASE,
      grid: { left: 8, right: 34, top: 14, bottom: 4, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.border } }, valueFormatter: (v) => `${v}${unit}` },
      xAxis: { type: "category", boundaryGap: false, data: labels, axisLabel: { margin: 10 } },
      yAxis: { type: "value", min: Math.floor((min - 4) / 5) * 5, max: Math.ceil((max + 4) / 5) * 5, splitNumber: 4 },
      series: [
        {
          type: "line",
          smooth: 0.35,
          data: values,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5, color: c },
          itemStyle: { color: c, borderColor: t.card, borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: withAlpha(c, 0.3) },
              { offset: 1, color: withAlpha(c, 0.03) },
            ]),
          },
          markLine: {
            symbol: "none",
            animation: false,
            data: [{ type: "average", name: "avg" }],
            lineStyle: { type: "dashed", color: withAlpha(t.muted, 0.7), width: 1 },
            label: { position: "insideStartTop", formatter: (p) => `avg ${Math.round(Number(p.value))}${unit}`, color: t.muted, fontSize: 10 },
          },
          markPoint: {
            symbol: "circle",
            symbolSize: 11,
            itemStyle: { color: c, borderColor: t.card, borderWidth: 2 },
            label: { show: true, position: "right", formatter: `${values[last]}${unit}`, color: t.fg, fontWeight: 700, fontSize: 11 },
            data: [{ name: "latest", coord: [labels[last], values[last]] }],
            animation: false,
          },
          emphasis: { focus: "series" },
        },
      ],
    }
  }, [values, labels, color, unit, t])
  return <EChart option={option} className={className} ariaLabel="Trend" />
}

/** Sentiment-graded distribution (Promoters / Passives / Detractors …) as horizontal bars with % labels. */
export function DistributionBarChart({
  items, className,
}: {
  items: { name: string; value: number; color: string }[]; className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 800,
    animationEasing: EASE,
    grid: { left: 8, right: 44, top: 4, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v}%` },
    xAxis: { type: "value", max: 100, show: false },
    yAxis: { type: "category", inverse: true, data: items.map((i) => i.name), axisLabel: { color: t.fg, fontSize: 12, fontWeight: 600, width: 120, overflow: "truncate" } },
    series: [
      {
        type: "bar",
        barWidth: 18,
        data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color } })),
        itemStyle: { borderRadius: 7 },
        showBackground: true,
        backgroundStyle: { color: withAlpha(t.muted, 0.15), borderRadius: 7 },
        label: { show: true, position: "right", distance: 8, formatter: "{c}%", fontWeight: 700, fontSize: 12, color: t.fg },
        emphasis: { focus: "series" },
      },
    ],
  }), [items, t])
  return <EChart option={option} className={className} ariaLabel="Response distribution" />
}

/** Segment / branch breakdown: bars proportional to the best segment, each coloured by its KPI band. */
export function SegmentBarChart({
  items, kpiId, className,
}: {
  items: { name: string; value: number }[]; kpiId?: string; className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const sorted = [...items].sort((a, b) => b.value - a.value)
    const max = Math.max(...sorted.map((i) => i.value))
    return {
      animationDuration: 800,
      animationEasing: EASE,
      grid: { left: 8, right: 40, top: 4, bottom: 4, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", max: max * 1.08, show: false },
      yAxis: { type: "category", inverse: true, data: sorted.map((i) => i.name), axisLabel: { color: t.fg, fontSize: 12, fontWeight: 600, width: 120, overflow: "truncate" } },
      series: [
        {
          type: "bar",
          barWidth: 14,
          data: sorted.map((i) => ({ value: i.value, itemStyle: { color: perfColor(i.value, kpiId) } })),
          itemStyle: { borderRadius: 7 },
          showBackground: true,
          backgroundStyle: { color: withAlpha(t.muted, 0.15), borderRadius: 7 },
          label: {
            show: true, position: "right", distance: 8, fontWeight: 800, fontSize: 12,
            formatter: (p) => `{v|${p.value}}`,
            rich: Object.fromEntries([["v", { fontWeight: 800, fontSize: 12, color: t.fg }]]),
          },
          emphasis: { focus: "series" },
        },
      ],
    }
  }, [items, kpiId, t])
  return <EChart option={option} className={className} ariaLabel="Segment breakdown" />
}
