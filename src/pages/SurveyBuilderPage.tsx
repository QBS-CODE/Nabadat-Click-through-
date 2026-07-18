import { useLocation, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { SurveyStepsWizard } from "@/components/surveys/SurveyStepsWizard"
import { SurveyQuestionsBuilder, type BuilderSection } from "@/components/surveys/SurveyQuestionsBuilder"
import { MOCK_ACTIVE_KPIS, MOCK_SURVEYS } from "@/data/mock-surveys"
import { DEFAULT_DRAFT_SETTINGS } from "@/components/surveys/SurveyDetailsForm"
import { defaultWelcome, defaultThankYou, type SurveySettings } from "@/types/survey"

// The survey the AI builder "drafts" — seeded into the wizard when opened via
// Build with AI › Open in editor (matches the reference generated card).
function aiSections(isAr: boolean): BuilderSection[] {
  return [
    {
      id: "g-ai",
      name: isAr ? "رضا صرف القرض" : "Loan disbursement satisfaction",
      sets: [],
      questions: [
        { id: "ai-q1", type: "KPI", text: "How satisfied were you with the disbursement?", required: true, kpi: MOCK_ACTIVE_KPIS.find((k) => k.id === "csat")?.id ?? "csat", perspective: "overall", boundJourney: true, journeyId: "j-002", scaleView: "labels", scalePoints: 5, comments: false, options: [] },
        { id: "ai-q2", type: "KPI", text: "How easy was the process?", required: true, kpi: MOCK_ACTIVE_KPIS.find((k) => k.id === "ces")?.id ?? "ces", perspective: "overall", boundJourney: true, journeyId: "j-002", scaleView: "labels", scalePoints: 5, comments: false, options: [] },
        { id: "ai-q3", type: "Single select", text: "Which channel did you use?", required: false, selectDisplay: "radio", options: ["Mobile app", "Web", "Branch", "Call centre"], comments: false },
        { id: "ai-q4", type: "Yes/No (Boolean)", text: "Would you recommend us?", required: false, trueLabel: "Yes", falseLabel: "No", boolDisplay: "buttons", options: [] },
        { id: "ai-q5", type: "Input Field", text: "Anything we could improve?", required: false, inputType: "Paragraph", sentiment: true, options: [] },
      ],
    },
  ]
}

// A survey's seeded questions (loaded when editing an existing survey with responses).
function seedSections(hasQuestions: boolean, isAr: boolean): BuilderSection[] {
  if (!hasQuestions) return [{ id: "g-general", name: isAr ? "عام" : "General", questions: [], sets: [] }]
  return [
    {
      id: "g-service",
      name: isAr ? "تجربة الخدمة" : "Service Experience",
      sets: [],
      questions: [
        {
          id: "q-csat", type: "KPI", text: "How satisfied were you with the loan disbursement?",
          required: true, kpi: MOCK_ACTIVE_KPIS.find((k) => k.id === "csat")?.id ?? "csat", perspective: "overall",
          // Bound to srv-001's journey (j-001, Digital Onboarding): stage s-001 → SMS Verification.
          boundJourney: true, journeyId: "j-001", stageId: "s-001", touchpointId: "tp-002",
          touchpoint: "Registration & Verification → SMS Verification",
          scaleView: "labels", scalePoints: 5, comments: true,
          reason: { on: true, prompt: "What was the main reason for your score?", multi: false, reasons: ["Slow disbursement", "Unclear fees", "Staff was unhelpful"], hasOther: true },
          options: [],
        },
        {
          id: "q-channel", type: "Single select", text: "Which channel did you use to apply?",
          required: false, options: ["Mobile app", "Web", "Branch", "Call centre"], selectDisplay: "radio", comments: false,
        },
      ],
    },
  ]
}

// Edit an existing survey — or build a new one — through the same 3-step wizard.
// `initialStep`: 0 details · 1 questions · 2 design (the Preview icon lands on Design).
export default function SurveyBuilderPage({ initialStep = 0, previewFull = false }: { initialStep?: 0 | 1 | 2; previewFull?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isAr = i18n.language === "ar"

  const existing = id ? MOCK_SURVEYS.find((s) => s.id === id) : null
  const isEdit = !!existing
  // Entered via Build with AI › Open in editor: seed the drafted questions and
  // land on the Questions step, with "Build method" shown done in the stepper.
  const fromAi = (useLocation().state as { fromAi?: boolean } | null)?.fromAi ?? false

  const initialSettings: SurveySettings = {
    ...DEFAULT_DRAFT_SETTINGS(defaultWelcome(isAr), defaultThankYou(isAr)),
    ...(fromAi ? { type: "Transactional" as const, journeyId: "j-002" } : {}),
    ...(existing?.settings ?? {}),
  }

  return (
    <SurveyStepsWizard
      breadcrumbBase={isAr ? "الاستبيانات" : "Surveys"}
      detailsTitle={isEdit ? (isAr ? (existing?.nameAr ?? "تعديل الاستبيان") : (existing?.nameEn ?? "Edit Survey")) : (isAr ? "استبيان جديد" : "New Survey")}
      detailsSubtitle={isAr
        ? "هيّئ هوية الاستبيان وربطه بالجمهور والرسائل التي يراها المشاركون."
        : "Set Up The Survey Identity, Audience Binding, And The Messages Respondents See."}
      saveLabel={isAr ? "حفظ الاستبيان" : "Save survey"}
      initialName={existing ? (isAr ? existing.nameAr : existing.nameEn) : (fromAi ? (isAr ? "رضا صرف القرض" : "Loan disbursement satisfaction") : "")}
      initialSettings={initialSettings}
      initialSections={fromAi ? aiSections(isAr) : seedSections(!!existing && existing.responseCount > 0, isAr)}
      initialStep={fromAi ? 1 : initialStep}
      initialPreviewFull={previewFull}
      onCancel={() => navigate("/surveys")}
      onBackFromFirst={() => navigate(fromAi ? "/surveys/new" : "/surveys")}
      onTranslate={id ? () => navigate(`/surveys/${id}/translations`) : undefined}
      onSave={() => { toast.success(isEdit ? (isAr ? "تم حفظ التغييرات" : "Changes saved") : (isAr ? "تم حفظ الاستبيان كمسودة" : "Survey saved as Draft")); navigate("/surveys") }}
    />
  )
}

// Keep the questions-builder export path stable for any lazy consumers.
export { SurveyQuestionsBuilder }
