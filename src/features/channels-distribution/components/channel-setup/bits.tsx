// Shared building blocks for the Channel setup screen: numbered mechanic rows,
// dark endpoint code panels, alerts, field wrappers, and the link/quiet cards
// appended to the Delivery tab of every messaged channel.

import type { ComponentProps, ReactNode } from "react"
import { AlertTriangle, Check, Clock, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NativeSelect } from "@/components/ui/native-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { hh, linkFor, uidSample } from "../../data/helpers"
import { useChannels } from "../../store"
import { Bdg, CodeChip } from "../ui-bits"
import type { SendChannel } from "../../data/types"

/** A styled native select filling its container, matching the mockup `.sel`. */
export function Sel({ className, ...props }: Omit<ComponentProps<"select">, "size">) {
  return <NativeSelect className={cn("w-full", className)} {...props} />
}

/** A read-only input with the mockup's muted `.inp[readonly]` background. */
export function RoInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input readOnly className={cn("bg-muted text-muted-foreground", className)} {...props} />
}

/** A small (i) button that opens a popover with detail text (mockup `infoBtn`/`openInfo`). */
export function InfoPop({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-6 shrink-0 text-muted-foreground hover:text-foreground")}
        aria-label="More information"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-w-sm text-xs leading-relaxed">
        {title != null && <div className="mb-1.5 text-[13px] font-bold text-foreground">{title}</div>}
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-sm dark:shadow-none", className)}>{children}</div>
  )
}
export function CardH({ title, desc }: { title: ReactNode; desc?: ReactNode }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex flex-wrap items-center gap-2 font-heading text-[14.5px] font-bold">{title}</div>
      {desc != null && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
    </div>
  )
}
export function CardB({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 pt-4 pb-5", className)}>{children}</div>
}

export function TwoCol({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">{children}</div>
}
export function Grid2({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>
}
export function Grid3({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>
}

export function Fld({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      {children}
      {hint != null && <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** A read-only fact on its own line (`factRow`), with an optional (i) detail popover. */
export function Fact({ label, value, info }: { label: ReactNode; value: ReactNode; info?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-foreground">{value}</div>
      </div>
      {info != null && <div className="shrink-0">{info}</div>}
    </div>
  )
}

/** A numbered mechanic row (`.mechanic`). */
export function Mechanic({ n, title, children }: { n: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-[10.5px] font-bold text-muted-foreground">
        {n}
      </span>
      <div>
        <div className="text-[12.5px] font-semibold">{title}</div>
        {children != null && <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}

const ALERT_ICON = { info: Info, warn: AlertTriangle, err: AlertTriangle, ok: Check }
const ALERT_CLS = {
  info: "bg-nb-cyan-100 text-nb-cyan-900 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100 [&_svg]:text-primary",
  warn: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  err: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
  ok: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
}
export function Alert({ kind, children, className }: { kind: keyof typeof ALERT_CLS; children: ReactNode; className?: string }) {
  const Icon = ALERT_ICON[kind]
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md px-3.5 py-3 text-xs leading-relaxed", ALERT_CLS[kind], className)}>
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

/** A dark endpoint code panel (`.endpoint`). */
export function Endpoint({ method, url, children, className }: { method: string; url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-nb-navy-900", className)} dir="ltr">
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-nb-mint to-nb-cyan" />
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <span className="rounded-sm bg-nb-mint-300 px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide text-nb-navy">{method}</span>
        <span className="font-mono text-[12.5px] break-all text-nb-cloud">{url}</span>
      </div>
      <div className="px-4 py-3.5 font-mono text-[11.5px] leading-[1.75] whitespace-pre-wrap text-nb-stone-lt">{children}</div>
    </div>
  )
}
export const EpKey = ({ children }: { children: ReactNode }) => <span className="text-nb-cyan-200">{children}</span>
export const EpVal = ({ children }: { children: ReactNode }) => <span className="text-nb-mint-200">{children}</span>
export const EpComment = ({ children }: { children: ReactNode }) => <span className="text-nb-stone">{children}</span>

/** Badge helper for provider status pills (`badge(ok,text)`). */
export function OkBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <Bdg tone={ok ? "d2" : "d3"}>{children}</Bdg>
}

// ============ shared appended cards ============

/** Survey link on this channel (`linkCardFor`). */
export function LinkCard({ onEditSettings }: { onEditSettings: () => void }) {
  const { settings } = useChannels()
  return (
    <Card className="mt-[18px]">
      <CardH
        title="Survey link on this channel"
        desc={
          <>
            Built from the tenant link format in <b>Settings</b>. One format is used on every channel, and each recipient
            gets their own unique attribute.
          </>
        }
      />
      <CardB className="pt-1">
        <LinkBox surveyId="SRV-014" />
        <Fact
          label="Where it appears"
          value={
            <span>
              Message body — <span className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-nb-cyan-800 dark:bg-nb-cyan-900/45 dark:text-nb-cyan-200">[Survey URL]</span>
            </span>
          }
          info={
            <InfoPop title="Placing the link">
              Insert <span className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-nb-cyan-800 dark:bg-nb-cyan-900/45 dark:text-nb-cyan-200">[Survey URL]</span>{" "}
              anywhere in a template. On SMS the link is a fixed cost of about 26 characters, which is roughly a third of
              an Arabic message part before a single word of copy — worth knowing when a template sits close to a part
              boundary.
            </InfoPop>
          }
        />
        <Fact
          label="Unique attribute"
          value={uidSample(settings.link.uid)}
          info={
            <InfoPop title="How the unique attribute works">
              Each recipient gets their own suffix. It resolves server-side to the transaction, the survey, the language
              and the contact, so nothing identifying travels in the URL itself. Six characters gives about 56 billion
              combinations — unguessable in practice, and short enough not to cost an SMS part. Length is set in Settings
              → Channels &amp; Distribution.
            </InfoPop>
          }
        />
        <Button variant="secondary" size="sm" className="mt-2.5" onClick={onEditSettings}>
          Edit link format in Settings
        </Button>
      </CardB>
    </Card>
  )
}

/** Coloured survey-link box (`.linkbox`). */
export function LinkBox({ surveyId }: { surveyId: string }) {
  const { settings } = useChannels()
  const l = linkFor(surveyId, settings)
  const path = settings.link.path
  const parts = path.split(/(\[survey-slug\]|\[unique-id\])/g)
  return (
    <div className="rounded-md bg-nb-navy-900 px-3.5 py-3 font-mono text-xs leading-[1.7] break-all text-nb-cloud" dir="ltr">
      <span className="text-nb-stone">https://</span>
      <span className="text-nb-cyan-200">{l.dom}</span>
      {parts.map((p, i) =>
        p === "[survey-slug]" ? (
          <span key={i} className="text-nb-mint-200">
            {l.slug}
          </span>
        ) : p === "[unique-id]" ? (
          <span key={i} className="rounded-sm bg-d5-dark/40 px-1 text-d5-light">
            {l.uid}
          </span>
        ) : (
          <span key={i} className="text-nb-stone">
            {p}
          </span>
        ),
      )}
    </div>
  )
}

/** Quiet hours on this channel (`quietCardFor`) — override + ignore + stale note. */
export function QuietCard({ channelKey, onEditSettings }: { channelKey: string; onEditSettings: () => void }) {
  const { channels, settings, setChannel } = useChannels()
  const c: SendChannel = channels[channelKey]
  const q = c.quietOwn || { on: false, from: 21, to: 8 }
  const ignore = !!c.ignoreQuiet
  return (
    <Card className="mt-[18px]">
      <CardH
        title={
          <>
            Quiet hours on this channel <Bdg tone="cyan">M-02</Bdg>
          </>
        }
        desc={
          <>
            Quiet hours are a property of the <b>channel</b>, not of any rule — "never send {c.name} between 9 pm and 9 am"
            has to hold for every message leaving the platform, whichever rule decided it and whether it is an invitation
            or a reminder.
          </>
        }
      />
      <CardB>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted px-3.5 py-3">
          <Inherit label="Tenant window" value={`${hh(settings.qFrom)} – ${hh(settings.qTo)}`} />
          <Inherit label="Behaviour" value={settings.qBeh === "hold" ? `Held, released at ${hh(settings.qTo)}` : "Skipped"} small />
          <Inherit label="On this channel" value={ignore ? <Bdg tone="d5">Ignored</Bdg> : <Bdg tone="d2">Enforced</Bdg>} small />
          <div className="ms-auto">
            <Button variant="secondary" size="sm" onClick={onEditSettings}>
              Edit window in Settings
            </Button>
          </div>
        </div>

        <PRow
          title={
            <>
              Ignore quiet hours on this channel {ignore && <Bdg tone="d5">On</Bdg>}
            </>
          }
          desc="Dispatch immediately at any hour. Intended for channels a customer does not experience as an interruption — an in-app inbox, for example — never for one that rings or buzzes a phone."
          control={<Switch checked={ignore} onCheckedChange={(v) => setChannel(channelKey, { ignoreQuiet: v, quietOwn: v ? { ...q, on: false } : q })} aria-label="Ignore quiet hours" />}
        />
        {ignore ? (
          <Alert kind="err" className="mt-3.5">
            <b>This is broader than a rule waiver.</b> A rule waiver applies to one rule that someone deliberately
            authored; this switch silently exempts <b>every</b> rule that uses {c.name}, including rules written later by
            people who never saw this screen. The request record tags each affected send so the exemption stays visible.
          </Alert>
        ) : (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Leaving this off is the safe default. Where a single rule genuinely must reach someone tonight, waive quiet
            hours <b>on that rule</b> instead — the exception then stays attached to the reason for it.
          </p>
        )}

        <PRow
          className="mt-1"
          title={
            <>
              Use a different quiet window on this channel {q.on && <Bdg tone="d3">On</Bdg>}
            </>
          }
          desc="Overrides the tenant window for this channel only. A channel that reaches a different country, or a different kind of customer, may need different hours."
          control={<Switch checked={q.on} onCheckedChange={(v) => setChannel(channelKey, { quietOwn: { ...q, on: v }, ignoreQuiet: v ? false : ignore })} aria-label="Use a different quiet window" />}
        />
        {q.on && (
          <Grid2 className="mt-3">
            <Fld label="From">
              <Sel value={q.from} onChange={(e) => setChannel(channelKey, { quietOwn: { ...q, from: +e.target.value } })}>
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={i}>
                    {hh(i)}
                  </option>
                ))}
              </Sel>
            </Fld>
            <Fld label="Until">
              <Sel value={q.to} onChange={(e) => setChannel(channelKey, { quietOwn: { ...q, to: +e.target.value } })}>
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={i}>
                    {hh(i)}
                  </option>
                ))}
              </Sel>
            </Fld>
          </Grid2>
        )}
        <Alert kind="warn" className="mt-3.5">
          <b>Local regulations restrict survey messages between roughly 21:00 and 08:00</b>, and the hours differ by
          country. The tenant window must sit inside the tightest restriction across the countries you send to.
        </Alert>
        <Alert kind="info" className="mt-3">
          <b>Held is not indefinite.</b> If the channel's <b>Stale after</b> window elapses before the quiet window opens,
          the dispatch is dropped at release evaluation and recorded as suppressed with reason{" "}
          <CodeChip>stale</CodeChip>. It is never sent late. This applies equally to invitations, reminders and held
          retry attempts.
        </Alert>
      </CardB>
    </Card>
  )
}

function Inherit({ label, value, small }: { label: ReactNode; value: ReactNode; small?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{label}</div>
      <div className={cn("font-heading font-bold", small ? "text-[13px]" : "text-base")}>{value}</div>
    </div>
  )
}
export { Inherit }

/** A policy row (`.prow`): main text + trailing control. */
export function PRow({ title, desc, control, className }: { title: ReactNode; desc?: ReactNode; control: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3.5 border-b border-border py-3.5 last:border-0", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{title}</div>
        {desc != null && <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  )
}

export { Clock }
