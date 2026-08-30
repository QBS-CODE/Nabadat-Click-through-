// M-02 Channels & Distribution — domain types.
// Mirrors the reference mockup's final (v2.0) runtime shapes. The reference is the
// source of truth; these types name the same fields so the mock data stays verbatim.

/** Lucide icon key used for a sending channel (mockup used raw SVG; we map to Lucide). */
export type ChannelIcon =
  | "whatsapp"
  | "sms"
  | "email"
  | "push"
  | "inapp"
  | "device"
  | "call"

/** A sending channel M-02 can deliver through (the `SEND` map in the mockup). */
export interface SendChannel {
  key: string
  name: string
  /** Delivery mode summary (column + hero). */
  mode: string
  /** How the answer is captured. */
  capture: string
  /** Provider / account line. */
  prov: string
  /** Enabled (`st`). */
  st: boolean
  sent: number
  /** Delivery rate %. */
  del: number
  /** Response rate %. */
  resp: number
  /** Contact field name: mobile | email | device_token | session | none. */
  contact: string
  icon: ChannelIcon
  /** Base channel type (whatsapp/sms/email/push/inapp/device/call). */
  base: string
  /** Ignores quiet hours entirely (per-channel switch). */
  ignoreQuiet?: boolean
  /** Per-channel quiet window override. */
  quietOwn?: { on: boolean; from: number; to: number }
  /** SMS onboarding route — "" none · "own" tenant gateway · "nabadat" Nabadat gateway. */
  smsRoute?: "" | "own" | "nabadat"
  /** SMS onboarding status — a channel can only be enabled once "verified". */
  smsStatus?: "not_started" | "in_progress" | "verified"
}

/** A read-only service channel contract from M-13 (the `CH` map). */
export interface ServiceChannel {
  key: string
  name: string
  /** Sending channels available on this service channel. */
  send: string[]
  /** In-session (IVR/Kiosk/POS) — collects on the device, no dispatch. */
  inS: boolean
  /** Parameters supported on this service channel. */
  params: string[]
}

export type ParamType =
  | "service"
  | "list"
  | "range"
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "decimal"
  | "date"
  | "datetime"
  | "boolean"

/** Parameter definition: label + data type (the `PD` map). */
export interface ParamDef {
  label: string
  type: ParamType
}

/** A survey (M-01) with its translated languages + published meta. */
export interface Survey {
  id: string
  name: string
  langs: string[]
  /** Published version, e.g. "v4". */
  ver: string
  /** Active period in days (CTR-02) — link expiry may not exceed it. */
  active: number
}

/** A condition node: either a group (`g:1`) or a leaf condition. */
export type CondNode = CondGroup | CondLeaf
export interface CondGroup {
  g: 1
  op: "ALL" | "ANY"
  ch: CondNode[]
}
export interface CondLeaf {
  p: string // parameter key
  o: string // operator
  v: unknown[] // values
}

/** A reminder config (value + unit form). */
export interface Reminder {
  on: boolean
  v: number
  u: "minutes" | "hours" | "days"
  ch: string
  /** Template index into TPLS. */
  tpl?: number | string
  script?: string
}

/** A trigger rule (the `RULES` array). */
export interface Rule {
  id: number
  /** Priority within its service channel. */
  p: number
  name: string
  ch: string // service channel key
  st: "enabled" | "disabled" | "draft"
  cond: CondGroup
  survey: string
  lang: string
  langOvr: boolean
  send: string // sending channel key, or "NULL" backend
  fb: string // fallback sending channel key
  delay: [number, string]
  exp: [number, string]
  rem: Reminder
  ovr: { q: boolean; f: boolean; g: boolean }
  from: string
  to: string
  /** Matched · 7 d. */
  trig: number
  /** Sent · 7 d. */
  sent?: number
  upd: string
  desc?: string
  tpl?: number | string
  emq?: boolean
}

export type TplKind = "Invitation" | "Reminder" | "Conversational"
export type TplApproval = "approved" | "pending" | "n/a"

/** A message template (the `TPLS` array). */
export interface Template {
  n: string
  ch: string
  k: TplKind
  lang: string
  ap: TplApproval
  u: string
  body: string
}

/** A survey request log row (the `REQ` array). */
export interface RequestRow {
  t: string
  id: string
  src: string
  ch: string // service channel key
  pr: Record<string, string> // key parameters (display)
  sent: "yes" | "no" | "held" | "norule"
  rule: string
  srv: string
  lang: string
  via: string // sending channel key
  resp: string
  why: string
}

/** Tenant Channels & Distribution settings (the `SET` object). */
export interface Settings {
  tz: string
  qFrom: number
  qTo: number
  qBeh: "hold" | "skip"
  link: { dom: string; path: string; uid: number }
}
