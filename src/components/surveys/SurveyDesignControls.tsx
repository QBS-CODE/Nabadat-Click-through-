import { createContext, useContext, useState } from "react"
import { ChevronRight, Upload, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { type SurveyTheme, type RadiusKey, SURVEY_FONTS } from "@/lib/survey-theme"

type ThemeMode = "inherited" | "customized"

// ── Shared context (so field primitives can be module-scope, not re-created ───
// per render — re-creating them remounts inputs and drops focus mid-typing).
interface DesignCtxValue {
  isAr: boolean
  ro: boolean
  theme: SurveyTheme
  onChange: <K extends keyof SurveyTheme>(key: K, value: SurveyTheme[K]) => void
  t: (en: string, ar: string) => string
}
const DesignCtx = createContext<DesignCtxValue | null>(null)
const useDesign = () => {
  const c = useContext(DesignCtx)
  if (!c) throw new Error("Design field used outside SurveyDesignControls")
  return c
}

function readFile(file: File, cb: (dataUrl: string) => void) {
  const reader = new FileReader()
  reader.onload = () => cb(reader.result as string)
  reader.readAsDataURL(file)
}

// ── Field primitives (module scope — stable identity) ─────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  )
}

function ColorField({ label, k }: { label: string; k: keyof SurveyTheme }) {
  const { theme, ro, onChange } = useDesign()
  const val = theme[k] as string
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          disabled={ro}
          value={val}
          onChange={(e) => onChange(k, e.target.value as SurveyTheme[typeof k])}
          aria-label={label}
          className="size-9 shrink-0 rounded-md border border-input bg-card p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-muted-foreground tabular-nums font-mono">{val}</span>
      </div>
    </Field>
  )
}

function SelectField({ label, k, options, hint }: { label: string; k: keyof SurveyTheme; options: [string, string][]; hint?: string }) {
  const { theme, ro, onChange } = useDesign()
  return (
    <Field label={label} hint={hint}>
      <Select value={String(theme[k])} onValueChange={(v) => v != null && onChange(k, v as SurveyTheme[typeof k])} disabled={ro}>
        <SelectTrigger className="w-full">
          <SelectValue>{options.find(([value]) => value === String(theme[k]))?.[1] ?? String(theme[k])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(([value, lbl]) => <SelectItem key={value} value={value}>{lbl}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  )
}

function CheckField({ label, k }: { label: string; k: keyof SurveyTheme }) {
  const { theme, ro, onChange } = useDesign()
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={theme[k] as boolean} disabled={ro} onCheckedChange={(c) => onChange(k, Boolean(c) as SurveyTheme[typeof k])} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

function RangeField({ label, k, min, max }: { label: string; k: keyof SurveyTheme; min: number; max: number }) {
  const { theme, ro, onChange } = useDesign()
  const val = theme[k] as number
  return (
    <Field label={`${label} — ${val}%`}>
      <input type="range" min={min} max={max} value={val} disabled={ro}
        onChange={(e) => onChange(k, Number(e.target.value) as SurveyTheme[typeof k])}
        className="w-full accent-primary disabled:opacity-50" />
    </Field>
  )
}

function TextField({ label, k, hint }: { label: string; k: keyof SurveyTheme; hint?: string }) {
  const { theme, ro, onChange } = useDesign()
  return (
    <Field label={label} hint={hint}>
      <Input value={(theme[k] as string) ?? ""} disabled={ro} onChange={(e) => onChange(k, e.target.value as SurveyTheme[typeof k])} />
    </Field>
  )
}

function ImageField({ label, k, hint, clearLabel }: { label: string; k: keyof SurveyTheme; hint?: string; clearLabel: string }) {
  const { theme, ro, onChange, t } = useDesign()
  const val = theme[k] as string | null
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40 overflow-hidden">
          {val ? <img src={val} alt="" className="size-full object-contain" /> : <span className="text-xs text-muted-foreground">{t("none", "لا شيء")}</span>}
        </span>
        <label className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-accent transition-colors", ro && "opacity-50 pointer-events-none")}>
          <Upload className="size-3.5" />
          {t("Upload", "رفع")}
          <input type="file" accept="image/*" disabled={ro} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (url) => onChange(k, url as SurveyTheme[typeof k])) }} />
        </label>
        {val && (
          <button type="button" disabled={ro} onClick={() => onChange(k, (k === "logo" ? null : "") as SurveyTheme[typeof k])}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50">
            <Trash2 className="size-3.5" />
            {clearLabel}
          </button>
        )}
      </div>
    </Field>
  )
}

