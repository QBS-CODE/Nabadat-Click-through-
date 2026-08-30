// SCR-01 · Ingestion Monitoring — M-04 · Response Collection.
// Ported faithfully from SCR-01-ingestion-monitoring-wireframe_3.html. Answers one
// question: is feedback arriving and being stored? Volume, suppressions and rejections
// across every channel. Read-only for P-01 (CX Manager) and P-07 (IT Administrator).
// Fully bilingual (ar/en) via the `ingestion` i18n namespace; technical identifiers
// (codes, IDs, snake_case field names, JSON payloads, channel proper names) stay literal.

import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ChevronRight, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const TIME_WINDOWS = ["1h", "24h", "7d", "30d", "1y"] as const

type TileTone = "ok" | "warn" | "crit"
interface TileData {
  label: string
  pill?: { tone: TileTone; text: string }
  value: string
  trend: string
  tone: TileTone
}
interface ChannelRow {
  channel: string
  chip: string
  ingested: string
  suppressed: string
  rejected: string
  sealed: string
  share: number
}
interface IntegrationRow {
  name: string
  sc: string
  ingested: string
  suppressed: string
  rejected: string
  peak: string
}
interface Rejection {
  time: string
  source: string
  code: string
  mode: string
  survey: string
  question: string
  meta: [string, string][]
  payload?: ReactNode
  note: string
}

// ---- small building blocks ----

const PILL_TONE: Record<TileTone, string> = {
  ok: "bg-d1-light text-d1 dark:bg-d1-dark/25 dark:text-d1-light",
  warn: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  crit: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
}
const TREND_TONE: Record<TileTone, string> = {
  ok: "text-d1 dark:text-d1-light",
  warn: "text-d3-dark dark:text-d3-light",
  crit: "text-d5 dark:text-d5-light",
}

function Tile({ data }: { data: TileData }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md dark:shadow-none">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <span>{data.label}</span>
        {data.pill && (
          <span className={cn("rounded-full px-1.5 py-px font-mono text-[9.5px] tracking-[0.04em]", PILL_TONE[data.pill.tone])}>
            {data.pill.text}
          </span>
        )}
      </div>
      <div className="mt-1 font-heading text-[26px] font-bold tabular-nums tracking-[-0.02em]" dir="ltr">
        {data.value}
      </div>
      <div className={cn("mt-0.5 font-mono text-[11.5px]", TREND_TONE[data.tone])}>{data.trend}</div>
    </div>
  )
}

/** Small mono cyan chip (the mockup's `.chip`). */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm bg-nb-cyan-100 px-1.5 py-px font-mono text-[10px] text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
      {children}
    </span>
  )
}

/** Red rejection reason code (the mockup's `.rej-code`). */
function RejCode({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-sm bg-d5-light px-1.5 py-0.5 font-mono text-[11.5px] whitespace-nowrap text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light">
      {children}
    </span>
  )
}

