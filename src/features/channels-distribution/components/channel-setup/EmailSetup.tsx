// Email channel setup — Delivery (from/subject/footer + preview), Capture (+ the
// per-rule first-question note), Provider (sending service, auth & domain,
// unsubscribe & complaints), and a generic Limits panel shared with other channels.

import { useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { resolveMsg } from "../../data/helpers"
import { useChannels } from "../../store"
import { Bdg } from "../ui-bits"
import {
  Alert,
  Card,
  CardB,
  CardH,
  Fact,
  Fld,
  Grid2,
  Grid3,
  InfoPop,
  Mechanic,
  OkBadge,
  RoInput,
  Sel,
  TwoCol,
} from "./bits"

const FOOTER_TEXT =
  "This survey is sent on behalf of [Organisation Name]. Your answers are processed by Nabadat solely to improve the services you received, under the data-processing agreement signed between Nabadat and [Organisation Name]. Their <b>integrity</b> is protected: they are recorded exactly as you give them and are never altered, corrected or re-interpreted afterwards. Their <b>confidentiality</b> is protected too: they are never sold, never shared with a third party for marketing, and never used to identify you in any published report. You can stop receiving these invitations at any time using the unsubscribe link below."

const FOOTER_PARAMS = ["Organisation Name", "Survey Name", "Unsubscribe Link"]

export function EmailDelivery() {
  const { emailDefaults } = useChannels()
  const [footerHead, setFooterHead] = useState("Powered by Nabadat")
  const [footerBody, setFooterBody] = useState(FOOTER_TEXT)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const insertFooterParam = (name: string) => {
    const el = bodyRef.current
    const tag = `[${name}]`
    if (!el) {
      setFooterBody((b) => b + tag)
      return
    }
    const a = el.selectionStart ?? el.value.length
    const b2 = el.selectionEnd ?? a
    setFooterBody((prev) => prev.slice(0, a) + tag + prev.slice(b2))
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = a + tag.length
    })
  }
  // Email footer meter — measured like the reference's countMsg('email'): Typed = raw length,
  // Resolved = params-substituted length (tags kept), toward a 600-char SOFT recommendation.
  const footerResolved = resolveMsg(footerBody)
  const footerWords = footerResolved.trim() ? footerResolved.trim().split(/\s+/).length : 0
  const footerPct = Math.min(100, Math.round((footerResolved.length / 600) * 100))
  const footerWarn = footerPct >= 80
  return (
    <TwoCol>
      <div>
        <Card className="mb-[18px]">
          <CardH title="Delivery mechanics" />
          <CardB>
            <Grid2>
              <Fld label="From name">
                <Input defaultValue="Ministry of Interior — Feedback" />
              </Fld>
              <Fld label="From address">
                <Input defaultValue="surveys@tenant.gov.jo" />
              </Fld>
            </Grid2>
            <Fld label="Reply-to" hint="Replies are not parsed as answers; they reach a human mailbox.">
              <Input defaultValue="cx@tenant.gov.jo" />
            </Fld>
            <Fact
              label="Sending domain"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  tenant.gov.jo <OkBadge ok>SPF</OkBadge> <OkBadge ok>DKIM</OkBadge> <OkBadge ok={false}>DMARC p=none</OkBadge>
                </span>
              }
              info={
                <InfoPop title="Sending domain and authentication">
                  The domain surveys are sent from, and the DNS records that prove it. <b>SPF</b> and <b>DKIM</b> must both
                  pass and be aligned to the From domain; <b>DMARC</b> tells mailbox providers what to do when they do not.
                  Moving beyond <span className="font-mono">p=none</span> to quarantine or reject is the next step and is
                  also a prerequisite for BIMI. Changing the domain is a DNS operation, not a setting in Nabadat.
                </InfoPop>
              }
            />
            <Fact
              label="Subject"
              value={emailDefaults.subject}
              info={
                <InfoPop title="Why the subject is fixed">
                  One subject line for every tenant and every survey. A single plain question performs consistently across
                  inboxes, removes a per-tenant thing to test and translate, and keeps the specifics where they belong —
                  in the message body, which carries the customer name, the service and the date.
                </InfoPop>
              }
            />
            <Fld label="Preheader" hint="The grey line next to the subject in most inboxes. Left empty, clients pull the first body line instead." className="mt-4 mb-0">
              <Input defaultValue={emailDefaults.preheader} />
            </Fld>
          </CardB>
        </Card>

        <Card className="mb-[18px]">
          <CardH
            title="Email footer"
            desc="Appended to every survey email. It is where the data-handling commitment is made in plain language, which is what a cautious recipient looks for before clicking a link."
          />
          <CardB>
            <Fld label="Footer heading" hint="Shown above the footer text, visually separated from the message.">
              <Input value={footerHead} onChange={(e) => setFooterHead(e.target.value)} />
            </Fld>
            <div>
              <Label className="mb-1.5 block">Footer text</Label>
              <Textarea
                ref={bodyRef}
                value={footerBody}
                onChange={(e) => setFooterBody(e.target.value)}
                className="min-h-[130px] font-mono text-xs"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
                <span>
                  Typed <b className="text-foreground tabular-nums">{footerBody.length}</b>
                </span>
                <span className={cn(footerWarn && "font-bold text-d3-dark dark:text-d3-light")}>
                  Resolved <b className="tabular-nums">{footerResolved.length}</b> / 600 recommended
                </span>
                <span>
                  Words <b className="text-foreground tabular-nums">{footerWords}</b>
                </span>
                <span className="h-1 min-w-20 max-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full transition-[width] duration-150", footerWarn ? "bg-d3" : "bg-primary")}
                    style={{ width: `${footerPct}%` }}
                  />
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Parameters are resolved the same way as in the body — use{" "}
                <span className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-[11px] text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                  [Organisation Name]
                </span>{" "}
                so one footer serves every tenant.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FOOTER_PARAMS.map((pname) => (
                  <button
                    key={pname}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFooterParam(pname)}
                    className="h-[26px] rounded-sm border border-dashed border-border bg-card px-2 font-mono text-[11px] font-semibold text-primary transition-colors hover:border-primary hover:bg-nb-cyan-100 dark:hover:bg-nb-cyan-900/40"
                  >
                    [{pname}]
                  </button>
                ))}
              </div>
            </div>
            <Alert kind="info" className="mt-4">
              The unsubscribe link is added automatically whether or not the footer text mentions it, because one-click
              unsubscribe is a header-level requirement for bulk senders. Referring to it in the text as well is what stops
              a recipient reaching for the spam button instead.
            </Alert>
          </CardB>
        </Card>

        <Card>
          <CardH title="The link is the whole call to action" desc="The email carries the invitation; the survey is answered on the web." />
          <CardB className="pt-1.5">
            <Mechanic n="1" title="One survey link">
              The same signed token used on every other channel, in one URL format.
            </Mechanic>
            <Mechanic n="2" title="No answers in the inbox">
              Nothing is answerable from the email itself. Every response is captured in the web survey, which keeps one
              rendering path and one set of validation rules.
            </Mechanic>
            <Mechanic n="3" title="Opened is not answered">
              The tracking pixel reports an open, which image-blocking clients under-report. Link-opened is the
              trustworthy signal.
            </Mechanic>
          </CardB>
        </Card>
      </div>

      <div>
        <Card>
          <CardH title="Preview" />
          <CardB>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="border-b border-border bg-muted px-3.5 py-2.5 text-[11px] text-muted-foreground">
                <b className="text-foreground">Ministry of Interior — Feedback</b>
                <br />
                {emailDefaults.subject} <span className="opacity-70">— {emailDefaults.preheader}</span>
              </div>
              <div className="px-3.5 py-4 text-center">
                <h4 className="font-heading text-[13px] font-bold">{emailDefaults.subject}</h4>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  Thank you, Ahmad Al-Masri, for using the Tourism Visa Request service on 27 Jul 2026.
                </p>
                <div className="mt-3.5">
                  <span className="pointer-events-none inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
                    Open the survey
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">Two questions, under a minute.</p>
                <div className="mt-4 border-t border-border pt-3 text-start">
                  <div className="text-[11px] font-bold">{footerHead}</div>
                  <div
                    className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground [&_b]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: resolveMsg(footerBody) }}
                  />
                  <div className="mt-1.5 text-[10.5px] text-primary">Unsubscribe</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Subject is fixed; the footer is tenant-configurable and appended to every survey email.
            </p>
          </CardB>
        </Card>
      </div>
    </TwoCol>
  )
}

