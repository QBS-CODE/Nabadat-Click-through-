import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useDirection } from "@/hooks/use-direction"
import { usePersona } from "@/contexts/persona-context"
import { type KpiMetric } from "@/components/cx/kpi-flip-card"
import { AiChatPanel } from "@/components/cx/ai-chat-panel"
import { KpiTrendChart, JourneyChart, TopicSentimentChart, KpiRadarChart } from "@/components/charts/dashboard-charts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { type ChartConfig } from "@/components/ui/chart"
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare,
  Sparkles,
  Target,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── CSS Animations ────────────────────────────────────────

const styles = `
  @keyframes cx-fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cx-scale-in {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes cx-pulse-dot {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }

  .cx-fade-in-up {
    opacity: 0;
    animation: cx-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .cx-scale-in {
    opacity: 0;
    animation: cx-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .cx-live-dot { animation: cx-pulse-dot 2s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .cx-fade-in-up, .cx-scale-in { opacity: 1; animation: none; }
    .cx-live-dot { animation: none; }
  }
`

// ─── Hooks ─────────────────────────────────────────────────

// ─── Static Data (language-independent) ────────────────────

const KPI_COLORS = {
  nps: "var(--chart-1)",
  csat: "var(--chart-2)",
  ces: "var(--chart-4)",
  agent: "var(--chart-3)",
  vfm: "var(--chart-5)",
  fcr: "var(--chart-5)",
}

const alertStyles = {
  warning: "bg-d3-light text-d3-dark border-d3/20 dark:bg-d3-dark/20 dark:text-d3-light",
  danger: "bg-d5-light text-d5-dark border-d5/20 dark:bg-d5-dark/20 dark:text-d5-light",
  success: "bg-d2-light text-d2-dark border-d2/20 dark:bg-d2-dark/20 dark:text-d2-light",
  info: "bg-nb-cyan-100 text-nb-cyan-800 border-nb-cyan/20 dark:bg-nb-cyan-900/20 dark:text-nb-cyan-300",
}

const sentimentStyles = {
  positive: "bg-d2-light text-d2-dark border-d2/20 dark:bg-d2-dark/20 dark:text-d2-light",
  neutral: "bg-d3-light text-d3-dark border-d3/20 dark:bg-d3-dark/20 dark:text-d3-light",
  negative: "bg-d5-light text-d5-dark border-d5/20 dark:bg-d5-dark/20 dark:text-d5-light",
}

// ─── Funnel + Topics Section ───────────────────────────────

const FUNNEL_DATA = [
  { step: "funnelImpressions", value: 4820, pct: 100 },
  { step: "funnelOpened", value: 3241, pct: 67 },
  { step: "funnelStarted", value: 1893, pct: 58 },
  { step: "funnelCompleted", value: 1286, pct: 68 },
]

const TOPICS_DATA = [
  { key: "topicStaff", mentions: 489, positive: 52, neutral: 28, negative: 20, pct: 38 },
  { key: "topicWaitTime", mentions: 309, positive: 18, neutral: 30, negative: 52, pct: 24 },
  { key: "topicApp", mentions: 257, positive: 65, neutral: 20, negative: 15, pct: 20 },
  { key: "topicFees", mentions: 141, positive: 10, neutral: 25, negative: 65, pct: 11, emerging: true },
  { key: "topicBranch", mentions: 90, positive: 45, neutral: 35, negative: 20, pct: 7 },
]

// ─── KPI Band tile — number · delta · bullet bar against target (ink = data, red = miss) ───

type KpiBandItem = KpiMetric & { target: number; lowerIsBetter?: boolean }

