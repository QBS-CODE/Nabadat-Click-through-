// M-02 helpers — formatting, plain-language summaries, survey links, SMS metrics,
// reminder timing, template resolution. Ported from the mockup's final functions.

import {
  CH,
  LANGS,
  MP,
  NULL_CH,
  PD,
  SEND,
  SLUG,
  SURVEYS,
  VALS,
  chanBase,
  isNullCh,
  opMulti,
  opNoVal,
} from "./reference"
import { SEED_SETTINGS } from "./records"
import type { CondNode, ParamType, Reminder, Rule, Settings, Template } from "./types"

// ---- formatting ----
export const fmtN = (n: number) => Number(n).toLocaleString("en-US")
export const hh = (h: number) => String(h).padStart(2, "0") + ":00"
export const sendName = (k: string): string =>
  isNullCh(k) ? "Backend — link returned to the requesting system" : SEND[k]?.name ?? "—"
export const srvObj = (id: string) => SURVEYS.find((s) => s.id === id) || null
export const srvLabel = (id: string) => {
  const s = srvObj(id)
  return s ? `${s.name} (${s.id})` : "—"
}
export const vLabel = (p: string, v: unknown) => {
  const t = (VALS[p] || []).find((x) => x[0] === String(v))
  return t ? t[1] : String(v)
}
export const dmy = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"
export const slugify = (s: string) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "untitled"

/** Response-rate badge D-token (`>=35` D1, `>=20` D2, else D3). */
export const respTone = (resp: number): "d1" | "d2" | "d3" => (resp >= 35 ? "d1" : resp >= 20 ? "d2" : "d3")

// ---- survey link ----
export const uidSample = (n: number) => "aB3xK9pQ7ZmT".slice(0, n)
/** Build a survey link from settings. Returns plain text, or segments for rich rendering. */
export function linkFor(surveyId: string, set: Settings = SEED_SETTINGS) {
  const slug = SLUG[surveyId] || "survey"
  const uid = uidSample(set.link.uid)
  const path = set.link.path.replace("[survey-slug]", slug).replace("[unique-id]", uid)
  return {
    full: "https://" + set.link.dom + path,
    dom: set.link.dom,
    slug,
    uid,
    /** path template split around the slug/uid, for coloured segments. */
    path: set.link.path,
  }
}

// ---- SMS metrics ----
const GSM7 =
  /^[A-Za-z0-9@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€\r\n]*$/
export function smsMetrics(text: string) {
  const t = resolveMsg(text)
  const uni = !GSM7.test(t)
  const single = uni ? 70 : 160
  const multi = uni ? 67 : 153
  const seg = t.length === 0 ? 0 : t.length <= single ? 1 : Math.ceil(t.length / multi)
  return { len: t.length, raw: String(text || "").length, uni, seg, per: seg <= 1 ? single : multi }
}

// ---- reminder / duration ----
export const UNIT_MIN: Record<string, number> = { minutes: 1, hours: 60, days: 1440, months: 43200 }
export const toMin = (v: number, u: string) => (+v || 0) * (UNIT_MIN[u] || 60)
export function tidyDuration(mins: number): { v: number; u: "minutes" | "hours" | "days" } {
  if (mins <= 0) return { v: 0, u: "hours" }
  if (mins % 1440 === 0) return { v: mins / 1440, u: "days" }
  if (mins % 60 === 0) return { v: mins / 60, u: "hours" }
  return { v: mins, u: "minutes" }
}
export function remOffset(rem?: Reminder) {
  if (!rem) return "immediately"
  const v = rem.v ?? 0
  const u = rem.u || "hours"
  return v ? `+${v} ${u}` : "immediately"
}
export const remMinutes = (rem?: Reminder) => toMin(rem?.v ?? 0, rem?.u || "hours")
export const srvActiveMin = (id: string) => ((srvObj(id)?.active ?? 30) * 1440)
export function humanMin(m: number) {
  const t = tidyDuration(m)
  return `${t.v} ${t.u}`
}

// ---- message resolution ----
export const resolveMsg = (t: string) =>
  String(t || "").replace(/\[([^\]]+)\]/g, (m, k) => (MP[k] !== undefined ? MP[k] : m))
/** Split a template body into runs of plain text and `[Param]` tokens, for highlighting. */
export function paramRuns(text: string): { t: string; param: boolean }[] {
  const out: { t: string; param: boolean }[] = []
  let last = 0
  const re = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), param: false })
    out.push({ t: m[0], param: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last), param: false })
  return out
}

