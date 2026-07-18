import { useState } from "react"
import { Star, Smile, Meh, Frown, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
import { ChartContainer } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Label } from "recharts"
import { cn } from "@/lib/utils"
import { PERQ_ITEMS, type PerQItem, type PerQBar } from "@/data/mock-perquestion"

// ── D-scale hexes (semantic status only) ──────────────────────────────────────
const D1 = "#1A7A3C", D2 = "#2EB85C", D3 = "#E8A020", D5 = "#C01B2A"
const D_BY_RANK = ["--color-d1", "--color-d2", "--color-d3", "--color-d4", "--color-d5"]

function barColor(bar: PerQBar, rank: number, total: number): string {
  // Use the raw `--chart-N` :root token, NOT the `--color-chart-N` @theme alias:
  // Tailwind v4 only emits @theme tokens referenced by a utility class, so an
  // inline `var(--color-chart-5)` can resolve to empty (invisible dot/segment).
  if (bar.colorVar) return `var(--${bar.colorVar})`
  const idx = total <= 1 ? 0 : Math.round((rank / (total - 1)) * 4)
  return `var(${D_BY_RANK[idx]})`
}

// value fraction (0..100) → zone color for a performance gauge
function zoneColor(pct: number): string {
  if (pct < 33) return D5
  if (pct < 55) return D3
  if (pct < 70) return D2
  return D1
}

// ── Semicircular gauge geometry ───────────────────────────────────────────────
const GX = 90, GY = 88, GR = 66
function gpt(deg: number, r = GR) {
  const a = (deg * Math.PI) / 180
  return { x: GX + r * Math.cos(a), y: GY + r * Math.sin(a) }
}
// gauge sweeps 180° (left) → 360° (right) over the top; f in 0..1
function gArc(a0: number, a1: number, r = GR): string {
  const s = gpt(a0, r), e = gpt(a1, r)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}
const ang = (pct: number) => 180 + 1.8 * Math.max(0, Math.min(100, pct))

// KPI gauge: 3 colored zones + needle dot at value + target tick
function KpiGauge({ value, display, label, target, isAr }: {
  value: number; display: string; label: string; target?: number; isAr: boolean
}) {
  const valColor = zoneColor(value)
  const needle = gpt(ang(value))
  const tick0 = target != null ? gpt(ang(target), GR - 12) : null
  const tick1 = target != null ? gpt(ang(target), GR + 6) : null
  const tLabel = target != null ? gpt(ang(target), GR + 16) : null
  return (
    <div className="flex flex-col items-center justify-center border-s border-border ps-4">
      <svg viewBox="0 0 180 104" className="w-40" role="img" aria-label={`${label} ${display}`}>
        {/* zone arcs */}
        <path d={gArc(180, 180 + 1.8 * 33)} fill="none" stroke={D5} strokeWidth={12} strokeLinecap="round" />
        <path d={gArc(180 + 1.8 * 33, 180 + 1.8 * 55)} fill="none" stroke={D3} strokeWidth={12} />
        <path d={gArc(180 + 1.8 * 55, 360)} fill="none" stroke={D1} strokeWidth={12} strokeLinecap="round" />
        {/* target marker */}
        {tick0 && tick1 && (
          <line x1={tick0.x} y1={tick0.y} x2={tick1.x} y2={tick1.y} stroke="var(--color-foreground)" strokeWidth={2} />
        )}
        {tLabel && (
          <text x={tLabel.x} y={tLabel.y} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">T</text>
        )}
        {/* needle dot */}
        <circle cx={needle.x} cy={needle.y} r={6} fill={valColor} stroke="var(--color-card)" strokeWidth={2.5} />
        {/* center */}
        <text x={GX} y={GY - 20} textAnchor="middle" fontFamily="Sora" fontWeight={800} fontSize={30} fill={valColor}>{display}</text>
        <text x={GX} y={GY - 4} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">{label}</text>
      </svg>
      {target != null && (
        <span className="text-xs text-muted-foreground -mt-1">
          {isAr ? "الهدف" : "Target"}: <b className="text-foreground">{display.includes("%") ? `${target}%` : (target > 0 ? `+${target}` : `${target}`)}</b>
        </span>
      )}
    </div>
  )
}