export function EmailCapture() {
  return (
    <>
      <TwoCol>
        <div>
          <Card>
            <CardH title="How the answer comes back" />
          <CardB className="pt-1.5">
            <Mechanic n="1" title="Through the survey link">
              The recipient opens the link and answers in the web survey. Nothing is captured in the message itself.
            </Mechanic>
            <Mechanic n="2" title="Answers commit per question">
              Closing the browser mid-survey still yields a partial response.
            </Mechanic>
            <Mechanic n="3" title="Open tracking">
              A 1×1 pixel records an open. Image-blocking clients under-report it, so open rate is treated as a floor and
              never as a denominator.
            </Mechanic>
            <Mechanic n="4" title="Bounces">
              Hard bounces write an invalid-contact flag to M-03 and suppress future email to that address. Soft bounces
              retry per the limits tab.
            </Mechanic>
            <Mechanic n="5" title="Complaints">
              A spam complaint writes an immediate channel opt-out to M-03. Never overridable.
            </Mechanic>
            <Mechanic n="6" title="Unsubscribe">
              A one-click list-unsubscribe header is added to every message, as required by major mailbox providers, and
              the footer repeats it in plain text.
            </Mechanic>
          </CardB>
        </Card>
      </div>
      <div>
        <Card>
          <CardH title="Why nothing is answerable in the inbox" desc="The in-body first question was removed from the design." />
          <CardB className="pt-1.5">
            <Mechanic n="1" title="One rendering path">
              Every answer arrives through the web survey, so validation, versioning and partial-response handling exist
              in exactly one place.
            </Mechanic>
            <Mechanic n="2" title="No duplicate-click rules">
              An in-body answer needs first-click-wins handling, a way to correct a mis-tap, and a reconciliation with the
              web answer. All of that disappears.
            </Mechanic>
            <Mechanic n="3" title="Consistent funnel">
              Opened → started → finished means the same thing on email as on SMS, which makes cross-channel response
              rates comparable.
            </Mechanic>
            <Alert kind="info">
              The trade is a lower click-to-response rate than an embedded question would give. Worth revisiting once the
              web survey's first-question load time is measured.
            </Alert>
          </CardB>
        </Card>
        </div>
      </TwoCol>
      <EmqCard />
    </>
  )
}

