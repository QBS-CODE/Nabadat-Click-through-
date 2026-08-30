// Screen 5 — Survey trigger rules. Decide whether a survey is sent for a
// transaction, which survey, in which language, and through which channel.

import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Copy, GripVertical, Pencil, Play, Plus, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CH, SURVEYS, isNullCh } from "../data/reference"
import { dmy, fmtN, humanMin, isExpired, remOffset, ruleStatus, sendName, srvActiveMin, srvLabel, summary } from "../data/helpers"
import { useChannels } from "../store"
import { Bdg, CodeChip } from "../components/ui-bits"
import { RuleDrawer } from "../components/RuleDrawer"
import { Simulator } from "../components/Simulator"
import type { Rule } from "../data/types"

const langAbbr = (l: string) => (({ ar: "Arabic", en: "English", fr: "French", ur: "Urdu" })[l] || "—").slice(0, 2).toUpperCase()

function StatusBadge({ r }: { r: Rule }) {
  if (isExpired(r)) return <Bdg tone="d3">Expired</Bdg>
  if (r.st === "disabled") return <Bdg tone="mute">Off</Bdg>
  return null
}

function OverrideBadges({ r }: { r: Rule }) {
  const parts: React.ReactNode[] = []
  if (r.ovr?.q) parts.push(<Bdg key="q" tone="d3" title="Quiet hours waived — M-02 owns the window, so M-02 can waive it">Quiet waived</Bdg>)
  const req = [r.ovr?.f ? "fatigue" : null, r.ovr?.g ? "grace" : null].filter(Boolean)
  if (req.length) parts.push(<Bdg key="e" tone="d3" title="Exemption requested from M-03 at dispatch — M-03 decides, M-02 records the answer">{req.join(" · ")} exemption</Bdg>)
  if (r.langOvr) parts.push(<Bdg key="l" tone="cyan" title="Preferred-value overriding from the customer profile or parameters">Lang</Bdg>)
  return parts.length ? <div className="flex flex-wrap gap-1">{parts}</div> : <span className="text-muted-foreground">—</span>
}

function TimingCell({ r }: { r: Rule }) {
  if (CH[r.ch]?.inS) return <span className="text-muted-foreground">In session</span>
  if (isNullCh(r.send)) return <span className="text-muted-foreground">Backend · link returned</span>
  return (
    <div>
      <div className="text-xs">Active {humanMin(srvActiveMin(r.survey))}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {r.rem?.on ? `Reminder ${remOffset(r.rem)} · ${sendName(r.rem.ch)}` : "No reminder"}
      </div>
    </div>
  )
}

/** Matched vs Sent gap bar + delta. */
function SentCell({ r }: { r: Rule }) {
  if (!r.trig) return <span className="text-muted-foreground">—</span>
  const sent = r.sent || 0
  const pct = Math.round((sent / r.trig) * 100)
  const gap = Math.max(0, r.trig - sent)
  const held = Math.round(gap * 0.34)
  const opt = Math.round(gap * 0.28)
  const fat = gap - held - opt
  const title = gap
    ? `Held by quiet hours ${held} (M-02) · dropped for opt-out ${opt} (M-03) · suppressed by fatigue or grace ${fat} (M-03)`
    : "Every matched transaction was sent"
  return (
    <div className="min-w-[104px]" title={title}>
      <div className="text-[12.5px] font-semibold tabular-nums">{fmtN(sent)}</div>
      <div className="mt-1 flex h-[5px] overflow-hidden rounded-full bg-muted">
        <span className="h-full bg-d2" style={{ width: `${pct}%` }} />
        <span className="h-full bg-d3" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
        {gap ? `−${fmtN(gap)} at dispatch` : "no gap"}
      </div>
    </div>
  )
}

const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

