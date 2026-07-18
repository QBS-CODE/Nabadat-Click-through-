import { useEffect, useRef } from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { SurveyStepsWizard } from "@/components/surveys/SurveyStepsWizard"
import type { BuilderSection } from "@/components/surveys/SurveyQuestionsBuilder"
import { MOCK_TEMPLATES } from "@/data/mock-surveys"

// The template's saved questions, loaded into the new survey (journey bindings are re-resolved).
function seedFromTemplate(isAr: boolean): BuilderSection[] {
  return [{
    id: "g-1", name: isAr ? "عام" : "General", sets: [],
    questions: [
      { id: "uq-1", type: "KPI", text: "How likely are you to recommend us to a friend or colleague?", required: true, kpi: "nps", perspective: "overall", scaleView: "labels", scalePoints: 5, comments: false, reason: { on: false } },
      { id: "uq-2", type: "Single select", text: "Which channel did you use?", required: false, options: ["Mobile app", "Web", "Branch", "Call centre"], selectDisplay: "radio", comments: false },
    ],
  }]
}

// "Use as Survey" (from a template card) → the 3-step wizard, pre-filled from the template.
export default function UseTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isAr = i18n.language === "ar"
  const tpl = templateId ? MOCK_TEMPLATES.find((t) => t.id === templateId) : null
  // Preview icon on a template card jumps straight to the Design step (step 2).
  const isPreview = (useLocation().state as { preview?: boolean } | null)?.preview === true

  const toasted = useRef(false)
  useEffect(() => {
    if (toasted.current) return
    toasted.current = true
    if (isPreview) return
    toast.success(isAr
      ? "تم تطبيق القالب — تم تحميل إعداداته وأسئلته المحفوظة."
      : "Template applied — its saved survey settings and questions were loaded.")
  }, [isAr, isPreview])

  return (
    <SurveyStepsWizard
      breadcrumbBase={isAr ? "الاستبيانات" : "Surveys"}
      detailsTitle={isAr ? "استبيان جديد" : "New Survey"}
      detailsSubtitle={isAr
        ? "هيّئ هوية الاستبيان وربطه بالجمهور والرسائل التي يراها المشاركون."
        : "Set Up The Survey Identity, Audience Binding, And The Messages Respondents See."}
      saveLabel={isAr ? "إنشاء الاستبيان" : "Create survey"}
      initialName={tpl ? (isAr ? tpl.nameAr : tpl.nameEn) : ""}
      initialSections={seedFromTemplate(isAr)}
      initialStep={isPreview ? 2 : undefined}
      initialPreviewFull={isPreview}
      onCancel={() => navigate("/surveys")}
      onBackFromFirst={() => navigate("/surveys/templates/pick")}
      onTranslate={() => navigate("/surveys/new/translations")}
      onSave={() => { toast.success(isAr ? "تم إنشاء الاستبيان كمسودة" : "Survey created as Draft"); navigate("/surveys") }}
    />
  )
}