// Scale gauge: single brand-cyan fill arc + value, with an icon row below
function ScaleGauge({ value, children }: { value: number; children: React.ReactNode }) {
  const end = gpt(ang(value))
  return (
    <div className="flex flex-col items-center justify-center border-s border-border ps-4">
      <svg viewBox="0 0 180 104" className="w-40" role="img" aria-label={`${value}%`}>
        <path d={gArc(180, 360)} fill="none" stroke="var(--color-muted)" strokeWidth={12} strokeLinecap="round" />
        <path d={gArc(180, ang(value))} fill="none" stroke="var(--color-primary)" strokeWidth={12} strokeLinecap="round" />
        <circle cx={end.x} cy={end.y} r={5} fill="var(--color-primary)" stroke="var(--color-card)" strokeWidth={2.5} />
        <text x={GX} y={GY - 8} textAnchor="middle" fontFamily="Sora" fontWeight={800} fontSize={30} fill="var(--color-primary)">{value}%</text>
      </svg>
      <div className="-mt-1 flex flex-col items-center gap-1">{children}</div>
    </div>
  )
}

function DistBars({ bars, isAr, showCount }: { bars: PerQBar[]; isAr: boolean; showCount?: boolean }) {
  return (
    <div className="space-y-2">
      {bars.map((b, i) => (
        <div key={b.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">{isAr ? b.labelAr : b.label}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">
              {showCount && b.count != null
                ? `${b.count.toLocaleString("en-US")} · ${b.pct}%`
                : `${b.pct}%`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700"
              style={{ width: `${b.pct}%`, backgroundColor: barColor(b, i, bars.length) }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Donut({ bars, n, isAr }: { bars: PerQBar[]; n: number; isAr: boolean }) {
  const data = bars.map((b, i) => ({
    name: isAr ? b.labelAr : b.label,
    value: b.pct,
    fill: barColor(b, i, bars.length),
  }))
  return (
    <ChartContainer config={{}} className="shrink-0 h-32 w-32">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%"
          strokeWidth={2} stroke="var(--color-card)">
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          <Label content={({ viewBox }) => {
            if (!viewBox || !("cx" in viewBox)) return null
            const { cx, cy } = viewBox as { cx: number; cy: number }
            return (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                <tspan x={cx} y={cy - 4} className="fill-foreground text-lg font-bold tabular-nums">
                  {n.toLocaleString("en-US")}
                </tspan>
                <tspan x={cx} y={cy + 13} className="fill-muted-foreground text-[10px]">
                  {isAr ? "إجابة" : "answers"}
                </tspan>
              </text>
            )
          }} />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

function Legend({ bars, isAr }: { bars: PerQBar[]; isAr: boolean }) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {bars.map((b, i) => (
        <div key={b.label} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: barColor(b, i, bars.length) }}
          />
          <span className="text-foreground flex-1 truncate">{isAr ? b.labelAr : b.label}</span>
          <span className="text-foreground tabular-nums font-bold w-10 text-end shrink-0">{b.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// value → d-level (matches CLAUDE.md perfColor thresholds)
function perfLevel(value: number): string {
  if (value >= 85) return "d1"
  if (value >= 75) return "d2"
  if (value >= 60) return "d3"
  if (value >= 45) return "d4"
  return "d5"
}

function TextResponses({ item, isAr }: { item: PerQItem; isAr: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const rows = item.rows ?? []
  const COLLAPSED = 4
  const shown = expanded ? rows : rows.slice(0, COLLAPSED)
  const canExpand = rows.length > COLLAPSED
  const th = "text-xs uppercase tracking-wide text-muted-foreground font-medium"
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border overflow-hidden">
        {/* Only the rows scroll — the sticky header stays put */}
        <div className={cn(expanded && "max-h-80 overflow-y-auto")}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm [&_tr]:border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn("ps-4", th)}>{isAr ? "الرد" : "Response"}</TableHead>
                <TableHead className={cn("w-32", th)}>{isAr ? "القناة" : "Channel"}</TableHead>
                <TableHead className={cn("w-28", th)}>{isAr ? "متى" : "When"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="ps-4 text-foreground">{isAr ? r.textAr : r.text}</TableCell>
                  <TableCell className="text-muted-foreground">{r.channel}</TableCell>
                  <TableCell className="text-muted-foreground"><span dir="ltr" className="inline-block text-start">{r.when}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Footer stays outside the scroll area */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {expanded
            ? (isAr
                ? "عرض آخر ١٠٠ رد مستلَم — القائمة الكاملة والمواضيع في تحليلات النص (M-05)."
                : "Showing last 100 received responses — full list and themes in M-05 text analytics.")
            : (isAr
                ? `عرض أحدث ${shown.length} — القائمة الكاملة والمواضيع في تحليلات النص (M-05).`
                : `Showing latest ${shown.length} — full list and themes in M-05 text analytics.`)}
        </p>
        {canExpand && (
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? (isAr ? "طيّ" : "Collapse") : (isAr ? "عرض المزيد" : "Expand")}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

function NumberBox({ item, isAr }: { item: PerQItem; isAr: boolean }) {
  const data = (item.line ?? []).map((v, i) => ({ d: i + 1, v }))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-5 items-center">
      <div>
        <ChartContainer config={{ v: { label: isAr ? "الردود" : "Responses", color: "var(--color-chart-1)" } }} className="h-40 w-full">
          <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="numFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="d" tickLine={false} axisLine={false} tickMargin={6}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} interval={1} />
            <YAxis tickLine={false} axisLine={false} width={34}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <Area type="monotone" dataKey="v" stroke="var(--color-chart-1)" strokeWidth={2.5}
              fill="url(#numFill)" dot={{ r: 2.5, fill: "var(--color-chart-1)" }} />
          </AreaChart>
        </ChartContainer>
        <p className="text-center text-xs text-muted-foreground mt-1">{isAr ? "عدد الأيام" : "Number of days"}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5 border-s border-border ps-4">
        <span className="text-xs text-muted-foreground">{isAr ? "المتوسط" : "Average"}</span>
        <span className="text-3xl font-heading font-bold tabular-nums text-nb-cyan">{item.avg}</span>
        <span className="text-xs text-muted-foreground">{isAr ? item.avgUnitAr : item.avgUnitEn}</span>
      </div>
    </div>
  )
}

function typeBadge(item: PerQItem, isAr: boolean): string {
  const n = `${item.n.toLocaleString("en-US")} ${isAr ? "إجابة" : "answers"}`
  switch (item.kind) {
    case "kpi":
      return `${item.n.toLocaleString("en-US")} ${isAr ? "رد" : "responses"}`
    case "single":
      return `${isAr ? "اختيار واحد" : "Single select"} · ${n}`
    case "bool":
      return `${isAr ? "نعم/لا (منطقي)" : "Yes/No (Boolean)"} · ${n}`
    case "multi":
      return `${isAr ? "اختيار متعدد" : "Multi-select"} · ${item.n.toLocaleString("en-US")} ${isAr ? "مشارك" : "respondents"}`
    case "scale":
      return `${isAr ? "مقياس" : "Scale"} (${item.view}) · ${n}`
    case "number":
      return `${isAr ? "إدخال — رقم" : "Input — Number"} · ${n}`
    case "text":
      return `${isAr ? "إدخال — فقرة" : "Input — Paragraph"} · ${n}`
  }
}

function QuestionCard({ item, isAr }: { item: PerQItem; isAr: boolean }) {
  const bars = item.bars ?? []
  const score = item.score ?? 0
  let body: React.ReactNode

  if (item.kind === "kpi") {
    const display = item.kpiId === "nps" ? `+${Math.round(score * 2 - 100)}` : `${score}%`
    const label = (item.kpiId ?? "").toUpperCase()
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-5 items-center">
        <DistBars bars={bars} isAr={isAr} />
        <KpiGauge value={score} display={display} label={label} target={item.target} isAr={isAr} />
      </div>
    )
  } else if (item.kind === "scale" && item.view === "labels") {
    // No side gauge → bars take the full width
    body = <DistBars bars={bars} isAr={isAr} />
  } else if (item.kind === "scale") {
    const stars = Math.round((score / 100) * 5)
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-5 items-center">
        <DistBars bars={bars} isAr={isAr} />
        {item.view === "stars" ? (
          <ScaleGauge value={score}>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("size-4", n <= stars ? "fill-d3 stroke-d3" : "stroke-border")} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {isAr ? "مقياس النجوم" : "Stars scale"} · {((score / 100) * 5).toFixed(1)} / 5
            </span>
          </ScaleGauge>
        ) : (
          <ScaleGauge value={score}>
            {(() => {
              const Icon = score >= 60 ? Smile : score >= 40 ? Meh : Frown
              return <Icon className="size-6" style={{ color: `var(--color-${perfLevel(score)})` }} />
            })()}
            <span className="text-xs text-muted-foreground">{isAr ? "مقياس الوجوه" : "Faces scale"}</span>
          </ScaleGauge>
        )}
      </div>
    )
  } else if (item.kind === "single" || item.kind === "bool") {
    body = (
      <div className="flex items-center gap-5">
        <Donut bars={bars} n={item.n} isAr={isAr} />
        <Legend bars={bars} isAr={isAr} />
      </div>
    )
  } else if (item.kind === "multi") {
    body = (
      <div className="space-y-2">
        <DistBars bars={bars} isAr={isAr} showCount />
        <p className="text-xs text-muted-foreground pt-1">
          {isAr
            ? `اختيار متعدد — يمكن للمشاركين اختيار عدة خيارات، لذا تتجاوز النسب 100٪ إجمالاً (الأساس: ${item.n.toLocaleString("en-US")} مشارك).`
            : `Multi-select — respondents can pick several options, so percentages exceed 100% in total (base: ${item.n.toLocaleString("en-US")} respondents).`}
        </p>
      </div>
    )
  } else if (item.kind === "number") {
    body = <NumberBox item={item} isAr={isAr} />
  } else {
    body = <TextResponses item={item} isAr={isAr} />
  }

  // Donut cards stack the badge UNDER the title (per reference); wide cards
  // keep the badge inline top-end.
  const stacked = item.kind === "single" || item.kind === "bool"
  return (
    <Card className="h-full">
      <CardContent className="px-5 space-y-3">
        {stacked ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {isAr ? item.qAr : item.q}
            </h3>
            <Badge variant="outline" className="text-xs">
              {typeBadge(item, isAr)}
            </Badge>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {isAr ? item.qAr : item.q}
            </h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {typeBadge(item, isAr)}
            </Badge>
          </div>
        )}
        {body}
      </CardContent>
    </Card>
  )
}

export function PerQuestionResults({ isAr }: { isAr: boolean }) {
  // Pair adjacent donut (single/bool) questions into a 2-up row (per reference).
  const isDonut = (it: PerQItem) => it.kind === "single" || it.kind === "bool"
  const rows: React.ReactNode[] = []
  for (let i = 0; i < PERQ_ITEMS.length; i++) {
    const it = PERQ_ITEMS[i]
    const next = PERQ_ITEMS[i + 1]
    if (isDonut(it) && next && isDonut(next)) {
      rows.push(
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuestionCard item={it} isAr={isAr} />
          <QuestionCard item={next} isAr={isAr} />
        </div>
      )
      i++
    } else {
      rows.push(<QuestionCard key={i} item={it} isAr={isAr} />)
    }
  }
  return <div className="space-y-4">{rows}</div>
}
