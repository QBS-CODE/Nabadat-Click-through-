// M-02 reference data — sending channels, service channels, parameters, operators.
// Mirrors the mockup's FINAL (v2.0) runtime state: live channels first, then the
// deferred "coming soon" family. Provider/stat values are the seeded demo tenant's.

import type {
  ParamDef,
  ParamType,
  SendChannel,
  ServiceChannel,
  Survey,
} from "./types"

/** Coming-soon channel keys (listed for the roadmap, inert in this phase). */
export const COMING_SOON = [
  "whatsapp",
  "push",
  "inapp",
  "device",
  "call-ivr",
  "call-agent",
  "call-ai",
] as const

export const isSoon = (key: string, base?: string) =>
  (COMING_SOON as readonly string[]).includes(key) ||
  (base ? (COMING_SOON as readonly string[]).includes(base) : false)

/** Sending channels (`SEND`), in final display order (live first, deferred after). */
export const SEND: Record<string, SendChannel> = {
  // ---- live ----
  sms: {
    key: "sms",
    name: "SMS",
    mode: "Template text with a survey link",
    capture: "Short link → web survey",
    prov: "Tenant gateway · sms.tenant.gov.jo",
    st: true,
    sent: 9420,
    del: 94.1,
    resp: 22.6,
    contact: "mobile",
    icon: "sms",
    base: "sms",
    smsRoute: "own",
    smsStatus: "verified",
  },
  email: {
    key: "email",
    name: "Email",
    mode: "Link message · First question in body",
    capture: "One-click answer or link",
    prov: "SMTP relay · surveys@tenant.gov.jo",
    st: true,
    sent: 6810,
    del: 97.9,
    resp: 18.4,
    contact: "email",
    icon: "email",
    base: "email",
  },
  "sms-jo": {
    key: "sms-jo",
    name: "SMS-JO",
    mode: "Template text with a survey link",
    capture: "Short link → web survey",
    prov: "Tenant gateway · sms.tenant.gov.jo",
    st: true,
    sent: 4180,
    del: 95.2,
    resp: 24.1,
    contact: "mobile",
    icon: "sms",
    base: "sms",
    smsRoute: "own",
    smsStatus: "verified",
  },
  "sms-ksa": {
    key: "sms-ksa",
    name: "SMS-KSA",
    mode: "Template text with a survey link",
    capture: "Short link → web survey",
    prov: "Tenant gateway · sms.tenant.gov.jo",
    st: true,
    sent: 2260,
    del: 93.4,
    resp: 19.8,
    contact: "mobile",
    icon: "sms",
    base: "sms",
    smsRoute: "own",
    smsStatus: "verified",
  },
  "sms-vip": {
    key: "sms-vip",
    name: "SMS-VIP",
    mode: "Template text with a survey link",
    capture: "Short link → web survey",
    prov: "Tenant gateway · sms.tenant.gov.jo",
    st: true,
    sent: 610,
    del: 98.1,
    resp: 38.7,
    contact: "mobile",
    icon: "sms",
    base: "sms",
    smsRoute: "own",
    smsStatus: "verified",
  },
  "email-vip": {
    key: "email-vip",
    name: "Email-VIP",
    mode: "Survey link",
    capture: "Web survey",
    prov: "SMTP relay · vip@tenant.gov.jo",
    st: true,
    sent: 940,
    del: 98.6,
    resp: 31.2,
    contact: "email",
    icon: "email",
    base: "email",
  },
  // ---- coming soon (faded / inert) ----
  whatsapp: {
    key: "whatsapp",
    name: "WhatsApp",
    mode: "Template message with a survey link",
    capture: "Survey link only — no inbound API",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "mobile",
    icon: "whatsapp",
    base: "whatsapp",
  },
  push: {
    key: "push",
    name: "Push notification",
    mode: "Deep link into the app",
    capture: "In-app survey view",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "device_token",
    icon: "push",
    base: "push",
  },
  inapp: {
    key: "inapp",
    name: "In-app / web intercept",
    mode: "Embedded panel",
    capture: "Answered in place",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "session",
    icon: "inapp",
    base: "inapp",
  },
  device: {
    key: "device",
    name: "On-device (in-session)",
    mode: "Presented on the device",
    capture: "Answered in the same session",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "none",
    icon: "device",
    base: "device",
  },
  "call-ivr": {
    key: "call-ivr",
    name: "Outbound Call — IVR",
    mode: "Automated call, keypad answers",
    capture: "DTMF captured in the call",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "mobile",
    icon: "call",
    base: "call",
  },
  "call-agent": {
    key: "call-agent",
    name: "Outbound Call — Human Agent",
    mode: "An agent calls and asks the questions",
    capture: "Agent records the answers",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "mobile",
    icon: "call",
    base: "call",
  },
  "call-ai": {
    key: "call-ai",
    name: "Outbound Call — AI Voicebot",
    mode: "AI voice agent conducts the survey",
    capture: "Speech recognised and mapped to options",
    prov: "Not configured",
    st: false,
    sent: 0,
    del: 0,
    resp: 0,
    contact: "mobile",
    icon: "call",
    base: "call",
  },
}

