// M-02 module store — the mutable state the mockup kept in globals (rules,
// templates, channels, settings, requests), lifted into a React context so every
// screen reads and mutates one source of truth.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { CHAN_TYPES, SEND, chanBase } from "./data/reference"
import { EMAIL_DEFAULTS, SEED_REQUESTS, SEED_RULES, SEED_SETTINGS, SEED_TEMPLATES } from "./data/records"
import { normalizeRules, renumber, sendName } from "./data/helpers"
import type { RequestRow, Rule, SendChannel, Settings, Template } from "./data/types"

interface Ctx {
  channels: Record<string, SendChannel>
  rules: Rule[]
  templates: Template[]
  requests: RequestRow[]
  settings: Settings
  emailDefaults: { subject: string; preheader: string }
  toggleChannel: (key: string, on: boolean) => void
  toggleRule: (id: number, on: boolean) => void
  duplicateRule: (id: number) => void
  reorderRules: (fromId: number, toId: number) => void
  saveRule: (rule: Rule) => void
  saveTemplate: (idx: number, tpl: Template) => void
  setSettings: (s: Settings) => void
  setEmailDefaults: (d: { subject: string; preheader: string }) => void
  setChannel: (key: string, patch: Partial<SendChannel>) => void
  /** Create a channel of `type` (disabled), returning its new key. */
  createChannel: (type: string, name: string, prov: string) => string
}

const ChannelsCtx = createContext<Ctx | null>(null)

