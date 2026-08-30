// SMS channel setup tabs — reproduces the FINAL (v2.0) SMS UI: own-gateway route
// (HTTP or SMPP), verified. Config is held in component-local state.

import type { ReactNode } from "react"
import { ArrowRightLeft, Check, Send, Server, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Bdg, CodeChip, SectionT } from "../ui-bits"
import {
  Alert,
  Card,
  CardB,
  CardH,
  Endpoint,
  EpComment,
  EpKey,
  EpVal,
  Fld,
  Grid2,
  Grid3,
  Mechanic,
  RoInput,
  Sel,
} from "./bits"

export interface SmsOwn {
  proto: "http" | "smpp"
  url: string
  method: string
  ctype: string
  auth: string
  authValue: string
  fTo: string
  fText: string
  fSender: string
  extra: string
  uniMode: string
  uniField: string
  uniValue: string
  okCodes: string
  okPath: string
  okValue: string
  idPath: string
  statusMode: string
  rate: number
  timeout: number
  // smpp
  smppHost: string
  smppPort: number
  smppTls: boolean
  smppSystemId: string
  smppType: string
  smppBind: string
  smppWin: number
  smppTps: number
  srcTon: string
  srcNpi: string
  dstTon: string
  dstNpi: string
  coding: string
  longMsg: string
  dlr: string
  enquire: number
}

export const SMS_OWN_DEFAULT: SmsOwn = {
  proto: "http",
  url: "https://sms.tenant.gov.jo/api/v3/send",
  method: "POST",
  ctype: "application/json",
  auth: "bearer",
  authValue: "••••••••••••",
  fTo: "destination",
  fText: "body",
  fSender: "source",
  extra: '{"dlr":"1","route":"transactional"}',
  uniMode: "auto",
  uniField: "encoding",
  uniValue: "unicode",
  okCodes: "200,201,202",
  okPath: "status",
  okValue: "accepted",
  idPath: "data.messageId",
  statusMode: "callback",
  rate: 40,
  timeout: 10,
  smppHost: "smpp.tenant.gov.jo",
  smppPort: 2775,
  smppTls: true,
  smppSystemId: "nabadat",
  smppType: "",
  smppBind: "transceiver",
  smppWin: 10,
  smppTps: 20,
  srcTon: "5 — Alphanumeric",
  srcNpi: "0 — Unknown",
  dstTon: "1 — International",
  dstNpi: "1 — ISDN/E.164",
  coding: "auto",
  longMsg: "udh",
  dlr: "1 — final state only",
  enquire: 30,
}

/** The blank gateway config a NEWLY created SMS channel starts with — nothing is filled in,
 * so its Verify card lists gaps and its request preview is empty (mirrors `freshSmsCfg().own`).
 * A seeded/verified channel uses SMS_OWN_DEFAULT instead. */
export const SMS_OWN_EMPTY: SmsOwn = {
  ...SMS_OWN_DEFAULT,
  url: "",
  authValue: "",
  fTo: "",
  fText: "",
  fSender: "",
  extra: "{}",
  uniField: "",
  okCodes: "200",
  okPath: "",
  okValue: "",
  idPath: "",
  statusMode: "none",
  rate: 20,
  smppHost: "",
  smppSystemId: "",
  smppType: "",
}

/** Missing-configuration list, in the reference's exact wording. Empty = ready to verify. */
export function smsGaps(o: SmsOwn): string[] {
  const g: string[] = []
  if ((o.proto || "http") === "smpp") {
    if (!o.smppHost.trim()) g.push("the SMPP host is empty.")
    if (!o.smppSystemId.trim()) g.push("the SMPP system_id is empty.")
    if (!o.smppPort) g.push("the SMPP port is not set.")
  } else {
    if (!o.url.trim()) g.push("the gateway endpoint URL is empty.")
    if (!o.fTo.trim() || !o.fText.trim()) g.push("the recipient and message field names must both be mapped.")
    if (!o.okCodes.trim()) g.push("no HTTP status codes are treated as success.")
    if (o.uniMode !== "none" && !o.uniField.trim())
      g.push("Unicode handling is switched on but no flag field is named — Arabic surveys would arrive as question marks.")
  }
  return g
}

const SAMPLE_MSG = "شكراً لاستخدامك خدمة طلب التأشيرة. سؤالان سريعان: nbdt.jo/s/visa-nps/7Kq2Xb"

export type SmsRoute = "" | "own" | "nabadat"
export type SmsStatus = "not_started" | "in_progress" | "verified"
const ROUTE_LABEL: Record<"own" | "nabadat", string> = {
  own: "Tenant's own gateway · HTTP",
  nabadat: "Nabadat gateway · Access to Arabia",
}

/** Delivery/Capture tab banner: yellow "no route" until onboarding starts, then the blue
 * route banner (with a "Not verified" chip while onboarding is still in progress). */
function RouteBanner({ route, status, onGotoProvider }: { route: SmsRoute; status: SmsStatus; onGotoProvider?: () => void }) {
  if (!route) {
    return (
      <div className="mb-[18px] flex items-start gap-2.5 rounded-md bg-d3-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
        <TriangleAlert className="mt-0.5 size-[15px] shrink-0" aria-hidden />
        <span>
          <b>No delivery route chosen.</b> Nothing on this tab applies until onboarding is started.{" "}
          <button type="button" onClick={onGotoProvider} className="font-semibold text-primary hover:underline">
            Choose a route →
          </button>
        </span>
      </div>
    )
  }
  return (
    <div className="mb-[18px] flex items-start gap-2.5 rounded-md border border-nb-cyan-200 bg-nb-cyan-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-nb-cyan-900 dark:border-nb-cyan-300/25 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-100">
      <Send className="mt-0.5 size-[15px] shrink-0 text-primary" aria-hidden />
      <span>
        <b>Route: {ROUTE_LABEL[route]}.</b> Nabadat builds an HTTP request and calls your gateway; your provider bills you
        directly.{" "}
        <button type="button" onClick={onGotoProvider} className="font-semibold text-primary hover:underline">
          Provider &amp; compliance →
        </button>
        {status !== "verified" && (
          <span className="ms-1.5 inline-block align-middle">
            <Bdg tone="d3">Not verified</Bdg>
          </span>
        )}
      </span>
    </div>
  )
}

/** Centered empty-state card shown on a tab before a route is chosen. */
function EmptyState({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Card>
      <CardB>
        <div className="px-5 py-10 text-center">
          {title && <div className="mb-1.5 font-heading text-[15px] font-bold">{title}</div>}
          <p className="mx-auto max-w-[520px] text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>
        </div>
      </CardB>
    </Card>
  )
}

