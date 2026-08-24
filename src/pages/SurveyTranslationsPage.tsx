import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { ArrowLeft, ArrowRight, Check, Plus, Search, Sparkles, Languages, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { MOCK_SURVEYS } from "@/data/mock-surveys"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── Translatable fields (English is the authoring source) ─────────────────────
type TrField = { id: string; label: string; src: string }
const FIELDS: TrField[] = [
  { id: "survey_name", label: "Survey name", src: "Post-disbursement satisfaction" },
  { id: "welcome", label: "Welcome message", src: "Thank you for sharing your experience." },
  { id: "thankyou", label: "Thank-you message", src: "Your responses have been recorded — thank you." },
  { id: "q1", label: "KPI · question", src: "How satisfied were you with the loan disbursement?" },
  { id: "q2", label: "Single select · question", src: "Which channel did you use to apply?" },
  { id: "q2_o0", label: "— option", src: "Mobile app" },
  { id: "q2_o1", label: "— option", src: "Web" },
  { id: "q2_o2", label: "— option", src: "Branch" },
  { id: "q2_o3", label: "— option", src: "Call centre" },
  { id: "q3", label: "Scale · question", src: "How clear was the fee breakdown?" },
  { id: "q4", label: "Scale · question", src: "How helpful was the branch staff?" },
  { id: "q5", label: "Yes/No (Boolean) · question", src: "Was the waiting time acceptable?" },
  { id: "q5_bt", label: "— \"true\" label", src: "Yes" },
  { id: "q5_bf", label: "— \"false\" label", src: "No" },
]

// Seed Arabic drafts — the built-in dictionary the "Generate AI drafts" action draws on.
const AR_DICT: Record<string, string> = {
  "Post-disbursement satisfaction": "رضا ما بعد الصرف",
  "Thank you for sharing your experience.": "شكراً لمشاركتك تجربتك.",
  "Your responses have been recorded — thank you.": "تم تسجيل ردودك — شكراً لك.",
  "How satisfied were you with the loan disbursement?": "ما مدى رضاك عن صرف القرض؟",
  "Which channel did you use to apply?": "ما القناة التي استخدمتها للتقديم؟",
  "Mobile app": "تطبيق الجوال",
  "Web": "الويب",
  "Branch": "الفرع",
  "Call centre": "مركز الاتصال",
  "Yes": "نعم",
  "No": "لا",
  "How clear was the fee breakdown?": "ما مدى وضوح تفصيل الرسوم؟",
  "How helpful was the branch staff?": "ما مدى تعاون موظفي الفرع؟",
  "Was the waiting time acceptable?": "هل كان وقت الانتظار مقبولاً؟",
}

const ADD_LANG_OPTIONS = ["French", "Urdu", "Turkish", "Spanish", "German"]
const RTL_LANGS = ["Arabic", "Urdu"]

// The seeded draft for a field in a language (Arabic pulls from the dictionary).
function seedValue(lang: string, src: string): string {
  return lang === "Arabic" ? (AR_DICT[src] ?? "") : ""
}

export default function SurveyTranslationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const t = (en: string, ar: string) => (isAr ? ar : en)

  const survey = id ? MOCK_SURVEYS.find((s) => s.id === id) : null
  const surveyName = survey ? (isAr ? survey.nameAr : survey.nameEn) : FIELDS[0].src

  const [targetLangs, setTargetLangs] = useState<string[]>(["Arabic"])
  const [addLang, setAddLang] = useState(ADD_LANG_OPTIONS[0])
  const [search, setSearch] = useState("")
  // trData[lang][fieldId] — undefined means "fall back to the seeded draft".
  const [trData, setTrData] = useState<Record<string, Record<string, string>>>({ Arabic: {} })

  const fields = FIELDS.map((f) => (f.id === "survey_name" ? { ...f, src: surveyName } : f))

  const valueOf = (lang: string, f: TrField) => trData[lang]?.[f.id] ?? seedValue(lang, f.src)
  const setTr = (lang: string, fid: string, v: string) =>
    setTrData((prev) => ({ ...prev, [lang]: { ...(prev[lang] ?? {}), [fid]: v } }))

  function addLanguage() {
    if (targetLangs.includes(addLang)) { toast.info(t(`${addLang} is already added.`, `${addLang} مضافة بالفعل.`)); return }
    setTargetLangs((prev) => [...prev, addLang])
    setTrData((prev) => ({ ...prev, [addLang]: prev[addLang] ?? {} }))
    toast.success(t(`${addLang} added.`, `تمت إضافة ${addLang}.`))
  }
  function removeLanguage(lang: string) {
    setTargetLangs((prev) => prev.filter((l) => l !== lang))
  }
  function generateDrafts() {
    setTrData((prev) => {
      const next = { ...prev }
      for (const lang of targetLangs) {
        const cur = { ...(next[lang] ?? {}) }
        for (const f of fields) {
          if (!cur[f.id]) cur[f.id] = lang === "Arabic" ? (AR_DICT[f.src] ?? `[${lang}] ${f.src}`) : `[${lang}] ${f.src}`
        }
        next[lang] = cur
      }
      return next
    })
    toast.success(t("AI drafts generated — edit and Save.", "تم إنشاء مسودات الذكاء الاصطناعي — عدّلها ثم احفظ."))
  }

  const term = search.trim().toLowerCase()
  const rows = fields.filter((f) => !term || f.label.toLowerCase().includes(term) || f.src.toLowerCase().includes(term))

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{t("Surveys › Translate", "الاستبيانات › الترجمة")}</p>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5" onClick={() => navigate(-1)} aria-label={t("Back", "رجوع")}>
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold">{t("Translate Survey", "ترجمة الاستبيان")}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t("Author in English, add languages, optionally draft with AI, then edit each label and save.",
                "حرّر بالإنجليزية، أضف اللغات، اختياريًا صِغ مسودة بالذكاء الاصطناعي، ثم عدّل كل تسمية واحفظ.")}
            </p>
          </div>
        </div>
        <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground shrink-0" onClick={() => toast.success(t("Translations saved.", "تم حفظ الترجمات."))}>
          <Check className="size-4" />{t("Save", "حفظ")}
        </Button>
      </div>

      {/* Languages card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm dark:shadow-none">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Languages className="size-4" />{t("Languages", "اللغات")}
        </p>
        {/* Language chips: English (source) + targets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 text-sm font-medium">
            {t("English", "الإنجليزية")}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">{t("Source", "المصدر")}</span>
          </span>
          {targetLangs.map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm">
              {l}
              <button onClick={() => removeLanguage(l)} aria-label={t(`Remove ${l}`, `إزالة ${l}`)} className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        {/* Add language + Generate AI drafts */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Select value={addLang} onValueChange={(v) => v && setAddLang(v)}>
              <SelectTrigger className="w-40"><SelectValue>{addLang}</SelectValue></SelectTrigger>
              <SelectContent>{ADD_LANG_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={addLanguage}>
              <Plus className="size-4" />{t("Add language", "إضافة لغة")}
            </Button>
          </div>
          <div className="sm:ms-auto">
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={generateDrafts}>
              <Sparkles className="size-4" />{t("Generate AI drafts", "إنشاء مسودات بالذكاء الاصطناعي")}
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative sm:max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search a label to quick-translate…", "ابحث عن تسمية للترجمة السريعة…")} className="ps-9" />
      </div>

      {/* Fields table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">{t("Field · English", "الحقل · الإنجليزية")}</TableHead>
              {targetLangs.map((l) => <TableHead key={l}>{l}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={targetLangs.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                  {t(`No labels match "${search}".`, `لا توجد تسميات تطابق "${search}".`)}
                </TableCell>
              </TableRow>
            ) : rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="align-top">
                  <div className="text-xs font-semibold text-foreground">{f.label}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{f.src}</div>
                </TableCell>
                {targetLangs.map((l) => {
                  const rtl = RTL_LANGS.includes(l)
                  return (
                    <TableCell key={l} className="align-top">
                      <Input
                        value={valueOf(l, f)}
                        onChange={(e) => setTr(l, f.id, e.target.value)}
                        dir={rtl ? "rtl" : "ltr"}
                        placeholder={t("Translate…", "ترجم…")}
                        className={cn("h-9", rtl && "text-end")}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info note */}
      <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        {isAr ? (
          <>عدّل أي خلية مباشرةً ثم اضغط <b className="text-foreground">حفظ</b>. تملأ «إنشاء مسودات بالذكاء الاصطناعي» الخلايا الفارغة، ويمكنك تعديلها بعد ذلك.</>
        ) : (
          <>Edit any cell directly and click <b className="text-foreground">Save</b>. "Generate AI drafts" fills empty cells; you can still edit them.</>
        )}
      </div>
    </div>
  )
}
