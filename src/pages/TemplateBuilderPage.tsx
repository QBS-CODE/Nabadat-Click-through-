import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { ArrowRight, ArrowLeft, Trash2, Check, Pencil, Settings2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { SurveyStepsWizard } from "@/components/surveys/SurveyStepsWizard"
import type { BuilderSection } from "@/components/surveys/SurveyQuestionsBuilder"
import { MOCK_TEMPLATES } from "@/data/mock-surveys"
import { toast } from "sonner"

// A template's saved questions (loaded when editing / building on it).
function seedTemplateSections(isAr: boolean): BuilderSection[] {
  return [{
    id: "g-1", name: isAr ? "عام" : "General", sets: [],
    questions: [
      { id: "tq-1", type: "KPI", text: "How likely are you to recommend us to a friend or colleague?", required: true, kpi: "nps", perspective: "overall", scaleView: "labels", scalePoints: 5, comments: false, reason: { on: false } },
      { id: "tq-2", type: "Single select", text: "Which channel did you use?", required: false, options: ["Mobile app", "Web", "Branch", "Call centre"], selectDisplay: "radio", comments: false },
    ],
  }]
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const NextIcon = isRtl ? ArrowLeft : ArrowRight

  const existing = id ? MOCK_TEMPLATES.find((t) => t.id === id) : null
  const isEdit = !!existing

  const [phase, setPhase] = useState<"settings" | "wizard">("settings")
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? "")
  const [nameAr, setNameAr] = useState(existing?.nameAr ?? "")
  const [desc, setDesc] = useState("")
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "))
  const [deleteOpen, setDeleteOpen] = useState(false)

  const breadcrumbBase = isAr
    ? `القوالب › ${isEdit ? "تعديل قالب" : "قالب جديد"}`
    : `Templates › ${isEdit ? "Edit template" : "New template"}`

  // ── Wizard phase (details → questions → design) ──────────────
  if (phase === "wizard") {
    return (
      <SurveyStepsWizard
        breadcrumbBase={breadcrumbBase}
        detailsTitle={isAr ? "تفاصيل الاستبيان" : "Survey Details"}
        detailsSubtitle={isAr
          ? "هيّئ هوية الاستبيان وربطه بالجمهور والرسائل التي يراها المشاركون."
          : "Set Up The Survey Identity, Audience Binding, And The Messages Respondents See."}
        saveLabel={isAr ? "حفظ القالب" : "Save template"}
        initialName={isAr ? nameAr : nameEn}
        initialSections={isEdit ? seedTemplateSections(isAr) : undefined}
        onCancel={() => navigate("/surveys")}
        onBackFromFirst={() => setPhase("settings")}
        onTranslate={() => navigate("/surveys/new/translations")}
        onSave={() => { toast.success(isAr ? "تم حفظ القالب" : "Template saved"); navigate("/surveys") }}
      />
    )
  }

  // ── Settings phase (New / Edit template main settings) ───────
  // Proceed to the questions wizard (name can still be set on the details step).
  const goBuild = () => setPhase("wizard")

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{breadcrumbBase}</p>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5" onClick={() => navigate("/surveys")} aria-label={isAr ? "رجوع" : "Back"}>
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold">
              {isEdit ? (isAr ? "تعديل قالب" : "Edit Template") : (isAr ? "قالب جديد" : "New Template")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {isAr
                ? "عدّل الإعدادات الرئيسية للقالب ثم ابنِ أسئلته. تحمل القوالب إعدادات الاستبيان وأسئلته المحفوظة، لكن دون روابط رحلة."
                : "Edit The Template's Main Settings, Then Build Its Questions. Templates Carry The Survey's Saved Settings And Questions, But No Journey Bindings."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEdit ? (
            <>
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />{isAr ? "حذف القالب" : "Delete template"}
              </Button>
              <Button variant="outline" onClick={() => toast.success(isAr ? "تم حفظ الإعدادات" : "Template settings saved")}>
                <Check className="size-4" />{isAr ? "حفظ الإعدادات" : "Save settings"}
              </Button>
              <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={goBuild}>
                <Pencil className="size-4" />{isAr ? "تعديل الأسئلة" : "Edit questions"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate("/surveys")}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={goBuild}>
                <NextIcon className="size-4" />{isAr ? "إضافة الأسئلة" : "Add questions"}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardContent className="px-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{isAr ? "الإعدادات الرئيسية" : "Main settings"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-en">{isAr ? "اسم القالب" : "Template name"} <span className="text-muted-foreground font-normal">{isAr ? "— الإنجليزية" : "— English"}</span></Label>
              <Input id="tpl-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={isAr ? "مثال: قالب NPS القياسي" : "e.g. Standard Banking NPS Template"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-ar">{isAr ? "الاسم — العربية" : "الاسم — Arabic"}</Label>
              <Input id="tpl-ar" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: قالب NPS القياسي" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">{isAr ? "الوصف" : "Description"} <span className="text-muted-foreground font-normal">{isAr ? "— لماذا هذا القالب" : "— what this template is for"}</span></Label>
            <Textarea id="tpl-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={isAr ? "متى يستخدم فرق تجربة العملاء هذا القالب." : "When CX teams should reach for this template."} className="min-h-20" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-tags">{isAr ? "الوسوم" : "Tags"} <span className="text-muted-foreground font-normal">{isAr ? "— اختياري، مفصولة بفواصل" : "— optional, comma separated"}</span></Label>
            <Input id="tpl-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={isAr ? "مثال: NPS، فتح الحساب، ما بعد المعاملة" : "e.g. NPS, onboarding, post-transaction"} />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-nb-cyan-200 dark:border-nb-cyan-900/60 bg-nb-cyan-100/40 dark:bg-nb-cyan-900/15 p-3 text-xs text-nb-cyan-800 dark:text-nb-cyan-200 leading-relaxed">
            <Info className="size-4 mt-0.5 shrink-0" />
            <span>
              {isAr
                ? "يخزّن القالب إعدادات الاستبيان (سلوك التجميع، المظهر، الرسائل) وأسئلته وروابط المؤشرات، لكن دون روابط رحلة/مرحلة/نقطة تماس — تُعاد هذه عند استخدام القالب لإنشاء استبيان."
                : <>A template stores the survey's <b>settings</b> (collection behaviour, appearance, messages) and its <b>questions and KPI links</b>, but <b>no journey/stage/touchpoint bindings</b> — those are re-resolved when the template is used to create a survey.</>}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "حذف القالب؟" : "Delete template?"}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {isAr
                ? `سيتم حذف "${nameEn || nameAr}" نهائياً. الاستبيانات التي أُنشئت منه لن تتأثر.`
                : `"${nameEn || nameAr}" will be permanently deleted. Surveys already created from it are not affected.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => { setDeleteOpen(false); toast.success(isAr ? "تم حذف القالب" : "Template deleted"); navigate("/surveys") }}>
              {isAr ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
