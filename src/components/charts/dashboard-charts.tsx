// Dashboard charts on Apache ECharts. Each component builds its option from the live
// design tokens (useChartTokens) so light/dark and tenant themes apply automatically.
// Brand `chart-*` colours carry series; the D1–D5 scale is used only where a value is a
// status (gauge zones, sentiment split, radar performance gradient) — Two-Palette Rule.

import { useMemo } from "react"
import { EChart, echarts, resolveCssColor, useChartTokens, withAlpha, type EChartsOption } from "./echart"
import type { BarSeriesOption, GaugeSeriesOption, LineSeriesOption } from "echarts/charts"

const EASE = "cubicOut" as const

// ─── KPI trend (multi-series line, one emphasised series, action markers) ───

export function KpiTrendChart({
  data, xKey = "week", config, visible, markers, className,
}: {
  data: Record<string, number | string>[]
  xKey?: string
  config: Record<string, { label: string; color: string }>
  visible: Record<string, boolean>
  markers?: { x: string; title: string }[]
  className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const keys = Object.keys(config).filter((k) => visible[k])
    const focus = keys[0]
    const xs = data.map((d) => String(d[xKey]))
    const last = data.length - 1
    const markerColors = [t.chart[3], t.chart[4]]
    const all = keys.flatMap((k) => data.map((d) => Number(d[k])))
    const yMin = Math.max(0, Math.floor((Math.min(...all) - 6) / 10) * 10)
    const yMax = Math.min(100, Math.ceil((Math.max(...all) + 6) / 10) * 10)
    const series = keys.map((key): LineSeriesOption => {
      const c = resolveCssColor(config[key].color)
      const isFocus = key === focus
      const lastVal = Number(data[last][key])
      return {
        id: key,
        name: config[key].label,
        type: "line" as const,
        smooth: 0.35,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 7,
        data: data.map((d) => Number(d[key])),
        lineStyle: { width: isFocus ? 2.5 : 1.75, color: c, opacity: isFocus ? 1 : 0.72 },
        itemStyle: { color: c, borderColor: t.card, borderWidth: 2 },
        emphasis: { focus: "series" as const, lineStyle: { width: 3, opacity: 1 } },
        z: isFocus ? 3 : 2,
        ...(isFocus
          ? {
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(c, 0.28) },
                  { offset: 1, color: withAlpha(c, 0.02) },
                ]),
              },
              markPoint: {
                symbol: "circle",
                symbolSize: 10,
                itemStyle: { color: c, borderColor: t.card, borderWidth: 2 },
                label: { show: true, position: "right" as const, formatter: String(lastVal), color: t.fg, fontWeight: 700, fontSize: 11 },
                data: [
                  { name: "latest", coord: [xs[last], lastVal] },
                  ...(markers ?? []).map((m, i) => ({
                    name: m.title,
                    coord: [m.x, Number(data[xs.indexOf(m.x)]?.[key] ?? 0)],
                    itemStyle: { color: markerColors[i % 2], borderColor: t.card, borderWidth: 2 },
                    symbolSize: 12,
                    label: { show: false },
                  })),
                ],
                animation: false,
              },
              markLine: markers?.length
                ? {
                    symbol: "none",
                    animation: false,
                    lineStyle: { type: "dashed" as const, width: 1.5 },
                    label: { position: "end" as const, fontSize: 10, fontWeight: 600, distance: 6 },
                    data: markers.map((m, i) => ({
                      xAxis: m.x,
                      lineStyle: { color: markerColors[i % 2], opacity: 0.85 },
                      label: { formatter: m.title, color: markerColors[i % 2] },
                    })),
                  }
                : undefined,
            }
          : {}),
      }
    })
    return {
      animationDuration: 900,
      animationEasing: EASE,
      grid: { left: 8, right: 36, top: markers?.length ? 30 : 16, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: t.border } },
        order: "valueDesc",
      },
      xAxis: { type: "category", boundaryGap: false, data: xs, axisLabel: { margin: 12 } },
      yAxis: { type: "value", min: yMin, max: yMax, splitNumber: 5 },
      series,
    }
  }, [data, xKey, config, visible, markers, t])
  return <EChart option={option} className={className} ariaLabel="KPI trend" />
}

