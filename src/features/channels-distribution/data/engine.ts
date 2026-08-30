// M-02 evaluation engine — condition evaluation, dispatch guardrail checks, the
// rule simulator, and wizard step validation. Ported from the mockup's final funcs.

import { CH, LANGS, PD, SEND, VALS, chanBase, isNullCh, isSoon } from "./reference"
import {
  condText,
  fmtN,
  hh,
  humanMin,
  remMinutes,
  remOffset,
  sendName,
  srvActiveMin,
  srvLabel,
  summary,
  vLabel,
  outcomeText,
} from "./helpers"
import type { CondNode, ParamType, Rule, Settings, Template } from "./types"

// ---- quiet window ----
export function quietHours(set: Settings): boolean[] {
  return [...Array(24).keys()].map((h) =>
    set.qFrom <= set.qTo ? h >= set.qFrom && h < set.qTo : h >= set.qFrom || h < set.qTo,
  )
}
export const inQuiet = (hour: number, set: Settings) => quietHours(set)[hour]

// ---- condition evaluation ----
export function evalCond(c: { p: string; o: string; v: unknown[] }, pl: Record<string, unknown>): boolean {
  const t: ParamType = PD[c.p] ? PD[c.p].type : "text"
  const raw = pl[c.p]
  const empty = raw === undefined || raw === null || raw === ""
  if (c.o === "is empty") return empty
  if (c.o === "is not empty") return !empty
  if (empty) return false
  const S = (v: unknown) => String(v).toLowerCase()
  const ordinal = t === "range"
  const num = (v: unknown) =>
    ordinal
      ? (VALS[c.p] || []).findIndex((x) => x[0] === String(v))
      : t === "date" || t === "datetime"
        ? Date.parse(String(v))
        : parseFloat(String(v))
  switch (c.o) {
    case "is":
      return String(raw) === String(c.v[0])
    case "is not":
      return ["number", "decimal", "date", "datetime"].includes(t)
        ? num(raw) !== num(c.v[0])
        : String(raw) !== String(c.v[0])
    case "equal":
      return num(raw) === num(c.v[0])
    case "is any of":
      return c.v.map(String).includes(String(raw))
    case "is none of":
      return !c.v.map(String).includes(String(raw))
    case "is in":
      return c.v.map(S).includes(S(raw))
    case "is not in":
      return !c.v.map(S).includes(S(raw))
    case "contains":
      return S(raw).includes(S(c.v[0] ?? ""))
    case "does not contain":
      return !S(raw).includes(S(c.v[0] ?? ""))
    case "starts with":
      return S(raw).startsWith(S(c.v[0] ?? ""))
    case "ends with":
      return S(raw).endsWith(S(c.v[0] ?? ""))
    case "greater than":
      return num(raw) > num(c.v[0])
    case "greater than or equal":
      return num(raw) >= num(c.v[0])
    case "less than":
      return num(raw) < num(c.v[0])
    case "less than or equal":
      return num(raw) <= num(c.v[0])
    default:
      return false
  }
}
export function evalNode(n: CondNode, pl: Record<string, unknown>): boolean {
  if (!("g" in n)) return evalCond(n, pl)
  if (!n.ch.length) return true
  return n.op === "ALL" ? n.ch.every((x) => evalNode(x, pl)) : n.ch.some((x) => evalNode(x, pl))
}
export function explain(n: CondNode, pl: Record<string, unknown>): string | null {
  if (!("g" in n)) {
    if (evalCond(n, pl)) return null
    const actual = pl[n.p] === undefined ? "(missing)" : `“${VALS[n.p] ? vLabel(n.p, pl[n.p]) : pl[n.p]}”`
    return `${condText(n)} — actual value: ${actual}`
  }
  if (!n.ch.length) return null
  if (n.op === "ALL") {
    for (const x of n.ch) {
      const e = explain(x, pl)
      if (e) return e
    }
    return null
  }
  return n.ch.some((x) => evalNode(x, pl)) ? null : "none of the OR alternatives matched"
}

// ---- anonymity boundary (fallback / reminder cannot cross it) ----
export function anonClass(k: string): "null" | "anonymous" | "identifying" {
  if (isNullCh(k)) return "null"
  return ["device", "inapp"].includes(chanBase(k)) ? "anonymous" : "identifying"
}
export const anonLabel = (c: string) =>
  c === "anonymous" ? "structurally anonymous" : c === "null" ? "no delivery" : "identifying"