export function ChannelsProvider({ children }: { children: ReactNode }) {
  const [channels, setChannels] = useState<Record<string, SendChannel>>(() =>
    Object.fromEntries(Object.entries(SEND).map(([k, v]) => [k, { ...v }])),
  )
  const [templates, setTemplates] = useState<Template[]>(() => SEED_TEMPLATES.map((t) => ({ ...t })))
  const [rules, setRules] = useState<Rule[]>(() => normalizeRules(SEED_RULES, SEED_TEMPLATES))
  const [requests] = useState<RequestRow[]>(() => SEED_REQUESTS.map((r) => ({ ...r })))
  const [settings, setSettingsState] = useState<Settings>(() => ({ ...SEED_SETTINGS, link: { ...SEED_SETTINGS.link } }))
  const [emailDefaults, setEmailDefaultsState] = useState({ ...EMAIL_DEFAULTS })

  const value = useMemo<Ctx>(() => {
    // Side effects (toast, id allocation, renumber) run here, NOT inside the
    // setState updaters — StrictMode double-invokes updaters in dev, which would
    // fire every toast twice. Each action computes the next value from the current
    // closure state, toasts once, then commits a concrete value.
    const nextRuleId = () => Math.max(6, ...rules.map((r) => r.id)) + 1

    const toggleChannel = (key: string, on: boolean) => {
      const c = channels[key]
      // An SMS channel can only be enabled once its delivery route is verified — matches
      // the reference onboarding gate (a rule cannot select an unverified SMS channel).
      if (on && chanBase(key) === "sms" && (c.smsStatus ?? "verified") !== "verified") {
        toast(
          `${c.name} cannot be enabled yet — SMS onboarding is ${
            (c.smsStatus ?? "not_started") === "not_started" ? "not started" : "incomplete"
          }. Choose a delivery route and verify it on the channel's Provider & compliance tab first.`,
        )
        return
      }
      const used = rules.filter((r) => r.send === key && r.st === "enabled")
      toast(
        on
          ? `${c.name} enabled — available to trigger rules immediately.`
          : `${c.name} disabled. ${used.length} enabled rule${used.length === 1 ? "" : "s"} use it as the primary channel and will fall back where a fallback is set.`,
      )
      setChannels((prev) => ({ ...prev, [key]: { ...prev[key], st: on } }))
    }
    const setChannel = (key: string, patch: Partial<SendChannel>) =>
      setChannels((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

    const createChannel = (type: string, name: string, prov: string) => {
      // unique key: type, then type-2, type-3… (matches the mockup's createChan).
      let key = type
      let n = 2
      while (SEND[key]) key = `${type}-${n++}`
      const t = CHAN_TYPES[type]
      const ch: SendChannel = {
        key,
        name,
        mode: t.mode,
        capture: t.capture,
        prov: prov.trim() || "Not configured",
        st: false,
        sent: 0,
        del: 0,
        resp: 0,
        contact: t.contact,
        icon: t.icon as SendChannel["icon"],
        base: type,
        // A new SMS channel has no delivery route yet — it must be onboarded (route chosen
        // + verified on the Provider & compliance tab) before it shows config or can enable.
        ...(type === "sms" ? { smsRoute: "" as const, smsStatus: "not_started" as const } : {}),
      }
      // Register on the module SEND map too, so chanBase/sendName/channelOrder/
      // liveChannels (which read SEND) see the new channel.
      SEND[key] = ch
      toast(`${name} created and disabled. Configure the provider and templates, send a test, then enable it — only then can a rule select it.`)
      setChannels((prev) => ({ ...prev, [key]: ch }))
      return key
    }

    const toggleRule = (id: number, on: boolean) => {
      const r = rules.find((x) => x.id === id)
      if (r) toast(`Rule “${r.name}” ${on ? "enabled — evaluated from the next transaction" : "disabled — skipped during evaluation"}.`)
      setRules((prev) => prev.map((x) => (x.id === id ? { ...x, st: (on ? "enabled" : "disabled") as Rule["st"] } : x)))
    }

    const duplicateRule = (id: number) => {
      const i = rules.findIndex((r) => r.id === id)
      if (i < 0) return
      const copy: Rule = {
        ...(JSON.parse(JSON.stringify(rules[i])) as Rule),
        id: nextRuleId(),
        name: rules[i].name + " (copy)",
        st: "disabled",
        trig: 0,
        sent: 0,
        upd: "just now · Sara A.",
      }
      const next = [...rules]
      next.splice(i + 1, 0, copy)
      renumber(next)
      toast("Duplicated as an Off rule. Edit and save to enable.")
      setRules(next)
    }

    const reorderRules = (fromId: number, toId: number) => {
      const a = rules.find((r) => r.id === fromId)
      const b = rules.find((r) => r.id === toId)
      if (!a || !b) return
      if (a.ch !== b.ch) {
        toast("Priority is ordered within one service channel — move the rule to that channel first.")
        return
      }
      const fromIdx = rules.findIndex((r) => r.id === fromId)
      const toIdx = rules.findIndex((r) => r.id === toId)
      const next = rules.filter((r) => r.id !== fromId)
      const bi = next.findIndex((r) => r.id === toId)
      next.splice(bi + (fromIdx < toIdx ? 1 : 0), 0, a)
      renumber(next)
      toast(`“${a.name}” is now priority ${a.p} on ${b.ch}.`)
      setRules(next)
    }

    const saveRule = (rule: Rule) => {
      const i = rules.findIndex((r) => r.id === rule.id)
      const replacing = i >= 0
      const next = [...rules]
      if (replacing) next[i] = { ...next[i], ...rule }
      else next.push({ ...rule, id: nextRuleId() })
      renumber(next)
      toast(
        replacing
          ? `Rule “${rule.name}” saved. The previous configuration is replaced — rules are not versioned.`
          : `Rule “${rule.name}” saved${rule.st === "enabled" ? " and enabled" : " and left disabled"}.`,
      )
      setRules(next)
    }

    const saveTemplate = (idx: number, tpl: Template) => {
      const next = [...templates]
      if (idx >= 0) next[idx] = tpl
      else next.push(tpl)
      toast(`Template “${tpl.n}” saved.`)
      setTemplates(next)
    }
    const setSettings = (s: Settings) => setSettingsState(s)
    const setEmailDefaults = (d: { subject: string; preheader: string }) => setEmailDefaultsState(d)
    return {
      channels,
      rules,
      templates,
      requests,
      settings,
      emailDefaults,
      toggleChannel,
      toggleRule,
      duplicateRule,
      reorderRules,
      saveRule,
      saveTemplate,
      setSettings,
      setEmailDefaults,
      setChannel,
      createChannel,
    }
  }, [channels, rules, templates, requests, settings, emailDefaults])

  return <ChannelsCtx.Provider value={value}>{children}</ChannelsCtx.Provider>
}

export function useChannels() {
  const ctx = useContext(ChannelsCtx)
  if (!ctx) throw new Error("useChannels must be used within ChannelsProvider")
  return ctx
}

export { sendName }
