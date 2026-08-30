// Screen 2 — Channel setup. Hero + four tabs (Delivery mechanics · Response capture
// · Provider & compliance · Limits & retries). Only live channels are reachable;
// SMS and Email carry their own tab content, and Delivery appends the shared link +
// quiet-hours cards.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
import { ChevronLeft, Send } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { chanBase, isSoon } from "../data/reference"
import { fmtN } from "../data/helpers"
import { useChannels } from "../store"
import { Bdg, ChanIcon, CodeChip } from "../components/ui-bits"
import { LinkCard, QuietCard } from "../components/channel-setup/bits"
import { SMS_OWN_DEFAULT, SMS_OWN_EMPTY, SmsCapture, SmsDelivery, SmsProvider, smsGaps, type SmsRoute, type SmsStatus } from "../components/channel-setup/SmsSetup"
import { EmailCapture, EmailDelivery, EmailProvider, GenericLimits } from "../components/channel-setup/EmailSetup"
import { TestSendModal } from "../components/TestSendModal"

const TABS = [
  ["delivery", "Delivery mechanics"],
  ["capture", "Response capture"],
  ["provider", "Provider & compliance"],
  ["limits", "Limits & retries"],
] as const
type TabKey = (typeof TABS)[number][0]

export default function ChannelSetupPage() {
  const { key = "" } = useParams()
  const navigate = useNavigate()
  const { channels, toggleChannel, setChannel } = useChannels()
  const [tab, setTab] = useState<TabKey>("delivery")
  // A verified (seeded) SMS channel opens with a full gateway config; a freshly created one
  // opens BLANK, so its request preview is empty and its Verify card lists the gaps to fill.
  const [smsCfg, setSmsCfg] = useState(() =>
    (channels[key]?.smsStatus ?? "verified") === "verified" ? SMS_OWN_DEFAULT : SMS_OWN_EMPTY,
  )
  const [testOpen, setTestOpen] = useState(false)
  // Reset the local gateway config when switching to a different channel (no remount happens).
  const prevKeyRef = useRef(key)
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      setSmsCfg((channels[key]?.smsStatus ?? "verified") === "verified" ? SMS_OWN_DEFAULT : SMS_OWN_EMPTY)
    }
  }, [key, channels])

  const c = channels[key]
  if (!c || isSoon(key, chanBase(key))) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">This channel is not available to configure.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/distribution")}>
          Back to sending channels
        </Button>
      </div>
    )
  }
  const base = chanBase(key)
  // SMS onboarding state lives on the channel record: a new channel has no route yet, so its
  // Delivery/Capture tabs show an empty state and the Provider tab is the onboarding surface.
  const smsRoute = (c.smsRoute ?? "own") as SmsRoute
  const smsStatus = (c.smsStatus ?? "verified") as SmsStatus
  const chooseRoute = (m: "own" | "nabadat") => {
    if (smsRoute === m) return
    setChannel(key, {
      smsRoute: m,
      smsStatus: "in_progress",
      prov: m === "own" ? "Tenant gateway · sms.tenant.gov.jo" : "Access to Arabia · short name NABADAT",
    })
    toast(
      m === "own"
        ? "Route set to your own SMS gateway. Nabadat will deliver surveys by calling your HTTP endpoint — configure it below, then verify."
        : "Route set to Nabadat's gateway. Configure your short names and countries below, then verify.",
    )
  }
  const verifyRoute = () => {
    const gaps = smsGaps(smsCfg)
    if (gaps.length) {
      toast(`Verification failed — ${gaps[0]} The route is no longer verified and sending is suspended.`)
      return
    }
    setChannel(key, { smsStatus: "verified" })
    toast("SMS onboarding verified. The channel can now be enabled and selected by trigger rules.")
  }

  const renderTab = () => {
    if (base === "sms") {
      if (tab === "delivery")
        return (
          <>
            <SmsDelivery cfg={smsCfg} route={smsRoute} status={smsStatus} onGotoProvider={() => setTab("provider")} />
            <LinkCard onEditSettings={() => navigate("/settings")} />
            <QuietCard channelKey={key} onEditSettings={() => navigate("/settings")} />
          </>
        )
      if (tab === "capture") return <SmsCapture route={smsRoute} status={smsStatus} onGotoProvider={() => setTab("provider")} />
      if (tab === "provider")
        return (
          <SmsProvider
            cfg={smsCfg}
            setCfg={(patch) => setSmsCfg((p) => ({ ...p, ...patch }))}
            route={smsRoute}
            status={smsStatus}
            onChooseRoute={chooseRoute}
            onVerify={verifyRoute}
          />
        )
      return <GenericLimits channelName={c.name} />
    }
    // email
    if (tab === "delivery")
      return (
        <>
          <EmailDelivery />
          <LinkCard onEditSettings={() => navigate("/settings")} />
          <QuietCard channelKey={key} onEditSettings={() => navigate("/settings")} />
        </>
      )
    if (tab === "capture") return <EmailCapture />
    if (tab === "provider") return <EmailProvider />
    return <GenericLimits channelName={c.name} />
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/distribution")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
        <ChevronLeft className="size-3.5" />
        Back to sending channels
      </button>

      {/* Hero */}
      <div className="flex items-start gap-3.5 rounded-lg border border-border bg-card px-5 py-4 shadow-sm dark:shadow-none">
        <span className="grid size-11 place-items-center rounded-md bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
          <ChanIcon icon={c.icon} className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-[19px] font-bold">{c.name}</h1>
            <Bdg tone={c.st ? "d2" : "mute"}>{c.st ? "Enabled" : "Disabled"}</Bdg>
            <CodeChip>nbdt.jo/app/channels/{key}</CodeChip>
          </div>
          <div className="mt-2 flex flex-wrap gap-[18px]">
            <Meta label="Provider" value={c.prov} />
            <Meta label="Contact field" value={<span className="font-mono text-[11.5px]">{c.contact}</span>} />
            <Meta label="Sent · 7 d" value={c.sent ? fmtN(c.sent) : "—"} />
            <Meta label="Response rate" value={c.resp ? `${c.resp.toFixed(1)}%` : "—"} />
          </div>
        </div>
        <Switch checked={c.st} onCheckedChange={(v) => toggleChannel(key, v)} aria-label={`Enable ${c.name}`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex gap-2.5">
          <Button variant="secondary" onClick={() => setTestOpen(true)}>
            <Send className="size-4" />
            Send a test
          </Button>
          <Button onClick={() => toast("Channel settings saved. Rules using this channel pick up the change on the next dispatch.")}>
            Save changes
          </Button>
        </div>
      </div>

      <div>{renderTab()}</div>

      <TestSendModal open={testOpen} onClose={() => setTestOpen(false)} />
    </div>
  )
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="text-[11px] text-muted-foreground">
      {label}
      <b className="mt-0.5 block text-xs font-semibold text-foreground">{value}</b>
    </div>
  )
}