// ---- templates ----
export function tplOptions(templates: Template[], ch: string, kind: string, lang: string) {
  const base = chanBase(ch)
  let list = templates.map((t, i) => ({ t, i })).filter(({ t }) => chanBase(t.ch) === base && t.k === kind && t.lang === lang)
  if (!list.length) list = templates.map((t, i) => ({ t, i })).filter(({ t }) => chanBase(t.ch) === base && t.k === kind)
  return list
}
export function defaultTplIdx(templates: Template[], ch: string, kind: string, lang: string): number | "" {
  const l = tplOptions(templates, ch, kind, lang)
  return l.length ? l[0].i : ""
}

// ---- plain-language summaries ----
export function condText(c: { p: string; o: string; v: unknown[] }) {
  const L = PD[c.p] ? PD[c.p].label : c.p
  const t: ParamType = PD[c.p] ? PD[c.p].type : "text"
  const disp = (v: unknown) => (VALS[c.p] ? `“${vLabel(c.p, v)}”` : t === "boolean" ? String(v) : `“${v}”`)
  if (opNoVal(c.o)) return `${L} ${c.o}`
  if (opMulti(c.o)) return `${L} ${c.o} ${c.v.length ? c.v.map(disp).join(", ") : "…"}`
  return `${L} ${c.o} ${disp(c.v[0] ?? "…")}`
}
export function summary(n: CondNode): string {
  if (!("g" in n)) return condText(n)
  if (!n.ch.length) return "always (no conditions)"
  const parts = n.ch.map((x) => ("g" in x && x.ch.length > 1 ? `(${summary(x)})` : summary(x)))
  return parts.join(n.op === "ALL" ? " AND " : " OR ")
}
export function langText(r: Rule) {
  const base = LANGS[r.lang] || "—"
  if (!r.langOvr) return `in ${base}`
  return `in the customer's preferred language where the survey is translated into it, otherwise ${base}`
}
export function outcomeText(r: Rule, templates: Template[]) {
  if (CH[r.ch]?.inS) return `present ${srvLabel(r.survey)} on the device in session, ${langText(r)}`
  if (isNullCh(r.send))
    return `resolve ${srvLabel(r.survey)} ${langText(r)} and return the survey link to the requesting system (Backend) — no message is sent`
  const t = templates[Number(r.tpl)]
  let s = `send ${srvLabel(r.survey)} ${langText(r)} via ${sendName(r.send)}`
  if (r.fb) s += ` (fallback ${sendName(r.fb)})`
  if (t) s += ` using the template “${t.n}”`
  if (r.emq && chanBase(r.send) === "email") s += ` with the first question answerable in the email body`
  if (r.rem?.on) s += `; if there is no response, remind once ${remOffset(r.rem)} after sending via ${sendName(r.rem.ch)}`
  const o: string[] = []
  if (r.ovr?.q) o.push("quiet hours")
  if (r.ovr?.f) o.push("fatigue caps")
  if (r.ovr?.g) o.push("the grace period")
  if (o.length) s += `. This rule overrides ${o.join(", ")}`
  return s
}

// ---- rule status ----
export const isExpired = (r: Rule) => !!(r.to && r.to < "2026-07-27")
export function ruleStatus(r: Rule): "Enabled" | "Disabled" | "Expired" {
  if (isExpired(r)) return "Expired"
  return r.st === "enabled" ? "Enabled" : "Disabled"
}

// ---- normalize seed rules (fill tpl/rem.tpl/sent/emq), mirroring init backfill ----
export function normalizeRules(rules: Rule[], templates: Template[]): Rule[] {
  return rules.map((r) => {
    const rr: Rule = { ...r, rem: { ...r.rem } }
    if (rr.tpl === undefined) rr.tpl = defaultTplIdx(templates, rr.send || "sms", "Invitation", rr.lang)
    rr.emq = false
    if (rr.rem.tpl === undefined) rr.rem.tpl = defaultTplIdx(templates, rr.rem.ch || "sms", "Reminder", rr.lang)
    if (rr.sent === undefined) rr.sent = rr.trig
    return rr
  })
}

/** Renumber priorities within each service channel (first match wins). */
export function renumber(rules: Rule[]) {
  const seen: Record<string, number> = {}
  rules.forEach((r) => {
    seen[r.ch] = (seen[r.ch] || 0) + 1
    r.p = seen[r.ch]
  })
}

export { NULL_CH }