function AccordionItem({ title, body, open, onToggle }: { title: string; body: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
        {title}
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-90")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-border">{body}</div>
        </div>
      </div>
    </div>
  )
}

const RADIUS_OPTS: [RadiusKey, string, string][] = [
  ["sharp", "Sharp", "حادّ"],
  ["small", "Small rounded", "استدارة صغيرة"],
  ["medium", "Medium rounded", "استدارة متوسطة"],
  ["large", "Large rounded", "استدارة كبيرة"],
]

interface Props {
  isAr: boolean
  theme: SurveyTheme
  mode: ThemeMode
  onModeChange: (m: ThemeMode) => void
  onChange: <K extends keyof SurveyTheme>(key: K, value: SurveyTheme[K]) => void
  /** Hide the Customize / Use-Tenant mode cards (rendered separately full-width). */
  hideModeCards?: boolean
}

export function SurveyDesignControls({ isAr, theme, mode, onModeChange, onChange, hideModeCards }: Props) {
  const ro = mode !== "customized"
  const [openId, setOpenId] = useState<string>("branding")
  const [advOpen, setAdvOpen] = useState(false)
  const t = (en: string, ar: string) => (isAr ? ar : en)

  const fontOpts = SURVEY_FONTS.map((f) => [f, f] as [string, string])
  const radiusOpts = RADIUS_OPTS.map(([v, en, ar]) => [v, t(en, ar)] as [string, string])

  const GROUPS: { id: string; title: string; advanced?: boolean; body: React.ReactNode }[] = [
    { id: "branding", title: t("Branding", "الهوية"), body: (
      <ImageField label={t("Survey logo", "شعار الاستبيان")} k="logo" clearLabel={t("Use default mark", "استخدام الشعار الافتراضي")}
        hint={t('Shown in the survey header when "Show logo" is on.', "يظهر في ترويسة الاستبيان عند تفعيل «إظهار الشعار».")} />
    ) },
    { id: "colors", title: t("Colors", "الألوان"), body: (
      <div className="grid grid-cols-2 gap-3">
        <ColorField label={t("Primary", "اللون الأساسي")} k="primary" />
        <ColorField label={t("Text color", "لون النص")} k="textColor" />
      </div>
    ) },
    { id: "buttons", title: t("Buttons", "الأزرار"), body: (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><SelectField label={t("Button radius", "استدارة الزر")} k="btnRadius" options={radiusOpts} /></div>
        <ColorField label={t("Button border color", "لون حدّ الزر")} k="btnBorder" />
        <ColorField label={t("Button color", "لون الزر")} k="buttonColor" />
        <ColorField label={t("Button text color", "لون نص الزر")} k="buttonText" />
      </div>
    ) },
    { id: "header", title: t("Header", "الترويسة"), body: (
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <CheckField label={t("Show logo", "إظهار الشعار")} k="showLogo" />
          <CheckField label={t("Show survey title", "إظهار عنوان الاستبيان")} k="showTitle" />
        </div>
        <SelectField label={t("Header alignment", "محاذاة الترويسة")} k="headerAlign"
          options={[["start", t("Start", "البداية")], ["center", t("Center", "الوسط")]]} />
      </div>
    ) },
    { id: "footer", title: t("Footer", "التذييل"), body: (
      <TextField label={t("Footer text", "نص التذييل")} k="footerText" hint={t("Shown at the bottom of every page.", "يظهر أسفل كل صفحة.")} />
    ) },
    { id: "background", title: t("Background", "الخلفية"), body: (
      <div className="space-y-3">
        <SelectField label={t("Background type", "نوع الخلفية")} k="bgType"
          options={[["solid", t("Solid color", "لون صلب")], ["gradient", t("Gradient", "تدرّج")], ["image", t("Image", "صورة")], ["pattern", t("Pattern (tiled image)", "نمط (صورة مكرّرة)")]]} />
        {theme.bgType === "solid" && <p className="text-xs text-muted-foreground">{t("Uses the Background color set under Surfaces.", "يستخدم لون الخلفية المحدد ضمن الأسطح.")}</p>}
        {theme.bgType === "gradient" && (
          <div className="grid grid-cols-2 gap-3">
            <ColorField label={t("Gradient from", "التدرّج من")} k="gradFrom" />
            <ColorField label={t("Gradient to", "التدرّج إلى")} k="gradTo" />
            <div className="col-span-2">
              <SelectField label={t("Angle", "الزاوية")} k="gradAngle"
                options={[["90", t("Top → bottom", "أعلى ← أسفل")], ["135", t("Diagonal", "قطري")], ["180", t("Bottom → top", "أسفل ← أعلى")], ["45", t("Diagonal up", "قطري لأعلى")]]} />
            </div>
          </div>
        )}
        {(theme.bgType === "image" || theme.bgType === "pattern") && (
          <ImageField label={theme.bgType === "pattern" ? t("Pattern image", "صورة النمط") : t("Background image", "صورة الخلفية")} k="bgImage" clearLabel={t("Remove", "إزالة")} />
        )}
        <RangeField label={t("Background opacity", "شفافية الخلفية")} k="bgOpacity" min={0} max={100} />
      </div>
    ) },
    { id: "typography", title: t("Typography", "الطباعة"), advanced: true, body: (
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={t("Heading font", "خط العناوين")} k="headingFont" options={fontOpts} />
        <SelectField label={t("Body font", "خط النص")} k="bodyFont" options={fontOpts} />
        <SelectField label={t("Body size", "حجم النص")} k="bodySize" options={[["13", t("Small", "صغير")], ["14", t("Default", "افتراضي")], ["16", t("Large", "كبير")]]} />
        <SelectField label={t("Heading size", "حجم العنوان")} k="headingSize" options={[["15", t("Default", "افتراضي")], ["17", t("Large", "كبير")], ["20", t("Extra large", "كبير جداً")]]} />
        <div className="col-span-2"><SelectField label={t("Line height", "ارتفاع السطر")} k="lineHeight" options={[["1.3", t("Tight", "ضيّق")], ["1.5", t("Normal", "عادي")], ["1.7", t("Relaxed", "مريح")]]} /></div>
      </div>
    ) },
    { id: "surfaces", title: t("Surfaces", "الأسطح"), advanced: true, body: (
      <div className="grid grid-cols-2 gap-3">
        <ColorField label={t("Background color", "لون الخلفية")} k="background" />
        <ColorField label={t("Card background", "خلفية البطاقة")} k="card" />
        <div className="col-span-2"><ColorField label={t("Border color", "لون الحدود")} k="border" /></div>
      </div>
    ) },
    { id: "status", title: t("Status colors", "ألوان الحالة"), advanced: true, body: (
      <div className="grid grid-cols-2 gap-3">
        <ColorField label={t("Success", "نجاح")} k="success" />
        <ColorField label={t("Warning", "تحذير")} k="warning" />
        <div className="col-span-2"><ColorField label={t("Error", "خطأ")} k="error" /></div>
      </div>
    ) },
    { id: "layout", title: t("Layout", "التخطيط"), advanced: true, body: (
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={t("Card radius", "استدارة البطاقة")} k="radius" options={radiusOpts} />
        <SelectField label={t("Progress bar", "شريط التقدّم")} k="progress" options={[["bar", t("Bar", "شريط")], ["steps", t("Steps", "خطوات")], ["none", t("None", "بدون")]]} />
      </div>
    ) },
  ]

  const basic = GROUPS.filter((g) => !g.advanced)
  const advanced = GROUPS.filter((g) => g.advanced)

  const MODES = [
    { value: "customized" as const, titleEn: "Customize this survey", titleAr: "تخصيص هذا الاستبيان", descEn: "Unlock colors, fonts, header, buttons, and more", descAr: "افتح الألوان والخطوط والترويسة والأزرار والمزيد" },
    { value: "inherited" as const, titleEn: "Use Tenant Design Guidelines", titleAr: "استخدام إرشادات تصميم المؤسسة", descEn: "Default — inherits the organization's branding", descAr: "الافتراضي — يرث علامة المؤسسة" },
  ]

  return (
    <DesignCtx.Provider value={{ isAr, ro, theme, onChange, t }}>
      <div className="space-y-4">
        {!hideModeCards && (
          <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as ThemeMode)} className="space-y-2">
            {MODES.map((m) => {
              const active = mode === m.value
              return (
                <Label key={m.value} htmlFor={`dmode-${m.value}`}
                  className={cn("flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors", active ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
                  <RadioGroupItem id={`dmode-${m.value}`} value={m.value} className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-semibold text-foreground">{isAr ? m.titleAr : m.titleEn}</span>
                    <span className="block text-xs text-muted-foreground leading-relaxed">{isAr ? m.descAr : m.descEn}</span>
                  </span>
                </Label>
              )
            })}
          </RadioGroup>
        )}

        <div className={cn("space-y-2", ro && "opacity-60")}>
          {basic.map((g) => (
            <AccordionItem key={g.id} title={g.title} body={g.body} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? "" : g.id)} />
          ))}
        </div>

        <button type="button" onClick={() => setAdvOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          {advOpen ? t("Hide advanced settings", "إخفاء الإعدادات المتقدمة") : t("Show advanced settings", "إظهار الإعدادات المتقدمة")}
          <ChevronRight className={cn("size-4 transition-transform duration-200", advOpen && "rotate-90")} />
        </button>
        {advOpen && (
          <div className={cn("space-y-2", ro && "opacity-60")}>
            {advanced.map((g) => (
              <AccordionItem key={g.id} title={g.title} body={g.body} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? "" : g.id)} />
            ))}
          </div>
        )}
      </div>
    </DesignCtx.Provider>
  )
}

