import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
  ArrowRight, ArrowLeft, Send, Eye, Play, CheckCircle2,
  ChevronRight, TrendingUp, TrendingDown, BarChart2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { cn } from "@/lib/utils"

// ── Responses trend (per granularity — Daily / Weekly, per the reference) ─────
const RESPONSES_TREND: Record<
  "day" | "week",
  { label: string; labelAr: string; v: number }[]
> = {
  day: [
    { label: "Mon", labelAr: "الإثنين", v: 118 },
    { label: "Tue", labelAr: "الثلاثاء", v: 143 },
    { label: "Wed", labelAr: "الأربعاء", v: 129 },
    { label: "Thu", labelAr: "الخميس", v: 167 },
    { label: "Fri", labelAr: "الجمعة", v: 152 },
    { label: "Sat", labelAr: "السبت", v: 98 },
    { label: "Sun", labelAr: "الأحد", v: 87 },
  ],
  week: [
    { label: "Wk 1", labelAr: "أ١", v: 3080 },
    { label: "Wk 2", labelAr: "أ٢", v: 3120 },
    { label: "Wk 3", labelAr: "أ٣", v: 2980 },
    { label: "Wk 4", labelAr: "أ٤", v: 3300 },
  ],
}
const RESPONSES_IN_PERIOD = 12480

// ── Mock funnel data ──────────────────────────────────────────────────────────
const FUNNEL_DATA = {
  sent:     { value: 4820, changeVsPrev: +4.2, label: { ar: "أُرسل", en: "Sent" } },
  opened:   { value: 3241, changeVsPrev: +2.1, label: { ar: "فُتح", en: "Opened" } },
  started:  { value: 2156, changeVsPrev: -1.3, label: { ar: "بدأ", en: "Started" } },
  finished: { value: 1894, changeVsPrev: +5.8, label: { ar: "اكتمل", en: "Finished" } },
}

const CHANNEL_BREAKDOWN = [
  { id: "web",      labelAr: "ويب",              labelEn: "Web",      sent: 2140, finished: 910, delta: +3.2, color: "var(--color-chart-1)" },
  { id: "whatsapp", labelAr: "واتساب",            labelEn: "WhatsApp", sent: 1580, finished: 652, delta: +6.1, color: "var(--color-chart-2)" },
  { id: "email",    labelAr: "البريد الإلكتروني", labelEn: "Email",    sent: 820,  finished: 243, delta: -1.4, color: "var(--color-chart-4)" },
  { id: "sms",      labelAr: "رسائل SMS",         labelEn: "SMS",      sent: 280,  finished: 89,  delta: -3.9, color: "var(--color-chart-3)" },
]

// ── Period options (matches the Survey Report) ───────────────────────────────
const PERIOD_LABELS: Record<string, [string, string]> = {
  "1": ["Last 1 day", "آخر يوم"],
  "7": ["Last 7 days", "آخر ٧ أيام"],
  month: ["Last month", "آخر شهر"],
  "3": ["Last 3 months", "آخر ٣ أشهر"],
  "6": ["Last 6 months", "آخر ٦ أشهر"],
  "9": ["Last 9 months", "آخر ٩ أشهر"],
  year: ["Last year", "آخر سنة"],
}

// ── Step icons ────────────────────────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ReactNode> = {
  sent:     <Send className="size-4" />,
  opened:   <Eye className="size-4" />,
  started:  <Play className="size-4" />,
  finished: <CheckCircle2 className="size-4" />,
}

// ── Funnel step card ──────────────────────────────────────────────────────────
function FunnelStep({
  id,
  data,
  totalSent,
  conversionRate,
  isLast,
  isAr,
  isRtl,
}: {
  id: string
  data: { value: number; changeVsPrev: number; label: { ar: string; en: string } }
  totalSent: number
  conversionRate?: number
  isLast: boolean
  isAr: boolean
  isRtl: boolean
}) {
  const pctOfSent = totalSent > 0 ? (data.value / totalSent) * 100 : 0
  const isUp = data.changeVsPrev >= 0
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
        {/* Icon + label */}
        <div className="flex items-center gap-2">
          <span className="text-primary">{STEP_ICONS[id]}</span>
          <p className="text-sm font-semibold text-muted-foreground">
            {isAr ? data.label.ar : data.label.en}
          </p>
        </div>

        {/* Value */}
        <p className="text-3xl font-heading font-bold tabular-nums mt-2">
          {data.value.toLocaleString()}
        </p>

        {/* Single-line stat: % of sent · ▲/▼ delta vs prev. */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
          <span>{pctOfSent.toFixed(1)}% {isAr ? "من المُرسل" : "of sent"} ·</span>
          <span className={cn("inline-flex items-center gap-0.5 font-medium", isUp ? "text-d2" : "text-d5")}>
            <TrendIcon className="size-3" />
            {isUp ? "+" : ""}{data.changeVsPrev.toFixed(1)}%
          </span>
          <span>{isAr ? "مقارنة بالسابق" : "vs prev."}</span>
        </div>
      </div>

      {/* Conversion arrow */}
      {!isLast && (
        <div className="flex flex-col items-center gap-1 shrink-0 px-1">
          <div
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-bold tabular-nums",
              (conversionRate ?? 0) >= 70 ? "bg-d2-light text-d1"
              : (conversionRate ?? 0) >= 50 ? "bg-d3-light text-d3-dark"
              : "bg-d5-light text-d5-dark"
            )}
          >
            {conversionRate?.toFixed(1)}%
          </div>
          <ChevronRight className={cn("size-5 text-muted-foreground", isRtl && "rotate-180")} />
        </div>
      )}
    </div>
  )
}

