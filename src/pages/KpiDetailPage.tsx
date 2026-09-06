// KPI detail — one metric in depth. Same visual language as the dashboard's KPI band
// (value · delta · bullet bar vs target · three-way breakdown), plus the one place a rich
// gauge is the right tool: a single score against its target.

import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { KPI_DETAIL_DATA } from "@/components/cx/kpi-detail-modal"
import { perfColor, getKpiSegments } from "@/components/cx/kpi-flip-card"
import { KpiGaugeChart } from "@/components/charts/dashboard-charts"
import { SingleTrendChart, DistributionBarChart, SegmentBarChart } from "@/components/charts/kpi-detail-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUp, ArrowDown, AlertTriangle, CheckCircle, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react"

/** Tinted tile classes for the good · middle · bad segments (D2 · D3 · D5). */
const SEGMENT_TILE = [
  "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
]

export default function KpiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === "ar"

  const data = id ? KPI_DETAIL_DATA[id] : null
  if (!data || !id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
      </div>
    )
  }

  const m = data.meta
  const displayTitle = isArabic ? data.titleAr : data.title
  const weekLabel = t("cx.week")
  const weekLabels = data.trend.map((_, i) => `${weekLabel}${i + 1}`)
  const unit = id === "nps" ? "" : "%"

  // Same rule as the dashboard band: a miss is a shortfall beyond 5% of the metric's range.
  const range = id === "nps" ? 200 : 100
  const shortfall = m.lowerIsBetter ? m.numeric - m.target : m.target - m.numeric
  const miss = shortfall > range * 0.05
  const status = miss ? perfColor(m.numeric, id) : undefined
  const scaleMax = m.target * 1.15
  const fill = Math.min(100, (m.numeric / scaleMax) * 100)
  const tick = Math.min(100, (m.target / scaleMax) * 100)
  const valueWentUp = m.lowerIsBetter ? !m.changeUp : m.changeUp
  const gaugeMin = id === "nps" ? -100 : 0
  const segments = getKpiSegments(id, isArabic)

  return (
    <div className="px-8 py-5 space-y-5">
      {/* ── Hero: identity + value against target ── */}
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon-sm" className="mt-1 shrink-0" aria-label={t("common.back")} onClick={() => navigate("/dashboard")}>
              <ArrowRight className="size-5 rtl:rotate-180" />
            </Button>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {isArabic ? "تقرير مفصّل" : "Detailed KPI Report"}
                </span>
              </div>
              <h1 className="font-heading text-2xl font-bold">{displayTitle}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isArabic ? "استبيان ما بعد المعاملة" : "Post-Transaction Survey"}
                {m.lowerIsBetter && <> · {t("cx.lowerIsBetter")}</>}
              </p>
              <span
                className={cn(
                  "mt-3 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold",
                  miss ? "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light" : "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
                )}
              >
                {miss ? <AlertTriangle className="size-3" /> : <CheckCircle className="size-3" />}
                {miss ? t("cx.statusBelowTarget") : t("cx.statusOnTarget")}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-3 text-foreground" style={{ color: status }}>
              <span className="font-heading text-5xl leading-none font-bold tabular-nums" dir="ltr">{data.value}</span>
              <span className="inline-flex items-center gap-0.5 text-base font-bold tabular-nums">
                {valueWentUp ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                {m.change}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{t("cx.vsLastQuarter")}</span>
            </div>
            <div className="relative mt-4 h-3 w-full rounded-sm bg-muted" role="img" aria-label={`${data.value} / ${m.targetLabel}`}>
              <div className="h-full rounded-sm bg-primary motion-safe:transition-all motion-safe:duration-700" style={{ width: `${fill}%`, background: status }} />
              <div className="absolute -top-[3px] h-[18px] w-0.5 bg-foreground" style={{ insetInlineStart: `${tick}%` }} aria-hidden />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{m.lowerIsBetter ? t("cx.ceiling") : t("cx.target")} <b className="font-semibold text-foreground">{m.targetLabel.replace("≤", "")}</b></span>
              <span>{m.responses.toLocaleString("en-US")} {t("cx.responses")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Score gauge · breakdown · trend ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("cx.detailScoreVsTarget")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[240px]">
              <KpiGaugeChart
                value={m.numeric}
                min={gaugeMin}
                max={100}
                color={status ?? data.color}
                targetPct={(m.target - gaugeMin) / (100 - gaugeMin)}
                label={id.toUpperCase()}
                size={220}
              />
            </div>
            <div className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("cx.detailBreakdown")}</div>
            <div className="grid grid-cols-3 gap-2">
              {segments.map((sg, i) => (
                <div key={sg.key} className={cn("rounded-md px-2 py-2 text-center", SEGMENT_TILE[i])}>
                  <div className="text-sm font-bold tabular-nums">{sg.value}%</div>
                  <div className="truncate text-[10px] font-medium opacity-90">{sg.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base">{t("cx.detailTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SingleTrendChart values={data.trend} labels={weekLabels} color={data.color} unit={unit} className="h-64" />
          </CardContent>
        </Card>
      </div>

      {/* ── Insight · distribution · segments ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="border-s-4 border-s-nb-cyan bg-nb-cyan-100/50 dark:bg-nb-cyan-900/20 lg:col-span-4">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nb-cyan-100 dark:bg-nb-cyan-900/30">
              <Sparkles className="size-5 text-nb-cyan" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-nb-cyan-700 dark:text-nb-cyan-300">{t("cx.detailInsightLabel")}</p>
              <p className="text-sm leading-relaxed">{t(data.insightKey)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("cx.detailDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBarChart
              items={data.distribution.map((d, i) => ({ name: isArabic ? d.labelAr : d.label, value: segments[i]?.value ?? d.value, color: d.color }))}
              className="h-56"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("cx.detailSegments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SegmentBarChart
              items={data.segments.map((sg) => ({ name: isArabic ? sg.nameAr : sg.name, value: sg.value }))}
              kpiId={id}
              className="h-56"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Top drivers ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="border-s-4 border-s-d2">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-d2-light dark:bg-d2-dark/20">
              <ThumbsUp className="size-4 text-d2-dark dark:text-d2-light" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-d2-dark dark:text-d2-light">{t("cx.detailTopDriverPos")}</p>
              <p className="text-sm leading-relaxed">{isArabic ? data.topDriverPos.ar : data.topDriverPos.en}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-d5">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-d5-light dark:bg-d5-dark/20">
              <ThumbsDown className="size-4 text-d5-dark dark:text-d5-light" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-d5-dark dark:text-d5-light">{t("cx.detailTopDriverNeg")}</p>
              <p className="text-sm leading-relaxed">{isArabic ? data.topDriverNeg.ar : data.topDriverNeg.en}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
