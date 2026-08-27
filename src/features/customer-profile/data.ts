// M-03 Customer Profile — CLICKTHROUGH mock data.
//
// Ported VERBATIM from the ratified prototype `nabadat-m03-customer-profile-v4.3.html` so every
// screen renders the same figures. Bilingual values are kept as `[ar, en]` tuples exactly as the
// prototype stores them; components resolve the active language via `pick()`. No backend.

export type Lang = "ar" | "en"
/** Resolve an [ar, en] tuple (or two args) to the active language. */
export function pick(lang: Lang, ar: string, en: string): string {
  return lang === "ar" ? ar : en
}
export function pickPair(lang: Lang, pair: [string, string]): string {
  return lang === "ar" ? pair[0] : pair[1]
}

/** Fixed clickthrough clock — the prototype pins TODAY so trends/staleness are deterministic. */
export const TODAY = new Date("2026-07-30")
export const EXISTING_PROFILES = 132637

// ── Field categories (Identity / Demographics / Commercial / Organisational) ──
export interface Category {
  key: "identity" | "demo" | "comm" | "org"
  ar: string
  en: string
}
export const CATS: Category[] = [
  { key: "identity", ar: "الهوية", en: "Identity" },
  { key: "demo", ar: "البيانات الديموغرافية", en: "Demographics" },
  { key: "comm", ar: "التصنيف التجاري", en: "Commercial classification" },
  { key: "org", ar: "الانتماء التنظيمي", en: "Organisational" },
]