// ─── Customer journey — ink current vs dashed previous; a stage that dropped ≥5 pts is red ───

export function JourneyChart({
  data, labels, className,
}: {
  data: { stage: string; current: number; previous: number }[]
  labels: { current: string; previous: string }
  className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 900,
    animationEasing: EASE,
    grid: { left: 8, right: 28, top: 22, bottom: 34, containLabel: true },
    legend: { bottom: 0, left: "center", data: [labels.current, labels.previous], icon: "rect", itemWidth: 14, itemHeight: 2 },
    tooltip: { trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.border } }, valueFormatter: (v) => `${v}%` },
    xAxis: { type: "category", boundaryGap: false, data: data.map((d) => d.stage), axisLabel: { margin: 12, interval: 0 } },
    yAxis: { type: "value", min: 40, max: 100, interval: 15 },
    series: [
      {
        name: labels.previous,
        type: "line",
        data: data.map((d) => d.previous),
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 1.5, type: "dashed", color: t.muted },
        itemStyle: { color: t.muted },
        z: 2,
      },
      {
        name: labels.current,
        type: "line",
        data: data.map((d) => {
          const drop = d.previous - d.current >= 5
          return drop
            ? { value: d.current, itemStyle: { color: t.red, borderColor: t.card }, label: { color: t.red } }
            : d.current
        }),
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2.5, color: t.fg },
        itemStyle: { color: t.fg, borderColor: t.card, borderWidth: 2 },
        label: { show: true, position: "top", distance: 8, fontSize: 11, fontWeight: 700, color: t.fg, formatter: "{c}%" },
        emphasis: { focus: "series" },
        z: 3,
      },
    ],
  }), [data, labels, t])
  return <EChart option={option} className={className} ariaLabel="Customer journey" />
}

// ─── Response funnel ───────────────────────────────────────

export function FunnelChart({
  data, convWord, className,
}: {
  data: { name: string; value: number; pct: number }[]
  convWord: string
  className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const shades = ["var(--color-nb-cyan-300)", "var(--color-nb-cyan)", "var(--color-nb-cyan-700)", "var(--color-nb-cyan-800)"].map(resolveCssColor)
    return {
      animationDuration: 900,
      animationEasing: EASE,
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const q = p as { name: string; value: number; dataIndex: number }
          const d = data[q.dataIndex]
          return `<b>${q.name}</b><br/>${q.value.toLocaleString("en-US")}${q.dataIndex > 0 ? ` · ${d.pct}% ${convWord}` : ""}`
        },
      },
      series: [
        {
          type: "funnel",
          left: "4%",
          width: "92%",
          top: 4,
          bottom: 4,
          sort: "descending",
          minSize: "34%",
          maxSize: "100%",
          gap: 4,
          itemStyle: { borderColor: t.card, borderWidth: 2 },
          label: {
            show: true,
            position: "inside",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            formatter: (p: unknown) => {
              const q = p as { name: string; value: number; dataIndex: number }
              const conv = q.dataIndex > 0 ? `  ·  ${data[q.dataIndex].pct}% ${convWord}` : ""
              return `{n|${q.name}}\n{v|${q.value.toLocaleString("en-US")}}{c|${conv}}`
            },
            rich: {
              n: { fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 16 },
              v: { fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 20 },
              c: { fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.85)", lineHeight: 20 },
            },
          },
          emphasis: { label: { fontSize: 12 } },
          data: data.map((d, i) => ({ name: d.name, value: d.value, itemStyle: { color: shades[i % shades.length] } })),
        },
      ],
    }
  }, [data, convWord, t])
  return <EChart option={option} className={className} ariaLabel="Response funnel" />
}

// ─── Topics × sentiment — 100% stacked: ink positive · grey neutral · red negative ───