// Reusable full-width mode cards (used by the wizard's Design step).
export function AppearanceModeCards({ isAr, mode, onModeChange }: { isAr: boolean; mode: ThemeMode; onModeChange: (m: ThemeMode) => void }) {
  const MODES = [
    { value: "customized" as const, titleEn: "Customize this survey", titleAr: "تخصيص هذا الاستبيان", descEn: "Unlock colors, fonts, header, buttons, and more", descAr: "افتح الألوان والخطوط والترويسة والأزرار والمزيد" },
    { value: "inherited" as const, titleEn: "Use Tenant Design Guidelines", titleAr: "استخدام إرشادات تصميم المؤسسة", descEn: "Default — inherits the organization's branding", descAr: "الافتراضي — يرث علامة المؤسسة" },
  ]
  return (
    <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as ThemeMode)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {MODES.map((m) => {
        const active = mode === m.value
        return (
          <Label key={m.value} htmlFor={`amode-${m.value}`}
            className={cn("flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors", active ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
            <RadioGroupItem id={`amode-${m.value}`} value={m.value} className="mt-0.5" />
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold text-foreground">{isAr ? m.titleAr : m.titleEn}</span>
              <span className="block text-xs text-muted-foreground leading-relaxed">{isAr ? m.descAr : m.descEn}</span>
            </span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