const LimitsTable = () => (
  <div className="overflow-hidden rounded-md border border-border">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted text-[10px] tracking-wider text-muted-foreground uppercase">
          <th className="px-3 py-2 text-start font-semibold">Script</th>
          <th className="px-3 py-2 text-end font-semibold">Single message</th>
          <th className="px-3 py-2 text-end font-semibold">Per part when concatenated</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-border">
          <td className="px-3 py-2">
            <div className="font-semibold">English</div>
            <div className="text-[11px] text-muted-foreground">GSM-7</div>
          </td>
          <td className="px-3 py-2 text-end tabular-nums">160</td>
          <td className="px-3 py-2 text-end tabular-nums">153</td>
        </tr>
        <tr className="border-t border-border">
          <td className="px-3 py-2">
            <div className="font-semibold">Arabic</div>
            <div className="text-[11px] text-muted-foreground">Unicode</div>
          </td>
          <td className="px-3 py-2 text-end tabular-nums">70</td>
          <td className="px-3 py-2 text-end tabular-nums">67</td>
        </tr>
      </tbody>
    </table>
  </div>
)

export function SmsDelivery({
  cfg,
  route,
  status,
  onGotoProvider,
}: {
  cfg: SmsOwn
  route: SmsRoute
  status: SmsStatus
  onGotoProvider?: () => void
}) {
  return (
    <>
      <RouteBanner route={route} status={status} onGotoProvider={onGotoProvider} />
      {!route ? (
        <EmptyState title="SMS is not configured yet">
          Choose a delivery route on the Provider &amp; compliance tab. The message limits below are the same either way,
          but who sends, who registers the sender and who pays are not.
        </EmptyState>
      ) : (
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-[18px]">
          <Card>
            <CardH title="Sender identity" desc="Set by your gateway, not by Nabadat." />
            <CardB>
              <Grid2>
                <Fld label="Sender field sent to your gateway" hint={<>Nabadat passes <CodeChip>{"{sender}"}</CodeChip> in this field.</>}>
                  <RoInput value={cfg.fSender || "not sent"} className="font-mono" dir="ltr" />
                </Fld>
                <Fld label="Registration owner" hint="Per-country sender registration stays with you on this route.">
                  <RoInput value="Your operator contracts" />
                </Fld>
              </Grid2>
              <Alert kind="info">
                Because Nabadat does not hold your sender registrations, it cannot warn you about a country where the
                sender is undefined. That check exists only on the Nabadat gateway route.
              </Alert>
            </CardB>
          </Card>
          <Card>
            <CardH
              title="Message text limits"
              desc="The industry standard both routes are measured against. M-02 enforces these where the words are written, not at send time."
            />
            <CardB>
              <LimitsTable />
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                One Arabic character switches the whole message to the 70/67 budget, and counting happens on the{" "}
                <b>resolved</b> text — a long customer name can push a one-part message into two.
              </p>
              <Alert kind="warn" className="mt-3">
                Confirm your gateway concatenates long messages rather than truncating them, and that it bills per part.
                Nabadat never splits a message itself — it submits one string and counts the parts for reporting.
              </Alert>
            </CardB>
          </Card>
        </div>
        <div className="space-y-[18px]">
          <Card>
            <CardH title="Request Nabadat will send" />
            <CardB>
              <HttpPreview cfg={cfg} />
            </CardB>
          </Card>
          <Card>
            <CardH title="Survey link budget" desc="Why the link format matters more on SMS than anywhere else." />
            <CardB className="pt-1">
              <Mechanic n="1" title="The link is fixed cost">
                <CodeChip>nbdt.jo/s/visa-nps/7Kq2Xb</CodeChip> is 26 characters — over a third of an Arabic part before a
                single word of copy.
              </Mechanic>
              <Mechanic n="2" title="A tenant domain costs more">
                A longer branded domain reads better and may cost an extra part on every Arabic message. That is a real
                trade, priced per part.
              </Mechanic>
              <Mechanic n="3" title="The unique attribute is the floor">
                Six characters is the shortest safely unguessable suffix. Shortening it to save space trades security for
                a fraction of a part.
              </Mechanic>
            </CardB>
          </Card>
        </div>
      </div>
      )}
    </>
  )
}

export function SmsCapture({
  route,
  status,
  onGotoProvider,
}: {
  route: SmsRoute
  status: SmsStatus
  onGotoProvider?: () => void
}) {
  return (
    <>
      <RouteBanner route={route} status={status} onGotoProvider={onGotoProvider} />
      {!route ? (
        <EmptyState>Choose a delivery route first — how delivery status arrives depends entirely on it.</EmptyState>
      ) : (
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-[18px]">
          <Card>
            <CardH title="Delivery status on this route" desc="Pushed to Nabadat by your gateway." />
            <CardB className="pt-1">
              <Mechanic n="1" title="Your gateway calls Nabadat">
                Each status update is posted to the Nabadat callback URL, signed with the shared secret. This is the only
                push-based option on either route, and the most responsive.
              </Mechanic>
              <Mechanic n="2" title="Signature is mandatory">
                An unsigned or badly signed callback is rejected, so a third party cannot mark your messages delivered.
              </Mechanic>
              <Mechanic n="3" title="Unknown references are dropped">
                A status for a reference Nabadat never issued is logged and discarded rather than creating a phantom
                dispatch.
              </Mechanic>
              <Alert kind="info" className="mt-3.5">
                <b>Delivery is confirmed by silence.</b> The gateway reports <b>non-delivery</b>, not delivery, so a
                dispatch with no report inside the reporting window is recorded as delivered. There is no{" "}
                <i>unconfirmed</i> state to reconcile in reporting.
              </Alert>
            </CardB>
          </Card>
          <Card>
            <CardH title="How the answer comes back" desc="Identical on both routes: the message is a carrier, the web survey does the capturing." />
            <CardB className="pt-1">
              <Mechanic n="1" title="The link is the only capture route">
                Neither route offers an inbound SMS service, so nothing can be received but a link click.
              </Mechanic>
              <Mechanic n="2" title="Answers commit per question">A partially completed survey is still usable data.</Mechanic>
              <Mechanic n="3" title="Reopening resumes">
                The same link returns the customer to the first unanswered question while the survey is still active;
                after expiry it redirects to the general feedback form.
              </Mechanic>
            </CardB>
          </Card>
        </div>
        <div className="space-y-[18px]">
          <WhatCanBeReported />
        </div>
      </div>
      )}
      {/* Route-independent: the non-delivery report and the STOP listener are shown even
          before a route is chosen (they describe the channel's consent + reporting model). */}
      <div className="mt-[18px] space-y-[18px]">
        <NonDeliveryCard />
        <StopListenerCard />
      </div>
    </>
  )
}