export function TopicSentimentChart({
  data, labels, className,
}: {
  data: { name: string; mentions: number; positive: number; neutral: number; negative: number; emerging?: boolean }[]
  labels: { positive: string; neutral: string; negative: string; mentions: string; emerging: string }
  className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const onInk = t.card
    const onRed = t.dark ? resolveCssColor("var(--color-nb-navy)") : "#fff"
    const neutral = withAlpha(t.muted, t.dark ? 0.35 : 0.28)
    const seg = (name: string, key: "positive" | "neutral" | "negative", color: string, labelColor: string): BarSeriesOption => ({
      name,
      type: "bar",
      stack: "sentiment",
      barWidth: 16,
      data: data.map((d) => d[key]),
      itemStyle: { color, borderColor: t.card, borderWidth: 1 },
      label: {
        show: true,
        position: "insideLeft",
        distance: 6,
        fontSize: 10.5,
        fontWeight: 700,
        color: labelColor,
        formatter: (p) => ((p.value as number) >= 12 ? `${p.value}%` : ""),
      },
      emphasis: { focus: "series" },
    })
    return {
      animationDuration: 800,
      animationEasing: EASE,
      grid: { left: 8, right: 8, top: 4, bottom: 30, containLabel: true },
      legend: { bottom: 0, left: 0, data: [labels.positive, labels.neutral, labels.negative], icon: "rect", itemWidth: 10, itemHeight: 10 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v}%` },
      xAxis: { type: "value", max: 100, show: false },
      yAxis: [
        {
          type: "category",
          inverse: true,
          data: data.map((d) => d.name),
          axisLabel: {
            color: t.fg,
            fontSize: 12,
            fontWeight: 600,
            formatter: (name: string) => (data.find((x) => x.name === name)?.emerging ? `${name} {em|${labels.emerging}}` : name),
            rich: { em: { color: t.red, backgroundColor: withAlpha(t.red, 0.12), fontSize: 9, fontWeight: 700, padding: [2, 6], borderRadius: 4 } },
          },
        },
        {
          type: "category",
          inverse: true,
          position: "right",
          data: data.map((d) => `${d.mentions} ${labels.mentions}`),
          axisLabel: { color: t.muted, fontSize: 10.5 },
        },
      ],
      series: [
        seg(labels.positive, "positive", t.fg, onInk),
        seg(labels.neutral, "neutral", neutral, t.fg),
        seg(labels.negative, "negative", t.red, onRed),
      ],
    }
  }, [data, labels, t])
  return <EChart option={option} className={className} ariaLabel="Topics and sentiment" />
}

// ─── Index profile radar — ink current vs dashed target, axis labelled with value, misses in red ───

export function KpiRadarChart({
  kpis, target, labels, className,
}: {
  kpis: { label: string; value: number }[]
  target?: number[]
  labels?: { current: string; target: string }
  className?: string
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    // Same tolerance as the KPI band: a miss is a shortfall beyond 5% of the (normalised) range.
    const miss = (i: number) => (target ? kpis[i].value < target[i] - 5 : false)
    const rich: Record<string, { color: string; fontSize: number; fontWeight: number }> = {}
    kpis.forEach((_, i) => { rich[`l${i}`] = { color: miss(i) ? t.red : t.fg, fontSize: 12, fontWeight: 700 } })
    const cur = labels?.current ?? "Current", tgt = labels?.target ?? "Target"
    return {
      animationDuration: 900,
      animationEasing: EASE,
      tooltip: { trigger: "item" },
      legend: target ? { orient: "vertical", left: 0, bottom: 0, data: [cur, tgt], icon: "rect", itemWidth: 14, itemHeight: 2 } : undefined,
      radar: {
        indicator: kpis.map((k) => ({ name: k.label, max: 100 })),
        radius: "64%",
        center: ["50%", "50%"],
        splitNumber: 4,
        axisName: {
          formatter: (name?: string) => {
            const i = kpis.findIndex((k) => k.label === name)
            return `{l${i}|${name} ${kpis[i]?.value ?? ""}}`
          },
          rich,
        },
        splitLine: { lineStyle: { color: withAlpha(t.border, 0.9) } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: withAlpha(t.border, 0.8) } },
      },
      series: [
        ...(target
          ? [{
              type: "radar" as const,
              name: tgt,
              symbol: "none",
              data: [{ value: target, name: tgt }],
              lineStyle: { color: t.muted, width: 1.5, type: "dashed" as const },
              itemStyle: { color: t.muted },
              areaStyle: { color: "transparent" },
              z: 2,
            }]
          : []),
        {
          type: "radar",
          name: cur,
          symbol: "circle",
          symbolSize: 8,
          data: [{ value: kpis.map((k) => k.value), name: cur }],
          lineStyle: { color: t.fg, width: 2.5 },
          itemStyle: { color: t.fg, borderColor: t.card, borderWidth: 1.5 },
          areaStyle: { color: "transparent" },
          emphasis: { lineStyle: { width: 3 } },
          z: 3,
        },
      ],
    }
  }, [kpis, target, labels, t])
  return <EChart option={option} className={className} ariaLabel="KPI index profile" />
}

// ─── KPI gauge — instrument style: 270° sweep, soft zone band, ticks + min/max, gradient arc, needle ───

export function KpiGaugeChart({
  value, min = 0, max = 100, color, targetPct, label, size = 185,
}: {
  value: number; min?: number; max?: number; color: string; targetPct?: number; label: string; size?: number
}) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => {
    const c = resolveCssColor(color)
    const displayVal = (min < 0 && value > 0) || (label === "NPS" && value > 0) ? `+${value}` : `${value}%`
    const band = Math.round(size * 0.075)
    const base: GaugeSeriesOption = {
      type: "gauge", startAngle: 225, endAngle: -45, min, max,
      center: ["50%", "53%"], radius: "86%",
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, detail: { show: false }, title: { show: false },
    }
    const series: GaugeSeriesOption[] = [
      // 1 · zone band as the track (bad / average / great), with tick marks
      {
        ...base,
        splitNumber: 10,
        axisLine: { lineStyle: { width: band, color: [[0.33, withAlpha(t.d5, 0.16)], [0.55, withAlpha(t.d3, 0.18)], [1, withAlpha(t.d2, 0.16)]] } },
        splitLine: { show: true, length: 5, distance: -band - 8, lineStyle: { color: t.muted, width: 1.5 } },
        axisTick: { show: true, splitNumber: 2, length: 2.5, distance: -band - 8, lineStyle: { color: withAlpha(t.muted, 0.6), width: 1 } },
        z: 1,
      },
      // 2 · gradient progress arc + needle + value
      {
        ...base,
        progress: {
          show: true, width: band, roundCap: true,
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 1, 1, 0, [{ offset: 0, color: withAlpha(c, 0.45) }, { offset: 1, color: c }]) },
        },
        axisLine: { show: false },
        pointer: { show: true, length: "62%", width: 4, itemStyle: { color: c } },
        anchor: { show: true, size: 9, showAbove: true, itemStyle: { color: t.card, borderColor: c, borderWidth: 2.5 } },
        detail: { show: true, valueAnimation: true, offsetCenter: [0, "42%"], fontSize: 24, fontWeight: 800, color: c, formatter: () => displayVal },
        title: { show: true, offsetCenter: [0, "68%"], fontSize: 9, fontWeight: 600, color: t.muted },
        data: [{ value, name: label }],
        z: 3,
      },
      // 3 · target marker riding outside the band
      ...(targetPct != null
        ? [{
            ...base,
            min: 0, max: 1,
            pointer: { show: true, icon: "triangle", width: 7, length: "7%", offsetCenter: [0, "-112%"], itemStyle: { color: t.fg } },
            data: [{ value: targetPct }],
            z: 4,
          } satisfies GaugeSeriesOption]
        : []),
    ]
    return { animationDuration: 1100, animationEasing: EASE, series }
  }, [value, min, max, color, targetPct, label, size, t])
  return <EChart option={option} className="w-full" style={{ height: size * 0.72 }} ariaLabel={`${label}: ${value}`} />
}

// ─── Reasons donut (flip-card back) ────────────────────────

export function ReasonsDonutChart({ data, size = 130 }: { data: { key: string; value: number; color: string }[]; size?: number }) {
  const t = useChartTokens()
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 700,
    animationEasing: EASE,
    tooltip: { trigger: "item", formatter: "{b}: {c}%" },
    series: [
      {
        type: "pie",
        radius: ["60%", "92%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: t.card, borderWidth: 2, borderRadius: 3 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data: data.map((d) => ({ name: d.key, value: d.value, itemStyle: { color: d.color } })),
      },
    ],
  }), [data, t])
  return <EChart option={option} style={{ width: size, height: size }} className="shrink-0" ariaLabel="Reasons breakdown" />
}