// ── Channel bar ───────────────────────────────────────────────────────────────
function ChannelBar({
  ch,
  maxSent,
  isAr,
}: {
  ch: (typeof CHANNEL_BREAKDOWN)[0]
  maxSent: number
  isAr: boolean
}) {
  const rate = ch.sent > 0 ? (ch.finished / ch.sent) * 100 : 0
  const barWidth = maxSent > 0 ? (ch.sent / maxSent) * 100 : 0
  const up = ch.delta >= 0
  const DeltaIcon = up ? TrendingUp : TrendingDown

  return (
    <div className="grid grid-cols-[130px_1fr_170px] items-center gap-4">
      <p className="text-sm font-medium text-end">{isAr ? ch.labelAr : ch.labelEn}</p>
      <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700"
          style={{ width: `${barWidth}%`, backgroundColor: ch.color }}
        />
      </div>
      <div className="flex items-center justify-end gap-3 text-xs tabular-nums">
        <span className="text-muted-foreground">{ch.sent.toLocaleString()} →</span>
        <span className="font-semibold" style={{ color: ch.color }}>
          {rate.toFixed(1)}%
        </span>
        <span className={cn("flex items-center gap-0.5 font-medium w-12 justify-end", up ? "text-d2" : "text-d5")}>
          <DeltaIcon className="size-3" />
          {up ? "+" : ""}{ch.delta.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SurveyFunnelPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl: rtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = rtl ? ArrowRight : ArrowLeft

  const [period, setPeriod] = useState("month")
  const [granularity, setGranularity] = useState<"day" | "week">("week")
  const trendData = RESPONSES_TREND[granularity]

  const steps = Object.entries(FUNNEL_DATA) as [string, (typeof FUNNEL_DATA)[keyof typeof FUNNEL_DATA]][]
  const totalSent = FUNNEL_DATA.sent.value
  const maxChannelSent = Math.max(...CHANNEL_BREAKDOWN.map((c) => c.sent))

  function convRate(aKey: string, bKey: string): number {
    const a = FUNNEL_DATA[aKey as keyof typeof FUNNEL_DATA]?.value ?? 0
    const b = FUNNEL_DATA[bKey as keyof typeof FUNNEL_DATA]?.value ?? 0
    return a > 0 ? (b / a) * 100 : 0
  }
  const convRates = [
    convRate("sent", "opened"),
    convRate("opened", "started"),
    convRate("started", "finished"),
  ]

  const overallRate = totalSent > 0 ? (FUNNEL_DATA.finished.value / totalSent) * 100 : 0
  const periodLabel = isAr ? PERIOD_LABELS[period][1] : PERIOD_LABELS[period][0]

  return (
    <div className="space-y-5 py-5 px-8 pb-20">
      {/* Breadcrumb */}
      <p className="text-xs text-muted-foreground">
        {isAr ? "الاستبيانات › التحليلات" : "Surveys › Analytics"}
      </p>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            className="size-9 mt-0.5 shrink-0"
            onClick={() => navigate("/surveys")}
            aria-label={isAr ? "العودة إلى المكتبة" : "Back to library"}
          >
            <BackIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">
              {isAr ? "التحليلات" : "Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              {isAr
                ? "مسار التسليم إلى الإكمال، وتوزيع القنوات، واتجاهات الردود خلال الفترة المختارة."
                : "Delivery-to-completion funnel, channel breakdown, and response trends over the selected period."}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          className="shrink-0"
          onClick={() => navigate(id ? `/surveys/${id}/stats` : "/surveys")}
        >
          <BarChart2 className="size-4" />
          {isAr ? "تقرير الاستبيان" : "Survey report"}
        </Button>
      </div>

      {/* Controls: period + Daily/Weekly + responses-in-period */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-44">
            <SelectValue>{periodLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([v, [en, ar]]) => (
              <SelectItem key={v} value={v}>{isAr ? ar : en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex h-10 items-center rounded-md border border-border bg-card p-1">
          {([
            ["day", isAr ? "يومي" : "Daily"],
            ["week", isAr ? "أسبوعي" : "Weekly"],
          ] as const).map(([g, lbl]) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                "flex h-full items-center rounded-sm px-3 text-sm font-medium transition-colors",
                granularity === g
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs tabular-nums">
          {RESPONSES_IN_PERIOD.toLocaleString("en-US")} {isAr ? "رد في الفترة" : "responses in period"}
        </Badge>
      </div>

      {/* Overall completion banner */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {isAr ? "معدل الإكمال الإجمالي" : "Overall Completion Rate"}
          </p>
          <p className="text-2xl font-heading font-bold tabular-nums">
            {overallRate.toFixed(1)}%
          </p>
          <p className="text-xs font-medium text-d2 flex items-center gap-1 mt-0.5">
            <TrendingUp className="size-3" />
            {isAr ? "▲ +0.6 نقطة مقارنة بالفترة السابقة" : "+0.6 pts vs previous period"}
          </p>
        </div>
        <div className="ms-auto text-end">
          <p className="text-xs text-muted-foreground">
            {isAr ? "الفترة المختارة" : "Selected period"}
          </p>
          <p className="text-sm font-medium">{periodLabel}</p>
        </div>
      </div>

      {/* Funnel steps */}
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map(([key, data], idx) => (
          <FunnelStep
            key={key}
            id={key}
            data={data}
            totalSent={totalSent}
            conversionRate={idx < convRates.length ? convRates[idx] : undefined}
            isLast={idx === steps.length - 1}
            isAr={isAr}
            isRtl={rtl}
          />
        ))}
      </div>

      {/* Visual conversion funnel */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold">{isAr ? "مسار التحويل المرئي" : "Visual conversion funnel"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "الحجم في كل مرحلة تسليم." : "Volume at each delivery stage."}</p>
        </div>
        <div className="space-y-3">
          {steps.map(([key, data], idx) => {
            const pct = totalSent > 0 ? (data.value / totalSent) * 100 : 0
            const colors = ["bg-primary", "bg-nb-cyan-300", "bg-nb-mint", "bg-nb-mint-700"]
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{isAr ? data.label.ar : data.label.en}</span>
                  <span className="font-semibold tabular-nums">
                    {data.value.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={cn("h-full rounded-lg motion-safe:transition-all motion-safe:duration-700 flex items-center ps-3", colors[idx])}
                    style={{ width: `${pct}%`, minWidth: "2rem" }}
                  >
                    {pct > 12 && (
                      <span className="text-white text-xs font-medium truncate">{data.value.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Channel breakdown */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            {isAr ? "التوزيع حسب القناة" : "Breakdown by channel"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isAr ? "الإرسال → معدل الإكمال" : "Sent → Completion rate"}
          </p>
        </div>
        <div className="space-y-4">
          {CHANNEL_BREAKDOWN.map((ch) => (
            <ChannelBar key={ch.id} ch={ch} maxSent={maxChannelSent} isAr={isAr} />
          ))}
        </div>
      </div>

      {/* Responses trend */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold">{isAr ? "اتجاه الردود" : "Responses trend"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {granularity === "week"
              ? (isAr ? "تفصيل أسبوعي · ٤ أسابيع." : "Weekly granularity · 4 weeks.")
              : (isAr ? "تفصيل يومي · ٧ أيام." : "Daily granularity · 7 days.")}
          </p>
        </div>
        <ChartContainer
          config={{ v: { label: isAr ? "الردود" : "Responses", color: "var(--color-chart-1)" } }}
          className="h-64 w-full"
        >
          <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="respTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey={isAr ? "labelAr" : "label"}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              reversed={rtl}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              orientation={rtl ? "right" : "left"}
              className="text-xs tabular-nums"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--color-chart-1)"
              strokeWidth={2.5}
              fill="url(#respTrendFill)"
              dot={{ r: 3, fill: "var(--color-chart-1)" }}
            />
          </AreaChart>
        </ChartContainer>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-3 rounded-sm" style={{ background: "var(--chart-1)" }} />
          {isAr ? "الردود" : "Responses"}
        </div>
      </div>
    </div>
  )
}