/** "What can be reported" KV card (`SMSUI.capture` right column). Own-gateway callback route. */
function WhatCanBeReported() {
  const rows: [ReactNode, ReactNode][] = [
    ["Accepted by your gateway", <Bdg tone="cyan">Submitted · reference stored</Bdg>],
    ["Rejected at submission", <Bdg tone="d5">Failed · HTTP or body code</Bdg>],
    ["Delivered to the handset", <Bdg tone="d2">Reported</Bdg>],
    ["Read by the customer", <Bdg tone="mute">Does not exist on SMS</Bdg>],
    ["Link opened", <Bdg tone="d2">Tracked by M-02</Bdg>],
    ["Survey answered", <Bdg tone="d2">Reported by M-04</Bdg>],
  ]
  return (
    <Card>
      <CardH title="What can be reported" />
      <CardB>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 text-xs">
          {rows.map(([k, v], i) => (
            <div key={i} className="contents">
              <span>{k}</span>
              <span className="justify-self-end">{v}</span>
            </div>
          ))}
        </div>
      </CardB>
    </Card>
  )
}

function NonDeliveryCard() {
  return (
    <Card>
      <CardH title="Non-delivered report" desc="There is no positive delivery confirmation on this route. The gateway reports what failed, and silence is treated as delivered." />
      <CardB>
        <Endpoint method="POST" url="/api/v1/channels/sms/non-delivered">
          <EpKey>"send_attempt_id"</EpKey>: <EpVal>"inv_9f2a41.1"</EpVal>
          {"\n"}
          <EpKey>"provider_ref"</EpKey>: <EpVal>"123456789"</EpVal>
          {"\n"}
          <EpKey>"reason"</EpKey>: <EpVal>"absent_subscriber"</EpVal>
          {"\n"}
          <EpKey>"reported_at"</EpKey>: <EpVal>"2026-08-24T20:14:02+03:00"</EpVal>
        </Endpoint>
        <SectionT>What happens when one arrives</SectionT>
        <Mechanic n="1" title="The attempt is marked not delivered">Recorded against the send attempt, with the reason the gateway gave.</Mechanic>
        <Mechanic n="2" title="The fallback channel is used, if the rule has one">
          A new send attempt is created on the fallback channel under the same invitation. If the rule has no fallback, the
          invitation ends undelivered and is reported as such.
        </Mechanic>
        <Mechanic n="3" title="The funnel is corrected">
          A Sent event already fired. The non-delivery report is what lets the funnel show that the message never arrived,
          rather than leaving it counted as sent and unanswered.
        </Mechanic>
        <Mechanic n="4" title="No report means delivered">
          Absence of a report is the only delivery signal available. A dispatch with no report and no response is reported
          as delivered but unanswered — not as unconfirmed.
        </Mechanic>
        <Alert kind="warn" className="mt-1">
          <b>This inverts the usual assumption.</b> Treating silence as success means a gateway outage that stops reports
          also stops failures being seen. The report endpoint needs a heartbeat, or a day with zero non-delivery reports
          will look like a perfect day.
        </Alert>
      </CardB>
    </Card>
  )
}

function StopListenerCard() {
  return (
    <Card>
      <CardH
        title={<>Inbound STOP listener <Bdg tone="d2">M-03</Bdg></>}
        desc="The customer's only way to withdraw consent on SMS. M-02 listens, M-03 decides and enforces."
      />
      <CardB>
        <Mechanic n="1" title="The gateway captures the keyword">
          A reply of STOP — or its Arabic equivalent — is received by the SMS gateway on the number that sent the
          invitation.
        </Mechanic>
        <Mechanic n="2" title="M-02 forwards it, it does not interpret it">
          The inbound listener passes the event to M-03 as a channel-scoped opt-out. M-02 never decides consent.
        </Mechanic>
        <Mechanic n="3" title="Keyed on the number and the channel">
          The opt-out is recorded against <CodeChip>phone number + channel</CodeChip> — not against a customer ID, and
          not as an action taken inside Nabadat. A number with no matching contact is still honoured.
        </Mechanic>
        <Mechanic n="4" title="Scoped to the channel that received it">
          It suppresses <b>only</b> the SMS channel that received the STOP. Not the tenant's other SMS channels, not
          email, not in-session. No global or cross-channel suppression is implied.
        </Mechanic>
        <Mechanic n="5" title="Honoured by M-03 at dispatch">
          Every subsequent send on that channel is checked against it. M-02 records the suppression and its reason.
        </Mechanic>
        <Endpoint method="POST" url="M-03 · /api/v1/consent/opt-out" className="mt-3.5">
          <EpKey>"source"</EpKey>: <EpVal>"sms_inbound_keyword"</EpVal>
          {"\n"}
          <EpKey>"msisdn"</EpKey>: <EpVal>"962790000312"</EpVal>
          {"\n"}
          <EpKey>"channel"</EpKey>: <EpVal>"sms-jo"</EpVal>
          {"\n"}
          <EpKey>"keyword"</EpKey>: <EpVal>"STOP"</EpVal>
          {"\n"}
          <EpKey>"received_at"</EpKey>: <EpVal>"2026-08-24T20:41:06+03:00"</EpVal>
        </Endpoint>
        <Alert kind="warn" className="mt-3.5">
          <b>Channel-scoped is a deliberate narrowing.</b> A customer who stops SMS-JO can still be reached on SMS-KSA or
          by email. That is defensible where the channels represent different services, and indefensible if a customer
          believes they have opted out of surveys altogether. Worth confirming the customer-facing wording matches the
          actual scope.
        </Alert>
      </CardB>
    </Card>
  )
}

// ---- provider onboarding ----
export function SmsProvider({
  cfg,
  setCfg,
  route,
  status,
  onChooseRoute,
  onVerify,
}: {
  cfg: SmsOwn
  setCfg: (patch: Partial<SmsOwn>) => void
  route: SmsRoute
  status: SmsStatus
  onChooseRoute: (m: "own" | "nabadat") => void
  onVerify: () => void
}) {
  return (
    <>
      <StatusBanner route={route} status={status} cfg={cfg} />
      <RouteChooser route={route} onChooseRoute={onChooseRoute} />
      {!route ? (
        <EmptyState title="Choose a route to continue">
          Pick how surveys reach your customers above. The gateway configuration and the verification step appear once a
          route is selected.
        </EmptyState>
      ) : (
        <>
          <ProtoChooser cfg={cfg} setCfg={setCfg} />
          {cfg.proto === "http" ? <HttpPanel cfg={cfg} setCfg={setCfg} /> : <SmppPanel cfg={cfg} setCfg={setCfg} />}
          <VerifyCard status={status} onVerify={onVerify} cfg={cfg} />
        </>
      )}
    </>
  )
}

