// The customer-profile body — the rich, read-and-drill profile a CX manager sees.
//
// Extracted from CustomerProfilePage so the SCR-M03-06 preview dialog can render the
// EXACT same profile (the prototype's renderPreview clones the live profile node rather
// than re-describing it — a truthful preview, never a decorative one).
//
//  • `vis`      — when passed, hides the KPIs / summary cards / sections toggled off in the
//                 tenant's visibility setting (prototype applyVisibility). Omitted ⇒ show all.
//  • `preview`  — read-only mode: no drill-downs (KPI trend dialog is not wired), controls are
//                 disabled/inert, masked PII stays masked. The back link is page chrome and
//                 lives on CustomerProfilePage, not here.

import { useState } from "react"
import { toast } from "sonner"
import {
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"

import {
  CATS,
  DEMO_PROFILE,
  M13_REGISTRY,
  PREFS,
  RESPONSE_HISTORY,
  RESPONSE_TOTAL,
  SECONDARY,
  STATUS,
  TENANT_DEFAULTS,
  type Category,
  type DLevel,
  type Lang,
  type M13Param,
  type ValueRule,
  type VisState,
  asOf,
  bandOf,
  daysAgo,
  latest,
  pick,
  pickPair,
  prevVal,
  series,
  stale,
} from "../data"
import { KpiTrendDialog } from "./KpiTrendDialog"
import {
  D_BADGE,
  D_DOT_BG,
  D_TEXT,
  D_TINT_BG,
  D_TINT_TEXT,
  Sparkline,
  bLabel,
  fmt,
} from "./kpi-visuals"

// ── shared helpers ──
const t = (lang: Lang, ar: string, en: string) => pick(lang, ar, en)

/** Delta colour direction (up=good, down=warning; higher is always better). */
const DELTA_UP = "text-d2-dark dark:text-d2-light"
const DELTA_DOWN = "text-d4-dark dark:text-d4-light"

/** A drill affordance chevron — direction-aware, carries no data meaning. */
function DrillChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn("size-3.5 shrink-0 opacity-60 rtl:-scale-x-100", className)}
      aria-hidden="true"
    />
  )
}

function DeltaTag({ delta, dec }: { delta: number | null; dec: number }) {
  if (delta === null) return null
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : ""
  const col = !delta ? "text-muted-foreground" : delta > 0 ? DELTA_UP : DELTA_DOWN
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-bold", col)}>
      {!!delta && <Icon className="size-3" aria-hidden="true" />}
      <span className="tabular-nums">
        {sign}
        {fmt(Math.abs(delta), dec)}
      </span>
    </span>
  )
}

type OpenKpi = (k: string) => void