/** A card with a header row (title + hint) wrapping a data table. */
function TableCard({ title, hint, headerHint, children }: { title: ReactNode; hint?: ReactNode; headerHint?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="font-heading text-[15px] font-semibold">
          {title}
          {headerHint && <span className="ms-1.5 text-[11.5px] font-normal text-muted-foreground">{headerHint}</span>}
        </h2>
        {hint && <span className="text-[11.5px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

export default function IngestionMonitoringPage() {
  const { t } = useTranslation()
  const [window, setWindow] = useState<(typeof TIME_WINDOWS)[number]>("24h")
  const [open, setOpen] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  // Channel / survey proper names stay Latin (technical); "All …" and "Web embed" translate.
  const channelOpts = [t("ingestion.allChannels"), "SMS", "WhatsApp", "Email", "Kiosk", t("ingestion.webEmbed"), "API (M-13)"]
  const surveyOpts = [t("ingestion.allSurveys"), t("ingestion.srvBranchCsat"), t("ingestion.srvLoanNps"), t("ingestion.srvQuarterly")]

  const tiles: TileData[] = [
    { label: t("ingestion.tiles.responsesIngested"), pill: { tone: "ok", text: t("ingestion.pillOk") }, value: "14,208", trend: t("ingestion.tiles.responsesIngestedTrend"), tone: "ok" },
    { label: t("ingestion.tiles.answersWritten"), value: "151,940", trend: t("ingestion.tiles.answersWrittenTrend"), tone: "ok" },
    { label: t("ingestion.tiles.duplicatesSuppressed"), pill: { tone: "ok", text: t("ingestion.pillOk") }, value: "231", trend: t("ingestion.tiles.duplicatesSuppressedTrend"), tone: "ok" },
    { label: t("ingestion.tiles.rejections"), pill: { tone: "warn", text: t("ingestion.pillWatch") }, value: "89", trend: t("ingestion.tiles.rejectionsTrend"), tone: "warn" },
    { label: t("ingestion.tiles.sealedPartials"), value: "1,872", trend: t("ingestion.tiles.sealedPartialsTrend"), tone: "ok" },
    { label: t("ingestion.tiles.orphanResponses"), value: "47", trend: t("ingestion.tiles.orphanResponsesTrend"), tone: "ok" },
    { label: t("ingestion.tiles.generalFeedback"), value: "312", trend: t("ingestion.tiles.generalFeedbackTrend"), tone: "ok" },
  ]

  const channels: ChannelRow[] = [
    { channel: "SMS", chip: t("ingestion.chipNative"), ingested: "5,904", suppressed: "102", rejected: "12", sealed: "786", share: 42 },
    { channel: "WhatsApp", chip: t("ingestion.chipNative"), ingested: "3,671", suppressed: "64", rejected: "8", sealed: "402", share: 26 },
    { channel: "Email", chip: t("ingestion.chipNative"), ingested: "2,013", suppressed: "31", rejected: "5", sealed: "297", share: 14 },
    { channel: "Kiosk", chip: t("ingestion.chipOpenLink"), ingested: "1,485", suppressed: "0", rejected: "3", sealed: "344", share: 10 },
    { channel: "API", chip: t("ingestion.chipM13Atomic"), ingested: "1,135", suppressed: "34", rejected: "61", sealed: "—", share: 8 },
  ]

  const integrations: IntegrationRow[] = [
    { name: t("ingestion.intCoreBanking"), sc: "SC-BR-001", ingested: "684", suppressed: "29", rejected: "4", peak: "18" },
    { name: t("ingestion.intContactCenter"), sc: "SC-CC-002", ingested: "301", suppressed: "5", rejected: "2", peak: "9" },
    { name: t("ingestion.intDigitalOnboarding"), sc: "SC-DG-004", ingested: "150", suppressed: "0", rejected: "55", peak: "41" },
  ]

  const rejections: Rejection[] = [
    {
      time: "14:32:08",
      source: t("ingestion.srcDigitalOnboarding"),
      code: t("ingestion.rjCode06"),
      mode: t("ingestion.modeAtomic"),
      survey: t("ingestion.srvLoanNps"),
      question: "Q4",
      meta: [
        [t("ingestion.metaRejectionId"), "rj_9f3a1c"],
        ["transaction_id", "TXN-2026-081411-0042"],
        ["service_channel_id", "SC-DG-004"],
        [t("ingestion.metaFailingAnswer"), t("ingestion.failingAnswer06")],
        [t("ingestion.metaOutcome"), t("ingestion.outcomeRolledBack")],
      ],
      payload: (
        <>
          {`{
  "survey_id": "srv_lo_nps",
  "survey_version_id": "v3",
  "transaction_id": "TXN-2026-081411-0042",
  "customer_mobile": "`}
          <span className="text-nb-mint">•••• ••• 4821</span>
          {`",
  "answers": [
    { "question_id": "Q1", "value": 8 },
    { "question_id": "Q4", "value": 15 }   ← RJ-06
  ]
}`}
        </>
      ),
      note: t("ingestion.note06"),
    },
    {
      time: "13:58:41",
      source: t("ingestion.srcDigitalOnboarding"),
      code: t("ingestion.rjCode04"),
      mode: t("ingestion.modeAtomic"),
      survey: t("ingestion.srvLoanNps"),
      question: "Q9",
      meta: [
        [t("ingestion.metaRejectionId"), "rj_9f2b77"],
        ["transaction_id", "TXN-2026-081410-0966"],
        [t("ingestion.metaPinnedVersion"), t("ingestion.pinnedVersion04")],
        [t("ingestion.metaOutcome"), t("ingestion.outcomeRolledBack")],
      ],
      payload: `{ "answers": [ { "question_id": "Q9", "value": 4 } ] }  ← RJ-04`,
      note: t("ingestion.note04"),
    },
    {
      time: "11:12:03",
      source: t("ingestion.srcKiosk"),
      code: t("ingestion.rjCode14"),
      mode: t("ingestion.modeIncremental"),
      survey: t("ingestion.srvBranchCsat"),
      question: "Q2",
      meta: [
        [t("ingestion.metaRejectionId"), "rj_9e8c02"],
        ["session_token", "st_k014_88213"],
        [t("ingestion.metaSealedAt"), t("ingestion.sealedAt14")],
        [t("ingestion.metaOutcome"), t("ingestion.outcome14")],
      ],
      note: t("ingestion.note14"),
    },
  ]

  return (
    <div className="px-8 space-y-5 py-5">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground">{t("ingestion.breadcrumb")}</div>
        <div className="mt-1.5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-[-0.01em]">{t("ingestion.title")}</h1>
            <p className="mt-1 max-w-[560px] text-sm text-muted-foreground">{t("ingestion.subtitle")}</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex overflow-hidden rounded-md border border-border bg-card" role="tablist" aria-label={t("ingestion.timeWindow")}>
              {TIME_WINDOWS.map((w) => (
                <button
                  key={w}
                  role="tab"
                  aria-selected={window === w}
                  onClick={() => setWindow(w)}
                  className={cn(
                    "px-3.5 py-1.5 text-[12.5px] transition-colors",
                    window === w ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>

            <Select defaultValue={channelOpts[0]}>
              <SelectTrigger className="h-9 w-auto min-w-[140px]" aria-label={t("ingestion.channelFilter")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channelOpts.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select defaultValue={surveyOpts[0]}>
              <SelectTrigger className="h-9 w-auto min-w-[150px]" aria-label={t("ingestion.surveyFilter")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {surveyOpts.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-d2 motion-safe:animate-pulse" aria-hidden />
              {t("ingestion.live")}
            </span>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {tiles.map((tile) => (
          <Tile key={tile.label} data={tile} />
        ))}
      </div>

      {/* By channel */}
      <TableCard title={t("ingestion.byChannel")} hint={t("ingestion.byChannelHint")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TH}>{t("ingestion.colChannel")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colIngested")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colSuppressed")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colRejected")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colSealedPartial")}</TableHead>
              <TableHead className={cn(TH, "w-[180px]")}>{t("ingestion.colShare")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((c) => (
              <TableRow key={c.channel} className="hover:bg-muted/50">
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span dir="ltr">{c.channel}</span> <Chip>{c.chip}</Chip>
                  </span>
                </TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{c.ingested}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{c.suppressed}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{c.rejected}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{c.sealed}</TableCell>
                <TableCell>
                  <div className="h-1.5 min-w-[80px] overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-nb-cyan" style={{ width: `${c.share}%` }} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      {/* By integration */}
      <TableCard
        title={t("ingestion.byIntegration")}
        headerHint={t("ingestion.byIntegrationHint2")}
        hint={t("ingestion.byIntegrationHint")}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TH}>{t("ingestion.colIntegration")}</TableHead>
              <TableHead className={TH}>{t("ingestion.colServiceChannel")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colIngested")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colSuppressed")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colRejected")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colPeak")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.map((it) => (
              <TableRow key={it.sc} className="hover:bg-muted/50">
                <TableCell>{it.name}</TableCell>
                <TableCell>
                  <span className="font-mono text-[12.5px]" dir="ltr">
                    {it.sc}
                  </span>
                </TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{it.ingested}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{it.suppressed}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{it.rejected}</TableCell>
                <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{it.peak}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      {/* Rejections */}
      <TableCard
        title={t("ingestion.tiles.rejections")}
        headerHint={t("ingestion.rejectionsHint2")}
        hint={t("ingestion.rejectionsHint")}
      >
        <Table className="[&_td]:align-top">
          <TableHeader>
            <TableRow>
              <TableHead className={cn(TH, "w-[34%]")}>{t("ingestion.colWhenSource")}</TableHead>
              <TableHead className={TH}>{t("ingestion.colReason")}</TableHead>
              <TableHead className={TH}>{t("ingestion.colMode")}</TableHead>
              <TableHead className={TH}>{t("ingestion.colSurvey")}</TableHead>
              <TableHead className={cn(TH, "text-end")}>{t("ingestion.colQuestion")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rejections.map((r, i) => (
              <RejectionRow key={r.meta[0][1]} r={r} isOpen={open.has(i)} onToggle={() => toggle(i)} />
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  )
}

function RejectionRow({ r, isOpen, onToggle }: { r: Rejection; isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <span className="flex items-center gap-1.5">
            <ChevronRight className={cn("size-3 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
            <span className="font-mono text-[12.5px]" dir="ltr">{r.time}</span>
            <span className="text-muted-foreground">· {r.source}</span>
          </span>
        </TableCell>
        <TableCell>
          <RejCode>{r.code}</RejCode>
        </TableCell>
        <TableCell>{r.mode}</TableCell>
        <TableCell>{r.survey}</TableCell>
        <TableCell className="text-end font-mono text-[12.5px] tabular-nums">{r.question}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={5} className="p-0">
            <div className="px-[18px] py-3.5">
              {/* meta grid */}
              <dl className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                {r.meta.map(([k, v]) => (
                  <div key={k}>
                    <dt className="mb-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{k}</dt>
                    <dd className="m-0 font-mono text-[11.5px]" dir="ltr">{v}</dd>
                  </div>
                ))}
              </dl>
              {r.payload && (
                <pre className="overflow-x-auto rounded-md bg-nb-navy p-3.5 font-mono text-[11.5px] leading-relaxed text-nb-navy-100" dir="ltr">
                  {r.payload}
                </pre>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="size-3 shrink-0" aria-hidden />
                {r.note}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