function KpiBandTile({ kpi, onClick, t }: { kpi: KpiBandItem; onClick: () => void; t: (k: string) => string }) {
  const range = kpi.id === "nps" ? 200 : 100
  const shortfall = kpi.lowerIsBetter ? kpi.value - kpi.target : kpi.target - kpi.value
  const miss = shortfall > range * 0.05
  const scaleMax = kpi.target * 1.15
  const fill = Math.min(100, (kpi.value / scaleMax) * 100)
  const tick = Math.min(100, (kpi.target / scaleMax) * 100)
  const valueWentUp = kpi.lowerIsBetter ? !kpi.trendUp : kpi.trendUp
  const ink = miss ? "text-d5 dark:text-d5-light" : "text-foreground"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${kpi.title} ${kpi.displayValue}`}
      className="group flex min-w-0 flex-col border-b border-e border-border p-5 text-start motion-safe:transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
    >
      <div className={cn("text-[10px] font-semibold tracking-[0.14em] uppercase", miss ? "text-d5 dark:text-d5-light" : "text-muted-foreground")}>{kpi.title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {kpi.subtitle}
        {kpi.lowerIsBetter && <> · {t("cx.lowerIsBetter")}</>}
      </div>
      <div className={cn("mt-3 flex items-baseline gap-2", ink)}>
        <span className="font-heading text-4xl leading-none font-bold tabular-nums" dir="ltr">{kpi.displayValue}</span>
        <span className="inline-flex items-center gap-0.5 text-sm font-bold tabular-nums">
          {valueWentUp ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          {kpi.trend}
        </span>
      </div>
      <div className="relative mt-4 h-2.5 w-full rounded-sm bg-muted" role="img" aria-label={`${kpi.displayValue} / ${kpi.targetLabel}`}>
        <div className={cn("h-full rounded-sm motion-safe:transition-all motion-safe:duration-700", miss ? "bg-d5 dark:bg-d5-light" : "bg-foreground")} style={{ width: `${fill}%` }} />
        <div className="absolute -top-[3px] h-4 w-0.5 bg-foreground" style={{ insetInlineStart: `${tick}%` }} aria-hidden />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{kpi.lowerIsBetter ? t("cx.ceiling") : t("cx.target")} {kpi.targetLabel.replace("≤", "")}</span>
        <span>{kpi.responses.toLocaleString("en-US")} {t("cx.resp")}</span>
      </div>
    </button>
  )
}

function FunnelAndTopics({ t }: { t: (k: string) => string }) {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Response Funnel */}
      <Card className="cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.85s" }}>
        <CardHeader>
          <CardTitle>{t("cx.funnelTitle")}</CardTitle>
          <CardDescription>{t("cx.funnelSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FUNNEL_DATA.map((step, i) => {
            const prev = FUNNEL_DATA[i - 1]
            return (
              <div key={step.step}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{t(`cx.${step.step}`)}</span>
                  <span className="font-heading text-base font-bold tabular-nums">{step.value.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm bg-foreground motion-safe:transition-all motion-safe:duration-700"
                    style={{ width: `${(step.value / FUNNEL_DATA[0].value) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {prev ? `${step.pct}% ${t("cx.funnelOfWord")} ${t(`cx.${prev.step}`).toLowerCase()}` : "—"}
                </div>
              </div>
            )
          })}
          <div className="flex items-baseline justify-between border-t border-border pt-3 text-sm">
            <span className="font-semibold">{t("cx.funnelEndToEnd")}</span>
            <span className="font-heading font-bold tabular-nums">26.7%</span>
          </div>
        </CardContent>
      </Card>

      {/* Topic Sentiment — Bubble Ring Chart */}
      <Card className="cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.9s" }}>
        <CardHeader>
          <CardTitle>{t("cx.topicsTitle")}</CardTitle>
          <CardDescription>{t("cx.topicsShare")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TopicSentimentChart
            data={TOPICS_DATA.map((tp) => ({ name: t(`cx.${tp.key}`), mentions: tp.mentions, positive: tp.positive, neutral: tp.neutral, negative: tp.negative, emerging: tp.emerging }))}
            labels={{ positive: t("cx.sentimentPositive"), neutral: t("cx.sentimentNeutral"), negative: t("cx.sentimentNegative"), mentions: t("cx.topicMentions"), emerging: t("cx.topicEmerging") }}
            className="h-64"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Customer Journey Section ──────────────────────────────

function JourneySection({ t }: { t: (k: string) => string }) {
  const journeyData = [
    { stage: t("cx.journeyAcquisition"), current: 72, previous: 68 },
    { stage: t("cx.journeyOnboarding"), current: 80, previous: 75 },
    { stage: t("cx.journeyFirstTx"), current: 85, previous: 82 },
    { stage: t("cx.journeyOngoing"), current: 78, previous: 80 },
    { stage: t("cx.journeyResolution"), current: 56, previous: 61 },
  ]

  return (
    <Card className="cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.95s" }}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("cx.journeyTitle")}</CardTitle>
            <CardDescription>{t("cx.journeySubtitle")}</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 w-fit bg-d5-light text-d5-dark border-d5/20 dark:bg-d5-dark/20 dark:text-d5-light text-xs">
            <AlertTriangle className="size-3" />
            {t("cx.journeyWarning")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <JourneyChart data={journeyData} labels={{ current: t("cx.journeyCurrent"), previous: t("cx.journeyPrevious") }} className="h-64" />
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard ────────────────────────────────────────

export default function CxDashboard() {
  const { t } = useTranslation()
  useDirection()

  const navigate = useNavigate()
  const greeting = new Date().getHours() < 12 ? t("cx.greetingMorning") : t("cx.greetingEvening")

  // ── Translated data (recomputes on language change) ──

  const kpiMetrics: KpiBandItem[] = useMemo(() => [
    { id: "nps", title: t("cx.kpiNps"), subtitle: t("cx.kpiNpsSubtitle"), value: 42, displayValue: "+42", gaugePercent: 71, targetLabel: "+50", target: 50, trend: 4, trendUp: true, trendLabel: `+4 ${t("cx.points")}`, color: KPI_COLORS.nps, responses: 3420 },
    { id: "csat", title: t("cx.kpiCsat"), subtitle: t("cx.kpiCsatSubtitle"), value: 78, displayValue: "78%", gaugePercent: 78, targetLabel: "80%", target: 80, trend: 2, trendUp: true, trendLabel: "+2%", color: KPI_COLORS.csat, responses: 4180 },
    { id: "ces", title: t("cx.kpiCes"), subtitle: t("cx.kpiCesSubtitle"), value: 45, displayValue: "45%", gaugePercent: 55, targetLabel: "≤50%", target: 50, lowerIsBetter: true, trend: 0.3, trendUp: true, trendLabel: "−0.3", color: KPI_COLORS.ces, responses: 2890 },
    { id: "agent", title: t("cx.kpiAgent"), subtitle: t("cx.kpiAgentSubtitle"), value: 84, displayValue: "84%", gaugePercent: 84, targetLabel: "85%", target: 85, trend: 1, trendUp: false, trendLabel: `−1 ${t("cx.point")}`, color: KPI_COLORS.agent, responses: 5120 },
    { id: "vfm", title: t("cx.kpiVfm"), subtitle: t("cx.kpiVfmSubtitle"), value: 72, displayValue: "72%", gaugePercent: 72, targetLabel: "80%", target: 80, trend: 8, trendUp: false, trendLabel: `−8 ${t("cx.points")}`, color: KPI_COLORS.vfm, responses: 2340 },
    { id: "fcr", title: t("cx.kpiFcr"), subtitle: t("cx.kpiFcrSubtitle"), value: 68, displayValue: "68%", gaugePercent: 68, targetLabel: "75%", target: 75, trend: 7, trendUp: false, trendLabel: `−7 ${t("cx.points")}`, color: KPI_COLORS.fcr, responses: 3780 },
  ], [t])

  const radarData = useMemo(() => [
    { label: t("cx.kpiNps"), value: 71 },
    { label: t("cx.kpiCsat"), value: 78 },
    { label: t("cx.kpiCes"), value: 55 },
    { label: t("cx.kpiAgent"), value: 84 },
    { label: t("cx.kpiVfm"), value: 72 },
    { label: t("cx.kpiFcr"), value: 68 },
  ], [t])

  const trendChartConfig = useMemo(() => ({
    nps: { label: t("cx.kpiNps"), color: KPI_COLORS.nps },
    csat: { label: t("cx.kpiCsat"), color: KPI_COLORS.csat },
    ces: { label: t("cx.kpiCes"), color: KPI_COLORS.ces },
    agent: { label: t("cx.kpiAgent"), color: KPI_COLORS.agent },
    vfm: { label: t("cx.kpiVfm"), color: KPI_COLORS.vfm },
    fcr: { label: t("cx.kpiFcr"), color: KPI_COLORS.fcr },
  }) satisfies ChartConfig, [t])

  const w = t("cx.week")
  const trendData = useMemo(() => [
    { week: `${w}1`, nps: 38, csat: 75, ces: 48, agent: 80, vfm: 70, fcr: 65 },
    { week: `${w}2`, nps: 36, csat: 74, ces: 50, agent: 79, vfm: 69, fcr: 64 },
    { week: `${w}3`, nps: 39, csat: 76, ces: 47, agent: 81, vfm: 71, fcr: 66 },
    { week: `${w}4`, nps: 37, csat: 75, ces: 49, agent: 80, vfm: 70, fcr: 63 },
    { week: `${w}5`, nps: 40, csat: 77, ces: 46, agent: 82, vfm: 72, fcr: 67 },
    { week: `${w}6`, nps: 38, csat: 76, ces: 47, agent: 81, vfm: 71, fcr: 65 },
    { week: `${w}7`, nps: 41, csat: 78, ces: 45, agent: 83, vfm: 73, fcr: 68 },
    { week: `${w}8`, nps: 39, csat: 77, ces: 46, agent: 82, vfm: 72, fcr: 66 },
    { week: `${w}9`, nps: 40, csat: 76, ces: 47, agent: 82, vfm: 71, fcr: 67 },
    { week: `${w}10`, nps: 41, csat: 77, ces: 46, agent: 83, vfm: 72, fcr: 67 },
    { week: `${w}11`, nps: 42, csat: 78, ces: 45, agent: 83, vfm: 72, fcr: 68 },
    { week: `${w}12`, nps: 42, csat: 78, ces: 45, agent: 84, vfm: 72, fcr: 68 },
  ], [w])

  const branchNames = useMemo(() => [
    t("cx.branch1"), t("cx.branch2"), t("cx.branch3"),
    t("cx.branch4"), t("cx.branch5"), t("cx.branch6"),
  ], [t])
  const branchData = [
    { nps: 52, csat: 85, agent: 90, change: 4 },
    { nps: 47, csat: 82, agent: 86, change: 2 },
    { nps: 44, csat: 79, agent: 84, change: -1 },
    { nps: 38, csat: 74, agent: 70, change: -3 },
    { nps: 35, csat: 71, agent: 75, change: 1 },
    { nps: 29, csat: 68, agent: 78, change: -5 },
  ]

  const commentsData = useMemo(() => [
    { id: 1, name: t("cx.comment1Name"), initials: t("cx.comment1Name")[0], sentiment: "negative" as const, topic: t("cx.comment1Topic"), time: t("cx.comment1Time"), text: t("cx.comment1Text"), avatarColor: "bg-nb-cyan-700" },
    { id: 2, name: t("cx.comment2Name"), initials: t("cx.comment2Name")[0], sentiment: "positive" as const, topic: t("cx.comment2Topic"), time: t("cx.comment2Time"), text: t("cx.comment2Text"), avatarColor: "bg-nb-cyan" },
    { id: 3, name: t("cx.comment3Name"), initials: t("cx.comment3Name")[0], sentiment: "neutral" as const, topic: t("cx.comment3Topic"), time: t("cx.comment3Time"), text: t("cx.comment3Text"), avatarColor: "bg-nb-mint-700" },
    { id: 4, name: t("cx.comment4Name"), initials: t("cx.comment4Name")[0], sentiment: "positive" as const, topic: t("cx.comment4Topic"), time: t("cx.comment4Time"), text: t("cx.comment4Text"), avatarColor: "bg-nb-mint" },
  ], [t])

  const aiAlerts = useMemo(() => [
    { text: t("cx.alertWaitTime"), icon: AlertTriangle, type: "warning" as const },
    { text: t("cx.alertEastern"), icon: AlertTriangle, type: "danger" as const },
    { text: t("cx.alertCsatStable"), icon: CheckCircle, type: "success" as const },
    { text: t("cx.alertIvr"), icon: Info, type: "info" as const },
  ], [t])

  const actions = useMemo(() => [
    { id: 1, title: t("cx.action1Title"), statusLabel: t("cx.action1Status"), targets: ["CES −0.4", "FCR +5%", "CSAT +3%"], week: t("cx.action1Week"), color: "border-s-nb-cyan", statusColor: "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/20 dark:text-nb-cyan-300" },
    { id: 2, title: t("cx.action2Title"), statusLabel: t("cx.action2Status"), targets: [`${t("cx.kpiAgent")} +4%`, "CSAT +2%", "NPS +3"], week: t("cx.action2Week"), color: "border-s-nb-mint", statusColor: "bg-nb-mint-100 text-nb-mint-800 dark:bg-nb-mint-900/20 dark:text-nb-mint-300" },
  ], [t])

  const sentimentLabels = useMemo(() => ({
    positive: t("cx.sentimentPositive"),
    neutral: t("cx.sentimentNeutral"),
    negative: t("cx.sentimentNegative"),
  }), [t])

  // ── State ──

  const { persona } = usePersona()
  const [visibleKpis, setVisibleKpis] = useState<Record<string, boolean>>({
    nps: true, csat: true, ces: true, agent: true, vfm: false, fcr: false,
  })
  const toggleKpi = (id: string) => setVisibleKpis((p) => ({ ...p, [id]: !p[id] }))
  const handleKpiDetail = (id: string) => navigate(`/kpi/${id}`)
  const [chatOpen, setChatOpen] = useState(false)
  const [period, setPeriod] = useState("7")
  const periodLabel: Record<string, string> = { "7": t("cx.last7"), "30": t("cx.last30"), "90": t("cx.last90") }

  // ── Role-based views ──

  if (persona.id === "frontline") {
    return (
      <TooltipProvider>
        <style>{styles}</style>
        <div className="space-y-6 py-6 max-w-3xl mx-auto px-4 sm:px-6">
          <div className="cx-fade-in-up">
            <h1 className="text-2xl font-heading font-bold">{greeting}، {t("cx.userName")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("cx.frontlineBranch")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "NPS", value: "+52", colorClass: "text-nb-cyan" },
              { label: "CSAT", value: "82%", colorClass: "text-nb-mint" },
              { label: t("cx.openCases"), value: "3", colorClass: "text-d5" },
              { label: t("cx.todayResponses"), value: "47", colorClass: "text-secondary" },
            ].map((k) => (
              <Card key={k.label} className="cx-fade-in-up">
                <CardContent className="">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{k.label}</p>
                  <p className={cn("text-3xl font-heading font-bold tabular-nums", k.colorClass)}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="cx-fade-in-up">
            <CardHeader><CardTitle>{t("cx.openCases")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: t("cx.case1Customer"), issue: t("cx.case1Issue"), priority: t("cx.critical"), color: "bg-d5-light text-d5-dark" },
                { name: t("cx.case2Customer"), issue: t("cx.case2Issue"), priority: t("cx.high"), color: "bg-d4-light text-d4-dark" },
                { name: t("cx.case3Customer"), issue: t("cx.case3Issue"), priority: t("cx.high"), color: "bg-d4-light text-d4-dark" },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.issue}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", c.color)}>{c.priority}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    )
  }

  if (persona.id === "executive") {
    return (
      <TooltipProvider>
        <style>{styles}</style>
        <div className="space-y-6 py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="cx-fade-in-up flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold">{greeting}، {t("cx.userName")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("cx.execSummary")}</p>
            </div>
            <Badge variant="outline" className="text-xs">{new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "NPS", value: "+42", delta: "+4 vs prev", up: true },
              { label: "CSAT", value: "78%", delta: "+2% vs prev", up: true },
              { label: "CES", value: "3.2", delta: "−0.3", up: true },
              { label: t("cx.openCases"), value: "3", delta: "−2 vs prev", up: true },
            ].map((k) => (
              <Card key={k.label} className="cx-fade-in-up">
                <CardContent className="">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">{k.label}</p>
                  <p className="text-3xl font-heading font-bold tabular-nums mb-1">{k.value}</p>
                  <p className={cn("text-xs font-medium", k.up ? "text-d2 dark:text-d2-light" : "text-d5 dark:text-d5-light")}>
                    {k.up ? <TrendingUp className="size-3 inline me-1" /> : <TrendingDown className="size-3 inline me-1" />}
                    {k.delta}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 cx-fade-in-up">
              <CardHeader>
                <CardTitle>{t("cx.trendTitle")}</CardTitle>
                <CardDescription>{t("cx.trendSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <KpiTrendChart data={trendData} config={trendChartConfig} visible={{ nps: true, csat: true }} className="h-64" />
              </CardContent>
            </Card>
            <Card className="cx-fade-in-up">
              <CardHeader><CardTitle>{t("cx.branchTitle")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {branchData.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{branchNames[i]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">+{b.nps}</span>
                      <span className={cn("text-[10px] font-medium tabular-nums", b.change > 0 ? "text-d2" : "text-d5")}>
                        {b.change > 0 ? "+" : ""}{b.change}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // ── CX Manager / Analyst / Admin — Full Dashboard ──

  return (
    <TooltipProvider>
      <style>{styles}</style>

      <AiChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Welcome Header ────────────────────── */}
        <header className="cx-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              {greeting}، {t("cx.userName")}
              <Sparkles className="size-5 text-nb-cyan shrink-0" />
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-sm text-muted-foreground">{t("cx.dashboardSubtitle")}</p>
              <Badge variant="outline" className="gap-1 bg-nb-cyan-100 text-nb-cyan-700 border-nb-cyan/20 dark:bg-nb-cyan-900/20 dark:text-nb-cyan-300 text-[10px] shrink-0">
                <span className="size-1.5 rounded-full bg-nb-cyan cx-live-dot" />
                {t("cx.live")}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
              <SelectTrigger className="w-40">
                <Calendar className="size-4 text-muted-foreground" />
                <SelectValue>{periodLabel[period]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("cx.last7")}</SelectItem>
                <SelectItem value="30">{t("cx.last30")}</SelectItem>
                <SelectItem value="90">{t("cx.last90")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary">
              <Download className="size-4 ms-1.5" />
              {t("cx.export")}
            </Button>
          </div>
        </header>

        {/* ── KPI Radar + AI Assistant ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="cx-fade-in-up relative overflow-hidden min-w-0" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-secondary" />
                {t("cx.indexProfile")}
              </CardTitle>
              <CardDescription>{t("cx.indexProfileSubtitle")}</CardDescription>
            </CardHeader>

            <div className="absolute top-4 end-5 flex flex-col items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-nb-cyan to-nb-cyan-700 text-white shadow-lg">
              <span className="text-[10px] font-medium tracking-wide opacity-80">{t("cx.cxi")}</span>
              <span className="text-2xl font-heading font-bold leading-none tabular-nums">69</span>
              <span className="text-[9px] opacity-60">/100</span>
            </div>

            <CardContent>
              <KpiRadarChart
                kpis={radarData}
                target={[75, 80, 50, 85, 80, 75]}
                labels={{ current: t("cx.journeyCurrent"), target: t("cx.target") }}
                className="h-72"
              />
            </CardContent>
          </Card>

          <Card className="cx-fade-in-up overflow-hidden min-w-0 min-w-0" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 min-w-0">
                  <Zap className="size-5 text-secondary shrink-0" />
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full bg-nb-mint cx-live-dot shrink-0" />
                    {t("cx.aiAssistant")}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{t("cx.aiUpdated")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-7 rounded-full", chatOpen && "bg-secondary text-secondary-foreground")}
                    onClick={() => setChatOpen((o) => !o)}
                    aria-label="Chat"
                  >
                    <MessageSquare className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                {t("cx.aiNarrative")}{" "}
                <span className="font-bold text-d5 dark:text-d5-light">{t("cx.aiAtRisk")}</span>.{" "}
                {t("cx.aiSpike") && <>{t("cx.aiSpikePrefix")} <span className="font-bold text-d5 dark:text-d5-light">{t("cx.aiSpike")}</span>{" "}</>}
                {t("cx.aiSpikeSuffix")}{" "}
                <span className="font-bold text-d2 dark:text-d2-light">{t("cx.aiCsatStable")}</span>
                {t("cx.aiCsatContext")}{" "}
                <span className="font-bold text-d5 dark:text-d5-light">{t("cx.aiBelowSla")}</span>{" "}
                {t("cx.aiBreach")}{" "}
                <span className="font-bold">{t("cx.aiRecommendation")}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {aiAlerts.map((alert) => {
                  const AlertIcon = alert.icon
                  return (
                    <Badge key={alert.text} variant="outline" className={cn("gap-1 text-xs py-1", alertStyles[alert.type])}>
                      <AlertIcon className="size-3" />
                      {alert.text}
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── KPI Band — six KPIs, comparable at a glance: value · delta · bullet bar vs target ── */}
        <Card className="cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <CardTitle>{t("cx.kpiBand")}</CardTitle>
              <CardDescription className="text-xs">{t("cx.kpiBandHint")} · {t("cx.cxi")} 69/100</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="-mb-px -me-px grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
              {kpiMetrics.map((kpi) => (
                <KpiBandTile key={kpi.id} kpi={kpi} onClick={() => handleKpiDetail(kpi.id)} t={t} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Trend Chart ───────────────────────── */}
        <Card className="cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.8s" }}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("cx.trendTitle")}</CardTitle>
                <CardDescription>{t("cx.trendSubtitle")}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(trendChartConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => toggleKpi(key)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full font-medium",
                      "motion-safe:transition-all motion-safe:duration-200",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                      visibleKpis[key] ? "text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    style={visibleKpis[key] ? { backgroundColor: cfg.color } : undefined}
                    aria-label={`${visibleKpis[key] ? t("cx.hideLabel") : t("cx.showLabel")} ${cfg.label}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <KpiTrendChart
              data={trendData}
              config={trendChartConfig}
              visible={visibleKpis}
              markers={[
                { x: `${w}4`, title: t("cx.action1Title") },
                { x: `${w}9`, title: t("cx.action2Title") },
              ]}
              className="h-72"
            />
          </CardContent>
        </Card>

        {/* ── Response Funnel + Topic Sentiment ──── */}
        <FunnelAndTopics t={t} />

        {/* ── Customer Journey ──────────────────── */}
        <JourneySection t={t} />

        {/* ── Branch Performance + Comments ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "0.9s" }}>
            <CardHeader>
              <CardTitle>{t("cx.branchTitle")}</CardTitle>
              <CardDescription>{t("cx.branchSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start ps-6 w-8">#</TableHead>
                    <TableHead className="text-start">{t("cx.branchCol")}</TableHead>
                    <TableHead className="text-center">NPS</TableHead>
                    <TableHead className="text-center">CSAT</TableHead>
                    <TableHead className="text-center">{t("cx.agentCol")}</TableHead>
                    <TableHead className="text-end pe-6">{t("cx.changeCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchData.map((b, i) => (
                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50 motion-safe:transition-colors">
                      <TableCell className="ps-6 text-muted-foreground">
                        <span className="text-xs tabular-nums">{i + 1}</span>
                      </TableCell>
                      <TableCell className="font-medium">{branchNames[i]}</TableCell>
                      <TableCell className="tabular-nums font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-20 rounded-sm bg-muted" aria-hidden>
                            <div
                              className="h-full rounded-sm bg-foreground motion-safe:transition-all motion-safe:duration-700"
                              style={{ width: `${(b.nps / branchData[0].nps) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-end font-bold" dir="ltr">+{b.nps}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{b.csat}%</TableCell>
                      <TableCell className="text-center tabular-nums">{b.agent}%</TableCell>
                      <TableCell className="text-end pe-6">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                          b.change < 0 ? "text-d5 dark:text-d5-light" : b.change > 0 ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {b.change > 0 ? <ArrowUpRight className="size-3" /> : b.change < 0 ? <ArrowDownRight className="size-3" /> : null}
                          {b.change > 0 ? "+" : ""}{b.change}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 cx-fade-in-up overflow-hidden min-w-0" style={{ animationDelay: "1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-secondary" />
                {t("cx.commentsTitle")}
              </CardTitle>
              <CardDescription>{t("cx.commentsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentsData.map((c) => (
                <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 motion-safe:transition-colors">
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold", c.avatarColor)}>
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{c.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{c.text}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={cn("text-[10px] py-0", sentimentStyles[c.sentiment])}>
                        {sentimentLabels[c.sentiment]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0">{c.topic}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-secondary">
                {t("cx.viewAllComments")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Tracked Actions ───────────────────── */}
        <div>
          <h2 className="text-lg font-bold mb-4 cx-fade-in-up" style={{ animationDelay: "1.1s" }}>
            {t("cx.actionsTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actions.map((action, i) => (
              <Card
                key={action.id}
                className={cn("cx-scale-in overflow-hidden border-s-4", action.color, "motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-0.5 hover:shadow-md")}
                style={{ animationDelay: `${1.15 + i * 0.1}s` }}
              >
                <CardContent className="">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold">{action.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px]", action.statusColor)}>{action.statusLabel}</Badge>
                        <span className="text-[10px] text-muted-foreground">{action.week}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {action.targets.map((tgt) => (
                          <span key={tgt} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">{tgt}</span>
                        ))}
                      </div>
                    </div>
                    <Target className="size-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