function StatusBanner({ route, status, cfg }: { route: SmsRoute; status: SmsStatus; cfg: SmsOwn }) {
  if (!route)
    return (
      <Alert kind="warn" className="mb-[18px]">
        <b>SMS onboarding not started.</b> Choose how surveys should reach your customers. Nothing can be sent over SMS,
        and no trigger rule can select this channel, until a route is chosen and verified.
      </Alert>
    )
  if (status === "verified")
    return (
      <Alert kind="ok" className="mb-[18px]">
        <b>Verified — {ROUTE_LABEL[route]}.</b> This channel can be enabled and selected by trigger rules. Changing the
        route below returns the channel to <i>in progress</i> and suspends sending until it is verified again.
      </Alert>
    )
  const gaps = smsGaps(cfg)
  return (
    <Alert kind={gaps.length ? "warn" : "info"} className="mb-[18px]">
      <b>Onboarding in progress — {ROUTE_LABEL[route]}.</b>{" "}
      {gaps.length ? (
        `${gaps.length} item${gaps.length === 1 ? "" : "s"} left: ${gaps.map((x) => x.replace(/\.$/, "")).join("; ")}.`
      ) : (
        <>
          Everything required is present — run <b>Verify route</b> to finish.
        </>
      )}
    </Alert>
  )
}

function RouteChooser({ route, onChooseRoute }: { route: SmsRoute; onChooseRoute: (m: "own" | "nabadat") => void }) {
  return (
    <Card className="mb-[18px]">
      <CardH title="SMS delivery route" desc="One decision, taken once, that determines every field below it — and who pays for the messages." />
      <CardB>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            onClick={() => onChooseRoute("own")}
            className={cn(
              "relative block cursor-pointer rounded-md border-[1.5px] bg-card p-3.5 transition-colors",
              route === "own"
                ? "border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
                : "border-border hover:border-input",
            )}
          >
            <span
              className={cn(
                "absolute end-3 top-3 grid size-[17px] place-items-center rounded-full border-[1.5px] transition-colors",
                route === "own" ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
              )}
            >
              <Check className="size-3" />
            </span>
            <div className="mb-2.5 flex size-[34px] items-center justify-center rounded-md bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
              <Server className="size-[17px]" aria-hidden />
            </div>
            <div className="text-[12.5px] font-bold">I have my own SMS gateway</div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Nabadat calls your gateway over HTTP or binds to it over SMPP.</div>
            <RouteBullets
              items={[
                "You keep your existing sender and operator contracts",
                "You are billed by your own provider, not by Nabadat",
                "Delivery reporting is limited to what your gateway exposes",
              ]}
            />
          </label>
          <button
            type="button"
            onClick={() => toast("Nabadat's SMS gateway is coming soon. In this phase, SMS requires your own gateway over HTTP or SMPP.")}
            className="block cursor-not-allowed rounded-md border-[1.5px] border-border bg-card p-3.5 text-start opacity-50"
          >
            <div className="mb-2.5 flex size-[34px] items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Send className="size-[17px]" aria-hidden />
            </div>
            <div className="flex items-center gap-2 text-[12.5px] font-bold">
              Use Nabadat's gateway <Bdg tone="soon">Coming soon</Bdg>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Surveys sent through Access to Arabia on your behalf, metered and invoiced by Nabadat.</div>
            <RouteBullets
              items={[
                "No gateway or operator contract needed",
                "Sender IDs, country coverage and per-part billing",
                "Planned for a later phase",
              ]}
            />
          </button>
        </div>
        <Alert kind="info" className="mt-4">
          <b>Only the bring-your-own-gateway route is in this version.</b> Integration with Nabadat's own gateway (Access
          to Arabia) is deferred to a future release, and the provider questions it raises — failure-code enumeration,
          status codes, throughput, idempotency — are deferred with it. A tenant without their own SMS gateway cannot use
          SMS until then.
        </Alert>
      </CardB>
    </Card>
  )
}

