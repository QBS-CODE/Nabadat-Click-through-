import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
  ArrowRight, ArrowLeft, Edit2, BarChart2, Users, CheckCircle,
  Clock, Layers, Eye, EyeOff, LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { PerQuestionResults } from "@/components/surveys/PerQuestionResults"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { MOCK_SURVEYS } from "@/data/mock-surveys"
import KpiDashboardPreview from "@/components/kpi/KpiDashboardPreview"
import { cn } from "@/lib/utils"

// ── D2 "Good" green — used only for the positive response-delta text ──────────
const D2 = "#2EB85C"

// ── Mock report data per survey ───────────────────────────────────────────────
interface SurveyStatsData {
  kpiIds: string[]
  completionRate: number
  /** Responses gained vs the previous comparable period. */
  respDelta: number
  startedCount: number
  completedCount: number
  medianTime: string
  touchpoints: number
  touchpointStages: number
}

const STATS: Record<string, SurveyStatsData> = {
  "srv-001": { kpiIds: ["csat", "nps", "ces"], completionRate: 82, respDelta: 312, startedCount: 3420, completedCount: 2804, medianTime: "1m 42s", touchpoints: 6, touchpointStages: 3 },
  "srv-002": { kpiIds: ["csat", "ces"],        completionRate: 78, respDelta: 96,  startedCount: 810,  completedCount: 634,  medianTime: "1m 20s", touchpoints: 3, touchpointStages: 2 },
  "srv-003": { kpiIds: ["nps", "csat"],        completionRate: 74, respDelta: 41,  startedCount: 1090, completedCount: 806,  medianTime: "2m 05s", touchpoints: 2, touchpointStages: 1 },
  "srv-005": { kpiIds: ["csat", "nps"],        completionRate: 84, respDelta: 58,  startedCount: 728,  completedCount: 612,  medianTime: "1m 10s", touchpoints: 4, touchpointStages: 2 },
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<string, [string, string]> = {
  "1": ["Last 1 day", "آخر يوم"],
  "7": ["Last 7 days", "آخر ٧ أيام"],
  month: ["Last month", "آخر شهر"],
  "3": ["Last 3 months", "آخر ٣ أشهر"],
  "6": ["Last 6 months", "آخر ٦ أشهر"],
  "9": ["Last 9 months", "آخر ٩ أشهر"],
  year: ["Last year", "آخر سنة"],
}

export default function SurveyStatsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const [period, setPeriod] = useState("month")
  const [showPerQ, setShowPerQ] = useState(true)

  const survey = id ? MOCK_SURVEYS.find((s) => s.id === id) : null
  const stats = id ? STATS[id] : undefined
  const periodLabel = isAr ? PERIOD_LABELS[period][1] : PERIOD_LABELS[period][0]

  const surveyName = survey
    ? (isAr ? survey.nameAr : survey.nameEn)
    : (isAr ? "استبيان" : "Survey")

  // ── No-data state ──────────────────────────────────────────────
  if (!survey || !stats || survey.responseCount === 0) {
    return (
      <div className="space-y-5 py-5 px-8">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5"
            onClick={() => navigate("/surveys")}
            aria-label={isAr ? "العودة إلى المكتبة" : "Back to library"}
          >
            <BackIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">{surveyName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAr ? "تقرير الاستبيان" : "Survey Report"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="size-14 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? "لا توجد بيانات بعد" : "No data yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
            {survey?.status === "Draft"
              ? (isAr
                  ? "فعّل الاستبيان لبدء جمع الردود وعرض الإحصائيات هنا."
                  : "Activate the survey to start collecting responses. Statistics will appear here.")
              : (isAr
                  ? "لم يتم تلقي أي ردود على هذا الاستبيان بعد."
                  : "No responses have been received for this survey yet.")}
          </p>
          <Button
            className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
            onClick={() => navigate(id ? `/surveys/${id}/edit` : "/surveys")}
          >
            <Edit2 className="size-4" />
            {isAr ? "فتح المحرر" : "Open Builder"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-5 px-8">

      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {isAr ? "الاستبيانات › التقرير" : "Surveys › Report"}
      </p>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 mt-0.5"
            onClick={() => navigate("/surveys")}
            aria-label={isAr ? "العودة إلى المكتبة" : "Back to library"}
          >
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold">
              {isAr ? "تقرير الاستبيان" : "Survey Report"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              {isAr
                ? "نتائج مؤشرات الأداء ونتائج كل سؤال لهذا الاستبيان. الاتجاهات والأداء الأسبوعي في التحليلات."
                : "KPI scores and per-question results for this survey. Trends and weekly performance live in Analytics."}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          className="shrink-0"
          onClick={() => navigate(`/surveys/${id}/funnel`)}
        >
          <LineChart className="size-4" />
          {isAr ? "فتح التحليلات" : "Open Analytics"}
        </Button>
      </div>

      {/* ── Period selector ──────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-56">
            <SelectValue>{periodLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([v, [en, ar]]) => (
              <SelectItem key={v} value={v}>{isAr ? ar : en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs tabular-nums">
          {survey.responseCount.toLocaleString("en-US")}{" "}
          {isAr ? "رد" : "responses"} · {periodLabel}
        </Badge>
      </div>

      {/* ── Summary stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Responses */}
        <Card>
          <CardContent className="px-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "الردود" : "Responses"}
              </p>
              <Users className="size-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums text-foreground">
              {survey.responseCount.toLocaleString("en-US")}
            </p>
            <p className="text-xs mt-1 font-medium" style={{ color: D2 }}>
              ▲ {stats.respDelta} {isAr ? "مقارنة بالفترة السابقة" : "vs last period"}
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardContent className="px-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "معدل الإكمال" : "Completion rate"}
              </p>
              <CheckCircle className="size-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums text-foreground">
              {stats.completionRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {stats.completedCount.toLocaleString("en-US")} {isAr ? "من" : "of"} {stats.startedCount.toLocaleString("en-US")} {isAr ? "بدأوا" : "started"}
            </p>
          </CardContent>
        </Card>

        {/* Median time */}
        <Card>
          <CardContent className="px-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "الوقت الوسيط" : "Median time"}
              </p>
              <Clock className="size-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-3xl font-heading font-bold tabular-nums text-foreground">
              {stats.medianTime}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? "الوسيط · مع استبعاد القيم الشاذة · مُسجّل دائماً" : "median · outliers excluded · always recorded"}
            </p>
          </CardContent>
        </Card>

        {/* Touchpoints */}
        <Card>
          <CardContent className="px-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "نقاط التماس" : "Touchpoints"}
              </p>
              <Layers className="size-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">
              <span className="tabular-nums">{stats.touchpoints}</span>{" "}
              <span className="text-base font-bold">{isAr ? "نقطة تماس" : "touchpoints"}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr
                ? `عبر ${stats.touchpointStages} مراحل من ${survey.journeyNameAr ?? "الرحلة"}`
                : `across ${stats.touchpointStages} stages of ${survey.journeyNameEn ?? "the journey"}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI Score Gauges ─────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          {isAr ? "نتائج مؤشرات الأداء" : "KPI Scores"}
        </h2>
        <div className={cn(
          "grid gap-4",
          stats.kpiIds.length === 1 ? "grid-cols-1 max-w-xs" :
          stats.kpiIds.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" :
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {stats.kpiIds.map((kpiId) => (
            <Card key={kpiId} className="hover:shadow-md transition-shadow">
              <CardContent className="px-4">
                <KpiDashboardPreview kpiId={kpiId} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Per-Question Results ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold">
            {isAr ? "نتائج كل سؤال" : "Per-Question Results"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowPerQ((s) => !s)}>
            {showPerQ ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showPerQ ? (isAr ? "إخفاء القسم" : "Hide section") : (isAr ? "إظهار القسم" : "Show section")}
          </Button>
        </div>
        {showPerQ && <PerQuestionResults isAr={isAr} />}
      </div>

    </div>
  )
}