// ---- dispatch guardrail checks (used by the simulator) ----
export interface DispatchStage {
  stage: string
  own: "" | "m02" | "m03"
  ok: boolean
  held?: boolean
  dropped?: boolean
  note: string
}
export function dispatchChecks(
  r: Rule,
  when: Date,
  ctx: { optout?: boolean; fatigue?: boolean },
  set: Settings,
): DispatchStage[] {
  if (CH[r.ch]?.inS) {
    return [
      {
        stage: "In-session presentation",
        own: "",
        ok: true,
        note:
          "The survey is presented on the device in the same session the customer started. There is no dispatch, no consent check and no fatigue check — M-02 does not consult M-03 for an in-session presentation.",
      },
    ]
  }
  const out: DispatchStage[] = []
  out.push({
    stage: "Dispatch scheduled",
    own: "",
    ok: true,
    note: `Queued for ${r.delay[0]} ${r.delay[1]} after the transaction. The checks below run then, not now.`,
  })

  // quiet hours — channel's own window overrides the tenant window (D-6)
  const c = SEND[r.send]
  const hrs = when.getHours()
  const waive = !!r.ovr?.q
  const own = c?.quietOwn?.on ? c.quietOwn : null
  if (own) {
    const inOwn = own.from > own.to ? hrs >= own.from || hrs < own.to : hrs >= own.from && hrs < own.to
    out.push({
      stage: "Quiet hours",
      own: "m02",
      ok: !inOwn || waive,
      held: inOwn && !waive,
      note: inOwn
        ? waive
          ? `Inside ${sendName(r.send)}'s own window (${hh(own.from)}–${hh(own.to)}), waived by this rule.`
          : `Inside ${sendName(r.send)}'s own window (${hh(own.from)}–${hh(own.to)}), which overrides the tenant setting. Held until ${hh(own.to)}.`
        : `Outside ${sendName(r.send)}'s own window (${hh(own.from)}–${hh(own.to)}), which overrides the tenant setting.`,
    })
  } else {
    const q = inQuiet(hrs, set)
    const chIgnore = !!c?.ignoreQuiet
    out.push({
      stage: "Quiet hours",
      own: "m02",
      ok: !q || chIgnore || waive,
      held: q && !chIgnore && !waive,
      note: q
        ? chIgnore
          ? `Send time ${String(hrs).padStart(2, "0")}:00 is inside the quiet window, but ${sendName(r.send)} is configured to ignore quiet hours — sent immediately and tagged.`
          : waive
            ? `Send time ${String(hrs).padStart(2, "0")}:00 is inside the quiet window, but this rule waives it — sent immediately and tagged on the request record.`
            : `Send time ${String(hrs).padStart(2, "0")}:00 is inside the quiet window (${hh(set.qFrom)}–${hh(set.qTo)}). Held and released at ${hh(set.qTo)} — not dropped.`
        : `Send time ${String(hrs).padStart(2, "0")}:00 is inside the sending window.`,
    })
  }

  out.push({
    stage: "Opt-out",
    own: "m03",
    ok: !ctx.optout,
    dropped: !!ctx.optout,
    note: ctx.optout
      ? `This customer has withdrawn consent for ${sendName(r.send)}. Dropped — no rule can override it and no flag exists to try.`
      : `Delegated to M-03 and answered allow. Consent is re-read at this instant, so an opt-out during the delay is still caught.`,
  })

  const exempt = !!r.ovr?.f
  out.push({
    stage: "Grace and fatigue — decided by M-03",
    own: "m03",
    ok: !ctx.fatigue || exempt,
    dropped: ctx.fatigue && !exempt,
    note: ctx.fatigue
      ? exempt
        ? "Customer is inside a window; this rule requested an exemption and M-03 granted it. The exemption is recorded against the request."
        : "Suppressed by M-03. Both the grace windows and the fatigue caps are configured and evaluated in M-03, which holds the contact history. M-02 records the decision and the reason it returned."
      : "M-02 asked M-03 whether this customer may receive this survey now. M-03 answered allow, and the answer is recorded against the request.",
  })

  const stopped = out.find((x) => !x.ok)
  out.push({
    stage: "Channel adapter fires",
    own: "",
    ok: !stopped,
    note: stopped
      ? `Never reached — stopped at ${stopped.stage}.`
      : chanBase(r.send) === "sms"
        ? `Submitted to the tenant gateway. The provider reference is stored and polled until a terminal status arrives.`
        : `${sendName(r.send)} accepts the message. When the customer answers, M-04 stores the response.`,
  })
  return out
}