export default function RulesListPage() {
  const navigate = useNavigate()
  const { rules, channels, toggleRule, duplicateRule, reorderRules } = useChannels()
  const [q, setQ] = useState("")
  const [fch, setFch] = useState("")
  const [fsrv, setFsrv] = useState("")
  const [fst, setFst] = useState("")
  const [drawerRule, setDrawerRule] = useState<Rule | null>(null)
  const [simOpen, setSimOpen] = useState(false)

  const dragId = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dropOver, setDropOver] = useState<number | null>(null)

  const rows = rules.filter((r) => {
    const st = ruleStatus(r)
    return (
      (r.name.toLowerCase().includes(q.toLowerCase()) || summary(r.cond).toLowerCase().includes(q.toLowerCase())) &&
      (!fch || r.ch === fch) &&
      (!fsrv || r.survey === fsrv) &&
      (!fst || st === fst)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">Survey trigger rules</h1>
          <p className="mt-1 max-w-[680px] text-sm text-muted-foreground">
            Decide whether a survey is sent for a transaction, which survey, in which language, and through which sending
            channel. Rules read M-13's transaction parameters and channel contracts; the do-not-send policy can still stop
            the send afterwards.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => setSimOpen(true)}>
            <Play className="size-4" />
            Rule simulator
          </Button>
          <Button onClick={() => navigate("/sending-rules/new")}>
            <Plus className="size-4" />
            New rule
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="rule-q">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="rule-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules…" className="ps-9" />
          </div>
        </div>
        <FilterSelect label="Service channel" value={fch} onChange={setFch} placeholder="All service channels" options={Object.entries(CH).map(([k, c]) => [k, c.name])} />
        <FilterSelect label="Survey" value={fsrv} onChange={setFsrv} placeholder="All surveys" options={SURVEYS.map((s) => [s.id, s.name])} />
        <FilterSelect label="Status" value={fst} onChange={setFst} placeholder="Any status" options={[["Enabled", "Enabled"], ["Disabled", "Disabled"], ["Expired", "Expired"]]} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table className="[&_td]:align-top">
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={cn(TH, "w-[68px]")}>Priority</TableHead>
              <TableHead className={TH}>Rule</TableHead>
              <TableHead className={TH}>Service channel</TableHead>
              <TableHead className={TH}>Conditions</TableHead>
              <TableHead className={TH}>Survey → Sending channel</TableHead>
              <TableHead className={TH}>Timing</TableHead>
              <TableHead className={TH}>Effective</TableHead>
              <TableHead className={TH}>Overrides</TableHead>
              <TableHead className={cn(TH, "text-end")}>Matched · 7 d</TableHead>
              <TableHead className={cn(TH, "text-end")}>Sent · 7 d</TableHead>
              <TableHead className={TH}>Enabled</TableHead>
              <TableHead className={cn(TH, "w-16 text-center")}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                  No rules match the current filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const inS = CH[r.ch]?.inS
              const chOff = r.send && channels[r.send] && !channels[r.send].st
              return (
                <TableRow
                  key={r.id}
                  draggable
                  onDragStart={(e) => {
                    dragId.current = r.id
                    e.dataTransfer.effectAllowed = "move"
                    // The default row drag image spans the whole table width (reads as
                    // "dragging the page"). Substitute a compact labelled pill.
                    const ghost = document.createElement("div")
                    ghost.textContent = `#${r.p} · ${r.name}`
                    ghost.className =
                      "fixed -left-[9999px] top-0 z-50 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg"
                    document.body.appendChild(ghost)
                    e.dataTransfer.setDragImage(ghost, 14, 14)
                    setTimeout(() => ghost.remove(), 0)
                    setTimeout(() => setDragging(r.id), 0)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropOver(r.id)
                  }}
                  onDragLeave={() => setDropOver((d) => (d === r.id ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragId.current != null && dragId.current !== r.id) reorderRules(dragId.current, r.id)
                    dragId.current = null
                    setDragging(null)
                    setDropOver(null)
                  }}
                  onDragEnd={() => {
                    setDragging(null)
                    setDropOver(null)
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button,label,input,select,[data-grip],[role=switch]")) return
                    setDrawerRule(r)
                  }}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    dragging === r.id && "opacity-40",
                    dropOver === r.id && dragging !== r.id && "border-t-2 border-t-primary",
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span data-grip className="cursor-grab text-border" title="Drag to reorder">
                        <GripVertical className="size-4" />
                      </span>
                      <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-sm bg-accent px-1.5 font-heading text-xs font-bold text-accent-foreground">
                        {r.p}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[190px] max-w-[190px] whitespace-normal">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold break-words">
                      {r.name} <StatusBadge r={r} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">Updated {r.upd}</div>
                  </TableCell>
                  <TableCell>
                    <CodeChip>{r.ch}</CodeChip>
                  </TableCell>
                  <TableCell className="w-[150px] max-w-[150px] whitespace-normal">
                    <div className="text-[11.5px] break-words text-muted-foreground">{summary(r.cond)}</div>
                  </TableCell>
                  <TableCell className="w-[200px] max-w-[200px] whitespace-normal">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold break-words">
                      {srvLabel(r.survey)} <Bdg tone="mute">{langAbbr(r.lang)}</Bdg>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] break-words text-muted-foreground">
                      {inS
                        ? "In-session / on-device"
                        : `→ ${sendName(r.send)}${r.fb ? ` · fallback ${sendName(r.fb)}` : ""}`}
                      {chOff && <Bdg tone="d5">Channel off</Bdg>}
                    </div>
                  </TableCell>
                  <TableCell className="w-[150px] max-w-[150px] whitespace-normal">
                    <TimingCell r={r} />
                  </TableCell>
                  <TableCell className="w-[110px] max-w-[110px] whitespace-normal text-[11.5px] text-muted-foreground">
                    {r.to ? `${dmy(r.from)} – ${dmy(r.to)}` : `From ${dmy(r.from)}`}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <OverrideBadges r={r} />
                  </TableCell>
                  <TableCell className="text-end tabular-nums" title="Transactions where this rule was the first match — a decision, not a send">
                    {fmtN(r.trig)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end">
                      <SentCell r={r} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={r.st === "enabled"}
                      onCheckedChange={(v) => toggleRule(r.id, v)}
                      aria-label={`Enable ${r.name}`}
                    />
                  </TableCell>
                  <TableCell className="w-16 text-center">
                    <div className="flex justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Edit rule"
                        title="Edit"
                        onClick={() => navigate(`/sending-rules/${r.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Duplicate rule"
                        title="Duplicate"
                        onClick={() => duplicateRule(r.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="border-t border-border pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
        <b>A rule matching does not guarantee a send.</b> A rule makes the decision; the guardrails run later, at dispatch
        — quiet hours in <b>M-02</b>, opt-out and fatigue caps in <b>M-03</b> — so <b>Matched</b> and <b>Sent</b> can
        legitimately differ, and the gap is not a defect. Drag the <b>grip</b> to reorder priority within a service
        channel (first match wins). Rule evaluation is invoked by M-13's transaction pipeline; each evaluation writes a
        per-rule trace against the transaction's correlation ID.
      </p>

      <RuleDrawer rule={drawerRule} onClose={() => setDrawerRule(null)} onEdit={(id) => { setDrawerRule(null); navigate(`/sending-rules/${id}/edit`) }} />
      <Simulator open={simOpen} onClose={() => setSimOpen(false)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: [string, string][]
}) {
  const ALL = "__all__"
  return (
    <div className="flex flex-col gap-1.5 sm:w-48">
      <Label>{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(!v || v === ALL ? "" : v)}>
        <SelectTrigger className="w-full">
          <SelectValue>{value ? options.find((o) => o[0] === value)?.[1] : placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map(([k, l]) => (
            <SelectItem key={k} value={k}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
