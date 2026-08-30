// Rule preview drawer — a read-only 5-tab view of a rule (Details · Conditions ·
// Outcome · Reminder · Schedule), opened by clicking a row on the rules list.

import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet"
import { CH } from "../data/reference"
import {
  dmy,
  fmtN,
  hh,
  humanMin,
  isExpired,
  remOffset,
  resolveMsg,
  sendName,
  srvActiveMin,
  srvLabel,
  summary,
} from "../data/helpers"
import { isNullCh } from "../data/reference"
import { useChannels } from "../store"
import { Bdg, CodeChip, SectionT } from "./ui-bits"
import type { Rule } from "../data/types"

const TABS = ["Details", "Conditions", "Outcome", "Reminder", "Schedule"] as const

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-xs">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <span className="font-medium text-muted-foreground">{k}</span>
          <span className="text-foreground">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function RuleDrawer({
  rule,
  onClose,
  onEdit,
}: {
  rule: Rule | null
  onClose: () => void
  onEdit: (id: number) => void
}) {
  const { rules, templates, settings } = useChannels()
  const [tab, setTab] = useState(0)

  const r = rule
  const langName = (l: string) => ({ ar: "Arabic", en: "English", fr: "French", ur: "Urdu" })[l] || "—"
  const inS = r ? CH[r.ch]?.inS : false
  const nul = r ? isNullCh(r.send) : false
  const tpl = r ? templates[Number(r.tpl)] : undefined
  const remTpl = r && r.rem ? templates[Number(r.rem.tpl)] : undefined
  const statusBadge = r
    ? isExpired(r)
      ? <Bdg tone="d3">Expired</Bdg>
      : r.st === "enabled"
        ? <Bdg tone="d2">Enabled</Bdg>
        : <Bdg tone="mute">Disabled</Bdg>
    : null

  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[560px] max-w-[94vw] flex-col gap-0 p-0 data-[side=left]:sm:max-w-[560px] data-[side=right]:sm:max-w-[560px]"
      >
        {r && (
          <>
            <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
              <div className="font-heading text-base font-bold">{r.name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <span>
                  Priority {r.p} on <span className="font-semibold text-foreground">{CH[r.ch]?.name}</span>
                </span>
                <span>·</span>
                {statusBadge}
                <span>·</span>
                <span>updated {r.upd}</span>
              </div>
            </SheetHeader>

            <div className="px-5 pt-3">
              <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-border bg-muted p-1">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(i)}
                    className={cn(
                      "rounded-sm px-3 py-1 text-xs font-semibold transition-colors",
                      i === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {tab === 0 && (
                <KV
                  rows={[
                    ["Name", r.name],
                    ["Service channel", <span key="sc" className="inline-flex items-center gap-2">{CH[r.ch]?.name} <CodeChip>{r.ch}</CodeChip></span>],
                    ["Priority", `#${r.p} of ${rules.filter((x) => x.ch === r.ch).length} on this channel`],
                    ["Status", r.st === "enabled" ? <Bdg tone="d2">Enabled</Bdg> : <Bdg tone="mute">Disabled</Bdg>],
                    ["Description", r.desc || "—"],
                    ["Matched · 7 d", fmtN(r.trig)],
                    ["Sent · 7 d", fmtN(r.sent || 0)],
                  ]}
                />
              )}
              {tab === 1 && (
                <>
                  <div className="rounded-md border border-border bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed">
                    <span className="font-bold text-nb-cyan-800 dark:text-nb-cyan-200">WHEN</span> a transaction arrives on{" "}
                    <span className="font-semibold">{CH[r.ch]?.name}</span> and {summary(r.cond)}.
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Evaluated in priority order; the first matching enabled rule wins and evaluation stops.
                  </p>
                </>
              )}
              {tab === 2 && (
                <>
                  <KV
                    rows={[
                      ["Survey", srvLabel(r.survey)],
                      [
                        "Language",
                        <span key="l" className="inline-flex items-center gap-2">
                          {langName(r.lang)}
                          {r.langOvr && <Bdg tone="cyan">Preferred language overriding</Bdg>}
                        </span>,
                      ],
                      inS
                        ? ["Delivery", "Presented on the device in session"]
                        : nul
                          ? ["Outcome", <span key="o"><b>Backend</b> — the survey link is returned to the requesting system, no message is sent</span>]
                          : ["Sending channel", sendName(r.send)],
                      ...(inS || nul ? [] : ([["Fallback", r.fb ? sendName(r.fb) : "None"]] as [string, React.ReactNode][])),
                      ...(inS || nul ? [] : ([["Template", tpl ? `${tpl.n} — ${langName(tpl.lang)}` : "—"]] as [string, React.ReactNode][])),
                      ["Active period", `${humanMin(srvActiveMin(r.survey))} from sending · set with the survey in M-01`],
                    ]}
                  />
                  {!inS && !nul && tpl && (
                    <>
                      <SectionT>Message</SectionT>
                      <MsgPrev body={tpl.body} />
                    </>
                  )}
                </>
              )}
              {tab === 3 &&
                (r.rem?.on ? (
                  <>
                    <KV
                      rows={[
                        ["Sent", `${remOffset(r.rem)} after the survey was sent`],
                        ["Channel", sendName(r.rem.ch)],
                        ["Template", remTpl ? remTpl.n : "—"],
                      ]}
                    />
                    {remTpl && (
                      <>
                        <SectionT>Message</SectionT>
                        <MsgPrev body={remTpl.body} />
                      </>
                    )}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Suppressed if the customer has responded, opted out, or the survey is no longer active.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No reminder is configured for this rule.</p>
                ))}
              {tab === 4 && (
                <KV
                  rows={[
                    ["Effective", r.to ? `${dmy(r.from)} – ${dmy(r.to)}` : `From ${dmy(r.from)}`],
                    ["Quiet hours", r.ovr?.q ? <Bdg tone="d3">Waived by this rule</Bdg> : `${hh(settings.qFrom)} – ${hh(settings.qTo)} · respected`],
                    ["Fatigue caps", r.ovr?.f ? <Bdg tone="d3">Exemption requested from M-03</Bdg> : "Respected"],
                    ["Grace period", r.ovr?.g ? <Bdg tone="d3">Exemption requested from M-03</Bdg> : "Set in M-03"],
                    ["Opt-out", "Always respected — not overridable"],
                  ]}
                />
              )}
            </div>

            <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border px-5 py-3.5">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => onEdit(r.id)}>Edit rule</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Resolved-message preview box (`.msg-prev`), with links highlighted. */
export function MsgPrev({ body }: { body: string }) {
  const resolved = resolveMsg(body)
  const parts = resolved.split(/(https?:\/\/[^\s]+)/g)
  return (
    <div className="rounded-md border border-border bg-muted px-3.5 py-3 text-xs leading-[1.7] whitespace-pre-wrap">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <span key={i} className="text-primary underline" dir="ltr">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  )
}