// ---- simulator ----
export interface SimTraceItem {
  dot: "ok" | "no" | "skip"
  priority: number
  name: string
  statusBadge: "Expired" | "Off" | ""
  text: string
}
export interface SimResult {
  parseError?: string
  decision: SimTraceItem[]
  matched: Rule | null
  outcome?: string
  dispatch?: DispatchStage[]
  blocker?: DispatchStage
  noRule?: boolean
}
export function runSimulation(
  payloadJson: string,
  serviceChannel: string,
  when: Date,
  day: string,
  ctx: { optout?: boolean; fatigue?: boolean },
  rules: Rule[],
  templates: Template[],
  set: Settings,
): SimResult {
  let pl: Record<string, unknown>
  try {
    pl = JSON.parse(payloadJson)
  } catch (e) {
    return { parseError: (e as Error).message, decision: [], matched: null }
  }
  const list = rules.filter((r) => r.ch === serviceChannel).sort((a, b) => a.p - b.p)
  const decision: SimTraceItem[] = []
  let matched: Rule | null = null
  for (const r of list) {
    let dot: "ok" | "no" | "skip" = "skip"
    let text = ""
    const badge: "Expired" | "Off" | "" = r.to && r.to < "2026-07-27" ? "Expired" : r.st !== "enabled" ? "Off" : ""
    if (matched) text = "Not evaluated — a higher-priority rule already matched (first match wins)."
    else if (r.st === "disabled") text = "Skipped — disabled."
    else if (r.from && day < r.from) text = `Skipped — outside the effective window (starts ${dmyLite(r.from)}).`
    else if (r.to && day > r.to) text = `Skipped — outside the effective window (ended ${dmyLite(r.to)}).`
    else if (evalNode(r.cond, pl)) {
      dot = "ok"
      text = `Matched — ${summary(r.cond)}. Evaluation stops here.`
      matched = r
    } else {
      dot = "no"
      text = `Not matched — ${explain(r.cond, pl) || "conditions not met"}.`
    }
    decision.push({ dot, priority: r.p, name: r.name, statusBadge: badge, text })
  }
  if (!matched) return { decision, matched: null, noRule: true }
  const outcome = outcomeText(matched, templates)
  const dispatch = dispatchChecks(matched, when, ctx, set)
  const blocker = dispatch.find((x) => !x.ok)
  return { decision, matched, outcome, dispatch, blocker }
}
const dmyLite = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

// ---- wizard validation ----
export function stepErrors(n: number, r: Rule, templates: Template[]): string[] {
  const e: string[] = []
  const inS = CH[r.ch]?.inS
  const nul = isNullCh(r.send)
  if (n === 1) {
    if (!r.name.trim()) e.push("Rule name is required.")
  }
  if (n === 3) {
    if (!r.survey) e.push("Choose a survey.")
    if (!inS && !nul) {
      if (!r.send) e.push("Choose a sending channel.")
      else if (isSoon(r.send, chanBase(r.send))) e.push(sendName(r.send) + " is coming soon and cannot be selected yet.")
      else if (!SEND[r.send]?.st) e.push(sendName(r.send) + " is currently disabled — enable it or pick another channel.")
      if (r.tpl === "" || r.tpl === null || r.tpl === undefined)
        e.push("Choose a message template for " + sendName(r.send) + " in " + (LANGS[r.lang] || "the selected language") + ".")
      if (r.fb && r.fb === r.send) e.push("The fallback channel cannot be the primary channel.")
      if (r.fb && isSoon(r.fb, chanBase(r.fb))) e.push(sendName(r.fb) + " is coming soon and cannot be used as a fallback.")
      if (r.fb && !isNullCh(r.send) && anonClass(r.fb) !== anonClass(r.send))
        e.push(`${sendName(r.fb)} is ${anonLabel(anonClass(r.fb))} but ${sendName(r.send)} is ${anonLabel(anonClass(r.send))} — a fallback may not cross an anonymity boundary.`)
    }
  }
  if (n === 4 && r.rem?.on && !inS && !nul) {
    if (!r.rem.ch) e.push("Choose a reminder channel.")
    if (!r.rem.v) e.push("Set how long after sending the reminder goes out.")
    if (r.rem.tpl === "" || r.rem.tpl === null || r.rem.tpl === undefined) e.push("Choose a reminder template.")
    if (r.rem.v && remMinutes(r.rem) >= srvActiveMin(r.survey))
      e.push(`The reminder is set for ${remOffset(r.rem).replace("+", "")} after sending, but ${srvLabel(r.survey)} is only active for ${humanMin(srvActiveMin(r.survey))} — it would point at a closed survey.`)
    if (r.rem.ch && !isNullCh(r.send) && anonClass(r.rem.ch) !== anonClass(r.send))
      e.push(`${sendName(r.rem.ch)} is ${anonLabel(anonClass(r.rem.ch))} but the invitation was sent on ${sendName(r.send)} — a reminder may not cross an anonymity boundary.`)
  }
  if (n === 5) {
    if (!r.from) e.push("Set an effective-from date.")
  }
  if (n === 6) return [1, 3, 4, 5].flatMap((x) => stepErrors(x, r, templates))
  return e
}

export { fmtN }
