import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { KPI_DETAIL_DATA } from "@/components/cx/kpi-detail-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SingleTrendChart, DistributionBarChart, SegmentBarChart } from "@/components/charts/kpi-detail-charts"
import { ArrowRight, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react"

export default function KpiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === "ar"

  const data = id ? KPI_DETAIL_DATA[id] : null
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
      </div>
    )
  }

  const displayTitle = isArabic ? data.titleAr : data.title
  const weekLabel = t("cx.week")
  const weekLabels = data.trend.map((_, i) => `${weekLabel}${i + 1}`)
  const unit = id === "nps" ? "" : "%"

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
      {/* ── Hero Header ──────────────────────── */}
      <div className="rounded-2xl bg-accent dark:bg-muted px-6 py-5 border border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 mt-1"
              aria-label={t("common.back")}
              onClick={() => navigate("/dashboard")}
            >
              <ArrowRight className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {isArabic ? "تقرير مفصّل" : "Detailed KPI Report"}
                </span>
              </div>
              <h1 className="text-2xl font-heading font-bold">{displayTitle}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isArabic ? "استبيان ما بعد المعاملة" : "Post-Transaction Survey"}
              </p>
            </div>
          </div>
          <div className="text-end shrink-0">
            <span className="text-4xl font-heading font-bold tabular-nums" style={{ color: data.color }}>
              {data.value}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {isArabic ? "الفترة الحالية" : "Current period"}
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Insight + Trend (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-s-4 border-s-nb-cyan bg-nb-cyan-100/50 dark:bg-nb-cyan-900/20">
          <CardContent className="flex gap-3 items-start">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nb-cyan-100 dark:bg-nb-cyan-900/30">
              <Sparkles className="size-5 text-nb-cyan" />
            </div>
            <div>
              <p className="text-xs font-bold text-nb-cyan-700 dark:text-nb-cyan-300 mb-1.5">
                {t("cx.detailInsightLabel")}
              </p>
              <p className="text-sm leading-relaxed">{t(data.insightKey)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="">
            <h3 className="text-sm font-bold mb-2">{t("cx.detailTrend")}</h3>
            <SingleTrendChart values={data.trend} labels={weekLabels} color={data.color} unit={unit} className="h-40" />
          </CardContent>
        </Card>
      </div>

      {/* ── Distribution + Segments (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Distribution */}
        <Card>
          <CardContent className="">
            <h3 className="text-sm font-bold mb-2">{t("cx.detailDistribution")}</h3>
            <DistributionBarChart
              items={data.distribution.map((d) => ({ name: isArabic ? d.labelAr : d.label, value: d.value, color: d.color }))}
              className="h-64"
            />
          </CardContent>
        </Card>

        {/* Segment Breakdown */}
        <Card>
          <CardContent className="">
            <h3 className="text-sm font-bold mb-2">{t("cx.detailSegments")}</h3>
            <SegmentBarChart
              items={data.segments.map((sg) => ({ name: isArabic ? sg.nameAr : sg.name, value: sg.value }))}
              kpiId={id}
              className="h-64"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Top Drivers ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-s-4 border-s-d2">
          <CardContent className="">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-d2-light dark:bg-d2-dark/20 shrink-0">
                <ThumbsUp className="size-4 text-d2-dark dark:text-d2-light" />
              </div>
              <div>
                <p className="text-xs font-bold text-d2-dark dark:text-d2-light mb-1">
                  {t("cx.detailTopDriverPos")}
                </p>
                <p className="text-sm leading-relaxed">
                  {isArabic ? data.topDriverPos.ar : data.topDriverPos.en}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-s-4 border-s-d5">
          <CardContent className="">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-d5-light dark:bg-d5-dark/20 shrink-0">
                <ThumbsDown className="size-4 text-d5-dark dark:text-d5-light" />
              </div>
              <div>
                <p className="text-xs font-bold text-d5-dark dark:text-d5-light mb-1">
                  {t("cx.detailTopDriverNeg")}
                </p>
                <p className="text-sm leading-relaxed">
                  {isArabic ? data.topDriverNeg.ar : data.topDriverNeg.en}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