function RouteBullets({ items }: { items: string[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {items.map((p) => (
        <span key={p} className="text-[10.5px] leading-relaxed text-muted-foreground">
          · {p}
        </span>
      ))}
    </div>
  )
}

function ProtoChooser({ cfg, setCfg }: { cfg: SmsOwn; setCfg: (p: Partial<SmsOwn>) => void }) {
  const card = (v: "http" | "smpp", title: string, sub: string, Icon: typeof Server, pts: string[]) => (
    <label
      onClick={() => setCfg({ proto: v })}
      className={
        "relative block cursor-pointer rounded-md border-[1.5px] bg-card p-3.5 " +
        (cfg.proto === v ? "border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_15%,transparent)]" : "border-border")
      }
    >
      <div className="mb-2.5 flex size-[34px] items-center justify-center rounded-md bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
        <Icon className="size-[17px]" aria-hidden />
      </div>
      <div className="text-[12.5px] font-bold">{title}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{sub}</div>
      <RouteBullets items={pts} />
    </label>
  )
  return (
    <Card className="mb-[18px]">
      <CardH title="Integration protocol" desc="How Nabadat talks to your gateway. Both are supported; they differ in throughput, in how delivery receipts arrive, and in how much operational care they need." />
      <CardB>
        <div className="grid gap-3 sm:grid-cols-2">
          {card("http", "HTTP", "One request per message over your gateway's REST or query API.", ArrowRightLeft, [
            "Simplest to operate and to debug",
            "Delivery receipts need a callback or polling",
            "Stateless — no session to keep alive",
          ])}
          {card("smpp", "SMPP 3.4", "A persistent binary session to your SMSC, the protocol operators use themselves.", Server, [
            "Higher throughput, lower per-message latency",
            "Delivery receipts arrive on the same session — no polling",
            "Needs a supervised long-lived connection",
          ])}
        </div>
        {cfg.proto === "smpp" && (
          <Alert kind="info" className="mt-4">
            SMPP is a <b>stateful</b> integration. Nabadat holds an open bind and must detect a silently dead session,
            reconnect with backoff, and resume without double-sending — which is why the keep-alive and window settings
            below matter more than they look.
          </Alert>
        )}
      </CardB>
    </Card>
  )
}

function HttpPanel({ cfg, setCfg }: { cfg: SmsOwn; setCfg: (p: Partial<SmsOwn>) => void }) {
  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">
      <div className="space-y-[18px]">
        <Card>
          <CardH title="Endpoint" desc="Where Nabadat sends each message. One HTTP call per recipient." />
          <CardB>
            <Fld label={<>Send URL<span className="ms-0.5 text-destructive">*</span></>} hint="HTTPS only. A plain-HTTP endpoint is refused, because the survey link and the recipient number would travel in clear text.">
              <Input value={cfg.url} onChange={(e) => setCfg({ url: e.target.value })} className="font-mono" dir="ltr" />
            </Fld>
            <Grid3>
              <Fld label="Method">
                <Sel value={cfg.method} onChange={(e) => setCfg({ method: e.target.value })}>
                  <option>POST</option>
                  <option>GET</option>
                </Sel>
              </Fld>
              <Fld label="Payload format" hint="GET always uses the query string.">
                <Sel value={cfg.ctype} onChange={(e) => setCfg({ ctype: e.target.value })}>
                  <option value="application/json">JSON body</option>
                  <option value="application/x-www-form-urlencoded">Form encoded</option>
                  <option value="query">Query string</option>
                </Sel>
              </Fld>
              <Fld label="Timeout" hint="A slow gateway blocks the dispatch queue.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" value={cfg.timeout} onChange={(e) => setCfg({ timeout: +e.target.value })} />
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
              </Fld>
            </Grid3>
          </CardB>
        </Card>
        <Card>
          <CardH title="Authentication" />
          <CardB>
            <Grid2>
              <Fld label="Method">
                <Sel value={cfg.auth} onChange={(e) => setCfg({ auth: e.target.value })}>
                  <option value="none">None — IP allowlist only</option>
                  <option value="basic">HTTP Basic</option>
                  <option value="bearer">Bearer token</option>
                  <option value="header">Custom header / API key</option>
                  <option value="body">Credentials in the payload</option>
                </Sel>
              </Fld>
              <Fld label="Value" hint="Stored encrypted in a vault, never returned to this screen once saved.">
                <Input type="password" value={cfg.authValue} onChange={(e) => setCfg({ authValue: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
            </Grid2>
          </CardB>
        </Card>
        <Card>
          <CardH title="Request mapping" desc="Your gateway's field names, so Nabadat can build a request it accepts. Nothing is assumed about naming." />
          <CardB>
            <Grid3>
              <Fld label={<>Recipient field<span className="ms-0.5 text-destructive">*</span></>} hint={<>Receives <CodeChip>{"{recipient}"}</CodeChip> in international format.</>}>
                <Input value={cfg.fTo} onChange={(e) => setCfg({ fTo: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label={<>Message field<span className="ms-0.5 text-destructive">*</span></>} hint={<>Receives <CodeChip>{"{message}"}</CodeChip>, already resolved.</>}>
                <Input value={cfg.fText} onChange={(e) => setCfg({ fText: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label="Sender field" hint="Leave empty if your gateway fixes the sender server-side.">
                <Input value={cfg.fSender} onChange={(e) => setCfg({ fSender: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
            </Grid3>
            <Fld label="Additional static parameters" hint="JSON object merged into every request — route class, DLR flag, account reference, anything your gateway needs.">
              <Textarea value={cfg.extra} onChange={(e) => setCfg({ extra: e.target.value })} className="min-h-16 font-mono text-[11.5px]" dir="ltr" />
            </Fld>
            <SectionT>Arabic and Unicode</SectionT>
            <Grid3>
              <Fld label="Handling">
                <Sel value={cfg.uniMode} onChange={(e) => setCfg({ uniMode: e.target.value })}>
                  <option value="auto">Send a flag when the text is Unicode</option>
                  <option value="always">Always send the Unicode flag</option>
                  <option value="none">Gateway detects it itself</option>
                </Sel>
              </Fld>
              {cfg.uniMode !== "none" && (
                <Fld label="Flag field">
                  <Input value={cfg.uniField} onChange={(e) => setCfg({ uniField: e.target.value })} className="font-mono" dir="ltr" />
                </Fld>
              )}
              {cfg.uniMode !== "none" && (
                <Fld label="Flag value">
                  <Input value={cfg.uniValue} onChange={(e) => setCfg({ uniValue: e.target.value })} className="font-mono" dir="ltr" />
                </Fld>
              )}
            </Grid3>
            <Alert kind="info">
              Arabic surveys are the normal case here. If your gateway needs to be told the text is Unicode and it is not
              told, recipients receive question marks — which looks like a Nabadat fault and is not one. This is the single
              most common failure in a bring-your-own-gateway setup.
            </Alert>
          </CardB>
        </Card>
        <Card>
          <CardH title="Reading the response" desc="How Nabadat decides whether a message was accepted, and where it finds the reference to track it by." />
          <CardB>
            <Grid2>
              <Fld label={<>Success HTTP codes<span className="ms-0.5 text-destructive">*</span></>} hint="Comma separated. Anything else counts as a failure.">
                <Input value={cfg.okCodes} onChange={(e) => setCfg({ okCodes: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label="Message reference path" hint="Dotted path into the JSON response. Without a reference, delivery status cannot be tracked at all.">
                <Input value={cfg.idPath} onChange={(e) => setCfg({ idPath: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
            </Grid2>
            <Grid2>
              <Fld label="Success field" hint="Optional. Many gateways return HTTP 200 with a failure in the body — this is how that is caught.">
                <Input value={cfg.okPath} onChange={(e) => setCfg({ okPath: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label="Expected value">
                <Input value={cfg.okValue} onChange={(e) => setCfg({ okValue: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
            </Grid2>
            <Alert kind="warn">
              <b>A 200 is not an acceptance.</b> Without a success field, a gateway that answers{" "}
              <CodeChip>200 {'{"status":"rejected"}'}</CodeChip> would be recorded as sent, and the customer would appear
              to have ignored a survey they never received.
            </Alert>
          </CardB>
        </Card>
      </div>
      <div className="space-y-[18px]">
        <Card>
          <CardH title="Request preview" />
          <CardB>
            <HttpPreview cfg={cfg} />
          </CardB>
        </Card>
        <Card>
          <CardH title="Delivery status" desc='Optional, and the honest answer is often "not available".' />
          <CardB>
            <Fld label="Method">
              <Sel value={cfg.statusMode} onChange={(e) => setCfg({ statusMode: e.target.value })}>
                <option value="callback">Your gateway calls Nabadat</option>
                <option value="poll">Nabadat polls your gateway</option>
                <option value="none">No delivery status available</option>
              </Sel>
            </Fld>
            {cfg.statusMode === "callback" && (
              <>
                <Fld label="Callback URL for your gateway" hint="Configure this in your gateway. It must send the message reference and a status.">
                  <RoInput value="https://api.nabadat.jo/v1/channels/sms/tenant-dlr" className="font-mono" dir="ltr" />
                </Fld>
                <Fld
                  label="Shared secret"
                  hint={<>Sent as <CodeChip>X-Nabadat-Signature</CodeChip>. Unsigned callbacks are rejected, so anyone cannot mark your messages delivered.</>}
                >
                  <RoInput type="password" value="••••••••" className="font-mono" dir="ltr" />
                </Fld>
              </>
            )}
            {cfg.statusMode === "none" && (
              <Alert kind="info">
                Without status, the request record stops at <b>Submitted</b> for this channel and delivery rate is not
                reported. <b>Link opened</b> becomes the only evidence a customer received anything — the same position
                the A2A WhatsApp route is in.
              </Alert>
            )}
          </CardB>
        </Card>
        <Card>
          <CardH title="Network & limits" desc="What you need to allow, and what you are telling Nabadat it can do." />
          <CardB>
            <Fld label="Allow these Nabadat egress addresses" hint="Add both to your gateway's allowlist. They are static; you will be notified 30 days before any change.">
              <RoInput value="185.42.10.14, 185.42.10.15" className="font-mono" dir="ltr" />
            </Fld>
            <Grid2>
              <Fld label="Declared send rate" hint="Nabadat stays under this. Set it below your real ceiling.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" value={cfg.rate} onChange={(e) => setCfg({ rate: +e.target.value })} className="flex-1" />
                  <span className="text-xs text-muted-foreground">per second</span>
                </div>
              </Fld>
              <Fld label="TLS" hint="Self-signed certificates are rejected in production.">
                <RoInput value="Required · certificate validated" />
              </Fld>
            </Grid2>
          </CardB>
        </Card>
        <Card>
          <CardH title="Who is responsible for what" desc="This route moves several obligations to you." />
          <CardB className="pt-1">
            <Mechanic n="1" title="Cost and billing">Your provider bills you directly. Nabadat does not meter or invoice SMS on this route, and cannot show you a cost.</Mechanic>
            <Mechanic n="2" title="Sender registration">Your sender identity and its per-country registration stay with your operator contracts.</Mechanic>
            <Mechanic n="3" title="Throughput">Your gateway's capacity is the ceiling. Nabadat queues behind it rather than around it.</Mechanic>
            <Mechanic n="4" title="Availability">A gateway outage becomes an M-02 dispatch backlog. Messages older than the stale window are dropped rather than sent late.</Mechanic>
            <Mechanic n="5" title="Opt-out keywords">If your gateway processes STOP, that event needs to reach M-03 to be honoured. Nabadat cannot see it otherwise.</Mechanic>
          </CardB>
        </Card>
      </div>
    </div>
  )
}

function HttpPreview({ cfg }: { cfg: SmsOwn }) {
  // Built as an object (like the reference): recipient + message are ALWAYS mapped, so when
  // their field names are blank both collapse to a single empty-key line, and an empty config
  // previews as `{ "": "…message…" }` rather than an empty body.
  const map: Record<string, string> = {}
  map[cfg.fTo] = "962790000312"
  map[cfg.fText] = SAMPLE_MSG
  if (cfg.fSender.trim()) map[cfg.fSender] = "NABADAT"
  if (cfg.uniMode !== "none" && cfg.uniField.trim()) map[cfg.uniField] = cfg.uniValue
  let extra: Record<string, unknown> = {}
  try {
    extra = cfg.extra.trim() ? JSON.parse(cfg.extra) : {}
  } catch {
    extra = { "//": "invalid JSON in additional parameters" }
  }
  for (const [k, v] of Object.entries(extra)) map[k] = String(v)
  const fields = Object.entries(map)
  const authLine =
    cfg.auth === "none" ? null : cfg.auth === "basic" ? "Authorization: Basic ••••••••" : cfg.auth === "bearer" ? "Authorization: Bearer ••••••••" : "X-API-Key: ••••••••"
  const clip = (s: string, n = 44) => (s.length > n ? s.slice(0, n) + "…" : s)
  return (
    <>
      <Endpoint method={cfg.method} url={cfg.url || "—"}>
        {authLine && (
          <>
            <EpComment>{authLine}</EpComment>
            {"\n"}
          </>
        )}
        {cfg.method === "GET" || cfg.ctype === "query" ? (
          <>
            <EpComment>// query string</EpComment>
            {"\n?"}
            {fields.map(([k, v], i) => (
              <span key={i}>
                {i > 0 && "&"}
                {encodeURIComponent(k)}={clip(encodeURIComponent(v), 28)}
              </span>
            ))}
          </>
        ) : cfg.ctype === "application/x-www-form-urlencoded" ? (
          <>
            <EpComment>Content-Type: application/x-www-form-urlencoded</EpComment>
            {"\n"}
            {fields.map(([k, v], i) => (
              <span key={i}>
                {i > 0 && "&"}
                <EpKey>{k}</EpKey>=<EpVal>{clip(v)}</EpVal>
              </span>
            ))}
          </>
        ) : (
          <>
            <EpComment>Content-Type: application/json</EpComment>
            {"\n{\n"}
            {fields.map(([k, v], i) => (
              <span key={i}>
                {"  "}
                <EpKey>"{k}"</EpKey>: <EpVal>"{clip(v)}"</EpVal>
                {i < fields.length - 1 ? ",\n" : "\n"}
              </span>
            ))}
            {"}"}
          </>
        )}
      </Endpoint>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Built live from the mapping. <CodeChip>{"{recipient}"}</CodeChip>, <CodeChip>{"{message}"}</CodeChip> and{" "}
        <CodeChip>{"{sender}"}</CodeChip> are filled by Nabadat at dispatch — the message text already has its{" "}
        <span className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-[10.5px] text-nb-cyan-800 dark:bg-nb-cyan-900/45 dark:text-nb-cyan-200">
          [Parameters]
        </span>{" "}
        resolved and its survey link inserted.
      </p>
    </>
  )
}

function SmppPanel({ cfg, setCfg }: { cfg: SmsOwn; setCfg: (p: Partial<SmsOwn>) => void }) {
  const uni = !cfg.coding.startsWith("0")
  const parts = uni ? Math.ceil(SAMPLE_MSG.length / 67) : Math.ceil(SAMPLE_MSG.length / 153)
  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">
      <div className="space-y-[18px]">
        <Card>
          <CardH title="Bind" desc="The credentials and session type Nabadat uses to connect to your SMSC." />
          <CardB>
            <Grid3>
              <Fld label={<>Host<span className="ms-0.5 text-destructive">*</span></>}>
                <Input value={cfg.smppHost} onChange={(e) => setCfg({ smppHost: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label={<>Port<span className="ms-0.5 text-destructive">*</span></>} hint="2775 plain · 3550 over TLS.">
                <Input type="number" value={cfg.smppPort} onChange={(e) => setCfg({ smppPort: +e.target.value })} />
              </Fld>
              <Fld label="Transport" hint="Plain TCP is only acceptable inside a VPN.">
                <Sel value={cfg.smppTls ? "TLS" : "Plain TCP"} onChange={(e) => setCfg({ smppTls: e.target.value === "TLS" })}>
                  <option>TLS</option>
                  <option>Plain TCP</option>
                </Sel>
              </Fld>
            </Grid3>
            <Grid3>
              <Fld label={<>system_id<span className="ms-0.5 text-destructive">*</span></>} hint="Max 15 characters in SMPP 3.4.">
                <Input value={cfg.smppSystemId} onChange={(e) => setCfg({ smppSystemId: e.target.value })} className="font-mono" dir="ltr" />
              </Fld>
              <Fld label="password" hint="Max 8 characters — an SMPP constraint, not ours.">
                <RoInput type="password" value="••••••••" className="font-mono" dir="ltr" />
              </Fld>
              <Fld label="system_type">
                <Input value={cfg.smppType} onChange={(e) => setCfg({ smppType: e.target.value })} placeholder="optional" className="font-mono" dir="ltr" />
              </Fld>
            </Grid3>
            <Grid3>
              <Fld
                label="Bind type"
                hint={
                  cfg.smppBind === "transmitter"
                    ? "Transmitter cannot receive delivery receipts. Choose transceiver unless your SMSC requires a separate receiver bind."
                    : "Sends and receives on one session, so receipts arrive without a second connection."
                }
              >
                <Sel value={cfg.smppBind} onChange={(e) => setCfg({ smppBind: e.target.value })}>
                  <option value="transceiver">transceiver</option>
                  <option value="transmitter">transmitter</option>
                </Sel>
              </Fld>
              <Fld label="Window size" hint="Unacknowledged PDUs in flight. Too high and a stalled SMSC silently loses messages.">
                <Input type="number" value={cfg.smppWin} onChange={(e) => setCfg({ smppWin: +e.target.value })} />
              </Fld>
              <Fld label="Submit rate" hint="Agree this with your SMSC — exceeding it gets the bind throttled or dropped.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" value={cfg.smppTps} onChange={(e) => setCfg({ smppTps: +e.target.value })} className="flex-1" />
                  <span className="text-xs text-muted-foreground">/ sec</span>
                </div>
              </Fld>
            </Grid3>
            {cfg.smppBind === "transmitter" && (
              <Alert kind="warn">
                A transmitter-only bind means <b>no delivery receipts at all</b> — the request record stops at Submitted
                for this channel and link-opened becomes the only evidence a customer received anything.
              </Alert>
            )}
          </CardB>
        </Card>
        <Card>
          <CardH title="Addressing" desc="TON and NPI decide whether the operator accepts your sender and your recipient at all. Wrong values fail everything, uniformly." />
          <CardB>
            <Grid2>
              <Fld label="source_addr_ton" hint="Alphanumeric for a text sender such as NABADAT; International for a numeric long code.">
                <Sel value={cfg.srcTon} onChange={(e) => setCfg({ srcTon: e.target.value })}>
                  <option>5 — Alphanumeric</option>
                  <option>1 — International</option>
                  <option>0 — Unknown</option>
                </Sel>
              </Fld>
              <Fld label="source_addr_npi" hint="0 is correct alongside an alphanumeric TON.">
                <Sel value={cfg.srcNpi} onChange={(e) => setCfg({ srcNpi: e.target.value })}>
                  <option>0 — Unknown</option>
                  <option>1 — ISDN/E.164</option>
                </Sel>
              </Fld>
            </Grid2>
            <Grid2>
              <Fld label="dest_addr_ton" hint="Recipients are always submitted in international form.">
                <Sel value={cfg.dstTon} onChange={(e) => setCfg({ dstTon: e.target.value })}>
                  <option>1 — International</option>
                  <option>0 — Unknown</option>
                </Sel>
              </Fld>
              <Fld label="dest_addr_npi">
                <Sel value={cfg.dstNpi} onChange={(e) => setCfg({ dstNpi: e.target.value })}>
                  <option>1 — ISDN/E.164</option>
                  <option>0 — Unknown</option>
                </Sel>
              </Fld>
            </Grid2>
            <Alert kind="info">
              An alphanumeric source address cannot receive a reply, exactly as on the HTTP route — so SMPP does not close
              the STOP-keyword gap either. Inbound <CodeChip>deliver_sm</CodeChip> messages that are not receipts are
              logged and dropped unless you ask for them to be forwarded to M-03.
            </Alert>
          </CardB>
        </Card>
        <Card>
          <CardH title="Encoding and long messages" desc="Where Arabic surveys are won or lost on SMPP." />
          <CardB>
            <Grid2>
              <Fld label="data_coding" hint={<>Arabic requires <CodeChip>data_coding 8</CodeChip>. Submitting Arabic as 0 delivers question marks.</>}>
                <Sel value={cfg.coding} onChange={(e) => setCfg({ coding: e.target.value })}>
                  <option value="auto">auto — 0 for GSM-7, 8 for UCS-2</option>
                  <option value="0 — GSM-7 always">0 — GSM-7 always</option>
                  <option value="8 — UCS-2 always">8 — UCS-2 always</option>
                </Sel>
              </Fld>
              <Fld label="Long messages" hint="UDH concatenation is universally supported; the TLV is cleaner but not every SMSC honours it.">
                <Sel value={cfg.longMsg} onChange={(e) => setCfg({ longMsg: e.target.value })}>
                  <option value="udh">udh</option>
                  <option value="tlv">message_payload TLV</option>
                </Sel>
              </Fld>
            </Grid2>
            <Grid2>
              <Fld label="registered_delivery" hint="1 is the right default: one receipt per message, no intermediate noise.">
                <Sel value={cfg.dlr} onChange={(e) => setCfg({ dlr: e.target.value })}>
                  <option>1 — final state only</option>
                  <option>2 — final state and intermediate</option>
                  <option>0 — no receipt</option>
                </Sel>
              </Fld>
              <Fld label="enquire_link interval" hint="The keep-alive. Without it a half-open TCP session accepts submissions that go nowhere.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" value={cfg.enquire} onChange={(e) => setCfg({ enquire: +e.target.value })} />
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
              </Fld>
            </Grid2>
            <Alert kind="warn">
              <b>The silent-failure mode of SMPP.</b> A bind can look alive while the SMSC has stopped processing. The
              keep-alive plus an alert when no receipt has arrived for a set period is the only reliable detection, and it
              belongs in the platform health checks, not in this screen.
            </Alert>
          </CardB>
        </Card>
      </div>
      <div className="space-y-[18px]">
        <Card>
          <CardH title="submit_sm preview" />
          <CardB>
            <Endpoint method="PDU" url={`submit_sm · bind_${cfg.smppBind}`}>
              <EpKey>source_addr_ton</EpKey>: <EpVal>{cfg.srcTon.split(" ")[0]}</EpVal> <EpKey>source_addr_npi</EpKey>:{" "}
              <EpVal>{cfg.srcNpi.split(" ")[0]}</EpVal>
              {"\n"}
              <EpKey>source_addr</EpKey>: <EpVal>"NABADAT"</EpVal>
              {"\n"}
              <EpKey>dest_addr_ton</EpKey>: <EpVal>{cfg.dstTon.split(" ")[0]}</EpVal> <EpKey>dest_addr_npi</EpKey>:{" "}
              <EpVal>{cfg.dstNpi.split(" ")[0]}</EpVal>
              {"\n"}
              <EpKey>destination_addr</EpKey>: <EpVal>"962790000312"</EpVal>
              {"\n"}
              <EpKey>data_coding</EpKey>: <EpVal>{uni ? "8" : "0"}</EpVal> <EpComment>// {uni ? "UCS-2 — Arabic" : "GSM-7"}</EpComment>
              {"\n"}
              <EpKey>registered_delivery</EpKey>: <EpVal>{cfg.dlr.split(" ")[0]}</EpVal>
              {"\n"}
              <EpKey>short_message</EpKey>: <EpVal>"{SAMPLE_MSG.slice(0, 46)}…"</EpVal>
              {"\n"}
              <EpComment>// {SAMPLE_MSG.length} characters · {parts} PDU{parts === 1 ? "" : "s"} · {uni ? "67" : "153"} per part</EpComment>
            </Endpoint>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Long messages are split by Nabadat into {parts} concatenated PDU{parts === 1 ? "" : "s"} — unlike the HTTP
              route, where the gateway concatenates. The receipt returns one message ID per PDU, all belonging to the same
              invitation attempt.
            </p>
          </CardB>
        </Card>
        <Card>
          <CardH title="Delivery receipts" desc="On SMPP there is nothing to configure — receipts arrive on the session Nabadat already holds." />
          <CardB className="pt-1">
            <Mechanic n="1" title="deliver_sm carries the receipt">
              The SMSC pushes it to the bound session, referencing the message ID returned by <CodeChip>submit_sm_resp</CodeChip>. No callback URL, no polling.
            </Mechanic>
            <Mechanic n="2" title="Receipts are text, not structured">
              The body is a conventional string — <CodeChip>id: stat: err:</CodeChip> — and its exact shape varies by SMSC.
              The parser has to be configured per gateway, and confirmed during verification.
            </Mechanic>
            <Mechanic n="3" title="stat is the status">
              <CodeChip>DELIVRD</CodeChip>, <CodeChip>UNDELIV</CodeChip>, <CodeChip>EXPIRED</CodeChip>,{" "}
              <CodeChip>REJECTD</CodeChip>. Only the first is a delivery; the rest tell M-02 whether to fall back or flag the contact.
            </Mechanic>
            <Mechanic n="4" title="Receipts can outlive the session">
              A reconnect must not lose them. Message IDs are stored against the invitation attempt so a receipt arriving
              after a reconnect still matches.
            </Mechanic>
          </CardB>
        </Card>
        <Card>
          <CardH title="Network & limits" />
          <CardB>
            <Fld label="Allow these Nabadat egress addresses" hint="Add both to your SMSC allowlist. SMPP binds from an unlisted address are refused.">
              <RoInput value="185.42.10.14, 185.42.10.15" className="font-mono" dir="ltr" />
            </Fld>
            <Grid2>
              <Fld label="Reconnect backoff" hint="Capped so a long SMSC outage does not become a reconnect storm.">
                <RoInput value="5s, 15s, 60s, then every 5 min" />
              </Fld>
              <Fld label="Queue behaviour" hint="Messages wait for the bind rather than failing, until the stale window on Limits & retries expires.">
                <RoInput value="Hold in the dispatch queue" />
              </Fld>
            </Grid2>
          </CardB>
        </Card>
        <Card>
          <CardH title="Who is responsible for what" />
          <CardB className="pt-1">
            <Mechanic n="1" title="Cost and billing">Your SMSC or operator bills you directly. Nabadat does not meter or invoice SMS on this route.</Mechanic>
            <Mechanic n="2" title="Sender registration">Your sender identity and its per-country registration stay with your operator contracts.</Mechanic>
            <Mechanic n="3" title="Throughput">The agreed submit rate and window are your SMSC's limits. Nabadat queues behind them.</Mechanic>
            <Mechanic n="4" title="Receipt format">
              The receipt string is your SMSC's convention; its parser is configured during verification and is a shared
              operational dependency afterwards.
            </Mechanic>
            <Mechanic n="5" title="Opt-out keywords">
              Alphanumeric senders cannot receive replies. If your platform processes STOP, that event still needs to
              reach M-03 to be honoured.
            </Mechanic>
          </CardB>
        </Card>
      </div>
    </div>
  )
}

function VerifyCard({ status, onVerify, cfg }: { status: SmsStatus; onVerify: () => void; cfg: SmsOwn }) {
  const gaps = smsGaps(cfg)
  return (
    <Card className="mt-[18px]">
      <CardH title="Verify and activate" desc="Verification sends one real message to an address you control and checks the whole path end to end." />
      <CardB>
        <Grid2>
          <Fld label="Verification recipient" hint="A number you can read. The message is billable on the Nabadat route.">
            <Input defaultValue="+962 79 000 0312" dir="ltr" />
          </Fld>
          <Fld label="What is checked">
            <div className="flex flex-col gap-1.5 pt-1.5">
              {[
                "The endpoint accepts the request and returns a success response",
                "A message reference can be extracted for status tracking",
                "A delivery status is received by the configured method",
                "The survey link opens and resolves to the right survey",
              ].map((t) => (
                <span key={t} className="text-[11px] text-muted-foreground">
                  · {t}
                </span>
              ))}
            </div>
          </Fld>
        </Grid2>
        {gaps.length ? (
          <Alert kind="warn">
            <b>Not ready to verify.</b> {gaps.map((x) => x.replace(/\.$/, "")).join("; ")}.
          </Alert>
        ) : (
          <Alert kind="ok">
            {status === "verified"
              ? "This route is verified. Re-running verification re-checks the whole path end to end."
              : "Configuration is complete. Verification is the last step before the channel can be enabled."}
          </Alert>
        )}
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <Button onClick={onVerify}>Verify route</Button>
          <Button variant="outline" onClick={() => toast("Configuration saved as a draft. The channel stays disabled until the route is verified.")}>
            Save draft
          </Button>
        </div>
      </CardB>
    </Card>
  )
}