// ── CXI chip (identity header, end side) ──
function CxiChip({ lang, onOpen, preview }: { lang: Lang; onOpen: OpenKpi; preview: boolean }) {
  const k = STATUS.cxi
  const v = latest(k)
  const b = bandOf(k, v)
  const pv = prevVal(k)
  const delta = pv === null ? null : v - pv
  const drillLabel = `${pick(lang, k.full[0], k.full[1])} — ${t(lang, "عرض الاتجاه التفصيلي", "open detailed trend")}`
  const compTip = t(
    lang,
    "مؤشر تجربة العميل — مركّب من NPS ٤٠٪ · CSAT ٣٠٪ · CES ٢٠٪ · VFM ١٠٪ (من M-06)",
    "Customer Experience Index — composed of NPS 40% · CSAT 30% · CES 20% · VFM 10% (from M-06)"
  )
  return (
    <button
      type="button"
      onClick={() => onOpen("cxi")}
      disabled={preview}
      tabIndex={preview ? -1 : undefined}
      title={compTip}
      aria-label={drillLabel}
      className={cn(
        "flex w-full min-w-[220px] flex-col gap-2 rounded-md p-3 text-start transition-shadow motion-safe:transition-shadow",
        !preview && "hover:shadow-md",
        D_TINT_BG[b.d],
        D_TINT_TEXT[b.d]
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-widest uppercase opacity-75">CXI</span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{bLabel(b, lang)}</span>
          {!preview && <DrillChevron />}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-heading text-3xl font-bold tabular-nums">
          {v}
          <span className="text-sm font-medium opacity-70"> / {k.max}</span>
        </span>
        <Sparkline vals={series(k)} k={k} className="text-current" />
        {delta !== null && (
          <span className="flex items-center gap-1.5 text-xs font-bold">
            {delta > 0 ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            <span className="tabular-nums">
              {delta > 0 ? "+" : "−"}
              {Math.abs(delta)}
            </span>
          </span>
        )}
      </div>
    </button>
  )
}

// ── NPS status block (cell 1) ──
function StatusBlock({ lang, onOpen, preview }: { lang: Lang; onOpen: OpenKpi; preview: boolean }) {
  const rec = STATUS.rec
  const v = latest(rec)
  const band = bandOf(rec, v)
  const old = stale(asOf(rec))
  const drillLabel = `${pick(lang, rec.full[0], rec.full[1])} — ${t(lang, "عرض الاتجاه التفصيلي", "open detailed trend")}`
  return (
    <button
      type="button"
      onClick={() => onOpen("rec")}
      disabled={preview}
      tabIndex={preview ? -1 : undefined}
      title={pick(lang, rec.full[0], rec.full[1])}
      aria-label={drillLabel}
      className={cn(
        "flex flex-col gap-1 rounded-md p-4 text-start transition-shadow motion-safe:transition-shadow",
        !preview && "hover:shadow-md",
        D_TINT_BG[band.d],
        D_TINT_TEXT[band.d]
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-widest uppercase opacity-75">
          {t(lang, "الحالة", "Status")}
        </span>
        {!preview && <DrillChevron />}
      </div>
      <div className="mt-1 text-lg font-bold">{bLabel(band, lang)}</div>
      <div className="font-heading text-3xl font-bold tabular-nums">
        {v} <span className="text-sm font-medium opacity-60">/ {rec.max}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {old && (
          <Badge className="bg-muted text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {t(lang, "قديمة", "Stale")}
          </Badge>
        )}
        <span className="tabular-nums">
          {daysAgo(asOf(rec))} {t(lang, "يوماً", "days ago")}
        </span>
      </div>
    </button>
  )
}

// ── NPS score + mix + legend (cell 2) ──
function NpsScoreCell({ lang, onOpen, preview }: { lang: Lang; onOpen: OpenKpi; preview: boolean }) {
  const rec = STATUS.rec
  const v = latest(rec)
  const band = bandOf(rec, v)
  const pv = prevVal(rec)
  const delta = pv === null ? null : v - pv

  const counts: Record<string, number> = {}
  rec.zones.forEach((z) => (counts[z.d] = 0))
  series(rec).forEach((x) => counts[bandOf(rec, x).d]++)
  const legend = rec.zones.slice().reverse()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={cn("font-heading text-3xl font-bold tabular-nums", D_TEXT[band.d])}>
          {v}
          <span className="text-sm font-medium text-muted-foreground"> / {rec.max}</span>
        </span>
        <Sparkline vals={series(rec)} k={rec} className={D_TEXT[band.d]} />
        <DeltaTag delta={delta} dec={rec.dec} />
      </div>

      <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
        {t(lang, "آخر ", "Last ")}
        {rec.points.length} {t(lang, "استجابة", "responses")}
      </div>

      {/* mix bar — one segment per response, coloured by band */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {rec.points.map((pt, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-full", D_DOT_BG[bandOf(rec, pt.v).d])}
            title={`${pt.d} · ${pt.v}`}
          />
        ))}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {legend.map((z) => (
          <span key={z.d} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", D_DOT_BG[z.d])} />
            <span className="text-xs text-muted-foreground">{pick(lang, z.ar, z.en)}</span>
            <span className="text-xs font-bold tabular-nums">{counts[z.d] || 0}</span>
          </span>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={preview}
        tabIndex={preview ? -1 : undefined}
        className="self-start px-2 text-muted-foreground hover:text-foreground"
        onClick={() => onOpen("rec")}
      >
        {t(lang, "الاتجاه التفصيلي", "Detailed trend")}
      </Button>
    </div>
  )
}

// ── Suggested actions (cell 3) — deliberately not-yet-defined ──
function SuggestedActionsCell({ lang }: { lang: Lang }) {
  return (
    // Divider on the start edge on desktop (prototype `.nps-cell + .nps-cell`); stacks below lg.
    <div className="flex flex-col gap-1 lg:border-s lg:border-border lg:ps-6">
      <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
        {t(lang, "الإجراءات المقترحة", "Suggested actions")}
      </div>
      <div className="font-heading text-2xl font-bold text-muted-foreground">
        {t(lang, "غير متاح", "N/A")}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(lang, "بانتظار تعريف قواعد الإجراءات من الجهة المعنية.", "Awaiting the business definition of the action rules.")}
      </p>
    </div>
  )
}

// ── Secondary KPI mini-tile ──
function MiniTile({
  kpiKey,
  lang,
  onOpen,
  preview,
}: {
  kpiKey: string
  lang: Lang
  onOpen: OpenKpi
  preview: boolean
}) {
  const k = STATUS[kpiKey]
  const val = latest(k)
  const pv = prevVal(k)
  const old = stale(asOf(k))
  const band = bandOf(k, val)
  const delta = pv === null ? null : val - pv
  const drillLabel = `${pick(lang, k.full[0], k.full[1])} — ${t(lang, "عرض الاتجاه التفصيلي", "open detailed trend")}`
  return (
    <button
      type="button"
      onClick={() => onOpen(kpiKey)}
      disabled={preview}
      tabIndex={preview ? -1 : undefined}
      title={pick(lang, k.full[0], k.full[1])}
      aria-label={drillLabel}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-start transition-shadow motion-safe:transition-shadow",
        !preview && "hover:shadow-md",
        old && "opacity-90"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium tracking-wider uppercase text-muted-foreground">
          {pick(lang, k.label[0], k.label[1])}
        </span>
        {!preview && <DrillChevron />}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("font-heading text-2xl font-bold tabular-nums", D_TEXT[band.d])}>
          {fmt(val, k.dec)}
          <span className="text-xs font-medium text-muted-foreground"> / {k.max}</span>
        </span>
        <Sparkline vals={series(k)} k={k} className={cn("ms-auto", D_TEXT[band.d])} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <DeltaTag delta={delta} dec={k.dec} />
        <span className="text-xs tabular-nums text-muted-foreground">
          <span dir="ltr">{old ? `${t(lang, "قديمة · ", "stale · ")}${asOf(k)}` : asOf(k)}</span>
        </span>
      </div>
    </button>
  )
}

// ── Preferences / channel icon lookups ──
const PREF_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  chat: MessageCircle,
  smartphone: Smartphone,
}
const CHANNEL_ICONS: Record<string, LucideIcon> = {
  chat: MessageCircle,
  mail: Mail,
  smartphone: Smartphone,
}

// ── Profile-data model: person-scoped, enabled, switched-on params, by category ──
interface IncludedParam extends M13Param {
  cat: Category["key"]
}
const INCLUDED: IncludedParam[] = M13_REGISTRY.filter(
  (r) => r.scope === "person" && r.enabled
)
  .map((r) => ({ r, def: TENANT_DEFAULTS[r.code] }))
  .filter((x) => x.def && x.def.on)
  .map((x) => ({ ...x.r, cat: x.def!.cat }))

// The live working-setup field the preview reads (a subset of the setup's WorkingParam, so
// ProfilePreviewDialog can pass its params straight through). When supplied, the Profile-data
// section mirrors the working setup — renames, on/off, recategorise, add — instead of the
// tenant defaults; the sample value / PII / accum. flag still come off the M-13 registry shape.
export interface ProfileWorkingParam {
  code: string
  cat: Category["key"]
  on: boolean
  rule: ValueRule
  pii: boolean
  secret?: string
  ar: string
  en: string
  sAr?: string
  sEn?: string
}

/** One person-scoped field to render in the Profile-data card (normalised from either source). */
interface ProfileDataField {
  code: string
  cat: Category["key"]
  nameAr: string
  nameEn: string
  sAr?: string
  sEn?: string
  secret?: string
  pii: boolean
  rule: ValueRule
}

export function CustomerProfileView({
  vis,
  preview = false,
  params,
}: {
  vis?: VisState
  preview?: boolean
  params?: ProfileWorkingParam[]
}) {
  const { lang: rawLang } = useDirection()
  const lang = rawLang as Lang
  const [openKpi, setOpenKpi] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const dp = DEMO_PROFILE
  const onOpen: OpenKpi = preview ? () => {} : setOpenKpi

  // Profile-data fields: mirror the live working setup when `params` is supplied (the preview),
  // else fall back to the tenant defaults (the real standalone profile page).
  const dataFields: ProfileDataField[] = params
    ? params
        .filter((p) => p.on)
        .map((p) => ({
          code: p.code,
          cat: p.cat,
          nameAr: p.ar,
          nameEn: p.en,
          sAr: p.sAr,
          sEn: p.sEn,
          secret: p.secret,
          pii: p.pii,
          rule: p.rule,
        }))
    : INCLUDED.map((pm) => ({
        code: pm.code,
        cat: pm.cat,
        nameAr: pm.defAr,
        nameEn: pm.defEn,
        sAr: pm.sAr,
        sEn: pm.sEn,
        secret: pm.secret,
        pii: pm.pii,
        rule: pm.rule,
      }))

  // Visibility gates — everything on when no `vis` supplied (the standalone profile page).
  const kOn = (k: string) => !vis || !!vis.kpis[k]
  const cOn = (k: string) => !vis || !!vis.cards[k]
  const sOn = (k: string) => !vis || !!vis.sections[k]

  const anyCard = cOn("ltv") || cOn("responses") || cOn("lastTx") || cOn("journeys")
  const npsShown = kOn("rec")
  const secondary = SECONDARY.filter((k) => kOn(k))
  // NPS off means no status classification exists to show — only the secondary tiles remain.
  const showKpiCard = ["cxi", "rec", ...SECONDARY].some((k) => kOn(k))
  const showConsent = sOn("consent")
  const showPrefs = sOn("prefs")

  return (
    <div className="space-y-5">
      {/* Identity header */}
      {sOn("identity") && (
        <Card>
          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-nb-mint to-nb-cyan font-heading text-xl font-bold text-white">
                {dp.initials}
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {dp.vip && (
                    <Badge className="bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                      <Star className="size-3" aria-hidden="true" />
                      {t(lang, "عميل مميز", "VIP")}
                    </Badge>
                  )}
                  {dp.badges.map((bd, i) => (
                    <Badge key={i} variant="outline">
                      {pickPair(lang, bd)}
                    </Badge>
                  ))}
                </div>
                <h1 className="truncate font-heading text-2xl font-bold">{pickPair(lang, dp.name)}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <code className="font-mono text-sm text-muted-foreground">{dp.id}</code>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {t(lang, "أُنشئ", "Created")} <span dir="ltr" className="tabular-nums">{dp.created}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 lg:items-end">
              {kOn("cxi") && <CxiChip lang={lang} onOpen={onOpen} preview={preview} />}
              {/* Always a sibling of the CXI chip — the locked note stays even when CXI is hidden. */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {t(lang, "ملف مُدار آليًا — يُحدَّث مع كل معاملة", "System-maintained — updated on every transaction")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {anyCard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cOn("ltv") && (
            <Card>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium tracking-wider uppercase text-muted-foreground">
                    {t(lang, "القيمة الدائمة للعميل", "Lifetime value")}
                  </span>
                  <Badge className="bg-muted text-muted-foreground">LTV</Badge>
                </div>
                <div className="font-heading text-3xl font-bold text-muted-foreground">
                  {t(lang, "غير متاح", "N/A")}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(lang, "بانتظار تعريف المؤشر وطريقة حسابه.", "Awaiting a business definition and calculation.")}
                </p>
              </CardContent>
            </Card>
          )}

          {cOn("responses") && (
            <Card>
              <CardContent className="space-y-1">
                <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  {t(lang, "معدل الاستجابة", "Response rate")}
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums">{dp.responseRate.pct}%</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    <span className="tabular-nums">{dp.responseRate.resp}</span>{" "}
                    {t(lang, `من ${dp.responseRate.inv} دعوة`, `of ${dp.responseRate.inv} invitations`)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cn("flex items-center gap-1.5 font-semibold", DELTA_UP)}>
                    <TrendingUp className="size-3" aria-hidden="true" />
                    <span className="tabular-nums">{t(lang, `${dp.responseRate.delta} نقاط`, `${dp.responseRate.delta} pts`)}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {cOn("lastTx") && (
            <Card>
              <CardContent className="space-y-1">
                <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  {t(lang, "آخر معاملة", "Last transaction")}
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums">
                  {dp.lastTx.day} <span className="text-lg">{pickPair(lang, dp.lastTx.month)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{pickPair(lang, dp.lastTx.ago)}</div>
              </CardContent>
            </Card>
          )}

          {cOn("journeys") && (
            <Card>
              <CardContent className="space-y-1">
                <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  {t(lang, "الرحلات المشمولة", "Journeys touched")}
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums">{dp.journeys.count}</div>
                <div className="text-xs text-muted-foreground">{pickPair(lang, dp.journeys.list)}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Experience (KPIs) */}
      {showKpiCard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {t(lang, "تجربة هذا العميل", "This customer's experience")}
            </CardTitle>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(
                lang,
                "تُحدَّد من أحدث استجابة لكل مؤشر — لا من متوسط عمر العميل، لأن المتوسط يخفي التحوّل الأخير.",
                "Taken from the latest response for each metric — not a lifetime average, which would hide the most recent shift."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {npsShown && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <StatusBlock lang={lang} onOpen={onOpen} preview={preview} />
                <NpsScoreCell lang={lang} onOpen={onOpen} preview={preview} />
                <SuggestedActionsCell lang={lang} />
              </div>
            )}
            {secondary.length > 0 && (
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 sm:grid-cols-3",
                  npsShown && "border-t border-border pt-4"
                )}
              >
                {secondary.map((key) => (
                  <MiniTile key={key} kpiKey={key} lang={lang} onOpen={onOpen} preview={preview} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consent + Preferences */}
      {(showConsent || showPrefs) && (
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            showConsent && showPrefs && "lg:grid-cols-2"
          )}
        >
          {showConsent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  {t(lang, "الموافقة والتواصل", "Consent & contact")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                      {t(lang, "حالة الموافقة", "Consent status")}
                    </span>
                    <Badge className={D_BADGE.d2}>
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      {t(lang, "مشترك", "Subscribed")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {pickPair(lang, dp.consent.note)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t(lang, "آخر تواصل", "Last contacted")}</span>
                    <span className="text-sm font-medium tabular-nums">
                      <span dir="ltr">{pickPair(lang, dp.consent.lastContacted)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t(lang, "قنوات مستبعدة", "Suppressed channels")}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {pickPair(lang, dp.consent.suppressed)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showPrefs && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">{t(lang, "التفضيلات", "Preferences")}</CardTitle>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(lang, "القيمة السائدة، تُستنتج من كل معاملة.", "The dominant value, inferred from each transaction.")}
                </p>
              </CardHeader>
              <CardContent>
                {/* Prototype .pref-item: [icon] [label 1fr] [value·end] [pct·muted], divided by
                    a top border — the dominant value sits on the end side beside the percentage. */}
                {PREFS.map((p, i) => {
                  const Icon = PREF_ICONS[p.icon] ?? Globe
                  return (
                    <div
                      key={i}
                      className={cn(
                        "grid grid-cols-[16px_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-2.5",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate text-sm text-muted-foreground">{pickPair(lang, p.title)}</span>
                      <span className="truncate text-end text-sm font-semibold">{pickPair(lang, p.value)}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{p.pct}%</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Profile data */}
      {sOn("data") && (
        <Card>
          <CardHeader className="flex flex-col items-start gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">{t(lang, "بيانات الملف", "Profile data")}</CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(
                  lang,
                  "الحقول هي حقول إعداد الملف لهذه المنشأة. تُدمج القيم مع كل معاملة، والقيمة الفارغة الواردة لا تمحو بياناً قائماً.",
                  "These are the fields defined in this organisation's profile setup. Values merge on each transaction, and an empty incoming value never erases stored data."
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={preview}
              tabIndex={preview ? -1 : undefined}
              className="shrink-0 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const next = !revealed
                setRevealed(next)
                toast(
                  next
                    ? pick(
                        lang,
                        "كُشفت البيانات — سُجّل الوصول في سجل التدقيق",
                        "Data revealed — the access was written to the audit log",
                      )
                    : pick(lang, "أُعيد حجب البيانات", "Data masked again"),
                )
              }}
            >
              {revealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              {revealed
                ? t(lang, "حجب البيانات", "Hide data")
                : t(lang, "إظهار البيانات المحجوبة", "Reveal masked data")}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {CATS.map((c) => {
                const mine = dataFields.filter((pm) => pm.cat === c.key)
                if (!mine.length) return null
                return (
                  <div key={c.key}>
                    {/* Category header — underlined (prototype .attr-col > .ui-label). */}
                    <div className="mb-px border-b border-border pb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {pick(lang, c.ar, c.en)}
                    </div>
                    {/* One line per field: label on the start, value on the end (prototype .attr-line). */}
                    {mine.map((pm, idx) => {
                      const name = pick(lang, pm.nameAr, pm.nameEn)
                      const masked = pick(lang, pm.sAr ?? "", pm.sEn ?? "")
                      const value = pm.pii && pm.secret && revealed ? pm.secret : masked
                      const mono = pm.code === "customer_id" || pm.pii
                      return (
                        <div
                          key={pm.code}
                          className={cn(
                            "flex items-baseline justify-between gap-2.5 py-1.5",
                            idx > 0 && "border-t border-border/40",
                          )}
                        >
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {name || <span className="italic">{t(lang, "بلا اسم", "unnamed")}</span>}
                          </span>
                          <span className="flex min-w-0 flex-wrap items-baseline justify-end gap-1.5 text-end">
                            <span className={cn("text-[13px] font-semibold", mono && "font-mono text-xs")}>
                              {value}
                            </span>
                            {pm.rule === "all" && (
                              <Badge className="bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                                {t(lang, "متراكم", "accum.")}
                              </Badge>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response history */}
      {sOn("history") && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">{t(lang, "سجل الاستجابات", "Response history")}</CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(lang, "كل معاملة أنشأت هذا الملف أو حدّثته.", "Every transaction that created or updated this profile.")}
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled={preview} tabIndex={preview ? -1 : undefined} className="shrink-0">
              {t(lang, `عرض الكل (${RESPONSE_TOTAL})`, `View all (${RESPONSE_TOTAL})`)}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(lang, "التاريخ", "Date")}</TableHead>
                    <TableHead>{t(lang, "الاستبيان", "Survey")}</TableHead>
                    <TableHead>{t(lang, "الرحلة ونقطة التماس", "Journey & touchpoint")}</TableHead>
                    <TableHead>{t(lang, "القناة", "Channel")}</TableHead>
                    <TableHead className="text-end">{t(lang, "النتيجة", "Score")}</TableHead>
                    <TableHead>{t(lang, "المشاعر", "Sentiment")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RESPONSE_HISTORY.map((row, i) => {
                    const ChIcon = CHANNEL_ICONS[row.channel.icon] ?? MessageCircle
                    return (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="tabular-nums">
                          <span dir="ltr">{row.date}</span>
                        </TableCell>
                        <TableCell>{pickPair(lang, row.survey)}</TableCell>
                        <TableCell className="text-muted-foreground">{pickPair(lang, row.touchpoint)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <ChIcon className="size-3" aria-hidden="true" />
                            {pickPair(lang, row.channel.label)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <span className="inline-flex flex-wrap justify-end gap-1">
                            {row.scores.map((sc, j) => (
                              <Badge key={j} className={D_BADGE[sc.d as DLevel]}>
                                {sc.kpi} {sc.v}
                              </Badge>
                            ))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={D_BADGE[row.sentiment.d]}>
                            <span className={cn("size-1.5 rounded-full", D_DOT_BG[row.sentiment.d])} />
                            {pickPair(lang, row.sentiment.label)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI trend drilldown — interactive profile only (preview is read-only) */}
      {!preview && <KpiTrendDialog kpiKey={openKpi} lang={lang} onClose={() => setOpenKpi(null)} />}
    </div>
  )
}
