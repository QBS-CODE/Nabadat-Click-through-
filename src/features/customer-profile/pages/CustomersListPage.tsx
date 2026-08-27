// SCR-M03-01 — Customers List (M-03 Customer Profile).
//
// Ported from the ratified prototype `nabadat-m03-customer-profile-v4.3.html`
// (view `data-view="customers"`, lines 986–1096 + render/logic 2825–3068) and SRS §8.1.
// Layout & behaviour are faithful to the prototype; styling uses THIS app's design system.
// Bilingual by DATA (ar/en tuples) — the active language comes from `useDirection()`.
//
// FR-M03-022 fixes the table at FIVE columns (Customer · Segment · Branch · CXI · Last
// transaction). Mobile is searchable (BR-M03-003) but never a column; there is no response-rate
// or consent column — consent is an advanced filter only (FR-M03-019).

import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Inbox,
  LayoutTemplate,
  MoveRight,
  Search,
  Upload,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  bandOf,
  BR_LABEL,
  CATS,
  CUSTOMERS,
  EXISTING_PROFILES,
  FIELD_OF,
  FILTERABLE,
  M13_REGISTRY,
  pick,
  pickPair,
  SEG_LABEL,
  STATUS,
  TENANT_DEFAULTS,
  VALUES,
  vLabel,
  type Category,
  type Customer,
  type DLevel,
  type Lang,
  type M13Param,
} from "@/features/customer-profile/data"

/** Design-system UI Label: small-caps, tracked, muted — the table-header + group-heading treatment. */
const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

/** Sentinel value for the "Any / All" select option (base-ui Select dislikes an empty value). */
const ANY = "__any"

/** D1–D5 badge tints — the SAME light/dark tokens the customer profile uses (BR-M03-007). */
const D_BADGE: Record<DLevel, string> = {
  d1: "bg-d1-light text-d1-dark dark:bg-d1-dark/25 dark:text-d1-light",
  d2: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  d3: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  d4: "bg-d4-light text-d4-dark dark:bg-d4-dark/25 dark:text-d4-light",
  d5: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
}

/** Brand (never semantic) chip treatment reused for the VIP flag + result count.
 *  Matches the prototype badge: rounded-sm (8px), padding ~3px 10px, 12px semibold. */
const CYAN_PILL =
  "rounded-sm h-auto px-2.5 py-0.5 text-xs font-semibold bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"

// M-13 registry joined with the tenant's published field-setup defaults (category + on/off).
type Param = M13Param & { cat: Category["key"]; on: boolean }
const PARAMS: Param[] = M13_REGISTRY.map((p) => ({
  ...p,
  cat: TENANT_DEFAULTS[p.code]?.cat ?? "org",
  on: TENANT_DEFAULTS[p.code]?.on ?? false,
}))

// The advanced panel is generated from the "Filterable" M-13 usage flag (BR-M03-004), grouped
// by field category (FR-M03-017); a category with no filterable+included param is omitted.
const ADV_GROUPS = CATS.map((c) => ({
  cat: c,
  params: PARAMS.filter((p) => p.on && p.cat === c.key && FILTERABLE.includes(p.code)),
})).filter((g) => g.params.length > 0)

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

/** Which record field a parameter code reads (mirrors the prototype's `recVal`). */
function recordValue(c: Customer, code: string): string | string[] {
  const f = FIELD_OF[code]
  if (f === "__name") return `${c.ar} ${c.en}`
  if (code === "vip") return c.vip ? "true" : "false"
  return (c as unknown as Record<string, string | string[]>)[f]
}

