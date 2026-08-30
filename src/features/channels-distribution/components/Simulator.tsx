// Rule simulator — runs evaluation exactly as the engine would (rules of the
// selected service channel, priority order, first match wins) then the dispatch
// guardrail checks on the winning rule.

import { useMemo, useState } from "react"
import { Check, Minus, Play, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CH } from "../data/reference"
import { runSimulation, type SimResult } from "../data/engine"
import { OWN_LABEL } from "../data/own"
import { useChannels } from "../store"
import { Bdg, SectionT } from "./ui-bits"

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    vip: true,
    service: "S002",
    region: "R01",
    customer_type: "CT1",
    customer_language: "AR",
    transaction_amount: 220,
    amount_band: "B2",
    mobile: "+962790000312",
    email: "ahmad@example.com",
    transaction_date: "2026-07-27",
    transaction_datetime: "2026-07-27T22:20",
  },
  null,
  1,
)

function Html({ text }: { text: string }) {
  // the engine returns a few inline <b> markers; render them faithfully.
  return <span dangerouslySetInnerHTML={{ __html: text }} />
}

export function Simulator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rules, templates, settings } = useChannels()
  const [ch, setCh] = useState(Object.keys(CH)[0])
  const [date, setDate] = useState("2026-07-27T22:40")
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD)
  const [optout, setOptout] = useState(false)
  const [fatigue, setFatigue] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)

  const run = () => {
    const when = new Date(date || "2026-07-27T22:40")
    const day = (date || "2026-07-27").slice(0, 10)
    setResult(runSimulation(payload, ch, when, day, { optout, fatigue }, rules, templates, settings))
  }

  const serviceChannels = useMemo(() => Object.entries(CH), [])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
          <DialogTitle className="font-heading">Rule simulator</DialogTitle>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Runs the evaluation exactly as the engine would: rules of the selected service channel, in priority order,
            first match wins — then the do-not-send policy check on the winning rule.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Service channel</Label>
              <Select value={ch} onValueChange={(v) => v && setCh(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{CH[ch]?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {serviceChannels.map(([k, c]) => (
                    <SelectItem key={k} value={k}>
                      {c.name} — {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sim-date">Evaluate as of</Label>
              <Input id="sim-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              <p className="text-xs leading-relaxed text-muted-foreground">Applies effective windows and quiet hours.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sim-payload">Sample transaction payload</Label>
            <Textarea
              id="sim-payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              spellCheck={false}
              className="min-h-[110px] font-mono text-[11.5px]"
              dir="ltr"
            />
          </div>

          <div>
            <Label className="mb-2 block leading-snug">
              Customer state at dispatch <span className="font-normal text-muted-foreground">— held by M-03</span>
            </Label>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Checkbox checked={optout} onCheckedChange={(v) => setOptout(!!v)} />
                Has opted out of the chosen channel
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <Checkbox checked={fatigue} onCheckedChange={(v) => setFatigue(!!v)} />
                Already at the fatigue cap
              </label>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              These are attributes of the customer, not of the transaction — which is why they are checked at dispatch
              rather than during evaluation.
            </p>
          </div>

          <div>
            <Button onClick={run} variant="secondary">
              <Play className="size-3.5" />
              Run evaluation
            </Button>
          </div>

          {result && <Trace result={result} />}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-3.5 text-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Dot({ kind }: { kind: "ok" | "no" | "skip" }) {
  return (
    <span
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        kind === "ok" && "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
        kind === "no" && "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
        kind === "skip" && "bg-muted text-muted-foreground",
      )}
    >
      {kind === "ok" ? <Check className="size-3" /> : kind === "no" ? <X className="size-3" /> : <Minus className="size-3" />}
    </span>
  )
}

function Trace({ result }: { result: SimResult }) {
  if (result.parseError) {
    return (
      <div className="rounded-md bg-d3-light px-3.5 py-3 text-[12.5px] text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
        <b>Invalid JSON.</b> {result.parseError}
      </div>
    )
  }
  return (
    <div className="pt-2">
      <SectionT className="mt-0">
        Stage 1 — decision · rule evaluation <Bdg tone="cyan">{OWN_LABEL.m02}</Bdg>
      </SectionT>
      <div>
        {result.decision.map((it, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
            <Dot kind={it.dot} />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-sm bg-accent px-1.5 font-heading text-[11px] font-bold text-accent-foreground">
                  {it.priority}
                </span>
                {it.name} {it.statusBadge && <Bdg tone={it.statusBadge === "Expired" ? "d3" : "mute"}>{it.statusBadge}</Bdg>}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                <Html text={it.text} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {result.noRule ? (
        <div className="mt-3 rounded-md bg-d3-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
          <b>No rule matched — decision is "no survey".</b> Nothing is dispatched and the dispatch stage never runs. The
          transaction is stored for analytics tagged “no rule matched”.
        </div>
      ) : (
        <>
          <div className="mt-1 rounded-md bg-d2-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light">
            <b>Decision:</b> <Html text={result.outcome!} />.
            <br />
            <span className="opacity-85">This is a decision only — the message has not been sent, and may still not be.</span>
          </div>
          <SectionT>Stage 2 — dispatch · at send time</SectionT>
          <div>
            {result.dispatch!.map((c, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
                <Dot kind={c.ok ? "ok" : c.held ? "skip" : "no"} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    {c.stage}{" "}
                    {c.own && <Bdg tone={c.own === "m02" ? "cyan" : "d2"}>{OWN_LABEL[c.own]}</Bdg>}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    <Html text={c.note} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {result.blocker ? (
            <div className="mt-3 rounded-md bg-d3-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
              <b>Result: the rule matched but nothing was {result.blocker.held ? "sent yet" : "sent"}.</b> Stopped at{" "}
              <b>{result.blocker.stage}</b>
              {result.blocker.own ? ` — owned by ${OWN_LABEL[result.blocker.own]}` : ""}. This is exactly the gap between
              the Matched and Sent counters on the rules list.
            </div>
          ) : (
            <div className="mt-3 rounded-md bg-d2-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light">
              <b>Result: sent.</b> The channel accepted the message. The response, when it arrives, is collected and stored
              by M-04 and reported back against this transaction.
            </div>
          )}
        </>
      )}
    </div>
  )
}
