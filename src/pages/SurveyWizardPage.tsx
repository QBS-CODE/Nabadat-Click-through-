import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Plus, LayoutTemplate, Sparkles, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { SurveyStepsWizard } from "@/components/surveys/SurveyStepsWizard"

// "Add Survey" → Build-method chooser → (Survey builder) → details/questions/design wizard.
export default function SurveyWizardPage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  // Cloning a survey skips the build-method chooser and lands straight on the
  // survey-details step, prefilled with "Copy of - <name>" (matches reference).
  const cloneName = (useLocation().state as { cloneName?: string } | null)?.cloneName
  const [building, setBuilding] = useState(!!cloneName)

  if (building) {
    return (
      <SurveyStepsWizard
        methodDone={!cloneName}
        initialName={cloneName}
        breadcrumbBase={isAr ? "الاستبيانات" : "Surveys"}
        detailsTitle={isAr ? "استبيان جديد" : "New Survey"}
        detailsSubtitle={isAr
          ? "هيّئ هوية الاستبيان وربطه بالجمهور والرسائل التي يراها المشاركون."
          : "Set Up The Survey Identity, Audience Binding, And The Messages Respondents See."}
        saveLabel={isAr ? "حفظ الاستبيان" : "Save survey"}
        onCancel={() => navigate("/surveys")}
        onBackFromFirst={() => (cloneName ? navigate("/surveys") : setBuilding(false))}
        onTranslate={() => navigate("/surveys/new/translations")}
        onSave={() => { toast.success(isAr ? "تم حفظ الاستبيان كمسودة" : "Survey saved as Draft"); navigate("/surveys") }}
      />
    )
  }

  const methods = [
    { icon: Plus, titleEn: "Survey builder", titleAr: "منشئ الاستبيان", descEn: "Start from a blank survey and add questions yourself.", descAr: "ابدأ باستبيان فارغ وأضف أسئلتك بنفسك.", onClick: () => setBuilding(true), bg: "bg-nb-cyan-100 dark:bg-nb-cyan-900/40", color: "text-nb-cyan" },
    { icon: LayoutTemplate, titleEn: "From a template", titleAr: "من قالب", descEn: "Browse templates by sector, pick one, then edit it as a survey.", descAr: "تصفّح القوالب حسب القطاع، اختر واحداً، ثم عدّله كاستبيان.", onClick: () => navigate("/surveys/templates/pick"), bg: "bg-nb-cyan-100 dark:bg-nb-cyan-900/40", color: "text-nb-cyan" },
    { icon: Sparkles, titleEn: "Build with AI", titleAr: "أنشئ بالذكاء الاصطناعي", descEn: "Describe the goal; the model drafts a survey for you to review.", descAr: "صف الهدف؛ يصيغ النموذج استبياناً لمراجعته.", onClick: () => navigate("/surveys/new/ai"), bg: "bg-nb-mint-100 dark:bg-nb-mint-900/40", color: "text-nb-mint-700" },
  ]

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{isAr ? "الاستبيانات › طريقة البناء" : "Surveys › Build method"}</p>
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="size-9 shrink-0 mt-0.5" onClick={() => navigate("/surveys")} aria-label={isAr ? "رجوع" : "Back"}>
          <BackIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">{isAr ? "كيف تريد بناءه؟" : "How Do You Want To Build It?"}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isAr
              ? "اختر نقطة البداية أولاً — ستهيّئ إعدادات الاستبيان بعد ذلك، ثم تصل إلى المُنشئ."
              : "Pick A Starting Point First — You Will Configure The Survey's Settings Next, Then Land In The Builder."}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methods.map((c) => {
          const Icon = c.icon
          return (
            <button key={c.titleEn} onClick={c.onClick} className="rounded-lg border border-border bg-card p-6 text-start space-y-3 hover:border-primary/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <div className={cn("flex size-11 items-center justify-center rounded-md", c.bg)}>
                <Icon className={cn("size-5", c.color)} />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">{isAr ? c.titleAr : c.titleEn}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{isAr ? c.descAr : c.descEn}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