export default function CustomersListPage() {
  const navigate = useNavigate()
  const { lang: rawLang, isRtl } = useDirection()
  const lang: Lang = rawLang === "ar" ? "ar" : "en"

  // The tenant is assumed configured for the clickthrough (the unconfigured first-run state
  // below renders when this is false — FR-M03-009).
  const configured = true

  const [search, setSearch] = useState("")
  // Advanced-filter state keyed by parameter code (+ the two non-parameter keys cxiBand/consent).
  // FR-M03-012: the quick Branch/Customer-category selects share this exact state, so they can
  // never diverge from their advanced twins and count as one filter each.
  const [adv, setAdv] = useState<Record<string, string>>({})
  const [advOpen, setAdvOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const pname = (p: Param) => pick(lang, p.defAr, p.defEn)

  // FR-M03-019 — CXI bands listed best-first (zones run d5→d1, so reverse).
  const cxiBands = useMemo(() => STATUS.cxi.zones.slice().reverse(), [])

  function setFilter(code: string, value: string) {
    setPage(1)
    setAdv((prev) => {
      const next = { ...prev }
      if (!value) delete next[code]
      else next[code] = value
      return next
    })
  }

  function clearFilters() {
    setPage(1)
    setAdv({})
    setSearch("")
  }

  // FR-M03-010/011/020 — AND-combined filter + case-insensitive substring search, recomputed on
  // every change. Deterministic total order (FR-M03-134): sort by active-language name, tiebreak
  // on customer_id.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    const matches = (c: Customer) => {
      for (const code of Object.keys(adv)) {
        const want = adv[code]
        if (!want) continue
        if (code === "cxiBand") {
          if (c.cxi === null || bandOf(STATUS.cxi, c.cxi).d !== want) return false
          continue
        }
        if (code === "consent") {
          if (c.consent !== want) return false
          continue
        }
        const got = recordValue(c, code)
        if (Array.isArray(got)) {
          if (!got.includes(want)) return false
          continue
        }
        if (VALUES[code]) {
          if (got !== want) return false
          continue
        }
        // Text/Phone: case-insensitive substring (name, mobile).
        if (!String(got ?? "").toLowerCase().includes(want.toLowerCase())) return false
      }
      return true
    }

    const rows = CUSTOMERS.filter((c) => {
      if (!matches(c)) return false
      if (q) {
        // Mobile stays in the haystack though it is not a column (BR-M03-003).
        const hay = `${c.id} ${c.ar} ${c.en} ${c.mob}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Prototype renders rows in source-array order (no client sort); match it.
    return rows
  }, [adv, search])

  // Pagination (FR-M03-027..031).
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const from = (currentPage - 1) * perPage
  const pageRows = filtered.slice(from, from + perPage)
  const isEmpty = filtered.length === 0

  // Active-filter count — treats quick + advanced as one set (FR-M03-012/015).
  const activeCount = Object.keys(adv).filter((k) => adv[k]).length

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-5 py-5">
      {/* ─── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {pick(lang, "العملاء", "Customers")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {configured
              ? pick(
                  lang,
                  `${EXISTING_PROFILES.toLocaleString("en-US")} ملفاً — يُنشأ كل ملف أو يُحدَّث تلقائياً عند وصول معاملة.`,
                  `${EXISTING_PROFILES.toLocaleString("en-US")} profiles — each one created or updated automatically when a transaction arrives.`,
                )
              : pick(lang, "لا ملفات بعد.", "No profiles yet.")}
          </p>
        </div>
        {/* FR-M03-007/008 — three actions; hidden entirely while unconfigured. One filled primary
            (Import), the rest secondary soft-cyan (BR-M03-001 / one-blue rule). */}
        {configured && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                toast.info(pick(lang, "يجري تنزيل القالب…", "Downloading template…"))
              }
            >
              <FileSpreadsheet className="size-4" />
              {pick(lang, "تنزيل قالب Excel", "Download Excel template")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info(pick(lang, "يجري تصدير القائمة…", "Exporting list…"))}
            >
              <Download className="size-4" />
              {pick(lang, "تصدير القائمة", "Export list")}
            </Button>
            <Button onClick={() => navigate("/customers/import")} data-testid="import-customers">
              <Upload className="size-4" />
              {pick(lang, "استيراد العملاء", "Import customers")}
            </Button>
          </div>
        )}
      </div>

      {!configured ? (
        /* ─── Unconfigured (first-run) state — FR-M03-009 ─────────────────────── */
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutTemplate className="mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-bold">
                {pick(lang, "هيّئ ملف العميل أولاً", "Set up the customer profile first")}
              </h3>
              <p className="mb-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                {pick(
                  lang,
                  "يحدّد إعداد الملف المعلومات التي تُحفظ عن كل عميل. لا يُنشئ النظام أي ملف قبل حفظ الإعداد، حتى لو وصلت معاملات.",
                  "The profile setup defines what is held about every customer. No profile is created until it is saved, even if transactions arrive.",
                )}
              </p>
              <Button onClick={() => navigate("/customers/setup")}>
                <MoveRight className={cn("size-4", isRtl && "rotate-180")} />
                {pick(lang, "ابدأ الإعداد", "Start the setup")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ─── Filters card ──────────────────────────────────────────────────── */}
          <Card>
            <CardContent>
              {/* Quick filter row — search spans two columns (FR-M03-007..012). */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <Label htmlFor="custSearch">{pick(lang, "بحث", "Search")}</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="custSearch"
                      type="search"
                      className="ps-9"
                      value={search}
                      placeholder={pick(
                        lang,
                        "الاسم أو معرّف العميل أو رقم الجوال",
                        "Name, customer ID, or mobile",
                      )}
                      onChange={(e) => {
                        setPage(1)
                        setSearch(e.target.value)
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fBranch">{pick(lang, "الفرع", "Branch")}</Label>
                  <Select
                    value={adv.branch || ANY}
                    onValueChange={(v) => setFilter("branch", v === ANY ? "" : (v ?? ""))}
                  >
                    <SelectTrigger id="fBranch" className="w-full">
                      <SelectValue>
                        {adv.branch
                          ? vLabel("branch", adv.branch, lang)
                          : pick(lang, "كل الفروع", "All branches")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>{pick(lang, "كل الفروع", "All branches")}</SelectItem>
                      {VALUES.branch.map(([v, ar, en]) => (
                        <SelectItem key={v} value={v}>
                          {pick(lang, ar, en)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fType">{pick(lang, "فئة العميل", "Customer category")}</Label>
                  <Select
                    value={adv.customer_type || ANY}
                    onValueChange={(v) => setFilter("customer_type", v === ANY ? "" : (v ?? ""))}
                  >
                    <SelectTrigger id="fType" className="w-full">
                      <SelectValue>
                        {adv.customer_type
                          ? vLabel("customer_type", adv.customer_type, lang)
                          : pick(lang, "كل الفئات", "All categories")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>{pick(lang, "كل الفئات", "All categories")}</SelectItem>
                      {VALUES.customer_type.map(([v, ar, en]) => (
                        <SelectItem key={v} value={v}>
                          {pick(lang, ar, en)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter status row — result count + clear (start) · advanced toggle (end). */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={CYAN_PILL}>
                    {filtered.length} {pick(lang, "نتيجة", "results")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={clearFilters}
                  >
                    <X className="size-4" />
                    {pick(lang, "مسح المرشّحات", "Clear filters")}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-expanded={advOpen}
                  aria-controls="advPanel"
                  onClick={() => setAdvOpen((o) => !o)}
                >
                  <Filter className="size-4" />
                  {pick(lang, "مرشّحات متقدّمة", "Advanced filters")}
                  {activeCount > 0 && (
                    <Badge variant="outline" className="rounded-sm tabular-nums">
                      {activeCount}
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      advOpen && "rotate-180",
                    )}
                  />
                </Button>
              </div>

              {/* Advanced panel — 300ms grid-rows collapse (FR-M03-015/016). */}
              <div
                id="advPanel"
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  advOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden border-t border-border pt-4">
                  {/* One column per category (reference layout): Identity · Demographics ·
                      Commercial · Organisational; Metrics & status follows into the first column.
                      `px-1` keeps input focus rings from being clipped by the overflow-hidden edge. */}
                  <div className="grid grid-cols-1 items-start gap-x-6 gap-y-6 px-1 sm:grid-cols-2 lg:grid-cols-4">
                    {ADV_GROUPS.map((g) => (
                      <div key={g.cat.key} className="space-y-3">
                        <div className={TH}>{pick(lang, g.cat.ar, g.cat.en)}</div>
                        <div className="space-y-4">
                          {g.params.map((p) => (
                            <div key={p.code} className="flex flex-col gap-1.5">
                              <Label htmlFor={`adv-${p.code}`} className="text-sm">
                                {pname(p)}
                              </Label>
                              {VALUES[p.code] ? (
                                <Select
                                  value={adv[p.code] || ANY}
                                  onValueChange={(v) =>
                                    setFilter(p.code, v === ANY ? "" : (v ?? ""))
                                  }
                                >
                                  <SelectTrigger id={`adv-${p.code}`} className="w-full">
                                    <SelectValue>
                                      {adv[p.code]
                                        ? vLabel(p.code, adv[p.code], lang)
                                        : pick(lang, "الكل", "Any")}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={ANY}>{pick(lang, "الكل", "Any")}</SelectItem>
                                    {VALUES[p.code].map(([v, ar, en]) => (
                                      <SelectItem key={v} value={v}>
                                        {pick(lang, ar, en)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  id={`adv-${p.code}`}
                                  value={adv[p.code] || ""}
                                  placeholder={pick(lang, "يحتوي على…", "contains…")}
                                  onChange={(e) => setFilter(p.code, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Metrics & status — CXI band + Consent are NOT M-13 params (BR-M03-005). */}
                    <div className="space-y-3">
                      <div className={TH}>{pick(lang, "مؤشرات وحالة", "Metrics & status")}</div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="adv-cxiBand" className="text-sm">
                            {pick(lang, "نطاق CXI", "CXI band")}
                          </Label>
                          <Select
                            value={adv.cxiBand || ANY}
                            onValueChange={(v) => setFilter("cxiBand", v === ANY ? "" : (v ?? ""))}
                          >
                            <SelectTrigger id="adv-cxiBand" className="w-full">
                              <SelectValue>
                                {adv.cxiBand
                                  ? pick(
                                      lang,
                                      cxiBands.find((b) => b.d === adv.cxiBand)?.ar ?? "",
                                      cxiBands.find((b) => b.d === adv.cxiBand)?.en ?? "",
                                    )
                                  : pick(lang, "الكل", "Any")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ANY}>{pick(lang, "الكل", "Any")}</SelectItem>
                              {cxiBands.map((z) => (
                                <SelectItem key={z.d} value={z.d}>
                                  {pick(lang, z.ar, z.en)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="adv-consent" className="text-sm">
                            {pick(lang, "الموافقة", "Consent")}
                          </Label>
                          <Select
                            value={adv.consent || ANY}
                            onValueChange={(v) => setFilter("consent", v === ANY ? "" : (v ?? ""))}
                          >
                            <SelectTrigger id="adv-consent" className="w-full">
                              <SelectValue>
                                {adv.consent === "in"
                                  ? pick(lang, "مشترك", "Subscribed")
                                  : adv.consent === "out"
                                    ? pick(lang, "منسحب", "Opted out")
                                    : pick(lang, "الكل", "Any")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ANY}>{pick(lang, "الكل", "Any")}</SelectItem>
                              <SelectItem value="in">{pick(lang, "مشترك", "Subscribed")}</SelectItem>
                              <SelectItem value="out">{pick(lang, "منسحب", "Opted out")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── Table card ────────────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
            {isEmpty ? (
              /* Empty state — replaces header, body and pager (FR-M03-026). */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="mb-4 size-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-bold">
                  {pick(lang, "لا يوجد عميل يطابق البحث", "No customer matches this search")}
                </h3>
                <p className="mb-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {pick(
                    lang,
                    "جرّب معرّف عميل أو اسماً مختلفاً، أو امسح المرشّحات للعودة إلى القائمة الكاملة.",
                    "Try a different customer ID or name, or clear the filters to return to the full list.",
                  )}
                </p>
                <Button onClick={clearFilters}>{pick(lang, "مسح المرشّحات", "Clear filters")}</Button>
              </div>
            ) : (
              <>
                <Table className="min-w-[720px]">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                      <TableHead className={cn(TH, "w-[38%]")}>
                        {pick(lang, "العميل", "Customer")}
                      </TableHead>
                      <TableHead className={TH}>{pick(lang, "الشريحة", "Segment")}</TableHead>
                      <TableHead className={TH}>{pick(lang, "الفرع", "Branch")}</TableHead>
                      <TableHead className={cn(TH, "text-end")}>CXI</TableHead>
                      <TableHead className={TH}>
                        {pick(lang, "آخر معاملة", "Last transaction")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((c) => {
                      const band = c.cxi === null ? null : bandOf(STATUS.cxi, c.cxi)
                      return (
                        <TableRow
                          key={c.id}
                          className="hover:bg-muted/50"
                          data-testid={`customer-row-${c.id}`}
                        >
                          {/* 1 · Customer — name link, VIP badge, id caption (FR-M03-024). */}
                          <TableCell>
                            <div className="flex min-w-0 flex-col items-start gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/customers/${c.id}`)}
                                  className="text-start font-semibold text-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                  {pick(lang, c.ar, c.en)}
                                </button>
                                {c.vip && (
                                  <Badge className={CYAN_PILL}>{pick(lang, "مميز", "VIP")}</Badge>
                                )}
                              </div>
                              <code
                                dir="ltr"
                                className="font-mono text-xs tracking-wide text-muted-foreground"
                              >
                                {c.id}
                              </code>
                            </div>
                          </TableCell>
                          {/* 2 · Segment */}
                          <TableCell>
                            {SEG_LABEL[c.seg] ? pickPair(lang, SEG_LABEL[c.seg]) : "—"}
                          </TableCell>
                          {/* 3 · Branch */}
                          <TableCell>
                            {BR_LABEL[c.br] ? pickPair(lang, BR_LABEL[c.br]) : "—"}
                          </TableCell>
                          {/* 4 · CXI — banded badge, or em dash when no responses (BR-M03-006). */}
                          <TableCell className="text-end tabular-nums">
                            {band ? (
                              <Badge
                                className={cn(D_BADGE[band.d], "rounded-sm h-auto px-2.5 py-0.5 text-xs font-semibold tabular-nums")}
                                title={pick(lang, band.ar, band.en)}
                              >
                                {c.cxi}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {/* 5 · Last transaction — ISO date, kept LTR */}
                          <TableCell className="tabular-nums">
                            <span dir="ltr">{c.last}</span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Pager (FR-M03-027) — hidden while empty (handled by the branch above). */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {pick(lang, "تُعرض ", "Showing ")}
                      <span dir="ltr" className="tabular-nums">
                        {from + 1}–{from + pageRows.length}
                      </span>
                      {pick(lang, " من ", " of ")}
                      <span dir="ltr" className="tabular-nums">
                        {filtered.length}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="perPage" className="text-sm text-muted-foreground">
                        {pick(lang, "سجلات في الصفحة", "Rows per page")}
                      </Label>
                      <Select
                        value={String(perPage)}
                        onValueChange={(v) => {
                          setPage(1)
                          setPerPage(Number(v))
                        }}
                      >
                        <SelectTrigger id="perPage" size="sm" className="w-auto">
                          <SelectValue>{perPage}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PER_PAGE_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <PrevIcon className="size-4" />
                      {pick(lang, "السابق", "Previous")}
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums" dir="ltr">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {pick(lang, "التالي", "Next")}
                      <NextIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
