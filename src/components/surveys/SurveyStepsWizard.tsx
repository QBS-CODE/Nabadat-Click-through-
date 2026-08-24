import { useState } from "react"
import {
  ArrowLeft, ArrowRight, Check, Eye, Languages, Route,
  Monitor, Smartphone, Mail, MessageCircle, Star, Smile, Meh, Frown, AlertTriangle,
  ChevronDown, Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { SurveyDetailsForm, DEFAULT_DRAFT_SETTINGS } from "@/components/surveys/SurveyDetailsForm"
import { SurveyQuestionsBuilder, flattenSectionQuestions, kpiScalePoints, type BuilderSection, type BuilderQuestion } from "@/components/surveys/SurveyQuestionsBuilder"
import { SurveyDesignControls, AppearanceModeCards } from "@/components/surveys/SurveyDesignControls"
import { type SurveyTheme, TENANT_THEME, radiusPx, fontFamily } from "@/lib/survey-theme"
import type { SurveySettings } from "@/types/survey"
import { defaultWelcome, defaultThankYou } from "@/types/survey"

type Step = "details" | "questions" | "design"
type ThemeMode = "inherited" | "customized"

// ── Stepper (clickable — jump to any reached step) ────────────────────────────
function Stepper({ items, onStep }: { items: { label: string; state: "done" | "active" | "todo"; onClick?: () => void }[]; onStep?: (i: number) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden bg-card">
      {items.map((s, i) => {
        const clickable = !!s.onClick
        return (
          <button
            key={i}
            type="button"
            disabled={!clickable}
            onClick={() => { s.onClick?.(); onStep?.(i) }}
            className={cn(
              "flex-1 flex items-center gap-2.5 px-4 py-3 min-w-0 text-start transition-colors",
              i > 0 && "border-s border-border",
              s.state !== "todo" && "bg-gradient-to-r from-nb-mint/15 to-nb-cyan/15",
              clickable ? "cursor-pointer hover:bg-accent" : "cursor-default",
            )}
          >
            <span className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              s.state === "done" ? "bg-nb-mint text-white" : s.state === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>
              {s.state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium truncate", s.state === "active" ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Themed rendering of one built question ────────────────────────────────────
function ThemedQuestion({ q, theme }: { q: BuilderQuestion; theme: SurveyTheme }) {
  if (q.type === "Paragraph")
    return <p className="text-sm whitespace-pre-wrap opacity-80">{q.text}</p>

  const pill = (sel: boolean): React.CSSProperties => ({
    border: `1.5px solid ${sel ? theme.primary : theme.border}`,
    background: sel ? theme.primary : "transparent",
    color: sel ? theme.buttonText : theme.textColor,
    borderRadius: radiusPx(theme.btnRadius),
  })
  const n = q.scalePoints ?? 5
  const sel = Math.ceil(n * 0.8)

  let body: React.ReactNode
  if (q.type === "KPI") {
    // A KPI question renders on the KPI's own configured scale (NPS 0–10, FCR 0–1, …).
    const pts = kpiScalePoints(q.kpi) ?? [1, 2, 3, 4, 5]
    const kSel = pts[Math.floor(pts.length * 0.7)]
    body = <div className="flex flex-wrap gap-1.5">
      {pts.map((v) => <span key={v} className="flex size-8 items-center justify-center text-sm font-medium" style={pill(v === kSel)}>{v}</span>)}
      {q.allowNA && <span className="px-3 py-1.5 text-sm" style={pill(false)}>N/A</span>}
    </div>
  } else if (q.type === "Scale") {
    if (q.scaleView === "stars") body = <div className="flex gap-0.5">{Array.from({ length: n }).map((_, i) => <Star key={i} className="size-5" style={{ color: theme.primary, fill: i < sel ? theme.primary : "transparent" }} />)}</div>
    else if (q.scaleView === "smileys") body = <div className="flex gap-1.5">{Array.from({ length: n }).map((_, i) => { const Icon = i / Math.max(1, n - 1) < 0.34 ? Frown : i / Math.max(1, n - 1) < 0.67 ? Meh : Smile; return <Icon key={i} className="size-6" style={{ color: i + 1 === sel ? theme.primary : theme.border }} /> })}</div>
    else if (q.scaleView === "slider") { const steps = Math.max(2, Math.min(20, q.sliderSteps ?? 10)); body = <div><div className="relative h-1.5 rounded-full" style={{ background: theme.border }}><div className="absolute inset-y-0 start-0 rounded-full" style={{ width: "80%", background: theme.primary, opacity: 0.6 }} />{Array.from({ length: steps + 1 }).map((_, i) => <span key={i} className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full" style={{ background: theme.border, insetInlineStart: `calc(${(i / steps) * 100}% - 3px)` }} />)}</div><div className="flex justify-between mt-1.5 text-[11px] opacity-60"><span>{q.sliderMin ?? 0}</span><span>{q.sliderMax ?? 100}</span></div></div> }
    else body = <div className="flex flex-wrap gap-1.5">{Array.from({ length: n }).map((_, i) => <span key={i} className="flex size-8 items-center justify-center text-sm font-medium" style={pill(i + 1 === sel)}>{q.pointLabels?.[i] || i + 1}</span>)}</div>
  } else if (q.type === "Yes/No (Boolean)") {
    body = <div className="flex gap-2">{[q.trueLabel || "Yes", q.falseLabel || "No"].map((l, i) => <span key={i} className="px-4 py-1.5 text-sm" style={pill(i === 0)}>{l}</span>)}</div>
  } else if (q.type === "Ranking") {
    body = <div className="flex flex-col gap-1.5">{(q.options?.length ? q.options : ["Item 1", "Item 2"]).map((o, i) => <span key={i} className="flex items-center gap-2 px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.radius) }}><b style={{ color: theme.primary }}>{i + 1}</b> {o}</span>)}</div>
  } else if (q.type === "Input Field") {
    body = q.inputType === "Paragraph"
      ? <div className="h-16 px-3 py-2 text-sm opacity-60" style={{ border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.btnRadius) }}>{q.inputType}…</div>
      : <div className="h-9 flex items-center px-3 text-sm opacity-60" style={{ border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.btnRadius) }}>{q.inputType ?? "Text"}…</div>
  } else if (q.type === "Single-select matrix") {
    const rows = q.matrixRows?.length ? q.matrixRows : ["Row 1", "Row 2"]
    const kpiMode = q.matrixMode === "kpi"
    const faces = [Frown, Frown, Meh, Smile, Smile]
    const cols = kpiMode ? faces : (q.matrixCols?.length ? q.matrixCols : ["A", "B", "C"])
    body = <div className="space-y-1 text-sm">{rows.map((r, ri) => <div key={ri} className="flex items-center gap-2"><span className="w-20 truncate opacity-80">{r}</span><div className="flex gap-1.5">{cols.map((C, ci) => kpiMode ? <C key={ci} className="size-4" style={{ color: ci === 3 ? theme.primary : theme.border }} /> : <span key={ci} className="size-4 rounded-full" style={{ border: `1.5px solid ${theme.border}` }} />)}</div></div>)}</div>
  } else {
    const opts = q.options?.length ? q.options : ["Option 1", "Option 2"]
    const asDropdown = (q.type === "Single select" && q.selectDisplay === "dropdown") || (q.type === "Multi-select dropdown" && q.multiDisplay === "dropdown")
    const isMulti = q.type === "Multi-select dropdown"
    body = asDropdown
      ? <div className="flex items-center justify-between px-3 py-1.5 text-sm opacity-80" style={{ border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.btnRadius) }}><span>{isMulti ? `${opts.length} options…` : opts[0]}</span><ChevronDown className="size-3.5" /></div>
      : <div className="flex flex-col gap-1.5">{opts.map((o, i) => <span key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm" style={{ border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.radius) }}>{isMulti ? <Square className="size-3.5 shrink-0" style={{ color: theme.border }} /> : <span className="size-3.5 rounded-full shrink-0" style={{ border: `1.5px solid ${i === 0 ? theme.primary : theme.border}`, background: i === 0 ? theme.primary : "transparent" }} />}{o}</span>)}</div>
  }

  return (
    <div className="p-4" style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: radiusPx(theme.radius) }}>
      <p className="text-sm font-semibold mb-2" style={{ fontFamily: fontFamily(theme.headingFont) }}>
        {q.text}{q.required && <span style={{ color: theme.error }}> *</span>}
      </p>
      {q.desc && <p className="text-xs opacity-60 mb-2">{q.desc}</p>}
      {body}
    </div>
  )
}

type Channel = "mobile" | "desktop" | "whatsapp" | "email"

// The scrollable survey body (`.srv`) — fixed 400px, header + welcome + questions.
function SurveyBody({ theme, isAr, questions, welcome, firstOnly }: {
  theme: SurveyTheme; isAr: boolean; questions: BuilderQuestion[]; welcome: string; firstOnly?: boolean
}) {
  const bg = theme.bgType === "gradient" ? `linear-gradient(${theme.gradAngle}deg, ${theme.gradFrom}, ${theme.gradTo})` : theme.background
  const shown = firstOnly ? questions.slice(0, 1) : questions
  return (
    <div className="relative h-[400px] overflow-y-auto overflow-x-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* background layer (sticky so it fills the scroll viewport) */}
      <div className="sticky top-0 h-[400px] -mb-[400px] pointer-events-none" style={{ background: bg, opacity: (theme.bgOpacity ?? 100) / 100 }} />
      <div className="relative z-10 p-5" style={{ color: theme.textColor, fontFamily: fontFamily(theme.bodyFont), fontSize: theme.bodySize ? `${theme.bodySize}px` : undefined, lineHeight: theme.lineHeight || undefined }}>
        {(theme.showLogo || theme.showTitle) && (
          <div className={cn("flex items-center gap-2 mb-3", theme.headerAlign === "center" && "justify-center")}>
            {theme.showLogo && (theme.logo
              ? <img src={theme.logo} alt="" className="h-7 object-contain" />
              : <span className="flex size-7 items-center justify-center rounded-md text-xs font-bold" style={{ background: theme.primary, color: theme.buttonText }}>N</span>)}
            {theme.showTitle && <span className="font-bold text-sm" style={{ fontFamily: fontFamily(theme.headingFont) }}>Nabadat Bank</span>}
          </div>
        )}
        <p className="text-sm mb-4">{welcome}</p>
        {questions.length === 0 ? (
          <p className="text-sm opacity-60">{isAr ? "لا توجد أسئلة بعد — أضف بعضها في المُنشئ." : "No questions yet — add some in the builder."}</p>
        ) : (
          <div className="space-y-3">
            {shown.map((qq) => <ThemedQuestion key={qq.id} q={qq} theme={theme} />)}
            <button className="w-full py-2.5 text-sm font-semibold mt-1" style={{ background: theme.buttonColor, color: theme.buttonText, border: `1px solid ${theme.btnBorder}`, borderRadius: radiusPx(theme.btnRadius) }}>{isAr ? "إرسال" : "Submit"}</button>
          </div>
        )}
        {theme.footerText && <p className="text-xs opacity-60 mt-4 text-center">{theme.footerText}</p>}
      </div>
    </div>
  )
}

// WhatsApp chat preview — questions as bubbles + quick-reply buttons.
function WhatsAppBody({ questions, isAr }: { questions: BuilderQuestion[]; isAr: boolean }) {
  if (!questions.length)
    return <div className="rounded-[10px] bg-white dark:bg-[#202c33] dark:text-[#e9edef] p-2.5 text-[13px] max-w-[85%] shadow-sm">{isAr ? "لا توجد أسئلة بعد — أضف بعضها في المُنشئ." : "No questions yet — add some in the builder."}</div>
  const replies = (q: BuilderQuestion): string[] => {
    if (q.type === "KPI") return (kpiScalePoints(q.kpi) ?? [1, 2, 3, 4, 5]).map(String)
    if (q.type === "Scale") { const n = q.scalePoints ?? 5; return Array.from({ length: n }, (_, i) => q.pointLabels?.[i] || String(i + 1)) }
    if (q.type === "Yes/No (Boolean)") return [q.trueLabel || "Yes", q.falseLabel || "No"]
    if (q.type === "Single select" || q.type === "Multi-select dropdown" || q.type === "Ranking") return q.options ?? []
    return []
  }
  return (
    <div className="space-y-2.5">
      {questions.map((q) => {
        const r = replies(q)
        return (
          <div key={q.id} className="space-y-2.5">
            <div className="rounded-[10px] bg-white dark:bg-[#202c33] dark:text-[#e9edef] p-2.5 text-[13px] max-w-[85%] shadow-sm">{q.text || "Question"}</div>
            <div className="rounded-[10px] bg-white dark:bg-[#202c33] p-2.5 max-w-[85%] ms-auto shadow-sm">
              {r.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {r.map((o, i) => <span key={i} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "#25d366", color: "#075e54", background: "#fff" }}>{o}</span>)}
                </div>
              ) : (
                <span className="text-xs opacity-60">{isAr ? "يُفتح في المتصفح ↗" : "Open in web ↗"}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChannelNote({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md bg-d3-light dark:bg-d3-dark/20 text-d3-dark dark:text-d3-light p-3 text-xs">
      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  )
}

function DesignPreview({ theme, isAr, sections, settings, channel, name }: {
  theme: SurveyTheme; isAr: boolean; sections: BuilderSection[]; settings: SurveySettings; channel: Channel; name?: string
}) {
  const questions = sections.flatMap(flattenSectionQuestions)
  const welcome = (settings.welcomeMessage?.replace(/<[^>]*>/g, "").trim())
    || (isAr ? "شكراً لمشاركتك تجربتك معنا." : "Thank you for taking a moment to share your experience with us.")
  const slug = (name || "survey").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "survey"
  const hasMatrix = questions.some((q) => q.type === "Single-select matrix")

  let frame: React.ReactNode
  let note: string | null = null
  if (channel === "mobile") {
    frame = (
      <div className="w-[320px] rounded-[34px] overflow-hidden bg-card shadow-md" style={{ border: "10px solid var(--nb-navy)" }}>
        <SurveyBody theme={theme} isAr={isAr} questions={questions} welcome={welcome} />
      </div>
    )
  } else if (channel === "desktop") {
    frame = (
      <div className="w-full max-w-[760px] rounded-xl overflow-hidden bg-card border border-border shadow-md">
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted border-b border-border">
          {["a", "b", "c"].map((k) => <span key={k} className="size-2.5 rounded-full bg-nb-stone-lt" />)}
          <span className="ms-2 flex-1 truncate rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">survey.nabadat.app/s/{slug}</span>
        </div>
        <SurveyBody theme={theme} isAr={isAr} questions={questions} welcome={welcome} />
      </div>
    )
  } else if (channel === "whatsapp") {
    frame = (
      <div className="w-[340px] rounded-lg p-4 min-h-[480px] bg-[#e5ddd5] dark:bg-[#0b141a]">
        <WhatsAppBody questions={questions} isAr={isAr} />
      </div>
    )
    note = hasMatrix
      ? (isAr ? "تُعرض تقييمات المقياس كأزرار رد سريع مرقّمة؛ أسئلة الشريط والمصفوفة غير مدعومة على واتساب وتُفتح في المتصفح." : "Scale ratings render as numbered quick-reply buttons; slider and matrix questions aren't supported on WhatsApp and open in a web view.")
      : (isAr ? "تُعرض أسئلة المقياس والاختيار كأزرار رد سريع مرقّمة/معنونة على واتساب." : "Scale and choice questions render as numbered/labelled quick-reply buttons on WhatsApp.")
  } else {
    frame = (
      <div className="w-full max-w-[600px] rounded-xl overflow-hidden bg-card border border-border shadow-md">
        <div className="px-4 py-3 border-b border-border text-xs text-muted-foreground space-y-0.5">
          <div><b className="text-foreground">{isAr ? "من:" : "From:"}</b> Nabadat Bank &lt;feedback@nabadat.app&gt;</div>
          <div><b className="text-foreground">{isAr ? "الموضوع:" : "Subject:"}</b> {isAr ? "سؤال سريع عن تجربتك الأخيرة" : "A quick question about your recent experience"}</div>
        </div>
        <SurveyBody theme={theme} isAr={isAr} questions={questions} welcome={welcome} firstOnly />
      </div>
    )
    note = isAr ? "يتضمّن البريد السؤال الأول؛ تُفتح بقية الأسئلة في المتصفح عند نقر المستلم." : "Email embeds the first question; the remaining questions open in a web view when the respondent clicks through."
  }

  return (
    <div>
      {/* Preview holder — has a background so the frame reads as a device on a stage */}
      <div className="flex justify-center items-start p-6 rounded-lg bg-muted min-h-[520px]">
        {frame}
      </div>
      {note && <ChannelNote text={note} />}
    </div>
  )
}

export interface SurveyStepsWizardProps {
  /** Show a done "Build method" chip before the 3 steps (survey flow). */
  methodDone?: boolean
  /** Breadcrumb prefix, e.g. "Surveys" or "Templates › New template". */
  breadcrumbBase: string
  /** Title/subtitle for the first (details) step. */
  detailsTitle: string
  detailsSubtitle: string
  /** Label of the final save button, e.g. "Save survey" / "Save template" / "Create survey". */
  saveLabel: string
  initialName?: string
  initialSettings?: SurveySettings
  initialSections?: BuilderSection[]
  initialThemeMode?: ThemeMode
  /** Land on a specific step (0=details, 1=questions, 2=design). Default 0. */
  initialStep?: 0 | 1 | 2
  /** Open the Design step in Preview mode (controls hidden, wide preview). */
  initialPreviewFull?: boolean
  onCancel: () => void
  onBackFromFirst: () => void
  onSave: (data: { name: string; settings: SurveySettings; sections: BuilderSection[]; theme: SurveyTheme; themeMode: ThemeMode }) => void
  /** Open the translations workspace (edit flow only — needs a saved survey id). */
  onTranslate?: () => void
}

export function SurveyStepsWizard(props: SurveyStepsWizardProps) {
  const { methodDone, breadcrumbBase, detailsTitle, detailsSubtitle, saveLabel, onCancel, onBackFromFirst, onSave, onTranslate } = props
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const NextIcon = isRtl ? ArrowLeft : ArrowRight

  const steps: Step[] = ["details", "questions", "design"]
  const [stepIdx, setStepIdx] = useState<number>(props.initialStep ?? 0)
  const step = steps[stepIdx]

  const [name, setName] = useState(props.initialName ?? "")
  const [settings, setSettings] = useState<SurveySettings>(props.initialSettings ?? DEFAULT_DRAFT_SETTINGS(defaultWelcome(isAr), defaultThankYou(isAr)))
  const [theme, setTheme] = useState<SurveyTheme>(() => ({ ...TENANT_THEME }))
  const [themeMode, setThemeMode] = useState<ThemeMode>(props.initialThemeMode ?? "inherited")
  const [channel, setChannel] = useState<"mobile" | "desktop" | "whatsapp" | "email">("desktop")
  const [previewFull, setPreviewFull] = useState(props.initialPreviewFull ?? false)   // Preview mode: hide controls, widen preview
  const [surveyActive, setSurveyActive] = useState(false)
  const [routing, setRouting] = useState(false)
  const [routingConfirm, setRoutingConfirm] = useState(false)
  const [routingLayoutAlert, setRoutingLayoutAlert] = useState(false)
  const [sections, setSections] = useState<BuilderSection[]>(props.initialSections ?? [{ id: "g-general", name: isAr ? "عام" : "General", questions: [], sets: [] }])

  const patch = (p: Partial<SurveySettings>) => setSettings((s) => ({ ...s, ...p }))
  const setThemeKey = <K extends keyof SurveyTheme>(k: K, v: SurveyTheme[K]) => setTheme((t) => ({ ...t, [k]: v }))

  const stepLabels: Record<Step, string> = {
    details: isAr ? "تفاصيل الاستبيان" : "Survey details",
    questions: isAr ? "الأسئلة" : "Questions",
    design: isAr ? "التصميم" : "Design",
  }
  const titles: Record<Step, { t: string; d: string }> = {
    details: { t: detailsTitle, d: detailsSubtitle },
    questions: {
      t: isAr ? "الأسئلة" : "Questions",
      d: isAr
        ? "أضف الأسئلة، ونظّمها في أقسام ومجموعات أسئلة، واربط أسئلة المؤشرات بنقطة تماس، واضبط المتابعات المبنية على الدرجة."
        : "Add Questions, Organise Them Into Sections And Questions Sets, Connect KPI Questions To A Touchpoint, And Set Score-Based Follow-Ups.",
    },
    design: {
      t: isAr ? "التصميم" : "Design",
      d: isAr
        ? "صمّم الاستبيان على اليسار؛ تعرض المعاينة على اليمين أسئلته الحقيقية، مباشرةً، لكل قناة."
        : "Style the survey on the left; the preview on the right shows this survey's real questions, live, per channel.",
    },
  }

  // Every step is freely reachable — the user can jump between Survey details,
  // Questions, and Design in any order without completing an earlier step first.
  const goStep = (i: number) => { if (i >= 0 && i < steps.length && i !== stepIdx) setStepIdx(i) }
  const stepperItems = [
    ...(methodDone ? [{ label: isAr ? "طريقة البناء" : "Build method", state: "done" as const, onClick: onBackFromFirst }] : []),
    ...steps.map((s, i) => ({
      label: stepLabels[s],
      state: (i < stepIdx ? "done" : i === stepIdx ? "active" : "todo") as "done" | "active" | "todo",
      onClick: i !== stepIdx ? () => goStep(i) : undefined,
    })),
  ]

  const back = () => (stepIdx === 0 ? onBackFromFirst() : setStepIdx((i) => i - 1))
  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1))
  const isLast = stepIdx === steps.length - 1
  const doSave = () => onSave({ name, settings, sections, theme, themeMode })

  const CHANNELS = [
    { key: "mobile" as const, icon: Smartphone, ar: "الويب للجوال", en: "Mobile web" },
    { key: "desktop" as const, icon: Monitor, ar: "الويب لسطح المكتب", en: "Desktop web" },
    { key: "whatsapp" as const, icon: MessageCircle, ar: "واتساب", en: "WhatsApp" },
    { key: "email" as const, icon: Mail, ar: "البريد", en: "Email" },
  ]

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{breadcrumbBase} › {stepLabels[step]}</p>

      <Stepper items={stepperItems} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5" onClick={back} aria-label={isAr ? "رجوع" : "Back"}>
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold">{titles[step].t}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{titles[step].d}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onCancel}>{isAr ? "إلغاء" : "Cancel"}</Button>
          {step === "design" && (
            <Button variant="outline" onClick={() => setPreviewFull((p) => !p)}>
              <Eye className="size-4" />{previewFull ? (isAr ? "العودة للتصميم" : "Back to design") : (isAr ? "معاينة" : "Preview")}
            </Button>
          )}
          {/* Survey details keeps Continue at the bottom of the form (see footer). */}
          {step !== "details" && (
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={isLast ? doSave : next}>
              {isLast ? (<><Check className="size-4" />{saveLabel}</>) : (<>{isAr ? "متابعة" : "Continue"}<NextIcon className="size-4" /></>)}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {step === "details" && (
        <>
          <SurveyDetailsForm isAr={isAr} name={name} onNameChange={setName} settings={settings} onPatch={patch} />
          <div className="flex justify-end">
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={isLast ? doSave : next}>
              {isLast ? (<><Check className="size-4" />{saveLabel}</>) : (<>{isAr ? "متابعة" : "Continue"}<NextIcon className="size-4" /></>)}
            </Button>
          </div>
        </>
      )}

      {step === "questions" && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap rounded-lg border border-border bg-card px-4 py-2.5">
            <Button variant="outline" size="sm" onClick={() => onTranslate ? onTranslate() : toast.info(isAr ? "الترجمة تُدار بعد حفظ الاستبيان." : "Translations are managed after the survey is saved.")}>
              <Languages className="size-4" />{isAr ? "ترجمة" : "Translate"}
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Switch checked={surveyActive} onCheckedChange={setSurveyActive} aria-label={isAr ? "تفعيل" : "Activate"} />
              <span className="text-sm text-muted-foreground">{isAr ? "تفعيل" : "Activate"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={routing} onCheckedChange={(v) => {
                if (!v) { setRouting(false); return }
                // Routing requires the "One question per page" layout (set in Survey details).
                if (settings.questionLayout !== "question") setRoutingLayoutAlert(true)
                else setRoutingConfirm(true)
              }} aria-label={isAr ? "توجيه الأسئلة" : "Question routing"} />
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1"><Route className="size-4" />{isAr ? "توجيه الأسئلة" : "Question routing"}</span>
            </div>
          </div>
          <SurveyQuestionsBuilder isAr={isAr} routingEnabled={routing} boundJourneyId={settings.journeyId} sections={sections} onSectionsChange={setSections} />
        </div>
      )}

      {step === "design" && (
        <div className="space-y-4">
          <AppearanceModeCards isAr={isAr} mode={themeMode} onModeChange={setThemeMode} />
          <div className={cn("grid grid-cols-1 gap-5", !previewFull && "lg:grid-cols-[minmax(0,360px)_1fr]")}>
            {/* Design controls — hidden in Preview mode */}
            {!previewFull && (
              <SurveyDesignControls isAr={isAr} theme={theme} mode={themeMode} onModeChange={setThemeMode} onChange={setThemeKey} hideModeCards />
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-1 border-b border-border">
                {CHANNELS.map((ch) => (
                  <button key={ch.key} onClick={() => setChannel(ch.key)}
                    className={cn("inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", channel === ch.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    <ch.icon className="size-4" />{isAr ? ch.ar : ch.en}
                  </button>
                ))}
              </div>
              <DesignPreview theme={theme} isAr={isAr} sections={sections} settings={settings} channel={channel} name={name} />
            </div>
          </div>
        </div>
      )}


      {/* Routing requires "One question per page" layout */}
      <Dialog open={routingLayoutAlert} onOpenChange={setRoutingLayoutAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "توجيه الأسئلة" : "Question routing"}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {isAr
                ? "توجيه الأسئلة متاح فقط مع تخطيط «سؤال واحد لكل صفحة». غيّر تخطيط الأسئلة في إعدادات الاستبيان أولاً."
                : "Question routing is only available with the “One question per page” layout. Change the Question layout in Survey Settings first."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => setRoutingLayoutAlert(false)}>{isAr ? "حسناً" : "OK"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Routing confirmation */}
      <Dialog open={routingConfirm} onOpenChange={setRoutingConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "تفعيل توجيه الأسئلة؟" : "Enable question routing?"}</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md bg-accent border border-border p-3 text-sm text-muted-foreground leading-relaxed">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              {isAr ? (
                <>يرسل التوجيه المشاركين إلى سؤال تالٍ محدد بناءً على إجابتهم. <b className="text-foreground">سيتم تعطيل خلط الأسئلة</b> أثناء تشغيل التوجيه. ستظهر أيقونة توجيه الإجابة على الأسئلة المؤهلة.</>
              ) : (
                <>Routing sends respondents to a specific next question based on their answer. <b className="text-foreground">Question shuffling will be disabled</b> while routing is on. The answer-routing icon will appear on eligible questions.</>
              )}
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutingConfirm(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => { setRouting(true); setRoutingConfirm(false); setSettings((s) => ({ ...s, shuffleEnabled: false })) }}>
              {isAr ? "تفعيل التوجيه" : "Enable routing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
