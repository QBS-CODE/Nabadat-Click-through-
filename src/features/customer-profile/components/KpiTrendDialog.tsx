// SCR-M03-05 — KPI Trend dialog. Answers "how did this customer reach this
// score?" for one metric: tinted stat tiles, a custom banded trend chart, and
// the response table (newest first). Bilingual by data via `pick`.

import { X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  CH,
  SVY,
  TP,
  STATUS,
  type Kpi,
  type Lang,
  asOf,
  bandOf,
  daysAgo,
  latest,
  pick,
  series,
  stale,
} from "../data"
import {
  D_BADGE,
  D_TINT_BG,
  D_TINT_TEXT,
  TrendChart,
  bLabel,
  fmt,
  mean,
} from "./kpi-visuals"

export function KpiTrendDialog({
  kpiKey,
  lang,
  onClose,
}: {
  kpiKey: string | null
  lang: Lang
  onClose: () => void
}) {
  const k = kpiKey ? STATUS[kpiKey] : undefined

  return (
    <Dialog open={!!k} onOpenChange={(o) => !o && onClose()}>
      {k && <KpiTrendBody k={k} lang={lang} />}
    </Dialog>
  )
}

function KpiTrendBody({ k, lang }: { k: Kpi; lang: Lang }) {
  const vals = series(k)
  const val = latest(k)
  const b = bandOf(k, val)
  const hi = Math.max(...vals)
  const lo = Math.min(...vals)
  const hiP = k.points.find((p) => p.v === hi)!
  const loP = k.points.find((p) => p.v === lo)!
  const bHi = bandOf(k, hi)
  const bLo = bandOf(k, lo)
  const old = stale(asOf(k))

  const t = (ar: string, en: string) => pick(lang, ar, en)

  const stats: {
    v: string
    d: (typeof b)["d"] | null
    band: string | null
    k: string
  }[] = [
    { v: `${fmt(val, k.dec)} / ${k.max}`, d: b.d, band: bLabel(b, lang), k: t("أحدث قيمة — هي الحالة", "Latest — this is the status") },
    { v: fmt(hi, k.dec), d: bHi.d, band: bLabel(bHi, lang), k: t("الأعلى · ", "Highest · ") + hiP.d.slice(0, 7) },
    { v: fmt(lo, k.dec), d: bLo.d, band: bLabel(bLo, lang), k: t("الأدنى · ", "Lowest · ") + loP.d.slice(0, 7) },
    { v: fmt(mean(vals), 1), d: null, band: null, k: t("متوسط الفترة — للسياق لا للحالة", "Period average — context, not status") },
  ]

  const rows = k.points.slice().reverse()

  return (
    <DialogContent
      showCloseButton={false}
      className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl"
    >
      <DialogClose
        render={<Button variant="ghost" size="icon" />}
        className="absolute end-3 top-3 z-10"
        aria-label="Close"
      >
        <X className="size-4" />
      </DialogClose>
      <DialogHeader className="shrink-0 border-b border-border p-5 pe-14 text-start">
        <DialogTitle className="text-base font-bold">
          {pick(lang, k.label[0], k.label[1])} · {t("اتجاه العميل", "customer trend")}
        </DialogTitle>
        <DialogDescription className="text-xs leading-relaxed">
          {pick(lang, k.full[0], k.full[1])} · <span dir="ltr" className="tabular-nums">{k.points.length}</span>{" "}
          {t("استجابة", "responses")} · <span dir="ltr" className="tabular-nums">{k.points[0].d} → {asOf(k)}</span>
          {old && (
            <>
              {" · "}
              {t("أحدث قيمة عمرها ", "latest is ")}
              <span dir="ltr" className="tabular-nums">{daysAgo(asOf(k))}</span>
              {t(" يوماً", " days old")}
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {/* stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((x, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md px-3 py-2.5",
                x.d ? cn(D_TINT_BG[x.d], D_TINT_TEXT[x.d]) : "bg-muted/40 text-foreground"
              )}
            >
              <div className="font-heading text-lg font-bold tabular-nums">{x.v}</div>
              {x.band && <div className="text-xs font-semibold">{x.band}</div>}
              <div className="mt-0.5 text-[11px] leading-snug opacity-80">{x.k}</div>
            </div>
          ))}
        </div>

        {/* trend chart */}
        <div className="rounded-md border border-border bg-card p-3">
          <TrendChart k={k} lang={lang} />
        </div>

        {/* dashed-line caption */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "الخط المتقطّع هو متوسط الفترة، ويُعرض للسياق لا لتحديد الحالة: المتوسط يفقد حساسيته مع تراكم الاستجابات فيخفي التحوّل الأخير.",
            "The dashed line is the period average, shown for context and not to set status: a mean loses sensitivity as responses accumulate, hiding the most recent shift."
          )}
        </p>

        {/* composition (composite metric only) */}
        {k.composition && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("مركّب من: ", "Composed of: ")}
            {k.composition
              .map((c) => `${pick(lang, STATUS[c[0]].label[0], STATUS[c[0]].label[1])} ${c[1]}%`)
              .join(" · ")}
          </p>
        )}

        {/* response table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Cells wrap (no whitespace-nowrap) so all six columns fit without a horizontal
              scroll — the prototype lets Date/Survey/Touchpoint wrap instead of scrolling. */}
          <Table className="[&_td]:align-top [&_td]:whitespace-normal [&_th]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("الاستبيان", "Survey")}</TableHead>
                <TableHead>{t("نقطة التماس", "Touchpoint")}</TableHead>
                <TableHead>{t("القناة", "Channel")}</TableHead>
                <TableHead className="text-end">{t("القيمة", "Value")}</TableHead>
                <TableHead>{t("التصنيف", "Band")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, i) => {
                const pb = bandOf(k, p.v)
                return (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">
                      <span dir="ltr">{p.d}</span>
                    </TableCell>
                    <TableCell>{pick(lang, SVY[p.s][0], SVY[p.s][1])}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {pick(lang, TP[p.tp][0], TP[p.tp][1])}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pick(lang, CH[p.ch][0], CH[p.ch][1])}</Badge>
                    </TableCell>
                    <TableCell className="text-end font-bold tabular-nums">
                      {fmt(p.v, k.dec)}
                    </TableCell>
                    <TableCell>
                      <Badge className={D_BADGE[pb.d]}>{bLabel(pb, lang)}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogContent>
  )
}
