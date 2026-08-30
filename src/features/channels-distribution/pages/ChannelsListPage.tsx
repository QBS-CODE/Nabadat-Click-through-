// Screen 1 — Sending channels. Every channel Nabadat can deliver through, and how
// each captures the answer. Deferred channels are listed but faded and inert.

import { useState } from "react"
import { useNavigate } from "react-router"
import { Info, Plus, Send, Settings2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { channelOrder, chanBase, isSoon } from "../data/reference"
import { fmtN, respTone } from "../data/helpers"
import { useChannels } from "../store"
import { AddChannelModal } from "../components/AddChannelModal"
import { TestSendModal } from "../components/TestSendModal"
import { Bdg, ChanIcon, CodeChip, Tile } from "../components/ui-bits"

const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

export default function ChannelsListPage() {
  const navigate = useNavigate()
  const { channels, toggleChannel } = useChannels()
  const [addOpen, setAddOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">Sending channels</h1>
          <p className="mt-1 max-w-[680px] text-sm text-muted-foreground">
            Every channel Nabadat can deliver a survey through, and how each one captures the answer. A trigger rule picks
            the survey; the channel decides how it reaches the customer and how the response comes back.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => setTestOpen(true)}>
            <Send className="size-4" />
            Send a test
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add channel
          </Button>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Enabled channels" value="6" badge={<Bdg tone="mute">of 13</Bdg>} sub="SMS and Email families · the other seven are coming soon" />
        <Tile
          label="Messages dispatched · 7 d"
          value="24,220"
          sub="Handed to a provider after the guardrails passed — the sum of Sent · 7 d below"
          title="Messages that passed the dispatch guardrails and were accepted by a provider."
        />
        <Tile label="Delivery rate · 7 d" value="96.8" suffix={<span className="text-sm">%</span>} badge={<Bdg tone="d2">On track</Bdg>} sub="Confirmed delivered ÷ accepted by the provider" />
        <Tile label="Held or suppressed · 7 d" value="2,850" sub="Quiet hours (M-02) · opt-out and fatigue (M-03)" title="Rules matched, but the dispatch guardrails held or dropped the message." />
      </div>

      {/* Table — fixed layout so columns fit without horizontal scroll and text
          wraps. Only the vertical padding is roomier; horizontal padding stays at the
          shadcn default (px-2) so header (th) and body (td) share the same left edge. */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table className="table-fixed [&_td]:py-3.5">
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={cn(TH, "w-[19%] whitespace-normal")}>Channel</TableHead>
              <TableHead className={cn(TH, "w-[13%] whitespace-normal")}>Delivery mode</TableHead>
              <TableHead className={cn(TH, "w-[21%] whitespace-nowrap")}>How the answer is captured</TableHead>
              <TableHead className={cn(TH, "w-[14%] whitespace-normal")}>Provider</TableHead>
              <TableHead className={cn(TH, "w-[8%] text-end")}>Sent · 7 d</TableHead>
              <TableHead className={cn(TH, "w-[8%] text-end")}>Delivered</TableHead>
              <TableHead className={cn(TH, "w-[8%] text-end")}>Response</TableHead>
              <TableHead className={cn(TH, "w-[5%]")}>Enabled</TableHead>
              <TableHead className={cn(TH, "w-[4%] text-center")}>
                <span className="sr-only">Setup</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channelOrder().map((k) => {
              const c = channels[k]
              const soon = isSoon(k, chanBase(k))
              const sms = !soon && chanBase(k) === "sms"
              return (
                <TableRow
                  key={k}
                  className={cn(soon ? "opacity-50 hover:bg-transparent" : "cursor-pointer hover:bg-muted/50")}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button,label,[role=switch]")) return
                    if (soon) {
                      toast(`${c.name} is coming soon — it is listed so the roadmap is visible, but it cannot be configured or enabled in this phase.`)
                      return
                    }
                    navigate(`/distribution/channels/${k}`)
                  }}
                >
                  <TableCell className="align-top">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                        <ChanIcon icon={c.icon} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] font-semibold">
                          {c.name}
                          {soon && <Bdg tone="soon">Coming soon</Bdg>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
                          Contact field: <CodeChip className="px-1 py-0 text-[10.5px]">{c.contact}</CodeChip>
                          {sms && <span>· Tenant&apos;s own gateway · HTTP</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-[11.5px] leading-snug whitespace-normal text-muted-foreground">{c.mode}</TableCell>
                  <TableCell className="align-top text-[11.5px] leading-snug whitespace-normal text-muted-foreground">{c.capture}</TableCell>
                  <TableCell className="align-top text-[11.5px] leading-snug whitespace-normal text-muted-foreground">
                    {soon ? (
                      <span className="text-muted-foreground">Not configurable in this phase</span>
                    ) : (
                      <>
                        {c.prov}
                        {sms && (
                          <div className="mt-2">
                            <Bdg tone="d2">Onboarding verified</Bdg>
                          </div>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-end tabular-nums">{c.sent ? fmtN(c.sent) : "—"}</TableCell>
                  <TableCell className="align-top text-end tabular-nums">{c.del ? `${c.del.toFixed(1)}%` : "—"}</TableCell>
                  <TableCell className="align-top text-end">
                    {c.resp ? <Bdg tone={respTone(c.resp)}>{c.resp.toFixed(1)}%</Bdg> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  {/* stopPropagation so toggling the switch never triggers the row's navigate */}
                  <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={c.st}
                      disabled={soon}
                      onCheckedChange={(v) => {
                        if (soon) {
                          toast(`${c.name} is coming soon and cannot be enabled yet.`)
                          return
                        }
                        toggleChannel(k, v)
                      }}
                      aria-label={`Enable ${c.name}`}
                    />
                  </TableCell>
                  <TableCell className="align-top text-center">
                    {!soon && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Channel setup"
                        title="Channel setup"
                        onClick={() => navigate(`/distribution/channels/${k}`)}
                      >
                        <Settings2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reconciliation banner */}
      <div className="flex items-start gap-2.5 rounded-md border border-nb-cyan-200 bg-nb-cyan-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-nb-cyan-900 dark:border-nb-cyan-900/40 dark:bg-nb-cyan-900/25 dark:text-nb-cyan-100">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <b>How the numbers reconcile.</b> Rules <b>matched</b> 27,070 transactions in the last 7 days. <b>24,220</b>{" "}
          survived the dispatch guardrails and were handed to a provider — that is the <i>Messages dispatched</i> tile, and
          the sum of the <i>Sent · 7 d</i> column. The remaining <b>2,850</b> were held or dropped at dispatch. Of what was
          dispatched, 96.8% came back with a delivery confirmation. <b>Dispatched is not delivered, and matched is not
          dispatched.</b>
          <br />
          <br />
          <b>Delivery confirmation is not available on every channel.</b> SMS is confirmed by <i>polling</i> the gateway
          status service; Email is confirmed by provider events. Where a tenant gateway reports no status at all, a
          dispatch ends its life <i>unconfirmed</i> rather than delivered — not a failure, and excluded from the
          delivery-rate denominator rather than counted as zero.
        </span>
      </div>

      <p className="border-t border-border pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
        A channel must be <b>enabled here</b> before a trigger rule can select it. Disabling a channel does not delete
        rules that use it — those rules fall back to their fallback channel, and are flagged on the rules list if no
        fallback is set. Contact validity, opt-out state and preferred-channel are owned by <b>M-03</b>; Nabadat reads them
        at dispatch.
      </p>

      <AddChannelModal open={addOpen} onClose={() => setAddOpen(false)} />
      <TestSendModal open={testOpen} onClose={() => setTestOpen(false)} />
    </div>
  )
}