/** The per-rule "First question in the email body" card (`emqCard`), full width below the two columns. */
function EmqCard() {
  return (
    <Card className="mt-[18px]">
      <CardH title="First question in the email body" desc="Offered per rule, not per template. The rule decides whether the first question is answerable straight from the inbox." />
      <CardB className="pt-1.5">
        <Mechanic n="1" title="One tap, one answer">
          The scale renders in the email. The click is recorded as the answer to question one and opens the survey at
          question two.
        </Mechanic>
        <Mechanic n="2" title="First click wins">
          A signed, single-use URL per option. A second click on a different option changes nothing — the first answer
          stands, and M-04 resolves duplicates first-write-wins.
        </Mechanic>
        <Mechanic n="3" title="The rest is the web survey">
          Only the first question is embedded. Everything after it is answered on the survey page, so there is one
          validation path and one rendering owner in M-01.
        </Mechanic>
        <Mechanic n="4" title="Image blocking does not break it">
          The options are styled markup, not an image map. A client that blocks images still shows a usable set of links.
        </Mechanic>
        <Alert kind="info">
          It lifts the click-to-response rate because the first answer costs nothing. The trade is a second answer path to
          keep correct — which is why it is a deliberate per-rule choice rather than a default.
        </Alert>
      </CardB>
    </Card>
  )
}

