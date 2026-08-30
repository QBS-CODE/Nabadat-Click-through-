// Screen 9 — Survey request log. Every transaction request M-02 received and what
// it decided: was a survey sent back, under which rule, on which channel, in which
// language. Rows expand to the decision timeline + the M-04 invitation record.

import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { ChevronRight, Download, Info, Search, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

import { VALS, chanBase } from "../data/reference"
import { sendName, srvLabel, uidSample } from "../data/helpers"
import { REQ_DATE, REQ_TILES } from "../data/records"
import { OWN_LABEL } from "../data/own"
import { useChannels } from "../store"
import { Bdg, CodeChip, SectionT, Tile, type Tone } from "../components/ui-bits"
import { DateField } from "../components/DateField"
import type { RequestRow } from "../data/types"

const LANG_NAME: Record<string, string> = { ar: "Arabic", en: "English", fr: "French", ur: "Urdu" }

/** Sent-state → [badge tone, label]. */
const RQST: Record<RequestRow["sent"], [Tone, string]> = {
  yes: ["d2", "Survey sent"],
  no: ["d3", "Not sent — policy"],
  held: ["d3", "Held"],
  norule: ["mute", "Not sent — no rule"],
}

const CHIPS: [string, string][] = [
  ["", "All requests"],
  ["yes", "Survey sent"],
  ["no", "Stopped by policy"],
  ["held", "Held"],
  ["norule", "No rule matched"],
]

/** display-parameter label → raw parameter key (for the raw/display table). */
const PRKEY: Record<string, string> = {
  Service: "service",
  Region: "region",
  "Customer Type": "customer_type",
  VIP: "vip",
  "Transaction Amount": "transaction_amount",
  "Wait Time (min)": "wait_time",
}
function rawOf(label: string, val: string) {
  const k = PRKEY[label]
  if (k && VALS[k]) {
    const hit = VALS[k].find((x) => x[1] === val)
    if (hit) return hit[0]
  }
  if (label === "Transaction Amount") return val.replace(/[^\d.]/g, "")
  return val
}

interface Attempt {
  n: number
  type: string
  ch: string
  ref: string
  st: string
  token: string
}
function invitationFor(r: RequestRow) {
  if (r.sent !== "yes") return null
  const shortId = r.id.replace(/^req_/, "")
  const attempts: Attempt[] = [
    {
      n: 1,
      type: "Invitation",
      ch: r.via,
      ref: chanBase(r.via) === "whatsapp" ? "RefNo 987654321" : chanBase(r.via) === "sms" ? "refNo 123456789" : "—",
      st: /recovered/i.test(r.why) ? "Failed → fell back" : "Accepted",
      token: uidSample(6),
    },
  ]
  if (/recovered/i.test(r.why))
    attempts.push({ n: 2, type: "Fallback", ch: "sms", ref: "refNo 123456790", st: "Accepted", token: uidSample(6) + "2" })
  if (/reminder due/i.test(r.resp))
    attempts.push({ n: attempts.length + 1, type: "Reminder", ch: r.via, ref: "—", st: "Scheduled 06:04", token: uidSample(6) + String(attempts.length + 1) })
  return {
    id: "inv_" + shortId,
    survey_id: r.srv,
    channel: r.via,
    sent_at: "2026-07-27T" + r.t + "+03:00",
    effective_expires_at: "2026-08-26T" + r.t + "+03:00",
    contact_id: "CNT-84120",
    request_id: r.id,
    service_channel_id: r.ch,
    transaction_id: "txn_" + shortId,
    redirect_ref: "fbk_" + shortId + "q7",
    params: Object.entries(r.pr).map(([k, v]) => [k, rawOf(k, v), v] as [string, string, string]),
    attempts,
  }
}

const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

export default function RequestLogPage() {
  const navigate = useNavigate()
  const { requests, rules } = useChannels()
  const [q, setQ] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [ruleFilter, setRuleFilter] = useState("")
  const [chip, setChip] = useState("")
  const [open, setOpen] = useState<Set<number>>(new Set())

  const ruleNames = useMemo(
    () => [...new Set(requests.map((r) => r.rule).filter((x) => x && x !== "—"))].sort(),
    [requests],
  )

  const rows = requests
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => {
      const ql = q.toLowerCase()
      const okSearch =
        r.id.includes(ql) ||
        r.rule.toLowerCase().includes(ql) ||
        r.srv.toLowerCase().includes(ql) ||
        r.src.toLowerCase().includes(ql)
      const okChip = !chip || r.sent === chip
      const okDate = (!from || REQ_DATE >= from) && (!to || REQ_DATE <= to)
      const okRule = !ruleFilter || r.rule === ruleFilter
      return okSearch && okChip && okDate && okRule
    })

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const openRule = (name: string) => {
    const rule = rules.find((x) => x.name === name)
    if (!rule) {
      toast("That rule no longer exists.")
      return
    }
    navigate(`/sending-rules/${rule.id}/edit`)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">Survey request log</h1>
          <p className="mt-1 max-w-[680px] text-sm text-muted-foreground">
            Every transaction request M-02 received, and what it decided: was a survey sent back, and if so under which
            rule, on which channel, in which language. Answering the question “why did this customer not get a survey?” is
            this screen's whole job.
          </p>
        </div>
        <Button variant="outline" onClick={() => toast("Export queued — CSV will download when ready.")}>
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Requests received · 24 h" value={REQ_TILES.received} sub="From 4 M-13 integrations" />
        <Tile
          label="Survey sent"
          value={REQ_TILES.sent}
          badge={<Bdg tone="d2">{REQ_TILES.sentPct}</Bdg>}
          sub="A rule matched and the policy allowed it"
        />
        <Tile label="No survey sent" value={REQ_TILES.noSurvey} sub={REQ_TILES.noSurveyBreak} />
        <Tile
          label="Answered · from M-04"
          value={REQ_TILES.answered}
          badge={<Bdg tone="d2">{REQ_TILES.answeredPct}</Bdg>}
          sub="Responses stored against the request"
        />
      </div>

      {/* M-04 contract */}
      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm dark:shadow-none">
        <div className="text-base font-bold">Contract with M-04 · Response Collection</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          M-02 stops at the provider hand-off. Every row below that a survey was sent for carries an{" "}
          <b>invitation record</b>, which is what M-04 deduplicates and anchors expiry on.
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <div>
            <SectionT className="mt-0">Funnel event ownership</SectionT>
            <MiniTable head={["Event", "Owner", ""]} cols={["44%", "22%", "34%"]}>
              {(
                [
                  ["Sent", "m02", "The message left the platform"],
                  ["Delivered", "m02", "Where the channel reports it — see the caveat below"],
                  ["Opened — invitation", "m02", "The link or notification was opened"],
                  ["Opened — survey rendered", "m04", ""],
                  ["Started — first answer persisted", "m04", ""],
                  ["Finished — response Completed", "m04", ""],
                ] as [string, string, string][]
              ).map(([ev, own, note]) => (
                <TableRow key={ev}>
                  <TableCell className="font-semibold">{ev}</TableCell>
                  <TableCell>
                    <Bdg tone={own === "m02" ? "cyan" : "d2"}>{OWN_LABEL[own]}</Bdg>
                  </TableCell>
                  <TableCell className="text-[11.5px] text-muted-foreground">{note}</TableCell>
                </TableRow>
              ))}
            </MiniTable>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Neither module computes the other's events — two figures for one number is how analytics stop being trusted.
            </p>
          </div>
          <div>
            <SectionT className="mt-0">What M-02 guarantees</SectionT>
            <Mech n="1" t="An invitation on every send, every channel" d="Including kiosk and web-embed, where a per-render session token stands in for a contact." />
            <Mech n="2" t="No survey version is pinned" d="Survey versioning is out of scope in this version, so the invitation records no survey_version_id. A survey republished while a response is open changes the questions under the respondent — accepted for now." />
            <Mech n="3" t="sent_at recorded accurately" d="The single anchor for expiry and for the reminder offset." />
            <Mech n="4" t="One invitation per survey per recipient" d="Reminders, fallbacks and retries are attempts beneath it." />
            <Mech n="5" t="Raw parameter values on the record" d="Never display labels, and never a reference into a log that purges at 90 days." />
            <Alert tone="warn" className="mt-3">
              <b>Delivered cannot always be supplied.</b> The A2A WhatsApp interface reports queueing only, and SMS status
              is polled, so a message can end its life <i>unconfirmed</i>. M-01's funnel has to tolerate a missing
              Delivered rather than treat it as zero.
            </Alert>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="rq-q">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="rq-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by request ID, rule, survey or customer…"
                className="ps-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <Label htmlFor="rq-from">From</Label>
            <DateField id="rq-from" value={from} onChange={setFrom} placeholder="From date" />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <Label htmlFor="rq-to">To</Label>
            <DateField id="rq-to" value={to} onChange={setTo} placeholder="To date" />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-56">
            <Label>Rule</Label>
            <Select value={ruleFilter || "__all__"} onValueChange={(v) => setRuleFilter(!v || v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{ruleFilter || "All rules"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All rules</SelectItem>
                {ruleNames.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setChip(k)}
              className={cn(
                "inline-flex h-[29px] items-center rounded-full px-3 text-[11.5px] font-semibold transition-colors",
                chip === k
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table className="w-full table-fixed [&_td]:align-top">
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[3%]" />
              <TableHead className={cn(TH, "w-[9%]")}>Received</TableHead>
              <TableHead className={cn(TH, "w-[11%]")}>Request</TableHead>
              <TableHead className={cn(TH, "w-[15%]")}>Service channel</TableHead>
              <TableHead className={cn(TH, "w-[17%]")}>Key parameters</TableHead>
              <TableHead className={cn(TH, "w-[12%]")}>Survey sent?</TableHead>
              <TableHead className={cn(TH, "w-[13%]")}>Rule used</TableHead>
              <TableHead className={cn(TH, "w-[6%]")}>Sent via</TableHead>
              <TableHead className={cn(TH, "w-[14%]")}>Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No requests match the current filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ r, i }) => {
              const [tone, label] = RQST[r.sent]
              const isOpen = open.has(i)
              return (
                <RowGroup
                  key={i}
                  r={r}
                  i={i}
                  tone={tone}
                  label={label}
                  isOpen={isOpen}
                  onToggle={() => toggle(i)}
                  onOpenRule={openRule}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="border-t border-border pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
        <b>Module boundary.</b> M-02 owns everything up to and including hand-off to the provider. Once a customer
        answers, <b>M-04 Response Collection</b> validates, deduplicates and stores the response, then reports it back
        against this request ID — which is why the Response column is read-only here and never editable. Requests are
        retained for 90 days in line with the M-13 request log.
      </p>
    </div>
  )
}

function RowGroup({
  r,
  tone,
  label,
  isOpen,
  onToggle,
  onOpenRule,
}: {
  r: RequestRow
  i: number
  tone: Tone
  label: string
  isOpen: boolean
  onToggle: () => void
  onOpenRule: (name: string) => void
}) {
  const inv = invitationFor(r)
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <div className="text-[12.5px] font-semibold">{r.t}</div>
          <div className="text-[11px] text-muted-foreground">27 Jul 2026</div>
        </TableCell>
        <TableCell>
          <div className="truncate font-mono text-[11px] font-semibold" dir="ltr">
            {r.id}
          </div>
          <div className="text-[11px] leading-snug text-muted-foreground">{r.src}</div>
        </TableCell>
        <TableCell>
          <CodeChip className="inline-block max-w-full truncate align-bottom">{r.ch}</CodeChip>
        </TableCell>
        <TableCell className="whitespace-normal">
          <div className="text-[11px] leading-relaxed break-words text-muted-foreground">
            {Object.entries(r.pr).map(([k, v], idx) => (
              <span key={k}>
                {idx > 0 && " · "}
                {k}: <b className="font-semibold text-foreground">{v}</b>
              </span>
            ))}
          </div>
        </TableCell>
        <TableCell className="whitespace-normal">
          <Bdg tone={tone}>{label}</Bdg>
        </TableCell>
        <TableCell className="whitespace-normal">
          <div className="text-xs font-semibold break-words">{r.rule}</div>
          <div className="text-[11px] leading-snug break-words text-muted-foreground">
            {r.srv}
            {r.lang ? ` · ${LANG_NAME[r.lang]}` : ""}
          </div>
        </TableCell>
        <TableCell className="whitespace-normal text-xs break-words">{r.via ? sendName(r.via) : "—"}</TableCell>
        <TableCell className="whitespace-normal text-[11.5px] break-words text-muted-foreground">{r.resp}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/60 hover:bg-muted/60">
          <TableCell colSpan={9} className="whitespace-normal p-0">
            <div className="px-5 py-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Decision timeline */}
                <div>
                  <SectionT className="mt-0">Decision</SectionT>
                  <Timeline
                    items={[
                      { t: "Request received", d: `${r.src} → M-13 → M-02 · ${r.t}` },
                      {
                        t: "Rule evaluation",
                        d: r.sent === "norule" ? `No enabled rule matched on ${r.ch}` : `Matched ${r.rule} (first match wins)`,
                        muted: r.sent === "norule",
                      },
                      { t: "Do-not-send check", d: r.why, muted: r.sent === "no" || r.sent === "held" },
                      {
                        t: "Dispatch",
                        d: r.via ? `${sendName(r.via)} · provider receipts are recorded against the attempt` : "Nothing dispatched",
                        muted: r.sent !== "yes",
                      },
                      {
                        t: "Response — owned by M-04",
                        d: r.resp.startsWith("Answered") ? `${r.resp} · validated, deduplicated and stored by M-04` : "No response stored yet",
                        muted: !r.resp.startsWith("Answered"),
                      },
                    ]}
                  />
                </div>
                {/* Params + trace + actions */}
                <div>
                  <SectionT className="mt-0">Received parameters</SectionT>
                  <KV rows={Object.entries(r.pr)} />
                  <SectionT>Trace</SectionT>
                  <KV
                    rows={[
                      ["Request ID", <span key="id" className="font-mono" dir="ltr">{r.id}</span>],
                      ["Survey", r.srv === "—" ? "None" : srvLabel(r.srv)],
                      ["Language sent", r.lang ? LANG_NAME[r.lang] : "—"],
                      ["Channel used", r.via ? sendName(r.via) : "—"],
                    ]}
                  />
                  {r.rule !== "—" && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenRule(r.rule)
                        }}
                      >
                        Open the rule
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invitation record */}
              <div className="mt-4 border-t border-border pt-1">
                {inv ? (
                  <>
                    <SectionT>
                      Invitation record <Bdg tone="cyan">M-02 → M-04</Bdg>
                    </SectionT>
                    <KV
                      mono
                      rows={[
                        ["invitation_id", <b key="i">{inv.id}</b>],
                        ["survey_id", inv.survey_id],
                        [
                          "effective_expires_at",
                          <span key="e">
                            {inv.effective_expires_at} <Bdg tone="mute">derived · M-04 reads, never recomputes</Bdg>
                          </span>,
                        ],
                        ["channel", sendName(inv.channel)],
                        [
                          "sent_at",
                          <span key="s">
                            {inv.sent_at} <Bdg tone="mute">expiry anchor</Bdg>
                          </span>,
                        ],
                        ["contact_id", inv.contact_id],
                        ["request_id", inv.request_id],
                        [
                          "redirect_ref",
                          <span key="r">
                            {inv.redirect_ref} <Bdg tone="cyan">minted on first use</Bdg>
                          </span>,
                        ],
                        ["service_channel_id", inv.service_channel_id],
                        ["transaction_id", inv.transaction_id],
                      ]}
                    />

                    <SectionT>
                      Registered parameter values <Bdg tone="mute">raw, not display</Bdg>
                    </SectionT>
                    <MiniTable head={["Parameter", "Raw value — stored", "Display value — resolved at read time"]}>
                      {inv.params.map(([k, raw, disp]) => (
                        <TableRow key={k}>
                          <TableCell className="text-[11.5px]">{k}</TableCell>
                          <TableCell>
                            <CodeChip>{raw}</CodeChip>
                          </TableCell>
                          <TableCell className="text-[11.5px] text-muted-foreground">{disp}</TableCell>
                        </TableRow>
                      ))}
                    </MiniTable>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Raw values travel on the invitation so reports survive the 90-day purge of M-13's request log;
                      labels resolve at read time per M-13 F0.5.
                    </p>

                    <SectionT>
                      Send attempts <Bdg tone="mute">children of one invitation</Bdg>
                    </SectionT>
                    <MiniTable head={["send_attempt_id", "Link token", "Type", "Channel", "Provider reference", "Result"]}>
                      {inv.attempts.map((a) => (
                        <TableRow key={a.n}>
                          <TableCell>
                            <CodeChip>
                              {inv.id}.{a.n}
                            </CodeChip>
                          </TableCell>
                          <TableCell>
                            <CodeChip>{a.token}</CodeChip>
                          </TableCell>
                          <TableCell className="text-[11.5px]">{a.type}</TableCell>
                          <TableCell className="text-[11.5px]">{sendName(a.ch)}</TableCell>
                          <TableCell className="font-mono text-[11.5px] text-muted-foreground">{a.ref}</TableCell>
                          <TableCell className="text-[11.5px]">{a.st}</TableCell>
                        </TableRow>
                      ))}
                    </MiniTable>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      <b>The link is bound to the attempt, not to the invitation.</b> A fallback or a reminder mints its
                      own token, so M-04 records <span className="font-mono">responding_send_attempt_id</span> and derives
                      the reporting channel from the attempt that actually delivered — otherwise every fallback would be
                      credited to the wrong channel.
                    </p>
                  </>
                ) : (
                  <Alert tone="warn" className="mt-3">
                    <b>No invitation record.</b>{" "}
                    {r.sent === "held"
                      ? "This dispatch is held. The invitation record is created at the moment of sending, so it does not exist yet — and sent_at cannot be recorded until the send actually happens."
                      : r.sent === "norule"
                        ? "No rule matched, so no survey was created and there is nothing for M-04 to receive."
                        : "A rule matched, but a dispatch guardrail stopped the send. No message left the platform, so no invitation exists and M-04 is never told about this transaction."}
                  </Alert>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ---- small building blocks ----
function MiniTable({ head, cols, children }: { head: string[]; cols?: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table className={cn("w-full [&_td]:align-top", cols && "table-fixed [&_td]:whitespace-normal")}>
        {cols && (
          <colgroup>
            {cols.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <TableHeader>
          <TableRow>
            {head.map((h, i) => (
              <TableHead key={i} className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  )
}

function Mech({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-[10.5px] font-bold text-muted-foreground">
        {n}
      </span>
      <div>
        <div className="text-[12.5px] font-semibold">{t}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{d}</div>
      </div>
    </div>
  )
}

const ALERT_TONE: Record<string, string> = {
  info: "bg-nb-cyan-100 text-nb-cyan-900 dark:bg-nb-cyan-900/30 dark:text-nb-cyan-100",
  warn: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  err: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
  ok: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
}
function Alert({ tone, className, children }: { tone: "info" | "warn" | "err" | "ok"; className?: string; children: ReactNode }) {
  const Icon = tone === "info" ? Info : TriangleAlert
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md px-3.5 py-2.5 text-xs leading-relaxed", ALERT_TONE[tone], className)}>
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function KV({ rows, mono }: { rows: [string, ReactNode][]; mono?: boolean }) {
  return (
    <div className={cn("grid gap-x-3 gap-y-1.5 text-xs", mono ? "grid-cols-[172px_1fr]" : "grid-cols-[170px_1fr]")}>
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <span className={cn("text-muted-foreground", mono && "font-mono text-[11px]")}>{k}</span>
          <span className={cn("text-foreground", mono && "font-mono text-[11px]")}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function Timeline({ items }: { items: { t: string; d: string; muted?: boolean }[] }) {
  return (
    <div className="relative ps-[18px] before:absolute before:top-1.5 before:bottom-1.5 before:start-[5px] before:w-px before:bg-border">
      {items.map((it, i) => (
        <div key={i} className="relative py-1.5">
          <span
            className={cn(
              "absolute -start-[16px] top-[11px] size-[9px] rounded-full border-2 border-card",
              it.muted ? "bg-border" : "bg-primary",
            )}
          />
          <div className={cn("text-xs font-semibold", it.muted && "text-muted-foreground")}>{it.t}</div>
          <div className="text-[11px] text-muted-foreground">{it.d}</div>
        </div>
      ))}
    </div>
  )
}
