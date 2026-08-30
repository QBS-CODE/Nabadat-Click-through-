// The Channels & Distribution settings canvas (M-02), extracted so it can be
// embedded as a section inside the app's native Settings page. Reads/writes the
// module store; changes apply live (no per-section Save — the store updates on edit).

import type { ReactNode } from "react"
import { useNavigate } from "react-router"
import { ChevronRight, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import { SURVEYS, chanBase, liveChannels } from "../data/reference"
import { hh, linkFor } from "../data/helpers"
import { quietHours } from "../data/engine"
import { useChannels } from "../store"
import { Bdg, SectionT } from "./ui-bits"

function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block leading-snug">{label}</Label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

type AlertTone = "info" | "warn" | "ok" | "err"
const ALERT: Record<AlertTone, string> = {
  info: "bg-nb-cyan-100 text-nb-cyan-900 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100",
  warn: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  ok: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  err: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
}
function Alert({ tone = "info", children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md px-3.5 py-3 text-xs leading-relaxed", ALERT[tone], className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

function Mech({ n, t, d }: { n: number; t: ReactNode; d: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0">
      <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-sm bg-muted font-mono text-[10.5px] font-bold text-muted-foreground">
        {n}
      </span>
      <div>
        <div className="text-[12.5px] font-semibold">{t}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{d}</div>
      </div>
    </div>
  )
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card shadow-sm dark:shadow-none", className)}>{children}</div>
}
function CardHead({ title, badge, desc }: { title: ReactNode; badge?: ReactNode; desc?: ReactNode }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex flex-wrap items-center gap-2 font-heading text-[14.5px] font-bold">
        {title}
        {badge}
      </div>
      {desc && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
    </div>
  )
}
function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 pt-4 pb-5", className)}>{children}</div>
}

function HoursGrid({ quiet }: { quiet: boolean[] }) {
  return (
    <div className="mt-3 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
      {quiet.map((q, h) => (
        <div
          key={h}
          title={`${hh(h)} — ${q ? "quiet" : "sending"}`}
          className={cn(
            "relative h-[26px] rounded-sm",
            q ? "bg-nb-navy-100 dark:bg-nb-navy-700" : "bg-d2-light dark:bg-d2-dark/25",
          )}
        >
          {h % 3 === 0 && (
            <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 text-[8px] tabular-nums text-muted-foreground">{h}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function LinkBox({ set }: { set: ReturnType<typeof linkFor> }) {
  const runs = set.path.split(/(\[survey-slug\]|\[unique-id\])/g).filter(Boolean)
  return (
    <div className="overflow-x-auto rounded-md bg-nb-navy-800 px-3.5 py-3 font-mono text-xs leading-[1.7] break-all text-nb-cloud dark:bg-nb-navy-900" dir="ltr">
      <span className="text-nb-navy-300">https://</span>
      <span className="text-nb-cyan-300">{set.dom}</span>
      {runs.map((r, i) =>
        r === "[survey-slug]" ? (
          <span key={i} className="text-nb-mint-300">{set.slug}</span>
        ) : r === "[unique-id]" ? (
          <span key={i} className="rounded-sm bg-d5-dark/40 px-1 text-d5-light">{set.uid}</span>
        ) : (
          <span key={i} className="text-nb-navy-300">{r}</span>
        ),
      )}
    </div>
  )
}

const HOUR_OPTS = [...Array(24).keys()]

export function ChannelsDistributionSettings() {
  const navigate = useNavigate()
  const { channels, settings, setSettings, emailDefaults, setEmailDefaults } = useChannels()
  const quiet = quietHours(settings)
  const linkPreview = linkFor("SRV-014", settings)
  const smsKeys = liveChannels().filter((k) => chanBase(k) === "sms" && channels[k])

  const patchLink = (patch: Partial<typeof settings.link>) => setSettings({ ...settings, link: { ...settings.link, ...patch } })

  return (
    <div className="space-y-[18px]">
      {/* 1 — Quiet hours */}
      <Card>
        <CardHead
          title="Quiet hours"
          badge={<Bdg tone="cyan">Tenant level</Bdg>}
          desc="One window for the whole tenant. No survey and no reminder is dispatched inside it, on any channel, under any rule — unless a rule holds an explicit quiet-hours override."
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  Timezone <span className="font-mono text-[9px] font-bold text-muted-foreground">M-11</span>
                </span>
              }
              hint={
                <>
                  Set once for the organisation in <b>Settings → Organisation</b>. Every quiet window, delay, reminder offset and effective date is computed in it.{" "}
                  <button
                    className="cursor-pointer font-semibold text-primary"
                    onClick={() => toast("Timezone is part of Organisation settings, owned by M-11 — outside this prototype.")}
                  >
                    Open Organisation settings →
                  </button>
                </>
              }
            >
              <Input value={settings.tz} readOnly />
            </Field>
            <Field label="Quiet from">
              <Select value={String(settings.qFrom)} onValueChange={(v) => v && setSettings({ ...settings, qFrom: +v })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{hh(settings.qFrom)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {hh(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quiet until">
              <Select value={String(settings.qTo)} onValueChange={(v) => v && setSettings({ ...settings, qTo: +v })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{hh(settings.qTo)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {hh(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Alert tone="warn" className="mt-4">
            <b>Local regulations restrict survey and marketing messages between roughly 21:00 and 08:00</b>, and the exact hours differ by country. Set the window
            inside those limits for every country you send to — the tightest restriction across your selected countries is the one that applies, because a message
            that breaches it is the operator's problem to block and your organisation's problem to answer for.
          </Alert>

          <HoursGrid quiet={quiet} />
          <div className="mt-4 flex flex-wrap items-center gap-3.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-[3px] bg-d2-light" />
              Sending window
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-[3px] bg-nb-navy-100 dark:bg-nb-navy-700" />
              Quiet — nothing is dispatched
            </span>
            <span className="ms-auto">
              Quiet {hh(settings.qFrom)} → {hh(settings.qTo)} · {settings.qBeh === "hold" ? "held until the window opens" : "skipped"}
            </span>
          </div>

          <SectionT>When a dispatch lands inside quiet hours</SectionT>
          <div className="grid gap-3 sm:grid-cols-2">
            <RCard
              on={settings.qBeh === "hold"}
              title="Hold until the window opens"
              desc="Queued and released when the sending window starts. Recommended — late feedback still counts."
              onClick={() => setSettings({ ...settings, qBeh: "hold" })}
            />
            <RCard
              on={settings.qBeh === "skip"}
              title="Skip the send"
              desc={
                <>
                  Recorded as suppressed with reason <span className="font-mono text-[10px]">quiet_hours</span>. Use when a late invitation is worse than none.
                </>
              }
              onClick={() => setSettings({ ...settings, qBeh: "skip" })}
            />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            A dispatch that lands inside the window is queued and released at {hh(settings.qTo)}. Nothing else about the hold is configurable — a survey invitation
            held overnight is still worth sending in the morning.
          </p>
        </CardBody>
      </Card>

      {/* 2 — Grace + fatigue (M-03) */}
      <Card>
        <CardHead
          title={
            <span className="inline-flex items-center gap-2">
              Grace period and fatigue caps <Bdg tone="d2">M-03</Bdg>
            </span>
          }
          desc="Configured in Audience & Contact Management, not here. M-03 holds the customer's contact history, so it is the only module that can see what a customer has already received — and therefore the only one that can decide."
        />
        <CardBody className="pt-1.5">
          <Mech n={1} t="M-03 owns the configuration" d="Both the per-survey and any-survey grace windows and the fatigue caps are set in M-03, alongside the contact history they are measured against." />
          <Mech n={2} t="M-03 decides at dispatch" d="M-02 asks M-03 whether this customer may receive this survey now. M-03 answers, and where it suppresses, it records the reason against the request." />
          <Mech n={3} t="M-02 records the answer, never the rule" d="M-02 stores the decision and its reason on the request so support can explain a missing survey, but it does not evaluate the window itself." />
          <Mech n={4} t="A rule may request an exemption" d="A trigger rule can ask M-03 to waive a cap or a grace window for a specific survey. It is a request; M-03 grants or refuses it." />
          <Alert className="mt-3.5">
            Previously M-02 configured the grace windows while M-03 enforced them. A split-ownership setting is the kind of thing that gets implemented twice and drifts,
            so configuration and enforcement now sit together.
          </Alert>
        </CardBody>
      </Card>

      {/* 3 — Survey link format */}
      <Card>
        <CardHead
          title="Survey link format"
          desc={
            <>
              Every invitation carries a short link. The path is <b>meaningful</b> so a customer can see what they are opening, and it ends in a <b>unique attribute</b>{" "}
              that identifies this one recipient's survey.
            </>
          }
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Link domain" hint="A tenant domain lifts click-through but needs a DNS record and a certificate.">
              <Input value={settings.link.dom} onChange={(e) => patchLink({ dom: e.target.value })} />
            </Field>
            <Field
              label="Path pattern"
              hint={
                <>
                  Use <span className="font-mono">[survey-slug]</span> for the readable part and <span className="font-mono">[unique-id]</span> for the attribute that
                  is unique per <b>send attempt</b>.
                </>
              }
            >
              <Input className="font-mono" value={settings.link.path} onChange={(e) => patchLink({ path: e.target.value })} />
            </Field>
            <Field
              label="Unique attribute length"
              hint="6 characters gives 56 billion combinations — long enough to be unguessable, short enough for SMS. The attribute is minted per send attempt, so a fallback or a reminder carries its own value."
            >
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={4}
                  max={12}
                  value={settings.link.uid}
                  onChange={(e) => patchLink({ uid: Math.min(12, Math.max(4, +e.target.value || 6)) })}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">characters</span>
              </div>
            </Field>
          </div>
          <div className="mt-3">
            <LinkBox set={linkPreview} />
          </div>
          <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
            One format is used on every channel, so the token contract is identical everywhere. Reissuing a survey on another channel still <b>mints a new link</b>,
            because the token is bound to the send attempt rather than to the invitation — that is what lets M-04 report the response against the channel that delivered
            it.
          </p>
          <SectionT>Resolved per survey</SectionT>
          <div className="grid grid-cols-[220px_1fr] gap-x-4 gap-y-2 text-xs">
            {SURVEYS.map((s) => (
              <div key={s.id} className="contents">
                <span className="text-muted-foreground">{s.name}</span>
                <span className="font-mono text-[11px]" dir="ltr">
                  {linkFor(s.id, settings).full}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 4 — What this section does not cover */}
      <Card>
        <CardHead title="What this section does not cover" />
        <CardBody className="pt-1.5">
          <Mech
            n={1}
            t="Per-channel sender identity"
            d={
              <>
                Sender numbers, from-addresses, providers and credentials belong to each channel — set them in{" "}
                <button className="cursor-pointer text-primary" onClick={() => navigate("/distribution")}>
                  Sending channels
                </button>
                .
              </>
            }
          />
          <Mech n={2} t="Per-rule timing" d="Delay before sending, link expiry and the reminder offset are decisions of an individual rule, not of the tenant." />
          <Mech n={3} t="Opt-out and contact validity" d={<>Owned by <b>M-03</b>. They are absolute and cannot be configured or overridden anywhere in M-02.</>} />
          <Mech n={4} t="Response storage" d={<>Once a customer answers, <b>M-04</b> validates, deduplicates and stores the response. M-02 stops at the provider hand-off.</>} />
        </CardBody>
      </Card>

      {/* 5 — SMS route & billing */}
      <Card>
        <CardHead
          title="SMS delivery route & billing"
          desc="Configured per SMS channel, not tenant-wide — each channel may use a different gateway and a different sender."
        />
        <CardBody>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="px-3.5 py-2.5 text-start font-semibold">Channel</th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">Route</th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">Onboarding</th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">Billed by</th>
                  <th className="w-10 px-3.5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {smsKeys.map((k) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-3.5 py-2.5 font-semibold">{channels[k].name}</td>
                    <td className="px-3.5 py-2.5 text-[11.5px] text-muted-foreground">Tenant's own gateway · HTTP</td>
                    <td className="px-3.5 py-2.5">
                      <Bdg tone="d2">Verified</Bdg>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11.5px]">Your own SMS provider</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        aria-label="Open onboarding"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/distribution/channels/${k}?tab=provider`)}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
            No SMS channel is on Nabadat's gateway, so Nabadat does not invoice SMS for this tenant.
          </p>
        </CardBody>
      </Card>

      {/* 6 — Email defaults */}
      <Card>
        <CardHead
          title="Email defaults"
          badge={<Bdg tone="cyan">Tenant level</Bdg>}
          desc="Applied to every survey email. Set once here rather than per template, so the wording stays consistent and there is one thing to translate."
        />
        <CardBody>
          <div className="space-y-4">
            <Field label="Subject" hint="Used for every survey email on every email channel. The body carries the specifics — the customer name, the service, the date.">
              <Input value={emailDefaults.subject} onChange={(e) => setEmailDefaults({ ...emailDefaults, subject: e.target.value })} />
            </Field>
            <Field label="Preheader" hint="The grey line next to the subject in most inboxes. Left empty, clients pull the first body line instead.">
              <Input value={emailDefaults.preheader} onChange={(e) => setEmailDefaults({ ...emailDefaults, preheader: e.target.value })} />
            </Field>
            <Alert>
              Templates do not carry a subject. A template is the message body; the subject belongs to the channel, so changing it is one edit rather than one per
              template per language.
            </Alert>
          </div>
        </CardBody>
      </Card>

      {/* 7 — Link resolution */}
      <Card>
        <CardHead
          title="Link resolution"
          desc="What happens when a survey link is opened. Three outcomes, decided by the token's state at the moment of the request."
        />
        <CardBody>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="px-3.5 py-2.5 text-start font-semibold">Token state</th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">Behaviour</th>
                  <th className="px-3.5 py-2.5 text-start font-semibold">Owner</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3.5 py-2.5 font-semibold">Valid, within the active period</td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
                    Serve the survey entry point. <b>M-01</b> renders the survey; M-02 resolves the token and hands over.
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Bdg tone="cyan">M-02</Bdg> → <Bdg tone="navy">M-01</Bdg>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3.5 py-2.5 font-semibold">Valid, past expiry</td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
                    Redirect to the general feedback form, carrying a <b>feedback token in the URL</b>. The survey is not rendered and no answer is accepted against it.
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Bdg tone="cyan">M-02</Bdg> → <Bdg tone="d2">M-04</Bdg>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3.5 py-2.5 font-semibold">Unknown, malformed, or purged</td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
                    Error page. <b>Never</b> the feedback form — an unrecognised token must not be treated as late feedback.
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Bdg tone="cyan">M-02</Bdg>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionT>The feedback token — M-04 DR-45</SectionT>
          <Mech n={1} t="Opaque, single purpose, in the URL" d="It appears in the redirect URL as an opaque string. It unlocks the feedback form and nothing else — it cannot be replayed against the survey, an API, or another customer's record." />
          <Mech n={2} t="Minted lazily" d="Created the first time an expired link is opened, not in advance. Most invitations never need one, so minting on demand avoids issuing millions of references nobody uses." />
          <Mech n={3} t="M-01 renders it in a hidden field" d="M-02 resolves and redirects; M-01 renders the feedback form carrying the token; M-04 resolves it server-side and rate-limits the endpoint. Header- and session-based hand-offs were rejected — they do not survive a redirect a customer may open days later on another device." />
          <Mech n={4} t="Possession equals attribution" d="Whoever holds the link is treated as the customer. Accepted deliberately: the same is already true of the survey link itself, and the alternative is asking a customer to authenticate before complaining." />
          <Mech n={5} t="It inherits identity" d={<>M-04 resolves the token to <span className="font-mono text-[10.5px]">invitation_id</span>, <span className="font-mono text-[10.5px]">send_attempt_id</span>, <span className="font-mono text-[10.5px]">customer_id</span>, <span className="font-mono text-[10.5px]">is_anonymous</span> and the parameter values — which is what makes closed-loop actioning possible on late feedback.</>} />

          <SectionT>How long it lives</SectionT>
          <Mech n={1} t="It has no TTL of its own" d="The token is never given an expiry date. It stops working only when the record behind it is gone." />
          <Mech n={2} t="Retention is the real limit" d="When the request log and the invitation record are deleted under the tenant retention policy, the invitation is expired with them and the link stops resolving. The customer can no longer leave feedback, and the error page is served rather than the form." />
          <Mech n={3} t="Resolution needs the invitation record alone" d="It must not require the survey definition or the parameter registry to be loadable — surveys are archived and the redirect has to outlive them. This is why the invitation carries raw parameter values rather than a reference into anything else." />
          <Alert tone="warn" className="mt-3.5">
            <b>"Never expires" and "deleted with the log" are the same rule stated from two ends.</b> The token carries no expiry, and it dies when retention removes the
            invitation. M-04 must therefore treat an unresolvable token as an ordinary outcome rather than an error condition — the customer sees the error page, not a
            broken form.
          </Alert>
        </CardBody>
      </Card>
    </div>
  )
}

function RCard({ on, title, desc, onClick }: { on: boolean; title: ReactNode; desc: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block rounded-md border-[1.5px] bg-card p-3.5 text-start transition-colors",
        on ? "border-primary ring-[3px] ring-primary/15" : "border-border hover:border-input",
      )}
    >
      <div className="text-[12.5px] font-bold">{title}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</div>
    </button>
  )
}