export function EmailProvider() {
  return (
    <TwoCol>
      <div>
        <Card className="mb-[18px]">
          <CardH title="Sending service" />
          <CardB>
            <Grid2>
              <Fld label="Delivery method" hint="An API gives per-message IDs and richer event webhooks than SMTP.">
                <Sel>
                  <option>ESP API</option>
                  <option>SMTP relay</option>
                </Sel>
              </Fld>
              <Fld label="Host / endpoint">
                <Input className="font-mono" defaultValue="smtp.tenant.gov.jo" />
              </Fld>
            </Grid2>
            <Grid3>
              <Fld label="Port">
                <Sel>
                  <option>587 — STARTTLS</option>
                  <option>465 — TLS</option>
                  <option>25 — unencrypted</option>
                </Sel>
              </Fld>
              <Fld label="Username">
                <Input className="font-mono" defaultValue="nabadat-relay" />
              </Fld>
              <Fld label="Password / API key">
                <Input className="font-mono" type="password" defaultValue="••••••••••••" />
              </Fld>
            </Grid3>
            <Grid2>
              <Fld label="IP assignment" hint="A dedicated IP owns its reputation but needs warm-up; a shared pool inherits other senders' behaviour.">
                <Sel>
                  <option>Dedicated IP</option>
                  <option>Shared pool</option>
                </Sel>
              </Fld>
              <Fld label="Warm-up schedule" hint="Sending full volume from a cold IP is the fastest route to the spam folder.">
                <Sel>
                  <option>Automatic ramp over 30 days</option>
                  <option>None — full volume</option>
                </Sel>
              </Fld>
            </Grid2>
          </CardB>
        </Card>

        <Card className="mb-[18px]">
          <CardH
            title="Authentication & domain"
            desc="Mailbox providers now enforce these for any domain sending 5,000+ messages a day, with permanent rejections rather than delays."
          />
          <CardB>
            <Grid2>
              <Fld label="Sending domain">
                <Input defaultValue="tenant.gov.jo" />
              </Fld>
              <Fld label="Custom tracking domain" hint="Link-branding on your own domain. Shared tracking domains carry other senders' reputation.">
                <Input defaultValue="click.tenant.gov.jo" />
              </Fld>
            </Grid2>
            <Fld label="DNS status">
              <div className="flex flex-wrap gap-2 pt-1.5">
                <OkBadge ok>SPF pass</OkBadge>
                <OkBadge ok>DKIM signed</OkBadge>
                <OkBadge ok>DMARC published</OkBadge>
                <OkBadge ok>Alignment ✓</OkBadge>
                <OkBadge ok>PTR / reverse DNS</OkBadge>
                <OkBadge ok>TLS enforced</OkBadge>
              </div>
            </Fld>
            <Grid2>
              <Fld label="DMARC policy" hint="Move beyond p=none once reports are clean; quarantine or reject is also a prerequisite for BIMI.">
                <Sel>
                  <option>p=none — monitor only</option>
                  <option>p=quarantine</option>
                  <option>p=reject</option>
                </Sel>
              </Fld>
              <Fld label="Plain-text alternative" hint="A multipart message with a text part is filtered less often than HTML alone.">
                <Sel>
                  <option>Generate automatically</option>
                  <option>HTML only</option>
                </Sel>
              </Fld>
            </Grid2>
          </CardB>
        </Card>

        <Card>
          <CardH title="Unsubscribe & complaints" />
          <CardB className="space-y-3">
            <label className="flex items-start gap-2.5">
              <Checkbox defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-[13px] font-semibold">One-click list-unsubscribe (RFC 8058)</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                  Adds <span className="font-mono">List-Unsubscribe</span> and <span className="font-mono">List-Unsubscribe-Post</span>, both covered by the DKIM
                  signature, processed over HTTPS POST and honoured within 48 hours. Required by Gmail, Yahoo and Outlook for bulk senders.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <Checkbox defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-[13px] font-semibold">Visible unsubscribe link in the body</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                  Insert it with the{" "}
                  <span className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-[11px] text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                    [Unsubscribe Link]
                  </span>{" "}
                  parameter. An unsubscribe writes a channel opt-out to M-03 immediately.
                </span>
              </span>
            </label>
            <Grid2>
              <Fld label="Complaint-rate alert threshold" hint="Stay under 0.10%. At 0.30% providers begin rejecting outright." className="mb-0">
                <Input type="number" step="0.01" defaultValue="0.10" />
              </Fld>
              <Fld label="Bounce & complaint webhook" hint="Hard bounces flag the contact invalid in M-03; complaints write an opt-out." className="mb-0">
                <RoInput className="font-mono" value="https://api.nabadat.jo/v1/channels/email/events" dir="ltr" />
              </Fld>
            </Grid2>
          </CardB>
        </Card>
      </div>
      <div>
        <Card>
          <CardH title="Why authentication is not enough" />
          <CardB className="pt-1.5">
            <Mechanic n="1" title="Authentication proves identity, not welcome">
              Fully authenticated mail still lands in spam when engagement is poor. Providers switch to behavioural
              signals once identity is settled.
            </Mechanic>
            <Mechanic n="2" title="Engagement is the real currency">
              Clicks and replies outrank opens. Open rate is under-reported by image blocking and should never be a
              denominator.
            </Mechanic>
            <Mechanic n="3" title="List hygiene">
              Every hard bounce costs reputation. M-02 suppresses invalid addresses automatically after the first hard
              bounce.
            </Mechanic>
            <Mechanic n="4" title="Separate your streams">
              Do not send survey invitations from the same IP or subdomain as bulk marketing — reputation is per IP and
              per DKIM domain.
            </Mechanic>
            <Mechanic n="5" title="This is why the grace period matters">
              Over-surveying raises complaints, complaints cost inbox placement, and lost placement quietly kills response
              rate long before anyone notices.
            </Mechanic>
          </CardB>
        </Card>
      </div>
    </TwoCol>
  )
}