// ── Simulated M-13 parameter registry (BR-M03-192) ──
export type ParamScope = "person" | "transaction"
export type ValueRule = "latest" | "all" | "fixed"
export interface M13Param {
  code: string
  type: string
  scope: ParamScope
  matchKey: boolean
  pii: boolean
  rule: ValueRule
  defAr: string
  defEn: string
  /** Sample display value (masked for PII). */
  sAr?: string
  sEn?: string
  /** Real (revealed) value for PII fields. */
  secret?: string
  enabled?: boolean
}
const M13_BASE: M13Param[] = [
  { code: "customer_id", type: "Text", scope: "person", matchKey: true, pii: false, rule: "fixed", defAr: "معرّف العميل", defEn: "Customer ID", sAr: "CUS-0-4471", sEn: "CUS-0-4471" },
  { code: "customer_name", type: "Text", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "الاسم الكامل", defEn: "Full name", sAr: "أحمد عبدالله المصري", sEn: "Ahmad Abdullah Al-Masri" },
  { code: "mobile", type: "Phone", scope: "person", matchKey: false, pii: true, rule: "latest", defAr: "رقم الجوال", defEn: "Mobile", secret: "+962 79 552 4471", sAr: "+962 •• ••• 4471", sEn: "+962 •• ••• 4471" },
  { code: "email", type: "Email", scope: "person", matchKey: false, pii: true, rule: "latest", defAr: "البريد الإلكتروني", defEn: "Email", secret: "a.masri@example.com", sAr: "a•••••@•••••.com", sEn: "a•••••@•••••.com" },
  { code: "gender", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "الجنس", defEn: "Gender", sAr: "ذكر", sEn: "Male" },
  { code: "nationality", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "الجنسية", defEn: "Nationality", sAr: "الأردن", sEn: "Jordan" },
  { code: "birth_date", type: "Date", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "", sAr: "1988-03-14", sEn: "1988-03-14" },
  { code: "customer_type", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "نوع العميل", defEn: "Customer type", sAr: "أفراد", sEn: "Retail" },
  { code: "customer_segment", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "شريحة العميل", defEn: "Customer segment", sAr: "الثروات", sEn: "Affluent" },
  { code: "vip", type: "Boolean", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "عميل مميز", defEn: "VIP", sAr: "نعم", sEn: "Yes" },
  { code: "product", type: "List", scope: "person", matchKey: false, pii: false, rule: "all", defAr: "المنتجات", defEn: "Products", sAr: "حساب جاري، تمويل شخصي، بطاقة ائتمانية", sEn: "Current account, Personal financing, Credit card" },
  { code: "service", type: "List", scope: "person", matchKey: false, pii: false, rule: "all", defAr: "", defEn: "", sAr: "تحويل دولي", sEn: "International transfer" },
  { code: "branch", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "الفرع", defEn: "Branch", sAr: "فرع عبدون", sEn: "Abdoun Branch" },
  { code: "region", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "المنطقة", defEn: "Region", sAr: "عمّان", sEn: "Amman" },
  { code: "department", type: "List", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "الإدارة", defEn: "Department", sAr: "الخدمات المصرفية للأفراد", sEn: "Retail Banking" },
  { code: "source_system", type: "Text", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "النظام المصدر", defEn: "Source system", sAr: "CoreBank", sEn: "CoreBank" },
  { code: "employee", type: "Text", scope: "person", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "", sAr: "ر. الحسن", sEn: "R. Al-Hassan" },
  { code: "transaction_id", type: "Text", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "transaction_date", type: "Date & time", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "journey", type: "List", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "journey_stage", type: "List", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "touchpoint", type: "List", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "service_channel", type: "List", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
  { code: "agent", type: "Text", scope: "transaction", matchKey: false, pii: false, rule: "latest", defAr: "", defEn: "" },
]
export const M13_REGISTRY: M13Param[] = M13_BASE.map((r) => ({ ...r, enabled: true }))

/** Per-tenant default field category + on/off (published profile-setup baseline). */
export const TENANT_DEFAULTS: Record<string, { cat: Category["key"]; on: boolean }> = {
  customer_id: { cat: "identity", on: true },
  customer_name: { cat: "identity", on: true },
  mobile: { cat: "identity", on: true },
  email: { cat: "identity", on: true },
  gender: { cat: "demo", on: true },
  nationality: { cat: "demo", on: true },
  birth_date: { cat: "demo", on: false },
  customer_type: { cat: "comm", on: true },
  customer_segment: { cat: "comm", on: true },
  vip: { cat: "comm", on: true },
  product: { cat: "comm", on: true },
  service: { cat: "comm", on: false },
  branch: { cat: "org", on: true },
  region: { cat: "org", on: true },
  department: { cat: "org", on: true },
  source_system: { cat: "org", on: true },
  employee: { cat: "org", on: false },
}

export function m13(code: string): M13Param | undefined {
  return M13_REGISTRY.find((r) => r.code === code)
}
export function m13MatchKey(): string | undefined {
  return M13_REGISTRY.find((r) => r.matchKey)?.code
}

// ── KPIs / trend data (STATUS) ──
export type DLevel = "d1" | "d2" | "d3" | "d4" | "d5"
export interface Zone {
  from: number
  to: number
  d: DLevel
  ar: string
  en: string
}
export interface TrendPoint {
  d: string
  v: number
  s: keyof typeof SVY
  tp: keyof typeof TP
  ch: keyof typeof CH
}
export interface Kpi {
  key: string
  label: [string, string]
  full: [string, string]
  min: number
  max: number
  dec: number
  composition?: [string, number][]
  zones: Zone[]
  points: TrendPoint[]
}

/** Survey / touchpoint / channel lookups used by the trend dialog + response history. */
export const SVY = {
  fin: ["رضا ما بعد التمويل", "Post-financing satisfaction"],
  br: ["زيارة الفرع", "Branch visit"],
  cd: ["تفعيل البطاقة", "Card activation"],
} as const
export const TP = {
  disb: ["التمويل الشخصي › الصرف", "Personal financing › Disbursement"],
  appl: ["التمويل الشخصي › التقديم", "Personal financing › Application"],
  recp: ["زيارة الفرع › الاستقبال", "Branch visit › Reception"],
  tell: ["زيارة الفرع › الصرّاف", "Branch visit › Teller"],
  actv: ["البطاقات › التفعيل", "Cards › Activation"],
} as const
export const CH = {
  wa: ["واتساب", "WhatsApp"],
  em: ["البريد الإلكتروني", "Email"],
  sms: ["الرسائل النصية", "SMS"],
} as const

export const STATUS: Record<string, Kpi> = {
  cxi: {
    key: "cxi", label: ["CXI", "CXI"], full: ["مؤشر تجربة العميل", "Customer Experience Index"],
    min: 0, max: 100, dec: 0,
    composition: [["rec", 40], ["csat", 30], ["ces", 20], ["vfm", 10]],
    zones: [
      { from: 0, to: 50, d: "d5", ar: "حرج", en: "Critical" },
      { from: 50, to: 65, d: "d4", ar: "ضعيف", en: "Weak" },
      { from: 65, to: 80, d: "d3", ar: "جيد", en: "Good" },
      { from: 80, to: 90, d: "d2", ar: "قوي", en: "Strong" },
      { from: 90, to: 100, d: "d1", ar: "ممتاز", en: "Excellent" },
    ],
    points: [
      { d: "2025-02-19", v: 71, s: "fin", tp: "appl", ch: "sms" },
      { d: "2025-09-14", v: 68, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-01-22", v: 82, s: "br", tp: "tell", ch: "wa" },
      { d: "2026-04-05", v: 78, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-07-18", v: 73, s: "fin", tp: "disb", ch: "wa" },
    ],
  },
  rec: {
    key: "rec", label: ["NPS", "NPS"], full: ["صافي نقاط الترويج", "Net Promoter Score"], min: 0, max: 10, dec: 0,
    zones: [
      { from: 0, to: 6.5, d: "d5", ar: "منتقد", en: "Detractor" },
      { from: 6.5, to: 8.5, d: "d3", ar: "محايد", en: "Passive" },
      { from: 8.5, to: 10, d: "d1", ar: "مروّج", en: "Promoter" },
    ],
    points: [
      { d: "2024-05-12", v: 8, s: "br", tp: "recp", ch: "em" },
      { d: "2024-08-20", v: 6, s: "fin", tp: "appl", ch: "sms" },
      { d: "2024-11-08", v: 7, s: "br", tp: "recp", ch: "em" },
      { d: "2025-02-19", v: 9, s: "fin", tp: "appl", ch: "sms" },
      { d: "2025-05-27", v: 6, s: "br", tp: "tell", ch: "em" },
      { d: "2025-09-14", v: 8, s: "cd", tp: "actv", ch: "wa" },
      { d: "2025-11-30", v: 8, s: "br", tp: "recp", ch: "wa" },
      { d: "2026-01-22", v: 10, s: "br", tp: "tell", ch: "wa" },
      { d: "2026-04-05", v: 10, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-07-18", v: 9, s: "fin", tp: "disb", ch: "wa" },
    ],
  },
  csat: {
    key: "csat", label: ["CSAT", "CSAT"], full: ["رضا العميل", "Customer Satisfaction"], min: 1, max: 5, dec: 0,
    zones: [
      { from: 0, to: 2.5, d: "d5", ar: "ضعيف", en: "Weak" },
      { from: 2.5, to: 3.5, d: "d3", ar: "متوسط", en: "Average" },
      { from: 3.5, to: 5, d: "d2", ar: "جيد", en: "Good" },
    ],
    points: [
      { d: "2025-03-11", v: 4, s: "br", tp: "recp", ch: "em" },
      { d: "2025-08-22", v: 4, s: "fin", tp: "appl", ch: "sms" },
      { d: "2025-12-14", v: 5, s: "br", tp: "tell", ch: "wa" },
      { d: "2026-03-19", v: 4, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-06-02", v: 3, s: "br", tp: "recp", ch: "em" },
    ],
  },
  vfm: {
    key: "vfm", label: ["VFM", "VFM"], full: ["القيمة مقابل السعر", "Value for Money"], min: 1, max: 5, dec: 0,
    zones: [
      { from: 0, to: 2.5, d: "d5", ar: "ضعيفة", en: "Weak" },
      { from: 2.5, to: 3.5, d: "d3", ar: "متوسطة", en: "Fair" },
      { from: 3.5, to: 5, d: "d2", ar: "جيدة", en: "Good" },
    ],
    points: [
      { d: "2025-04-22", v: 4, s: "fin", tp: "appl", ch: "sms" },
      { d: "2025-10-09", v: 3, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-02-14", v: 2, s: "fin", tp: "disb", ch: "em" },
      { d: "2026-07-18", v: 3, s: "fin", tp: "disb", ch: "wa" },
    ],
  },
  ces: {
    key: "ces", label: ["CES", "CES"], full: ["جهد العميل", "Customer Effort Score"], min: 1, max: 7, dec: 0,
    zones: [
      { from: 0, to: 3.5, d: "d5", ar: "صعب", en: "Difficult" },
      { from: 3.5, to: 5.5, d: "d3", ar: "متوسط", en: "Moderate" },
      { from: 5.5, to: 7, d: "d2", ar: "سهل", en: "Easy" },
    ],
    points: [
      { d: "2025-06-18", v: 5, s: "fin", tp: "appl", ch: "sms" },
      { d: "2025-11-05", v: 5, s: "cd", tp: "actv", ch: "wa" },
      { d: "2026-03-09", v: 3, s: "fin", tp: "appl", ch: "sms" },
      { d: "2026-04-27", v: 6, s: "cd", tp: "actv", ch: "wa" },
    ],
  },
}

export const SECONDARY = ["csat", "ces", "vfm"] as const

// KPI helpers (mirror the prototype).
export const series = (k: Kpi) => k.points.map((p) => p.v)
export const latest = (k: Kpi) => k.points[k.points.length - 1].v
export const asOf = (k: Kpi) => k.points[k.points.length - 1].d
export const prevVal = (k: Kpi) => (k.points.length > 1 ? k.points[k.points.length - 2].v : null)
export const pct = (k: Kpi) => ((latest(k) - k.min) / (k.max - k.min)) * 100
export function bandOf(k: Kpi, v: number): { ar: string; en: string; d: DLevel } {
  const z = k.zones.filter((z) => v >= z.from).pop() ?? k.zones[0]
  return { ar: z.ar, en: z.en, d: z.d }
}
export const daysAgo = (iso: string) => Math.round((TODAY.getTime() - new Date(iso).getTime()) / 86400000)
export const stale = (iso: string) => daysAgo(iso) > 90

// ── Profile visibility (part of the tenant's profile setup) ──
export interface VisState {
  kpis: Record<string, boolean>
  cards: Record<string, boolean>
  sections: Record<string, boolean>
}
export const VIS_DEFAULT: VisState = {
  kpis: { cxi: true, rec: true, csat: true, ces: true, vfm: true },
  cards: { ltv: true, responses: true, lastTx: true, journeys: true },
  sections: { identity: true, data: true, consent: true, prefs: true, history: true },
}
export interface VisGroup {
  ar: string
  en: string
  g: "kpis" | "cards" | "sections"
  items: { k: string; ar: string; en: string; nAr?: string; nEn?: string; locked?: boolean }[]
}
export const VIS_GROUPS: VisGroup[] = [
  { ar: "المؤشرات", en: "KPIs", g: "kpis", items: [
    { k: "cxi", ar: "CXI", en: "CXI", nAr: "مؤشر مركّب من المؤشرات الأخرى — تركيبه ووزنه من M-06.", nEn: "A composite of the other KPIs — its weighting is set in M-06." },
    { k: "rec", ar: "NPS", en: "NPS", nAr: "يقود شارة حالة العميل — إخفاؤه يخفي الحالة والتصنيف معه.", nEn: "Drives the customer status badge — hiding it hides the status too." },
    { k: "csat", ar: "CSAT", en: "CSAT" },
    { k: "ces", ar: "CES", en: "CES" },
    { k: "vfm", ar: "VFM", en: "VFM" },
  ] },
  { ar: "بطاقات الملخص", en: "Summary cards", g: "cards", items: [
    { k: "ltv", ar: "القيمة الدائمة (LTV)", en: "Lifetime value (LTV)", nAr: "غير متاح حتى يُعرَّف المؤشر.", nEn: "N/A until the metric is defined." },
    { k: "responses", ar: "الاستجابات ومعدلها", en: "Responses & rate" },
    { k: "lastTx", ar: "آخر معاملة", en: "Last transaction" },
    { k: "journeys", ar: "الرحلات المشمولة", en: "Journeys touched" },
  ] },
  { ar: "الأقسام", en: "Sections", g: "sections", items: [
    { k: "identity", ar: "ترويسة الهوية", en: "Identity header", locked: true, nAr: "لا يمكن إخفاؤها — بها يُعرف العميل.", nEn: "Cannot be hidden — it identifies the customer." },
    { k: "data", ar: "بيانات الملف", en: "Profile data", locked: true, nAr: "لا يمكن إخفاؤها — هي الملف نفسه.", nEn: "Cannot be hidden — it is the profile itself." },
    { k: "consent", ar: "الموافقة والتواصل", en: "Consent & contact" },
    { k: "prefs", ar: "التفضيلات", en: "Preferences" },
    { k: "history", ar: "سجل الاستجابات", en: "Response history" },
  ] },
]

// ── Detected preferences (dominant value) ──
export interface Pref {
  icon: string
  title: [string, string]
  value: [string, string]
  pct: number
}
export const PREFS: Pref[] = [
  { icon: "globe", title: ["اللغة", "Language"], value: ["العربية", "Arabic"], pct: 78 },
  { icon: "chat", title: ["القناة", "Channel"], value: ["واتساب", "WhatsApp"], pct: 61 },
  { icon: "smartphone", title: ["الجهاز", "Device"], value: ["الجوال", "Mobile"], pct: 83 },
]

// ── Customers list ──
export type Consent = "in" | "out"
export interface Customer {
  id: string
  ar: string
  en: string
  tpl: "retail" | "corp"
  ty: string
  seg: string
  br: string
  mob: string
  resp: number
  inv: number
  cxi: number | null
  last: string
  consent: Consent
  vip?: boolean
  gender: string
  nat: string
  region: string
  dept: string
  products: string[]
}
export const CUSTOMERS: Customer[] = [
  { id: "CUS-0-4471", ar: "أحمد عبدالله المصري", en: "Ahmad Abdullah Al-Masri", tpl: "retail", ty: "retail", seg: "affluent", br: "abdoun", mob: "+962 79 552 4471", resp: 24, inv: 35, cxi: 73, last: "2026-07-18", consent: "in", vip: true, gender: "m", nat: "jo", region: "amman", dept: "retail", products: ["current", "financing", "card"] },
  { id: "CUS-0-7101", ar: "دانة إبراهيم الخطيب", en: "Dana Ibrahim Al-Khatib", tpl: "retail", ty: "retail", seg: "affluent", br: "abdoun", mob: "+962 79 336 7101", resp: 19, inv: 23, cxi: 81, last: "2026-07-28", consent: "in", gender: "f", nat: "jo", region: "amman", dept: "retail", products: ["current", "card"] },
  { id: "CUS-0-7745", ar: "خالد يوسف الزعبي", en: "Khaled Yousef Al-Zoubi", tpl: "retail", ty: "retail", seg: "affluent", br: "abdoun", mob: "+962 79 118 7745", resp: 21, inv: 28, cxi: 88, last: "2026-07-27", consent: "in", vip: true, gender: "m", nat: "jo", region: "amman", dept: "retail", products: ["current", "financing"] },
  { id: "CUS-0-2210", ar: "لينا سامي حدّاد", en: "Lina Sami Haddad", tpl: "retail", ty: "retail", seg: "affluent", br: "abdoun", mob: "+962 77 410 2210", resp: 18, inv: 22, cxi: 84, last: "2026-07-24", consent: "in", gender: "f", nat: "jo", region: "amman", dept: "retail", products: ["current"] },
  { id: "CUS-0-4408", ar: "مجموعة السلام الطبية", en: "Al-Salam Medical Group", tpl: "corp", ty: "corp", seg: "sme", br: "abdoun", mob: "+962 78 145 4408", resp: 8, inv: 10, cxi: 62, last: "2026-07-21", consent: "in", gender: "", nat: "jo", region: "amman", dept: "corp", products: ["account", "pos"] },
  { id: "CUS-0-8812", ar: "هند محمود العزّة", en: "Hind Mahmoud Al-Izzah", tpl: "retail", ty: "retail", seg: "affluent", br: "irbid", mob: "+962 79 773 8812", resp: 15, inv: 20, cxi: 74, last: "2026-07-15", consent: "in", gender: "f", nat: "jo", region: "irbid", dept: "retail", products: ["current", "card"] },
  { id: "CUS-0-9034", ar: "سائد حرب", en: "Saed Harb", tpl: "retail", ty: "retail", seg: "mass", br: "irbid", mob: "+962 78 331 9034", resp: 9, inv: 19, cxi: 58, last: "2026-07-09", consent: "in", gender: "m", nat: "jo", region: "irbid", dept: "retail", products: ["current"] },
  { id: "CUS-0-5518", ar: "نور الدين قاسم", en: "Nour Al-Din Qasem", tpl: "retail", ty: "retail", seg: "mass", br: "zarqa", mob: "+962 77 507 5518", resp: 0, inv: 4, cxi: null, last: "2026-07-02", consent: "in", gender: "m", nat: "jo", region: "zarqa", dept: "retail", products: ["current"] },
  { id: "CUS-0-1187", ar: "مؤسسة الوادي للتجارة", en: "Al-Wadi Trading Est.", tpl: "corp", ty: "corp", seg: "sme", br: "zarqa", mob: "+962 79 900 1187", resp: 12, inv: 14, cxi: 79, last: "2026-06-30", consent: "in", gender: "", nat: "jo", region: "zarqa", dept: "corp", products: ["account"] },
  { id: "CUS-0-3092", ar: "شركة الأفق للمقاولات", en: "Ufuq Contracting Co.", tpl: "corp", ty: "corp", seg: "sme", br: "zarqa", mob: "+962 78 664 3092", resp: 6, inv: 11, cxi: 66, last: "2026-06-14", consent: "in", gender: "", nat: "eg", region: "zarqa", dept: "corp", products: ["account", "pos"] },
  { id: "CUS-0-6620", ar: "رهام نايف العموش", en: "Reham Naif Al-Amoush", tpl: "retail", ty: "retail", seg: "mass", br: "irbid", mob: "+962 77 220 6620", resp: 3, inv: 16, cxi: 44, last: "2026-05-21", consent: "out", gender: "f", nat: "sy", region: "irbid", dept: "retail", products: ["current"] },
  { id: "CUS-0-1963", ar: "عمر فؤاد الشريف", en: "Omar Fuad Al-Sharif", tpl: "retail", ty: "retail", seg: "mass", br: "irbid", mob: "+962 77 882 1963", resp: 4, inv: 17, cxi: 47, last: "2026-04-30", consent: "out", gender: "m", nat: "jo", region: "irbid", dept: "retail", products: ["current", "card"] },
]

/** Parameters that can be filtered on (M-13 "Filterable" usage flag). */
export const FILTERABLE = ["customer_name", "mobile", "gender", "nationality", "customer_type", "customer_segment", "vip", "product", "branch", "region", "department"]
/** Customer record field for each filterable parameter code. */
export const FIELD_OF: Record<string, string> = { customer_name: "__name", mobile: "mob", gender: "gender", nationality: "nat", customer_type: "ty", customer_segment: "seg", vip: "vip", product: "products", branch: "br", region: "region", department: "dept" }
/** Enumerated filter values: code → [value, ar, en][]. */
export const VALUES: Record<string, [string, string, string][]> = {
  gender: [["m", "ذكر", "Male"], ["f", "أنثى", "Female"]],
  nationality: [["jo", "الأردن", "Jordan"], ["eg", "مصر", "Egypt"], ["sy", "سوريا", "Syria"]],
  customer_type: [["retail", "أفراد", "Retail"], ["corp", "شركات", "Corporate"]],
  customer_segment: [["affluent", "الثروات", "Affluent"], ["mass", "الأفراد العام", "Mass retail"], ["sme", "المنشآت الصغيرة", "SME"]],
  vip: [["true", "نعم", "Yes"], ["false", "لا", "No"]],
  product: [["current", "حساب جاري", "Current account"], ["financing", "تمويل شخصي", "Personal financing"], ["card", "بطاقة ائتمانية", "Credit card"], ["account", "حساب شركة", "Corporate account"], ["pos", "نقاط بيع", "POS"]],
  branch: [["abdoun", "فرع عبدون", "Abdoun"], ["irbid", "فرع إربد", "Irbid"], ["zarqa", "فرع الزرقاء", "Zarqa"]],
  region: [["amman", "عمّان", "Amman"], ["irbid", "إربد", "Irbid"], ["zarqa", "الزرقاء", "Zarqa"]],
  department: [["retail", "الخدمات المصرفية للأفراد", "Retail Banking"], ["corp", "الخدمات المؤسسية", "Corporate Banking"]],
}
export const SEG_LABEL: Record<string, [string, string]> = { affluent: ["الثروات", "Affluent"], mass: ["الأفراد العام", "Mass retail"], sme: ["المنشآت الصغيرة", "SME"] }
export const BR_LABEL: Record<string, [string, string]> = { abdoun: ["فرع عبدون", "Abdoun"], irbid: ["فرع إربد", "Irbid"], zarqa: ["فرع الزرقاء", "Zarqa"] }

export function vLabel(code: string, v: string, lang: Lang): string {
  const row = (VALUES[code] || []).find((x) => x[0] === v)
  return row ? (lang === "ar" ? row[1] : row[2]) : v
}

// ── The demo profile (Ahmad Al-Masri, CUS-0-4471) — static content ──
export const DEMO_PROFILE = {
  id: "CUS-0-4471",
  name: ["أحمد عبدالله المصري", "Ahmad Abdullah Al-Masri"] as [string, string],
  initials: "أ.م",
  created: "2024-11-08",
  vip: true,
  badges: [
    ["الثروات", "Affluent"],
    ["أفراد", "Retail"],
  ] as [string, string][],
  responseRate: { pct: 69, resp: 24, inv: 35, delta: "+6" },
  lastTx: { day: "18", month: ["يوليو", "Jul"] as [string, string], ago: ["قبل 12 يوماً · التمويل الشخصي", "12 days ago · Personal financing"] as [string, string] },
  journeys: { count: 3, list: ["التمويل · الفرع · البطاقات", "Financing · Branch · Cards"] as [string, string] },
  consent: {
    status: "in" as Consent,
    note: ["لم يُسجّل أي انسحاب. آخر تأكيد للموافقة: 2026-02-11.", "No opt-out on record. Consent last confirmed 2026-02-11."] as [string, string],
    lastContacted: ["2026-07-18 · واتساب", "2026-07-18 · WhatsApp"] as [string, string],
    suppressed: ["لا يوجد", "None"] as [string, string],
  },
}

// ── Response history (recent transactions on the demo profile) ──
export interface ResponseRow {
  date: string
  survey: [string, string]
  touchpoint: [string, string]
  channel: { icon: string; label: [string, string] }
  scores: { kpi: string; v: number; d: DLevel }[]
  sentiment: { d: DLevel; label: [string, string] }
}
export const RESPONSE_HISTORY: ResponseRow[] = [
  { date: "2026-07-18", survey: ["رضا ما بعد التمويل", "Post-financing satisfaction"], touchpoint: ["التمويل الشخصي › الصرف", "Personal financing › Disbursement"], channel: { icon: "chat", label: ["واتساب", "WhatsApp"] }, scores: [{ kpi: "NPS", v: 9, d: "d1" }, { kpi: "VFM", v: 3, d: "d3" }], sentiment: { d: "d2", label: ["إيجابي", "Positive"] } },
  { date: "2026-06-02", survey: ["زيارة الفرع", "Branch visit"], touchpoint: ["زيارة الفرع › الاستقبال", "Branch visit › Reception"], channel: { icon: "mail", label: ["البريد", "Email"] }, scores: [{ kpi: "CSAT", v: 3, d: "d3" }], sentiment: { d: "d3", label: ["محايد", "Neutral"] } },
  { date: "2026-04-27", survey: ["تفعيل البطاقة", "Card activation"], touchpoint: ["البطاقات › التفعيل", "Cards › Activation"], channel: { icon: "chat", label: ["واتساب", "WhatsApp"] }, scores: [{ kpi: "CES", v: 6, d: "d2" }], sentiment: { d: "d2", label: ["إيجابي", "Positive"] } },
  { date: "2026-03-09", survey: ["رضا ما بعد التمويل", "Post-financing satisfaction"], touchpoint: ["التمويل الشخصي › التقديم", "Personal financing › Application"], channel: { icon: "smartphone", label: ["الرسائل النصية", "SMS"] }, scores: [{ kpi: "CES", v: 3, d: "d5" }], sentiment: { d: "d4", label: ["سلبي", "Negative"] } },
  { date: "2026-01-22", survey: ["زيارة الفرع", "Branch visit"], touchpoint: ["زيارة الفرع › الصرّاف", "Branch visit › Teller"], channel: { icon: "chat", label: ["واتساب", "WhatsApp"] }, scores: [{ kpi: "NPS", v: 10, d: "d1" }], sentiment: { d: "d2", label: ["إيجابي", "Positive"] } },
]
export const RESPONSE_TOTAL = 24
