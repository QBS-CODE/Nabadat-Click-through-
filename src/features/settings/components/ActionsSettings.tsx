import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Minus, Plus, AlertCircle, History, RotateCcw } from "lucide-react"

import { useDirection } from "@/hooks/use-direction"
import { useSettings } from "@/contexts/settings-context"
import { ACTIONS_DEFAULTS, LARGEST_SAVED_UPPER } from "@/data/mock-settings"
import { ThresholdSlider } from "@/components/cx/threshold-slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Settings › Actions (SET-1 / SET-2) ───────────────────────────────────────
// Tenant-wide parameters for the Action Management module, styled with the survey
// builder's card + control primitives. Each setting pairs its control with a wide
// live preview so the effect on the KPI Target sliders is visible while editing.

const round1 = (v: number) => Math.round(v * 10) / 10

// ── Small stepper (− input +) — 40px control family ──
function Stepper({
  value, onChange, step, min, decimal, ariaLabel, invalid, testId,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  decimal?: boolean
  ariaLabel: string
  invalid?: boolean
  testId?: string
}) {
  const bump = (dir: 1 | -1) => {
    const next = decimal ? round1(value + dir * step) : Math.round(value + dir * step)
    onChange(Math.max(min, next))
  }
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button" variant="outline" size="icon"
        aria-label={`${ariaLabel} −`} onClick={() => bump(-1)}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        step={step}
        min={min}
        value={value}
        aria-label={ariaLabel}
        data-testid={testId}
        onChange={(e) => {
          const n = e.currentTarget.valueAsNumber
          if (!Number.isNaN(n)) onChange(decimal ? round1(n) : Math.round(n))
        }}
        className={cn(
          "w-24 text-center tabular-nums font-mono",
          invalid && "border-destructive focus-visible:ring-destructive",
        )}
      />
      <Button
        type="button" variant="outline" size="icon"
        aria-label={`${ariaLabel} +`} onClick={() => bump(1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

// ── SET-2 preview: baseline-anchored zone slider with PAD track extension ──
const ZVBW = 900
const ZVBH = 78
const ZX0 = 26
const ZX1 = ZVBW - ZX0
const ZW = ZX1 - ZX0
const ZY = 30
const ZH = 14

function ZonePaddingPreview({ pad, isRtl }: { pad: number; isRtl: boolean }) {
  // Illustrative Target: Baseline 69, Lower +2, Upper +6, Current 73.
  const B = 69, lowPt = 71, upPt = 75, current = 73
  const min = B - pad
  const max = upPt + pad
  const span = max - min || 1
  const xOf = (v: number) => {
    const f = Math.min(1, Math.max(0, (v - min) / span))
    return ZX0 + (isRtl ? 1 - f : f) * ZW
  }
  const zone = (a: number, b: number, fill: string, key: string) => {
    const x1 = xOf(a), x2 = xOf(b)
    const x = Math.min(x1, x2), w = Math.abs(x2 - x1)
    return <rect key={key} x={x} y={ZY} width={w} height={ZH} fill={fill} />
  }
  const mark = (v: number, label: string, color: string) => {
    const x = xOf(v)
    return (
      <g key={`m-${label}`}>
        <line x1={x} y1={ZY - 6} x2={x} y2={ZY + ZH + 6} stroke={color} strokeWidth={2} />
        <text x={x} y={ZY - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
          {label}
        </text>
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${ZVBW} ${ZVBH}`} width="100%" preserveAspectRatio="xMidYMid meet"
      className="select-none" role="img" aria-hidden="true">
      <rect className="fill-muted" x={ZX0} y={ZY} width={ZW} height={ZH} rx={ZH / 2} />
      <g clipPath="url(#zpad-clip)">
        {zone(min, lowPt, "var(--color-d5)", "z-r")}
        {zone(lowPt, upPt, "var(--color-d3)", "z-y")}
        {zone(upPt, max, "var(--color-d2)", "z-g")}
      </g>
      <defs>
        <clipPath id="zpad-clip">
          <rect x={ZX0} y={ZY} width={ZW} height={ZH} rx={ZH / 2} />
        </clipPath>
      </defs>
      {/* Edge value ticks */}
      {[min, lowPt, upPt, max].map((v) => {
        const x = xOf(v)
        return (
          <g key={`t-${v}`} aria-hidden="true">
            <line className="stroke-muted-foreground/40" x1={x} y1={ZY + ZH + 2} x2={x} y2={ZY + ZH + 6} strokeWidth={1} />
            <text className="fill-muted-foreground" x={x} y={ZY + ZH + 18} textAnchor="middle" fontSize={9}>
              {Math.round(v)}
            </text>
          </g>
        )
      })}
      {mark(B, "B", "var(--foreground)")}
      {mark(current, "C", "var(--primary)")}
    </svg>
  )
}

// ── Preview panel wrapper ──
function PreviewPanel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  )
}

// ── Scope pill (SET-1 / SET-2) — brand cyan, carries no status meaning ──
function SetCode({ code }: { code: string }) {
  return (
    <span className="rounded-sm bg-nb-cyan-100 px-2 py-0.5 text-xs font-bold tracking-wide text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
      {code}
    </span>
  )
}

export function ActionsSettings() {
  const { isRtl } = useDirection()
  const { actionsConfig, saveActions } = useSettings()
  const t = (en: string, ar: string) => (isRtl ? ar : en)

  const [maxX, setMaxX] = useState(actionsConfig.maxUpperThreshold)
  const [pad, setPad] = useState(actionsConfig.sliderPadding)

  useEffect(() => {
    setMaxX(actionsConfig.maxUpperThreshold)
    setPad(actionsConfig.sliderPadding)
  }, [actionsConfig])

  // Validation (SET-1 guard + SET-2 range).
  const xError =
    Number.isNaN(maxX) || maxX <= 0
      ? t("Value must be greater than 0", "يجب أن تكون القيمة أكبر من 0")
      : round1(maxX) !== maxX
        ? t("Only one decimal place is allowed", "يُسمح بخانة عشرية واحدة فقط")
        : maxX < LARGEST_SAVED_UPPER
          ? t(
              `Cannot go below an existing Upper Threshold (${LARGEST_SAVED_UPPER})`,
              `لا يمكن أن تقل عن حدّ أعلى مُسجَّل (${LARGEST_SAVED_UPPER})`,
            )
          : ""

  const padError =
    Number.isNaN(pad) || pad < 1 || !Number.isInteger(pad)
      ? t("PAD must be a whole number ≥ 1", "يجب أن يكون العدد صحيحاً ≥ 1")
      : ""

  const invalid = !!(xError || padError)
  const dirty = maxX !== actionsConfig.maxUpperThreshold || pad !== actionsConfig.sliderPadding

  const handleReset = () => {
    setMaxX(ACTIONS_DEFAULTS.maxUpperThreshold)
    setPad(ACTIONS_DEFAULTS.sliderPadding)
    toast.message(t("Reset to defaults (not yet saved)", "أُعيدت القيم الافتراضية (لم تُحفظ بعد)"))
  }

  const handleSave = () => {
    if (invalid) {
      toast.error(t("Fix the highlighted values first", "صحّح القيم المميّزة أولاً"))
      return
    }
    saveActions({ maxUpperThreshold: maxX, sliderPadding: pad })
    toast.success(
      t("Action settings saved — applies tenant-wide", "حُفظت إعدادات الإجراءات — تُطبَّق على مستوى المؤسسة"),
    )
  }

  return (
    <div className="space-y-4">
      {/* SET-1 — Maximum Upper Threshold */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("Maximum Upper Threshold", "الحدّ الأعلى الأقصى")}
            <SetCode code="SET-1" />
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {t(
              "The maximum value (X) allowed for a KPI Target's threshold slider. Every Add / Edit Action slider runs on a 0 → X scale and the Upper Threshold cannot exceed it. Applies to all Actions tenant-wide.",
              "أقصى قيمة (X) مسموح بها لمنزلق حدّ هدف المؤشّر. يعمل كل منزلق إضافة/تعديل إجراء على مقياس 0 ← X ولا يمكن أن يتجاوزه الحدّ الأعلى. يُطبَّق على جميع الإجراءات على مستوى المؤسسة.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <div className="space-y-2">
            <Label className="block leading-snug">
              {t("Value (X)", "القيمة (X)")}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {t("— default 20", "— الافتراضي 20")}
              </span>
            </Label>
            <Stepper
              value={maxX} onChange={setMaxX} step={0.5} min={0.5} decimal
              ariaLabel={t("Maximum upper threshold", "الحدّ الأعلى الأقصى")}
              invalid={!!xError} testId="set-max-x"
            />
            <p className="text-xs text-muted-foreground">
              {t("Greater than 0 · one decimal place allowed", "أكبر من 0 · يُسمح بخانة عشرية واحدة")}
            </p>
            {xError ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                <AlertCircle className="size-4 shrink-0" />
                {xError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("Largest Upper Threshold saved in this tenant: ", "أكبر حدّ أعلى مُسجَّل في المؤسسة: ")}
                <span className="font-mono font-semibold text-foreground tabular-nums">{LARGEST_SAVED_UPPER}</span>
                {t(" — X cannot go below this.", " — لا يمكن أن تقلّ X عنه.")}
              </p>
            )}
          </div>

          <PreviewPanel
            title={t("Live preview — threshold slider scale", "معاينة حيّة — مقياس منزلق الحدود")}
            note={t(
              "Illustrative L +2 / U +6. Lowering X compresses the scale; the flags keep their absolute values.",
              "توضيحي L +2 / U +6. خفض X يضغط المقياس؛ تحتفظ العلامات بقيمها المطلقة.",
            )}
          >
            <ThresholdSlider lower={2} upper={6} max={Math.max(round1(maxX) || 0.5, 0.5)} />
          </PreviewPanel>
        </CardContent>
      </Card>

      {/* SET-2 — Slider Padding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("Slider Padding", "حاشية المنزلق")}
            <SetCode code="SET-2" />
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {t(
              "Extra points of track (PAD) shown on either side of the coloured zones on every card and details-page zone slider, so the Baseline / Current flags never sit on the track edge. Positive integer.",
              "نقاط إضافية من المسار (PAD) تُعرض على جانبي المناطق الملوّنة في كل بطاقة ومنزلق صفحة التفاصيل، كي لا تقع علامتا الأساس/الحالي على حافّة المسار. عدد صحيح موجب.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <div className="space-y-2">
            <Label className="block leading-snug">
              {t("Value (PAD)", "القيمة (PAD)")}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {t("— default 3", "— الافتراضي 3")}
              </span>
            </Label>
            <Stepper
              value={pad} onChange={setPad} step={1} min={1}
              ariaLabel={t("Slider padding", "حاشية المنزلق")}
              invalid={!!padError} testId="set-pad"
            />
            {padError ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                <AlertCircle className="size-4 shrink-0" />
                {padError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("Positive integer, minimum 1", "عدد صحيح موجب، الحدّ الأدنى 1")}
              </p>
            )}
          </div>

          <PreviewPanel
            title={t("Live preview — zone slider padding", "معاينة حيّة — حاشية منزلق المناطق")}
            note={t(
              `Baseline 69, thresholds +2 / +6. Track extends ${pad || 1} point(s) beyond the outer zones on each side.`,
              `الأساس 69، الحدود +2 / +6. يمتدّ المسار ${pad || 1} نقطة خارج المناطق على كل جانب.`,
            )}
          >
            <ZonePaddingPreview pad={Math.max(1, Math.round(pad) || 1)} isRtl={isRtl} />
          </PreviewPanel>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <History className="size-3.5 shrink-0" />
          {t("Last changed by ", "آخر تغيير بواسطة ")}
          <span className="font-medium text-foreground">Layla H.</span>
          {t(" on 14 Jul 2026, 10:22", " في 14 يوليو 2026، 10:22")}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="size-4" />
            {t("Reset to defaults", "إعادة الافتراضي")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || invalid}
            className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
          >
            {t("Save changes", "حفظ التغييرات")}
          </Button>
        </div>
      </div>
    </div>
  )
}