/** Generic Limits & retries panel, shared by SMS and Email (`GENERIC.limits`). */
export function GenericLimits({ channelName }: { channelName: string }) {
  return (
    <TwoCol>
      <div>
        <Card>
          <CardH
            title="Throughput & retries"
            desc={
              <>
                Applies to {channelName}. Provider limits are not negotiable from here — this screen governs how Nabadat
                behaves inside them.
              </>
            }
          />
          <CardB>
            <Grid2>
              <Fld label="Provider rate limit" hint="Set by the provider contract.">
                <RoInput value="80 messages / second" />
              </Fld>
              <Fld label="Nabadat send rate" hint="Kept below the provider ceiling so a burst never triggers throttling.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" defaultValue="60" className="flex-1" />
                  <span className="text-xs text-muted-foreground">per second</span>
                </div>
              </Fld>
            </Grid2>
            <Grid2>
              <Fld label="Retries on transient failure" hint="Applies to timeouts and 5xx responses only — never to a rejected or invalid recipient.">
                <Sel>
                  <option>3 attempts</option>
                  <option>2 attempts</option>
                  <option>1 attempt</option>
                  <option>No retry</option>
                </Sel>
              </Fld>
              <Fld
                label="Backoff"
                hint={
                  <>
                    How long to wait between retry attempts. Exponential multiplies the wait by five each time, so a
                    provider that is briefly overloaded gets breathing room instead of the same burst again; a fixed
                    interval retries on a flat rhythm. Retries stop at whichever comes first: the attempt count on the
                    left, or the <b>Stale after</b> window below. A retry that lands inside quiet hours is held like any
                    other send.
                  </>
                }
              >
                <Sel>
                  <option>Exponential — 1 min, then 5 min, then 25 min</option>
                  <option>Fixed — every 5 min</option>
                  <option>Fixed — every 15 min</option>
                </Sel>
              </Fld>
            </Grid2>
            <Grid2>
              <Fld label="Give-up behaviour" hint="Falling back is what makes the fallback field on a rule meaningful.">
                <Sel>
                  <option>Try the rule&apos;s fallback channel</option>
                  <option>Mark failed and stop</option>
                </Sel>
              </Fld>
              <Fld label="Stale after" hint="A queued message older than this is dropped rather than sent late.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" defaultValue="6" className="flex-1" />
                  <Sel className="w-24">
                    <option>hours</option>
                    <option>days</option>
                  </Sel>
                </div>
              </Fld>
            </Grid2>
          </CardB>
        </Card>
      </div>
      <div>
        <Card>
          <CardH title="Failure handling" />
          <CardB className="pt-1.5">
            <Mechanic n="1" title="Transient">
              Timeouts and provider 5xx. Retried per the policy on the left, then handed to the fallback channel.
            </Mechanic>
            <Mechanic n="2" title="Permanent">
              Invalid recipient, unreachable number, hard bounce. No retry — the contact is flagged in M-03 and the send
              is reported as failed.
            </Mechanic>
            <Mechanic n="3" title="Rejected">
              Provider policy refusal, for example an unapproved WhatsApp template. Held, not failed, so it can be released
              once the template is approved.
            </Mechanic>
            <Mechanic n="4" title="Every outcome is visible">
              All four land on the request record with a reason code. Nothing fails silently.
            </Mechanic>
          </CardB>
        </Card>
      </div>
    </TwoCol>
  )
}

export { Bdg }
