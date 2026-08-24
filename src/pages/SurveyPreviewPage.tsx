import { useMemo, useState, type CSSProperties } from "react"
import { useNavigate, useParams } from "react-router"
import {
  ArrowRight, ArrowLeft, Check, Eye, PanelLeftClose,
  Monitor, Smartphone, Mail, MessageCircle, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { MOCK_SURVEYS } from "@/data/mock-surveys"
import { cn } from "@/lib/utils"
import { SurveyDesignControls } from "@/components/surveys/SurveyDesignControls"
import {
  type SurveyTheme,
  TENANT_THEME,
  radiusPx,
  fontFamily,
} from "@/lib/survey-theme"

// ── Demo questions (from mock survey data) ───────────────────────────────────
const DEMO_QUESTIONS = [
  {
    id: "q1", type: "kpi",
    titleAr: "كيف تقيّم تجربتك العامة مع خدمتنا؟",
    titleEn: "How would you rate your overall experience with our service?",
    scale: [1, 2, 3, 4, 5] as number[],
    whatsappWarning: { ar: "يُعرض مقياس التقييم كخيارات مرقمة على واتساب", en: "Rating scale renders as numbered options on WhatsApp" },
  },
  {
    id: "q2", type: "rating",
    titleAr: "ما مدى احتمال توصيتك بخدماتنا لأصدقائك وزملائك؟",
    titleEn: "How likely are you to recommend our services to friends and colleagues?",
    scale: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as number[],
    whatsappWarning: { ar: "يُعرض مقياس 0-10 كقائمة أرقام على واتساب", en: "0–10 scale renders as a numbered list on WhatsApp" },
  },
  {
    id: "q3", type: "text",
    titleAr: "ما الذي يمكننا تحسينه في تجربتك؟",
    titleEn: "What could we improve about your experience?",
    emailWarning: { ar: "حقول النص الحر تُفتح في المتصفح خارج البريد الإلكتروني", en: "Free-text fields open in browser outside the email" },
  },
]

type Channel = "mobile" | "desktop" | "whatsapp" | "email"

// ── Theme-driven survey body (mobile + desktop share this) ────────────────────
function ThemedSurveyBody({
  isAr, surveyName, theme,
}: {
  isAr: boolean
  surveyName: string
  theme: SurveyTheme
}) {
  const [selected, setSelected] = useState<Record<string, number>>({})
  const cardRadius = radiusPx(theme.radius)
  const btnRadius = radiusPx(theme.btnRadius)

  const bgLayer: CSSProperties = { opacity: theme.bgOpacity / 100 }
  if (theme.bgType === "gradient") {
    bgLayer.background = `linear-gradient(${theme.gradAngle}deg, ${theme.gradFrom}, ${theme.gradTo})`
  } else if (theme.bgType === "image" && theme.bgImage) {
    bgLayer.backgroundImage = `url(${theme.bgImage})`
    bgLayer.backgroundSize = "cover"
    bgLayer.backgroundPosition = "center"
  } else if (theme.bgType === "pattern" && theme.bgImage) {
    bgLayer.backgroundImage = `url(${theme.bgImage})`
    bgLayer.backgroundRepeat = "repeat"
  } else {
    bgLayer.backgroundColor = theme.background
  }

  const bodyStyle: CSSProperties = {
    color: theme.textColor,
    fontFamily: fontFamily(theme.bodyFont),
    fontSize: `${theme.bodySize}px`,
    lineHeight: theme.lineHeight,
  }
  const headingStyle: CSSProperties = {
    fontFamily: fontFamily(theme.headingFont),
    fontSize: `${Number(theme.headingSize) + 3}px`,
    color: theme.textColor,
    textAlign: theme.headerAlign === "center" ? "center" : "start",
  }
  const cardStyle: CSSProperties = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: cardRadius,
  }
  const btnStyle: CSSProperties = {
    background: theme.buttonColor,
    color: theme.buttonText,
    border: `1px solid ${theme.btnBorder}`,
    borderRadius: btnRadius,
  }

  return (
    <div className="relative min-h-full" style={bodyStyle} dir={isAr ? "rtl" : "ltr"}>
      <div className="absolute inset-0 pointer-events-none" style={bgLayer} />
      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div
          className="space-y-2"
          style={{ textAlign: theme.headerAlign === "center" ? "center" : "start" }}
        >
          <div
            className="flex items-center gap-2"
            style={{ justifyContent: theme.headerAlign === "center" ? "center" : "flex-start" }}
          >
            {theme.showLogo && (
              <span
                className="flex size-8 items-center justify-center rounded-md text-sm font-bold shrink-0"
                style={{ background: theme.primary, color: theme.buttonText }}
              >
                {theme.logo ? (
                  <img src={theme.logo} alt="" className="size-full object-contain rounded-md" />
                ) : (
                  "N"
                )}
              </span>
            )}
            {theme.showTitle && (
              <span className="font-bold" style={headingStyle}>
                {surveyName}
              </span>
            )}
          </div>
          {/* Progress */}
          {theme.progress === "bar" && (
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${theme.primary}22` }}>
              <div className="h-full w-1/3 rounded-full" style={{ background: theme.primary }} />
            </div>
          )}
          {theme.progress === "steps" && (
            <div className="flex gap-1.5">
              {DEMO_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: i === 0 ? theme.primary : `${theme.primary}22` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Questions */}
        {DEMO_QUESTIONS.map((q, idx) => (
          <div key={q.id} className="p-4 space-y-3" style={cardStyle}>
            <div className="flex items-start gap-2.5">
              <span
                className="flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5"
                style={{ background: `${theme.primary}1a`, color: theme.primary }}
              >
                {idx + 1}
              </span>
              <p className="font-semibold leading-snug">{isAr ? q.titleAr : q.titleEn}</p>
            </div>

            {(q.type === "kpi" || q.type === "rating") && (
              <div className="flex flex-wrap gap-1.5 ps-8">
                {(q.scale ?? []).map((n) => {
                  const on = selected[q.id] === n
                  return (
                    <button
                      key={n}
                      onClick={() => setSelected((p) => ({ ...p, [q.id]: n }))}
                      className="size-9 flex items-center justify-center text-sm font-semibold transition-all"
                      style={{
                        borderRadius: btnRadius,
                        border: `1.5px solid ${on ? theme.primary : theme.border}`,
                        background: on ? theme.primary : "transparent",
                        color: on ? theme.buttonText : theme.textColor,
                      }}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            )}

            {q.type === "text" && (
              <div
                className="ps-8"
              >
                <div
                  className="px-3 py-2.5 min-h-16 text-sm opacity-60"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: cardRadius }}
                >
                  {isAr ? "اكتب إجابتك هنا..." : "Write your answer here..."}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Submit */}
        <button className="w-full py-2.5 text-sm font-semibold" style={btnStyle}>
          {isAr ? "إرسال" : "Submit"}
        </button>

        {/* Footer */}
        {theme.footerText && (
          <p className="text-xs text-center opacity-60 pt-1">{theme.footerText}</p>
        )}
      </div>
    </div>
  )
}

// ── Mobile Web frame ──────────────────────────────────────────────────────────
function MobilePreview({ isAr, surveyName, theme }: { isAr: boolean; surveyName: string; theme: SurveyTheme }) {
  return (
    <div className="flex justify-center">
      <div className="relative rounded-[44px] overflow-hidden shadow-2xl bg-nb-navy" style={{ width: 375, padding: 10 }}>
        <div className="rounded-[34px] overflow-hidden bg-background">
          {/* Status bar */}
          <div className="bg-nb-navy h-7 flex items-center justify-between px-6">
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-px items-end h-3">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} className="w-1 bg-white rounded-sm" style={{ height: h }} />
                ))}
              </div>
              <div className="w-5 h-3 rounded-sm border border-white" />
            </div>
          </div>
          {/* Browser chrome */}
          <div className="bg-muted border-b border-border flex items-center px-3 h-8">
            <div className="flex-1 bg-background rounded text-xs text-muted-foreground px-2 py-0.5 truncate">
              nabadat.cx/s/{surveyName.slice(0, 6)}
            </div>
          </div>
          {/* Themed survey */}
          <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
            <ThemedSurveyBody isAr={isAr} surveyName={surveyName} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Desktop Web frame ─────────────────────────────────────────────────────────
function DesktopPreview({ isAr, surveyName, theme }: { isAr: boolean; surveyName: string; theme: SurveyTheme }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border overflow-hidden shadow-sm">
      {/* Browser chrome */}
      <div className="bg-muted border-b border-border flex items-center gap-3 px-4 h-10">
        <div className="flex gap-1.5">
          {["traffic-1", "traffic-2", "traffic-3"].map((c) => (
            <div key={c} className="size-3 rounded-full bg-muted-foreground/30" />
          ))}
        </div>
        <div className="flex-1 max-w-sm bg-background rounded px-3 h-6 flex items-center">
          <span className="text-xs text-muted-foreground truncate">nabadat.cx/survey/srv-001</span>
        </div>
      </div>
      {/* Themed survey (centered column) */}
      <div className="min-h-[520px]" style={{ background: theme.background }}>
        <div className="mx-auto max-w-lg py-8 px-4">
          <div className="rounded-lg overflow-hidden shadow-sm">
            <ThemedSurveyBody isAr={isAr} surveyName={surveyName} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp preview (channel-native, not custom-themed) ──────────────────────
function WhatsAppPreview({ isAr, surveyName }: { isAr: boolean; surveyName: string }) {
  return (
    <div className="flex justify-center">
      <div className="w-[380px] rounded-lg overflow-hidden shadow-2xl border border-border">
        <div className="flex items-center gap-3 px-4 py-3 bg-nb-mint-900">
          <div className="size-9 rounded-full bg-card flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-nb-mint-900">N</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Nabadat CX</p>
            <p className="text-xs text-white/70">{isAr ? "متصل" : "online"}</p>
          </div>
          <MessageCircle className="size-5 text-white/80" />
        </div>
        <div className="min-h-[480px] p-4 space-y-3 bg-nb-cloud dark:bg-nb-dark-2">
          <div className="max-w-[85%] rounded-lg rounded-ss-sm bg-card px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed" dir={isAr ? "rtl" : "ltr"}>
              {isAr
                ? `مرحباً! نريد معرفة رأيك في ${surveyName}. هل يمكنك الإجابة على ٣ أسئلة سريعة؟`
                : `Hello! We'd love your feedback on ${surveyName}. Can you answer 3 quick questions?`}
            </p>
            <p className="text-xs text-end mt-1 text-muted-foreground">10:23 ✓✓</p>
          </div>
          {DEMO_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="space-y-1.5">
              <div className="max-w-[85%] rounded-lg rounded-ss-sm bg-card px-4 py-2.5 shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {isAr ? `السؤال ${idx + 1}` : `Question ${idx + 1}`}
                </p>
                <p className="text-sm leading-relaxed" dir={isAr ? "rtl" : "ltr"}>
                  {isAr ? q.titleAr : q.titleEn}
                </p>
              </div>
              {(q.type === "kpi" || q.type === "rating") && (
                <div className="flex flex-wrap gap-1.5">
                  {(q.type === "kpi" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((n) => (
                    <button key={n} className="px-3 py-1 rounded-full text-xs font-medium border border-nb-mint-300 bg-nb-mint-100 text-nb-mint-900">
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {"whatsappWarning" in q && q.whatsappWarning && (
                <div className="flex items-start gap-2 bg-d3-light border border-d3/30 rounded-md px-3 py-2 max-w-[90%]">
                  <AlertTriangle className="size-3.5 text-d3 shrink-0 mt-0.5" />
                  <p className="text-xs text-d3-dark">{isAr ? q.whatsappWarning.ar : q.whatsappWarning.en}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted">
          <div className="flex-1 bg-card rounded-full px-4 py-2 text-xs text-muted-foreground">
            {isAr ? "اكتب رسالة..." : "Type a message..."}
          </div>
          <div className="size-8 rounded-full flex items-center justify-center bg-nb-mint-700">
            <ArrowRight className="size-3.5 text-white rtl:rotate-180" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Email preview (channel-native) ────────────────────────────────────────────
function EmailPreview({ isAr, surveyName }: { isAr: boolean; surveyName: string }) {
  const firstQ = DEMO_QUESTIONS[0]
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="bg-muted border-b border-border p-4 space-y-2.5 text-sm">
        {[
          { label: isAr ? "من:" : "From:", value: "Nabadat CX <noreply@nabadat.cx>" },
          { label: isAr ? "إلى:" : "To:", value: "customer@example.com" },
          { label: isAr ? "الموضوع:" : "Subject:", value: surveyName, bold: true },
        ].map(({ label, value, bold }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
            <span className={cn("text-foreground text-xs", bold && "font-semibold")}>{value}</span>
          </div>
        ))}
      </div>
      <div className="p-6 bg-muted/40">
        <div className="max-w-lg mx-auto rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-nb-mint to-nb-cyan p-8 text-center">
            <p className="text-white/80 text-xs uppercase tracking-widest mb-2">Nabadat CX</p>
            <h2 className="font-heading font-bold text-xl text-white mb-2" dir={isAr ? "rtl" : "ltr"}>
              {isAr ? "شاركنا رأيك" : "Share Your Feedback"}
            </h2>
            <p className="text-white/80 text-sm">{isAr ? "دقيقتان فقط تكفيان" : "Only 2 minutes of your time"}</p>
          </div>
          <div className="bg-card p-6">
            <p className="text-base font-semibold text-foreground mb-4" dir={isAr ? "rtl" : "ltr"}>
              {isAr ? firstQ.titleAr : firstQ.titleEn}
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="size-10 rounded-full border-2 flex items-center justify-center text-sm font-bold border-nb-cyan text-nb-cyan">
                  {n}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-4 bg-nb-cyan-100/60 dark:bg-nb-cyan-900/20 rounded-md p-3">
              <AlertTriangle className="size-3.5 text-nb-cyan shrink-0 mt-0.5" />
              <p className="text-xs text-nb-cyan-800 dark:text-nb-cyan-300">
                {isAr
                  ? "النقر على أي تقييم أعلاه سيفتح بقية الاستبيان (سؤالان إضافيان) في متصفحك."
                  : "Tapping any rating above will open the remaining questions (2 more) in your browser."}
              </p>
            </div>
          </div>
          <div className="bg-card border-t border-border px-6 py-4 text-center">
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground text-sm px-6">
              {isAr ? "إكمال الاستبيان في المتصفح" : "Complete Survey in Browser"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SurveyPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const survey = id ? MOCK_SURVEYS.find((s) => s.id === id) : null
  const surveyName = survey ? (isAr ? survey.nameAr : survey.nameEn) : (isAr ? "معاينة الاستبيان" : "Survey Preview")

  const [channel, setChannel] = useState<Channel>("desktop")
  const [locale, setLocale] = useState<"ar" | "en">(isAr ? "ar" : "en")
  const [mode, setMode] = useState<"inherited" | "customized">("inherited")
  const [theme, setTheme] = useState<SurveyTheme>(() => ({ ...TENANT_THEME }))
  const [previewOnly, setPreviewOnly] = useState(false)

  const setThemeKey = <K extends keyof SurveyTheme>(key: K, value: SurveyTheme[K]) =>
    setTheme((prev) => ({ ...prev, [key]: value }))

  const previewIsAr = locale === "ar"

  const channels: { key: Channel; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { key: "mobile", labelAr: "ويب موبايل", labelEn: "Mobile web", icon: <Smartphone className="size-4" /> },
    { key: "desktop", labelAr: "ويب ديسكتوب", labelEn: "Desktop web", icon: <Monitor className="size-4" /> },
    { key: "whatsapp", labelAr: "واتساب", labelEn: "WhatsApp", icon: <MessageCircle className="size-4" /> },
    { key: "email", labelAr: "البريد", labelEn: "Email", icon: <Mail className="size-4" /> },
  ]

  const channelWarning = useMemo(() => {
    if (channel === "whatsapp")
      return isAr
        ? "لا تدعم قناة واتساب تخصيص السمة — تُعرض الأسئلة بنمط المحادثة الأصلي."
        : "WhatsApp does not support theme customization — questions render in the native chat style."
    if (channel === "email")
      return isAr
        ? "يعرض البريد السؤال الأول فقط؛ تُكمل بقية الأسئلة في المتصفح بالسمة المخصّصة."
        : "Email embeds only the first question; the rest open in the browser with your custom theme."
    return null
  }, [channel, isAr])

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 h-14 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => navigate(id ? `/surveys/${id}/edit` : "/surveys")}
            aria-label={isAr ? "رجوع" : "Back"}
          >
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-heading font-bold truncate">
              {isAr ? "التصميم" : "Design"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isAr
                ? "صمّم الاستبيان على اليمين؛ تعرض المعاينة أسئلته الحقيقية لكل قناة."
                : "Style the survey; the preview shows its real questions per channel."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Locale switch */}
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOnly((p) => !p)}
          >
            {previewOnly ? <PanelLeftClose className="size-4" /> : <Eye className="size-4" />}
            {previewOnly ? (isAr ? "العودة للتصميم" : "Back to design") : (isAr ? "معاينة" : "Preview")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/surveys")}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
            onClick={() => navigate("/surveys")}
          >
            <Check className="size-4" />
            {isAr ? "حفظ الاستبيان" : "Save survey"}
          </Button>
        </div>
      </header>

      {/* Two-pane body */}
      <div
        className={cn(
          "flex-1 overflow-hidden grid",
          previewOnly ? "grid-cols-1" : "lg:grid-cols-[minmax(320px,380px)_1fr] grid-cols-1",
        )}
      >
        {/* Controls */}
        {!previewOnly && (
          <aside className="overflow-y-auto border-e border-border p-4 hidden lg:block">
            <SurveyDesignControls
              isAr={isAr}
              theme={theme}
              mode={mode}
              onModeChange={setMode}
              onChange={setThemeKey}
            />
          </aside>
        )}

        {/* Preview */}
        <section className="overflow-y-auto bg-muted/20 p-6 space-y-4">
          {/* Channel segmented control */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              {channels.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setChannel(ch.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                    channel === ch.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {ch.icon}
                  {isAr ? ch.labelAr : ch.labelEn}
                </button>
              ))}
            </div>
          </div>

          {channel === "mobile" && <MobilePreview isAr={previewIsAr} surveyName={surveyName} theme={theme} />}
          {channel === "desktop" && <DesktopPreview isAr={previewIsAr} surveyName={surveyName} theme={theme} />}
          {channel === "whatsapp" && <WhatsAppPreview isAr={previewIsAr} surveyName={surveyName} />}
          {channel === "email" && <EmailPreview isAr={previewIsAr} surveyName={surveyName} />}

          {channelWarning && (
            <div className="mx-auto max-w-2xl flex items-start gap-2 rounded-md bg-d3-light dark:bg-d3-dark/20 border border-d3/30 p-3 text-xs text-d3-dark dark:text-d3-light">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>{channelWarning}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