/** The Null sending channel: M-02 returns the link to the requesting backend, sends nothing. */
export const NULL_CH = "NULL"
export const isNullCh = (k: string) => k === NULL_CH

/** Base channel type for a channel key. */
export const chanBase = (k: string): string => SEND[k]?.base || k || ""

/** Channels in display order: live first, deferred after. */
export const channelOrder = (): string[] => {
  const keys = Object.keys(SEND)
  return keys.filter((k) => !isSoon(k, chanBase(k))).concat(keys.filter((k) => isSoon(k, chanBase(k))))
}
export const liveChannels = (): string[] =>
  Object.keys(SEND).filter((k) => !isSoon(k, chanBase(k)))

/** Service channels (read-only M-13 contract, the `CH` map). */
export const CH: Record<string, ServiceChannel> = {
  "E-SERVICES-PORTAL": {
    key: "E-SERVICES-PORTAL",
    name: "e-Services Portal",
    send: ["whatsapp", "sms", "email"],
    inS: false,
    params: [
      "service",
      "region",
      "customer_type",
      "customer_language",
      "vip",
      "transaction_amount",
      "amount_band",
      "email",
      "mobile",
      "customer_name",
      "source_url",
      "transaction_date",
      "transaction_datetime",
    ],
  },
  "MOBILE-APP": {
    key: "MOBILE-APP",
    name: "Mobile App",
    send: ["push", "whatsapp", "sms"],
    inS: false,
    params: ["service", "customer_type", "customer_language", "vip", "mobile", "amount_band", "transaction_datetime"],
  },
  "SERVICE-CENTER": {
    key: "SERVICE-CENTER",
    name: "Service Center",
    send: ["sms", "whatsapp", "email"],
    inS: false,
    params: ["service", "region", "agent", "customer_type", "vip", "mobile", "email", "transaction_amount", "wait_time", "transaction_date"],
  },
  "CALL-CENTER": {
    key: "CALL-CENTER",
    name: "Call Center",
    send: [],
    inS: true,
    params: ["service", "agent", "wait_time", "customer_language", "mobile", "transaction_datetime"],
  },
  "SELF-SERVICE-KIOSK": {
    key: "SELF-SERVICE-KIOSK",
    name: "Self-Service Kiosk",
    send: [],
    inS: true,
    params: ["service", "region", "transaction_date"],
  },
}

/** Languages (`LANGS`). */
export const LANGS: Record<string, string> = { ar: "Arabic", en: "English", fr: "French", ur: "Urdu" }

/** Surveys (M-01) with translated languages + published meta (`SURVEYS` + `SRVMETA`). */
export const SURVEYS: Survey[] = [
  { id: "SRV-014", name: "Visa Journey NPS", langs: ["ar", "en", "fr"], ver: "v4", active: 30 },
  { id: "SRV-021", name: "Post-Service CSAT", langs: ["ar", "en"], ver: "v7", active: 14 },
  { id: "SRV-030", name: "Digital Experience CES", langs: ["ar", "en", "fr", "ur"], ver: "v2", active: 30 },
  { id: "SRV-008", name: "Complaint Follow-up CSAT", langs: ["ar"], ver: "v3", active: 7 },
  { id: "SRV-035", name: "Post-Call IVR CSAT", langs: ["ar", "en"], ver: "v1", active: 3 },
]

/** Survey slugs used in survey links (`SLUG`). */
export const SLUG: Record<string, string> = {
  "SRV-014": "visa-nps",
  "SRV-021": "service-csat",
  "SRV-030": "digital-ces",
  "SRV-008": "complaint-csat",
  "SRV-035": "call-csat",
}

/** Mapped list values (`VALS`): [code, displayLabel]. */
export const VALS: Record<string, [string, string][]> = {
  service: [
    ["S001", "Visa Request"],
    ["S002", "Tourism Visa Request"],
    ["S003", "Work Permit Renewal"],
    ["S004", "Commercial Licence Issuance"],
    ["S005", "Civil Records Extract"],
    ["S006", "Traffic Fine Payment"],
  ],
  region: [
    ["R01", "Amman"],
    ["R02", "Irbid"],
    ["R03", "Zarqa"],
    ["R04", "Aqaba"],
  ],
  customer_type: [
    ["CT1", "Citizen"],
    ["CT2", "Resident"],
    ["CT3", "Visitor"],
    ["CT4", "Business"],
  ],
  customer_language: [
    ["AR", "Arabic"],
    ["EN", "English"],
    ["FR", "French"],
    ["UR", "Urdu"],
  ],
  amount_band: [
    ["B1", "Under 100 JOD"],
    ["B2", "100 – 499 JOD"],
    ["B3", "500 – 999 JOD"],
    ["B4", "1,000 JOD and above"],
  ],
}

