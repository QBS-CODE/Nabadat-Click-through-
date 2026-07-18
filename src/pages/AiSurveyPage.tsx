import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, ArrowLeft, Send, Sparkles, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "ai" | "user"
  text: string
}

// The survey the assistant "drafts" — mirrors the generated card in the reference.
const GENERATED = [
  { n: 1, en: "KPI (CSAT) — How satisfied were you with the disbursement?", ar: "مؤشر (CSAT) — ما مدى رضاك عن عملية الصرف؟" },
  { n: 2, en: "KPI (CES) — How easy was the process?", ar: "مؤشر (CES) — ما مدى سهولة العملية؟" },
  { n: 3, en: "Radio — Which channel did you use?", ar: "اختيار — ما القناة التي استخدمتها؟" },
  { n: 4, en: "Boolean — Would you recommend us?", ar: "نعم/لا — هل توصي بنا؟" },
  { n: 5, en: "Long input — Anything we could improve?", ar: "نص طويل — ما الذي يمكننا تحسينه؟" },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AiSurveyPage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const endRef = useRef<HTMLDivElement>(null)

  const [input, setInput] = useState("")
  const [generated, setGenerated] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "ai-0",
      role: "ai",
      text: isAr
        ? "مرحباً — يمكنني صياغة استبيان باستخدام رحلاتك ونقاط التماس والمؤشرات. ما هدف هذا الاستبيان، وأي تفاصيل (الطول، النبرة، مواضيع أساسية)؟"
        : "Hi — I can draft a survey using your journeys, touchpoints, and KPIs. What's the goal of this survey, and any specifics (length, tone, must-have topics)?",
    },
  ])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, generated])

  function generate() {
    const text = input.trim() || (isAr
      ? "قياس الرضا بعد صرف القرض (≤6 أسئلة، تضمين CSAT وسؤال جهد)."
      : "Measure satisfaction after loan disbursement (≤6 questions, include CSAT + effort).")
    setInput("")
    setMessages((prev) => [...prev, { id: `user-${prev.length}`, role: "user", text }])
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: `ai-${prev.length}`,
        role: "ai",
        text: isAr
          ? "تم — صغتُ استبياناً من 5 أسئلة مرتبطاً برحلة القرض الشخصي. راجعه في المحرر قبل النشر."
          : "Done — I drafted a 5-question survey bound to the Personal Loan journey. Review it in the editor before publishing.",
      }])
      setGenerated(true)
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      generate()
    }
  }

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{isAr ? "الاستبيانات › أنشئ بالذكاء الاصطناعي" : "Surveys › Build with AI"}</p>

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5" onClick={() => navigate("/surveys/new")} aria-label={isAr ? "رجوع" : "Back"}>
          <BackIcon className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-bold">{isAr ? "أنشئ بالذكاء الاصطناعي" : "Build With AI"}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isAr
              ? "لدى المساعد سياق مؤسستك. صِف الهدف وأي متطلبات."
              : "The assistant has your tenant's context. Describe the goal and any requirements."}
          </p>
        </div>
      </div>

      {/* Chat card */}
      <div className="max-w-3xl rounded-lg border border-border bg-card p-5 space-y-4">
        {/* Tenant context chip */}
        <div className="inline-flex items-center gap-2 rounded-md bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200 px-3 py-1.5 text-xs font-medium">
          <Sparkles className="size-3.5" />
          {isAr
            ? "تم تحميل سياق المؤسسة · مصرفي · رحلات القرض الشخصي · 8 مؤشرات نشطة"
            : "Tenant context loaded · Banking · Personal Loan journeys · 8 active KPIs"}
        </div>

        {/* Conversation */}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-ee-sm"
                    : "bg-muted/40 border border-border text-foreground rounded-es-sm",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Generated survey card */}
          {generated && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-2">
              <h4 className="text-sm font-bold">
                {isAr ? "مُنشأ · رضا صرف القرض" : "Generated · Loan disbursement satisfaction"}
              </h4>
              <div className="space-y-1.5">
                {GENERATED.map((q) => (
                  <div key={q.n} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums me-1">{q.n} ·</span>
                    {isAr ? q.ar : q.en}
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => navigate("/surveys/new/builder", { state: { fromAi: true } })}
                >
                  {isAr ? "فتح في المحرر" : "Open in editor"}
                </Button>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAr
              ? "مثال: قياس الرضا بعد صرف القرض، أبقه دون 6 أسئلة، وتضمين سؤال CSAT وسؤال جهد."
              : "e.g. Measure satisfaction after loan disbursement, keep it under 6 questions, include a CSAT and an effort question."}
            className="w-full min-h-[56px] max-h-32 resize-none"
            dir={isAr ? "rtl" : "ltr"}
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
              onClick={generate}
            >
              <Send className="size-4" />
              {isAr ? "إنشاء" : "Generate"}
            </Button>
          </div>
        </div>

        {/* Draft note */}
        <div className="flex items-start gap-2 rounded-md bg-accent border border-border p-3 text-xs text-muted-foreground leading-relaxed">
          <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
          <span>
            {isAr ? (
              <>مخرجات الذكاء الاصطناعي <b className="text-foreground">مسودة</b>. تُفتح في المحرر كاستبيان مسودة وتحتاج مراجعتك قبل أن تصبح نشطة.</>
            ) : (
              <>AI output is a <b className="text-foreground">draft</b>. It opens in the editor as a Draft survey and needs your review before it can go Active.</>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
