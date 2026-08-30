// Screen 4 — Dispatch guardrails. A trigger rule makes a decision; sending is a
// separate later act (dispatch), and the three protections live there, not in any
// rule. Reproduces the final (v2.0) decision-vs-dispatch model.

import type { ReactNode } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, ChevronRight, Info, Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

import { useChannels } from "../store"
import { quietHours } from "../data/engine"
import { hh } from "../data/helpers"
import { OWN_LABEL } from "../data/own"
import { BLACKOUTS } from "../data/records"
import { Bdg, SectionT, type Tone } from "../components/ui-bits"

/* ---- small local primitives ---- */

function Alert({ tone, children }: { tone: "info" | "warn" | "err" | "ok"; children: ReactNode }) {
  const map: Record<typeof tone, string> = {
    info: "bg-nb-cyan-100 text-nb-cyan-900 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100",
    warn: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
    err: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
    ok: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  }
  const Icon = tone === "info" ? Info : tone === "ok" ? Info : AlertTriangle
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md px-3.5 py-3 text-xs leading-relaxed", map[tone])}>
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

function Card({
  title,
  desc,
  children,
  className,
}: {
  title: ReactNode
  desc?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-sm dark:shadow-none", className)}>
      <div className="px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2 font-heading text-[14.5px] font-bold">{title}</div>
        {desc && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
      </div>
      <div className="px-5 pt-4 pb-5">{children}</div>
    </div>
  )
}

function Own({ m }: { m: string }) {
  const tone: Tone = m === "m02" ? "cyan" : m === "m03" ? "d2" : "navy"
  return <Bdg tone={tone}>{OWN_LABEL[m] || m.toUpperCase()}</Bdg>
}

function Prow({ title, desc, ctl }: { title: ReactNode; desc: ReactNode; ctl?: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{title}</div>
        <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</div>
      </div>
      {ctl && <div className="flex shrink-0 items-center gap-2">{ctl}</div>}
    </div>
  )
}

function InheritRow({ items, trailing }: { items: [string, ReactNode][]; trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted px-3.5 py-3">
      {items.map(([l, v], i) => (
        <div key={i}>
          <div className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{l}</div>
          <div className="font-heading text-base font-bold">{v}</div>
        </div>
      ))}
      {trailing && <div className="ms-auto">{trailing}</div>}
    </div>
  )
}

function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-xs">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <span className="font-medium text-muted-foreground">{k}</span>
          <span className="text-end">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Stage({ n, title, own, desc }: { n: number; title: string; own?: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2.5">
      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-[10px] font-bold text-muted-foreground">
        {n}
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {title}
          {own && <Own m={own} />}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{desc}</div>
      </div>
    </div>
  )
}

/* ---- page ---- */

export default function GuardrailsPage() {
  const navigate = useNavigate()
  const { channels, settings } = useChannels()
  const quiet = quietHours(settings)
  const ignoring = Object.values(channels).filter((c) => c.ignoreQuiet || c.quietOwn?.on)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">Dispatch guardrails</h1>
          <p className="mt-1 max-w-[680px] text-sm text-muted-foreground">
            A trigger rule makes a <b>decision</b>. Sending is a separate, later act — <b>dispatch</b> — and these three
            protections are enforced there, not inside any rule. Each one states which module owns it and why it cannot
            live in a rule's conditions.
          </p>
        </div>
        <Button onClick={() => toast("Guardrail configuration saved. Applies from the next dispatch.")}>
          Save configuration
        </Button>
      </div>

      {/* Decision, then dispatch */}
      <Card
        title="Decision, then dispatch"
        desc="A trigger rule answers one question at one moment: given this transaction, should a survey be created, which one, and through which channel. Delivering the message is a separate, later act. These three protections deliberately live in the later act."
      >
        <div className="flex flex-wrap items-stretch gap-y-3.5 lg:flex-nowrap">
          <div className="min-w-[280px] flex-1 rounded-lg border border-dashed border-nb-cyan-300 bg-nb-cyan-100/40 p-3 dark:bg-nb-cyan-900/20">
            <div className="mb-2.5 flex items-center gap-2 text-[9.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Decision · one moment{" "}
              <b className="font-heading text-xs tracking-normal text-foreground normal-case">
                “should a survey exist?”
              </b>
            </div>
            <div className="flex flex-col gap-2">
              <Stage n={1} title="Transaction arrives" own="m13" desc="Validated, parameters mapped, forwarded with a correlation ID." />
              <Stage n={2} title="Rule evaluates and matches" own="m02" desc="First match wins. Output is a decision: survey X, in language Y, via channel Z, after a delay of N." />
            </div>
          </div>
          <div className="flex items-center justify-center px-2 text-border max-lg:w-full max-lg:rotate-90 max-lg:py-1">
            <ChevronRight className="size-5" aria-hidden />
          </div>
          <div className="min-w-[280px] flex-1 rounded-lg border border-dashed border-nb-mint-300 bg-nb-mint-100/40 p-3 dark:bg-nb-mint-800/20">
            <div className="mb-2.5 flex items-center gap-2 text-[9.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Dispatch · a later, separate act{" "}
              <b className="font-heading text-xs tracking-normal text-foreground normal-case">
                “may this message actually go?”
              </b>
            </div>
            <div className="flex flex-col gap-2">
              <Stage n={3} title="Dispatch scheduled" desc="The decision is fixed. Nothing below has run yet — and the customer can change state inside the delay." />
              <Stage n={4} title="Quiet hours" own="m02" desc="A property of the channel, identical for every message. Held and released at the next allowed window." />
              <Stage n={5} title="Opt-out" own="m03" desc="An attribute of the customer, and a legal obligation. Dropped outright. No override exists." />
              <Stage n={6} title="Fatigue cap and grace period" own="m03" desc="Needs memory across every rule, survey and channel. Only a customer-centric module can enforce it." />
              <Stage n={7} title="Channel adapter fires" desc="Only now does a message actually leave the platform." />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Alert tone="warn">
            <b>A rule matching does not guarantee a send.</b> Stages 4 to 6 can hold or drop a message the rule already
            approved, so the rules list reports <b>Matched</b> and <b>Sent</b> as two separate numbers. The gap is
            expected behaviour, not a defect — and every trace names the stage and the module that stopped it, which is
            what lets support answer "why did this customer get nothing?".
          </Alert>
          <Alert tone="info">
            <b>Why dispatch and not evaluation:</b> rules carry a delay — 15 minutes, an hour, a day. A customer can
            withdraw consent or hit their cap between the moment the rule matched and the moment the message would go.
            Checking at the last responsible moment is the only way the check is guaranteed to be current.
          </Alert>
          <Alert tone="info">
            <b>Evaluation is synchronous.</b> M-13 calls M-02 and waits: the rule is evaluated in the request, and the
            decision — survey, language, link, and whether Nabadat or the backend delivers it — is returned in the
            response. There is no event-driven path, so a source system always learns immediately whether a survey was
            created.
          </Alert>
        </div>
      </Card>

      {/* Two columns */}
      <div className="grid gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        {/* LEFT */}
        <div className="space-y-[18px]">
          {/* Quiet hours */}
          <Card
            title={
              <>
                Quiet hours <Own m="m02" /> <Bdg tone="navy">From tenant settings</Bdg>
              </>
            }
            desc={
              <>
                A property of the <b>channel</b>, not of any rule: "never send SMS between 9 pm and 9 am" must apply
                identically to every message leaving the platform. Enforced by M-02's channel policy at the moment of
                sending. Configured once in <b>Settings → Channels &amp; Distribution</b>; read-only here.
              </>
            }
          >
            <InheritRow
              items={[
                ["Quiet from", hh(settings.qFrom)],
                ["Quiet until", hh(settings.qTo)],
                ["Timezone", <span key="tz" className="text-[13px]">{settings.tz.split(" ")[0]}</span>],
              ]}
              trailing={
                <Button variant="secondary" size="sm" onClick={() => navigate("/settings")}>
                  Edit in Settings
                </Button>
              }
            />
            <HoursGrid quiet={quiet} />
            <div className="mt-4 flex flex-wrap items-center gap-3.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-2.5 rounded-sm bg-d2-light" />
                Sending window
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-2.5 rounded-sm bg-nb-navy-100 dark:bg-nb-navy-700" />
                Quiet — held
              </span>
              <span className="ms-auto">Held until the window opens</span>
            </div>
            <div className="mt-4">
              <Alert tone="info">
                <b>Held, not dropped.</b> A dispatch whose send time lands inside the quiet window is queued and released
                at the next allowed window — the feedback is still worth collecting an hour later. Only opt-out causes an
                outright drop.
              </Alert>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {ignoring.length ? (
                <>
                  <b className="text-d5-dark dark:text-d5-light">
                    {ignoring.length} channel{ignoring.length === 1 ? "" : "s"} override the tenant window:
                  </b>{" "}
                  {ignoring.map((c) => (
                    <Bdg key={c.key} tone="d5" className="mx-0.5">
                      {c.name}
                    </Bdg>
                  ))}
                </>
              ) : (
                <>
                  <b>Every enabled channel follows the tenant window.</b> A channel may define its own window, or ignore
                  quiet hours entirely, on its own setup screen.
                </>
              )}
            </p>
          </Card>

          {/* Grace period */}
          <Card
            title={
              <>
                Grace period <Bdg tone="d2">M-02 config</Bdg> <Bdg tone="d2">M-03 enforces</Bdg>
              </>
            }
            desc="The quiet gap after a customer's last survey. Configured with the other tenant distribution settings, but measured against the customer's history — so like the fatigue cap it can only be evaluated by the customer-centric module, at dispatch."
          >
            <InheritRow
              items={[
                ["Per survey", <span key="p" className="text-[13px]">Set in M-03</span>],
                ["For any survey", <span key="a" className="text-[13px]">Set in M-03</span>],
                ["Counted from", <span key="c" className="text-[13px]">Last response submitted</span>],
              ]}
              trailing={<Bdg tone="mute">Configured in Audience &amp; Contact Management</Bdg>}
            />
            <div className="mt-4">
              <Alert tone="info">
                Both windows are anchored on the customer's <b>last submitted response</b> — reported by <b>M-04</b> and
                held against the contact by <b>M-03</b>. Nabadat reads it at dispatch and writes the invitation event
                back. A customer who has never responded has no anchor, so grace never applies to them and the fatigue
                caps below are their only protection.
              </Alert>
            </div>
          </Card>

          {/* Fatigue caps */}
          <Card
            title={
              <>
                Fatigue caps <Own m="m03" /> <Bdg tone="mute">Read-only in M-02</Bdg>
              </>
            }
            desc="“No more than twice in 30 days” needs memory of the customer across all rules, all surveys and all channels. A trigger rule sees one transaction in isolation and has no such memory, so only a customer-centric module can enforce a cross-cutting cap. M-02 sends a dispatch intent; M-03 answers allow or deny."
          >
            <InheritRow
              items={[
                ["Cap", <span key="c"><span className="text-base">2</span> <span className="text-xs font-medium text-muted-foreground">per 30 days</span></span>],
                ["Counting basis", <span key="b" className="text-[13px]">Invitations sent</span>],
                ["Scope", <span key="s" className="text-[13px]">Any survey, any channel</span>],
              ]}
              trailing={
                <Button variant="secondary" size="sm" onClick={() => toast("Fatigue caps are configured in M-03 Customer & Contact Management — outside this prototype.")}>
                  Open in M-03
                </Button>
              }
            />
            <SectionT>Why it cannot be a rule condition</SectionT>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="bg-muted text-start">
                    <th className="border-b border-border p-2.5 text-start font-semibold text-muted-foreground">If it lived in the rule</th>
                    <th className="border-b border-border p-2.5 text-start font-semibold text-muted-foreground">Because it lives at dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Every author would have to add the same condition to every rule, and one omission silently over-surveys a customer.", "Applied once, to every dispatch, whatever the rule decided."],
                    ["A rule would need the customer's full invitation history, across modules it cannot see.", "M-03 already owns that history and is the only place it is complete."],
                    ["The count would be read when the rule matched — up to hours before the message actually goes.", "Read at the last responsible moment, so it is guaranteed current."],
                  ].map(([a, b], i) => (
                    <tr key={i}>
                      <td className="border-b border-border p-2.5 text-muted-foreground last:border-0">{a}</td>
                      <td className="border-b border-border p-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Opt-out */}
          <Card
            title={
              <>
                Opt-out and consent <Own m="m03" /> <Bdg tone="d5">Never overridable</Bdg>
              </>
            }
            desc="Whether a customer has withdrawn consent is an attribute of the customer, and honouring it is a legal obligation — PDPL in Saudi Arabia, GDPR elsewhere — not a preference."
          >
            <Alert tone="err">
              If opt-out were a condition rule authors had to add themselves, <b>one forgotten rule equals a compliance
              breach.</b> Centralising it in M-03's dispatch check makes it structurally impossible to bypass — there is
              no override flag anywhere in M-02, by design.
            </Alert>
            <div className="mt-4">
              <KV
                rows={[
                  ["Checked at", <Bdg key="1" tone="navy">Dispatch, immediately before the channel adapter fires</Bdg>],
                  ["Outcome for an opted-out customer", <Bdg key="2" tone="d5">Dropped, not held</Bdg>],
                  ["Scope", <Bdg key="3" tone="mute">Per channel, plus a global do-not-contact list</Bdg>],
                  ["Overridable by a rule", <Bdg key="4" tone="d5">Never — no flag exists</Bdg>],
                ]}
              />
            </div>
            <p className="mt-3.5 text-[11px] leading-relaxed text-muted-foreground">
              A customer can opt out <b>during</b> a rule's delay — between the moment the rule matched and the moment the
              message would go. That is the second reason the check belongs at dispatch: any earlier check is already
              stale.
            </p>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-[18px]">
          <Card title="Rule exemptions" desc="Which guardrails an individual trigger rule may ask to bypass, and who actually grants it. M-02 can only waive what M-02 enforces; the rest is a request passed to the owning module at dispatch.">
            <Prow
              title={<>Quiet hours <Own m="m02" /> <Bdg tone="d3">Waivable in M-02</Bdg></>}
              desc={<>M-02 owns the window, so it can waive it — for an incident survey that has to go out tonight. Requires the <span className="font-mono text-[10px]">rules.override_quiet_hours</span> permission, and every waived send is tagged on the request record.</>}
              ctl={<Switch defaultChecked aria-label="Allow quiet-hours waiver" />}
            />
            <Prow
              title={<>Fatigue caps <Own m="m03" /> <Bdg tone="d3">Request only</Bdg></>}
              desc="The rule's flag is forwarded to M-03 as an exemption request at dispatch. M-03 holds the customer history and makes the call — M-02 records what it asked for and what it was told."
              ctl={<Switch defaultChecked aria-label="Allow fatigue exemption request" />}
            />
            <Prow
              title={<>Grace period <Own m="m03" /> <Bdg tone="d3">Request only</Bdg></>}
              desc="Same mechanism. Typically used by complaint follow-up, where a second contact inside the window is the entire point."
              ctl={<Switch defaultChecked aria-label="Allow grace exemption request" />}
            />
          </Card>

          <Card title="Suppression sources" desc="Read-only — these are owned elsewhere and consumed at dispatch.">
            <KV
              rows={[
                ["Channel opt-out ledger", <Bdg key="1" tone="navy">M-03</Bdg>],
                ["Global do-not-contact list", <Bdg key="2" tone="navy">M-03</Bdg>],
                ["Hard bounce / invalid number", <Bdg key="3" tone="navy">M-02 write-back</Bdg>],
                ["Survey status not Active", <Bdg key="4" tone="navy">M-01</Bdg>],
                ["Open complaint case", <Bdg key="5" tone="navy">M-08</Bdg>],
              ]}
            />
          </Card>

          <Card title="Blackout dates" desc="Whole days on which nothing is dispatched.">
            {BLACKOUTS.map((b, i) => (
              <Prow
                key={i}
                title={b.t}
                desc={b.d}
                ctl={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                    onClick={() => toast("Blackout removed.")}
                  >
                    <X className="size-3.5" />
                  </Button>
                }
              />
            ))}
            <button
              className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border bg-card px-2.5 text-[11px] font-semibold text-primary hover:border-primary"
              onClick={() => toast("Blackout date picker — not wired in this prototype.")}
            >
              <Plus className="size-3.5" />
              Add blackout date
            </button>
          </Card>
        </div>
      </div>

      {/* Footer note */}
      <p className="border-t border-border pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
        Nothing on this screen selects a survey — that is the trigger rules' job. This screen only ever <b>delays</b> or{" "}
        <b>stops</b> a send that a rule already decided on. Because these checks run after the decision,{" "}
        <b>a rule matching does not guarantee a send</b>: the{" "}
        <button className="cursor-pointer text-primary underline" onClick={() => navigate("/sending-rules")}>
          rules list
        </button>{" "}
        reports Matched and Sent separately, and every held, dropped or delegated outcome appears on the{" "}
        <button className="cursor-pointer text-primary underline" onClick={() => navigate("/distribution/requests")}>
          survey request log
        </button>{" "}
        with the owning module named — so support staff can always see which stage stopped a message.
      </p>
    </div>
  )
}

function HoursGrid({ quiet }: { quiet: boolean[] }) {
  return (
    <div className="mt-5 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
      {quiet.map((q, h) => (
        <div
          key={h}
          title={`${hh(h)} — ${q ? "quiet" : "sending"}`}
          className={cn(
            "relative h-[26px] cursor-pointer rounded-sm",
            q ? "bg-nb-navy-100 dark:bg-nb-navy-700" : "bg-d2-light",
          )}
          onClick={() => toast("Quiet hours are set once for the tenant — open Settings → Channels & Distribution to change the window.")}
        >
          {h % 3 === 0 && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] tabular-nums text-muted-foreground">
              {h}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
