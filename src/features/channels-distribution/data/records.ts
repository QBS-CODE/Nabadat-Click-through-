// M-02 seed records — rules, templates, request log, settings.
// Final (v2.0) runtime state. Rules are seeded in their post-override shape
// (drafts→disabled, reminders as value+unit, deferred channels remapped to SMS).
// tpl / rem.tpl / sent / emq are filled by normalizeRules() at load, mirroring
// the mockup's init backfill.

import type { CondGroup, RequestRow, Rule, Settings, Template } from "./types"

// condition builders (`G` / `C` in the mockup)
export const G = (op: "ALL" | "ANY", ch: CondGroup["ch"]): CondGroup => ({ g: 1, op, ch })
export const C = (p: string, o: string, v: unknown[]) => ({ p, o, v })

/** Seed trigger rules (`RULES`) in final shape. */
export const SEED_RULES: Rule[] = [
  {
    id: 1, p: 1, name: "VIP fast-track — Visa services", ch: "E-SERVICES-PORTAL", st: "enabled",
    cond: G("ALL", [C("vip", "is", [true]), G("ANY", [C("service", "is any of", ["S001", "S002"]), C("customer_type", "is", ["CT4"])])]),
    survey: "SRV-014", lang: "en", langOvr: true, send: "sms", fb: "email", delay: [15, "minutes"],
    rem: { on: true, v: 2, u: "days", ch: "sms" }, exp: [72, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-06-01", to: "", trig: 412, sent: 356, upd: "2 d ago · Sara A.",
  },
  {
    id: 2, p: 2, name: "High-value transactions", ch: "E-SERVICES-PORTAL", st: "enabled",
    cond: G("ALL", [C("transaction_amount", "greater than or equal", [500]), C("region", "is any of", ["R01", "R04"])]),
    survey: "SRV-021", lang: "ar", langOvr: true, send: "email", fb: "sms", delay: [1, "hours"],
    rem: { on: true, v: 36, u: "hours", ch: "sms" }, exp: [48, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-06-01", to: "", trig: 128, sent: 101, upd: "5 d ago · Omar K.",
  },
  {
    id: 3, p: 3, name: "Ramadan campaign follow-up", ch: "E-SERVICES-PORTAL", st: "enabled",
    cond: G("ALL", [C("service", "is", ["S006"])]),
    survey: "SRV-021", lang: "ar", langOvr: false, send: "sms", fb: "", delay: [30, "minutes"],
    rem: { on: false, v: 1, u: "days", ch: "sms" }, exp: [24, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-03-01", to: "2026-04-20", trig: 0, sent: 0, upd: "12 Mar 2026 · Sara A.",
  },
  {
    id: 4, p: 4, name: "All portal transactions — catch-all", ch: "E-SERVICES-PORTAL", st: "enabled",
    cond: G("ALL", []),
    survey: "SRV-021", lang: "ar", langOvr: true, send: "sms", fb: "email", delay: [30, "minutes"],
    rem: { on: false, v: 1, u: "days", ch: "sms" }, exp: [72, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-06-01", to: "", trig: 3204, sent: 2841, upd: "9 d ago · Sara A.",
  },
  {
    id: 5, p: 1, name: "App CES after e-service", ch: "MOBILE-APP", st: "enabled",
    cond: G("ALL", [C("service", "is any of", ["S005", "S006"])]),
    survey: "SRV-030", lang: "en", langOvr: true, send: "sms", fb: "email", delay: [5, "minutes"],
    rem: { on: false, v: 1, u: "days", ch: "sms" }, exp: [24, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-06-15", to: "", trig: 864, sent: 790, upd: "1 d ago · Sara A.",
  },
  {
    id: 6, p: 1, name: "Post-call IVR survey", ch: "CALL-CENTER", st: "disabled",
    cond: G("ALL", [C("wait_time", "less than or equal", [10])]),
    survey: "SRV-035", lang: "ar", langOvr: true, send: "", fb: "", delay: [0, "minutes"],
    rem: { on: false, v: 0, u: "hours", ch: "" }, exp: [0, "hours"], ovr: { q: false, f: false, g: false },
    from: "2026-08-01", to: "", trig: 0, sent: 0, upd: "today · Layla H.",
  },
]

/** Message templates (`TPLS`) — final [Parameter]-syntax bodies. */
export const SEED_TEMPLATES: Template[] = [
  { n: "Visa NPS invitation", ch: "whatsapp", k: "Invitation", lang: "ar", ap: "approved", u: "2 d ago · Sara A.", body: "[Customer Name]، شكراً لاستخدامك خدمة [Service] اليوم.\n\nسؤالان لا يتجاوزان الدقيقة:\n[Survey URL]" },
  { n: "Visa NPS invitation", ch: "whatsapp", k: "Invitation", lang: "en", ap: "approved", u: "2 d ago · Sara A.", body: "[Customer Name], thank you for using the [Service] service today.\n\nTwo questions, under a minute:\n[Survey URL]" },
  { n: "Visa NPS conversational opener", ch: "whatsapp", k: "Conversational", lang: "ar", ap: "pending", u: "4 h ago · Sara A.", body: "[Customer Name]، هل تسمح لنا بسؤالين سريعين عن خدمة [Service]؟" },
  { n: "Generic reminder", ch: "whatsapp", k: "Reminder", lang: "ar", ap: "approved", u: "11 d ago · Omar K.", body: "[Customer Name]، تذكير بسيط: رأيك في خدمة [Service] يهمنا.\n[Survey URL]" },
  { n: "Generic reminder", ch: "whatsapp", k: "Reminder", lang: "en", ap: "approved", u: "11 d ago · Omar K.", body: "[Customer Name], a quick reminder — your view on [Service] still matters to us.\n[Survey URL]" },
  { n: "Short invitation", ch: "sms", k: "Invitation", lang: "ar", ap: "n/a", u: "6 d ago · Omar K.", body: "شكراً لاستخدامك خدمة [Service]. سؤالان سريعان: [Survey URL]" },
  { n: "Short invitation", ch: "sms", k: "Invitation", lang: "en", ap: "n/a", u: "6 d ago · Omar K.", body: "Thank you [Customer Name] for using [Service] on [Transaction Date]. Please rate it here: [Survey URL]" },
  { n: "Short reminder", ch: "sms", k: "Reminder", lang: "ar", ap: "n/a", u: "6 d ago · Omar K.", body: "تذكير: رأيك في خدمة [Service] يهمنا. [Survey URL]" },
  { n: "Short reminder", ch: "sms", k: "Reminder", lang: "en", ap: "n/a", u: "6 d ago · Omar K.", body: "Reminder: your feedback on [Service] takes under a minute. [Survey URL]" },
  { n: "CSAT invitation — first question in body", ch: "email", k: "Invitation", lang: "ar", ap: "n/a", u: "yesterday · Sara A.", body: "[Customer Name]، كيف كانت تجربتك مع خدمة [Service] بتاريخ [Transaction Date]؟\n\nاختر تقييمك من الأزرار أدناه — يُسجَّل فوراً.\n\nأو أكمل الاستبيان كاملاً: [Survey URL]\n\n[Organisation Name]\nلإلغاء الاشتراك: [Unsubscribe Link]" },
  { n: "CSAT invitation — first question in body", ch: "email", k: "Invitation", lang: "en", ap: "n/a", u: "yesterday · Sara A.", body: "Thank you [Customer Name] for using [Service] on [Transaction Date].\n\nPick your rating below — it is recorded straight away.\n\nOr open the full survey: [Survey URL]\n\n[Organisation Name]\nUnsubscribe: [Unsubscribe Link]" },
  { n: "Email reminder", ch: "email", k: "Reminder", lang: "en", ap: "n/a", u: "8 d ago · Sara A.", body: "[Customer Name], your survey on [Service] is still open.\n\n[Survey URL]\n\n[Organisation Name]\nUnsubscribe: [Unsubscribe Link]" },
  { n: "Email reminder", ch: "email", k: "Reminder", lang: "ar", ap: "n/a", u: "8 d ago · Sara A.", body: "[Customer Name]، الاستبيان الخاص بخدمة [Service] ما زال متاحاً.\n\n[Survey URL]\n\n[Organisation Name]\nلإلغاء الاشتراك: [Unsubscribe Link]" },
  { n: "App CES push", ch: "push", k: "Invitation", lang: "en", ap: "n/a", u: "3 d ago · Sara A.", body: "[Customer Name], how easy was [Service]? Tap to rate — 20 seconds." },
]

/** Survey request log rows (`REQ`) — deferred `via` channels remapped to live ones. */
export const SEED_REQUESTS: RequestRow[] = [
  { t: "22:41:02", id: "req_9f2a41", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Tourism Visa Request", VIP: "true", Region: "Amman" }, sent: "held", rule: "VIP fast-track — Visa services", srv: "SRV-014", lang: "en", via: "sms", resp: "—", why: "Rule matched; held by quiet hours until 08:00" },
  { t: "22:39:44", id: "req_9f2a3d", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Work Permit Renewal", "Transaction Amount": "880 JOD" }, sent: "no", rule: "High-value transactions", srv: "SRV-021", lang: "ar", via: "", resp: "—", why: "Rule matched, then stopped: grace period — survey received 3 days ago" },
  { t: "20:12:10", id: "req_9f28b1", src: "Branch queue system", ch: "SERVICE-CENTER", pr: { Service: "Civil Records Extract", Region: "Irbid", "Wait Time (min)": "6" }, sent: "yes", rule: "Branch exit CSAT", srv: "SRV-021", lang: "ar", via: "sms", resp: "Answered 20:29 · CSAT 4/5", why: "Sent and delivered" },
  { t: "20:10:55", id: "req_9f28a4", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Visa Request", VIP: "true" }, sent: "yes", rule: "VIP fast-track — Visa services", srv: "SRV-014", lang: "en", via: "sms", resp: "Answered 20:31 · NPS 9", why: "Sent, read and answered" },
  { t: "19:55:03", id: "req_9f2801", src: "Mobile backend", ch: "MOBILE-APP", pr: { Service: "Traffic Fine Payment", "Customer Type": "Citizen" }, sent: "yes", rule: "App CES after e-service", srv: "SRV-030", lang: "en", via: "sms", resp: "Not answered yet", why: "Push failed on a stale device token; recovered on the fallback channel" },
  { t: "19:41:27", id: "req_9f27c9", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Commercial Licence Issuance", "Customer Type": "Business" }, sent: "no", rule: "All portal transactions — catch-all", srv: "SRV-021", lang: "ar", via: "", resp: "—", why: "Rule matched, then stopped: customer opted out of SMS on 4 Jun 2026" },
  { t: "19:20:41", id: "req_9f2790", src: "Kiosk controller", ch: "SELF-SERVICE-KIOSK", pr: { Service: "Civil Records Extract", Region: "Amman" }, sent: "yes", rule: "Kiosk exit survey", srv: "SRV-021", lang: "ar", via: "email", resp: "Answered in session · CSAT 5/5", why: "Presented on the device in session" },
  { t: "18:58:12", id: "req_9f2712", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Visa Request", VIP: "true" }, sent: "yes", rule: "VIP fast-track — Visa services", srv: "SRV-014", lang: "ar", via: "sms", resp: "Not answered yet", why: "Quiet hours overridden by the rule; sent immediately" },
  { t: "18:30:09", id: "req_9f26f0", src: "Branch queue system", ch: "SERVICE-CENTER", pr: { Service: "Traffic Fine Payment", "Wait Time (min)": "41" }, sent: "norule", rule: "—", srv: "—", lang: "", via: "", resp: "—", why: "No enabled rule matched; stored for analytics tagged “no rule matched”" },
  { t: "18:04:55", id: "req_9f26aa", src: "Core services bus", ch: "E-SERVICES-PORTAL", pr: { Service: "Tourism Visa Request", "Transaction Amount": "640 JOD" }, sent: "yes", rule: "High-value transactions", srv: "SRV-021", lang: "ar", via: "email", resp: "Not answered yet · reminder due 06:04", why: "Sent; first question embedded in the email body" },
  { t: "17:52:31", id: "req_9f2680", src: "Mobile backend", ch: "MOBILE-APP", pr: { Service: "Civil Records Extract" }, sent: "no", rule: "App CES after e-service", srv: "SRV-030", lang: "en", via: "", resp: "—", why: "Rule matched, then stopped: fatigue cap — 2 invitations in the last 30 days" },
  { t: "17:31:18", id: "req_9f2641", src: "IVR platform", ch: "CALL-CENTER", pr: { Service: "Visa Request", "Wait Time (min)": "4" }, sent: "no", rule: "Post-call IVR survey", srv: "SRV-035", lang: "ar", via: "", resp: "—", why: "Matching rule is disabled — disabled rules are never evaluated" },
]

/** Request-log summary tiles + fixed date. */
export const REQ_DATE = "2026-07-27"
export const REQ_TILES = {
  received: "4,462",
  sent: "3,908",
  sentPct: "87.6%",
  noSurvey: "554",
  noSurveyBreak: "243 no rule · 311 stopped by policy",
  answered: "1,204",
  answeredPct: "30.8%",
}

/** Tenant Channels & Distribution settings (`SET`). */
export const SEED_SETTINGS: Settings = {
  tz: "Asia/Amman (GMT+3)",
  qFrom: 21,
  qTo: 8,
  qBeh: "hold",
  link: { dom: "nbdt.jo", path: "/s/[survey-slug]/[unique-id]", uid: 6 },
}

/** Tenant email defaults (D-3). */
export const EMAIL_DEFAULTS = {
  subject: "How was your experience today?",
  preheader: "One minute, and it helps us fix what is not working.",
}

/** Blackout dates on the guardrails screen. */
export const BLACKOUTS = [
  { t: "Eid al-Fitr", d: "19 – 22 Mar 2026 · all channels" },
  { t: "Independence Day", d: "25 May 2026 · all channels" },
  { t: "Core banking migration", d: "14 – 15 Sep 2026 · all channels · added by Omar K." },
]