/** Parameter definitions: label + data type (`PD`). */
export const PD: Record<string, ParamDef> = {
  service: { label: "Service", type: "service" },
  region: { label: "Region", type: "list" },
  customer_type: { label: "Customer Type", type: "list" },
  customer_language: { label: "Customer Language", type: "list" },
  vip: { label: "VIP", type: "boolean" },
  transaction_amount: { label: "Transaction Amount", type: "decimal" },
  wait_time: { label: "Wait Time (min)", type: "number" },
  amount_band: { label: "Amount Band", type: "range" },
  email: { label: "Email", type: "email" },
  mobile: { label: "Mobile", type: "phone" },
  agent: { label: "Agent", type: "text" },
  customer_name: { label: "Customer Name", type: "text" },
  source_url: { label: "Source URL", type: "url" },
  transaction_date: { label: "Transaction Date", type: "date" },
  transaction_datetime: { label: "Transaction Date & Time", type: "datetime" },
}

/** Operator catalogue, keyed by parameter data type (`OPS`). No BETWEEN anywhere. */
export const OPS: Record<ParamType, string[]> = {
  service: ["contains", "is", "is not", "is any of", "is none of", "is empty", "is not empty"],
  list: ["is", "is not", "is any of", "is none of", "is empty", "is not empty"],
  range: ["is", "is not", "is any of", "is none of", "greater than", "greater than or equal", "less than", "less than or equal", "is empty", "is not empty"],
  text: ["is", "is not", "contains", "does not contain", "starts with", "ends with", "is in", "is not in", "is empty", "is not empty"],
  email: ["is", "is not", "contains", "starts with", "ends with", "is in", "is not in", "is empty", "is not empty"],
  phone: ["is", "is not", "starts with", "contains", "is in", "is not in", "is empty", "is not empty"],
  url: ["is", "is not", "contains", "starts with", "ends with", "is empty", "is not empty"],
  number: ["equal", "is not", "greater than", "greater than or equal", "less than", "less than or equal", "is empty", "is not empty"],
  decimal: ["equal", "is not", "greater than", "greater than or equal", "less than", "less than or equal", "is empty", "is not empty"],
  date: ["equal", "is not", "greater than", "greater than or equal", "less than", "less than or equal", "is empty", "is not empty"],
  datetime: ["equal", "is not", "greater than", "greater than or equal", "less than", "less than or equal", "is empty", "is not empty"],
  boolean: ["is", "is empty", "is not empty"],
}

export const TYPE_LBL: Record<ParamType, string> = {
  service: "Service",
  list: "List",
  range: "Range",
  text: "Text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  decimal: "Decimal",
  date: "Date",
  datetime: "Date & time",
  boolean: "Boolean",
}

export const MULTI_OPS = ["is any of", "is none of", "is in", "is not in"]
export const NOVAL_OPS = ["is empty", "is not empty"]
export const opMulti = (o: string) => MULTI_OPS.includes(o)
export const opNoVal = (o: string) => NOVAL_OPS.includes(o)

/** Channel types offered in the Add-channel modal (`CHAN_TYPES`). */
export const CHAN_TYPES: Record<string, { name: string; d: string; icon: string; contact: string; mode: string; capture: string }> = {
  sms: { name: "SMS", d: "One short message carrying the survey link. No interactive replies.", icon: "sms", contact: "mobile", mode: "Link message", capture: "Short link → web survey" },
  email: { name: "Email", d: "Full survey URL, optionally with the first question answerable in the body.", icon: "email", contact: "email", mode: "Link message · First question in body", capture: "One-click answer or link" },
  whatsapp: { name: "WhatsApp", d: "Link message or a conversational survey answered in the chat.", icon: "whatsapp", contact: "mobile", mode: "Link message · Conversational", capture: "Inbound message or link" },
  push: { name: "Push notification", d: "Deep link into the tenant mobile app.", icon: "push", contact: "device_token", mode: "Deep link into the app", capture: "In-app survey view" },
  inapp: { name: "In-app / web intercept", d: "Embedded panel inside a web or app session.", icon: "inapp", contact: "session", mode: "Embedded panel", capture: "Answered in place" },
  device: { name: "On-device (in-session)", d: "Kiosk, IVR, ATM or POS — presented in the same session.", icon: "device", contact: "none", mode: "Presented on the device", capture: "Answered in the same session" },
}

/** Message parameters resolved at send time (`MP`), square-bracket syntax. */
export const MP: Record<string, string> = {
  "Customer Name": "Ahmad Al-Masri",
  Service: "Tourism Visa Request",
  Region: "Amman",
  Branch: "Amman HQ",
  Agent: "Layla H.",
  "Flight Number": "RJ 512",
  "Transaction Date": "27 Jul 2026",
  "Transaction Amount": "220 JOD",
  "Organisation Name": "Ministry of Interior",
  "Survey Name": "Visa Journey NPS",
  "Survey URL": "https://nbdt.jo/s/visa-nps/7Kq2Xb",
  "Unsubscribe Link": "https://nbdt.jo/u/7Kq2Xb",
}
export const MP_KEYS = Object.keys(MP)
export const SYS_PARAMS = ["Survey Name", "Survey URL", "Unsubscribe Link"]
export const TXN_PARAMS = MP_KEYS.filter((k) => !SYS_PARAMS.includes(k))
