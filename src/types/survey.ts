export type SurveyStatus = "Draft" | "Active" | "Paused" | "Archived"
export type SurveyType = "Transactional" | "Relational"
export type TemplateClass = "Platform" | "Tenant"
export type ShuffleMode = "Random" | "LowResponse" | "RoundRobin"
export type TranslationState = "untranslated" | "ai_draft" | "human_edited" | "approved" | "stale"

export interface Survey {
  id: string
  nameAr: string
  nameEn: string
  type: SurveyType
  status: SurveyStatus
  journeyId?: string
  journeyNameAr?: string
  journeyNameEn?: string
  version: string
  updatedAt: string
  responseCount: number
  questionCount: number
  /** Connected distribution rules — pausing an Active survey with rules>0 warns first. */
  rules?: number
  surveyJson?: object
  settings?: SurveySettings
}

export interface SurveyTemplate {
  id: string
  nameAr: string
  nameEn: string
  templateClass: TemplateClass
  sectors: string[]
  /** Tenant (Customized) templates carry free-text tags shown as #chips on the card. */
  tags?: string[]
  usedBySurveys: number
  updatedAt: string
  questionCount: number
  surveyJson?: object
}

export type QuestionLayout = "single" | "group" | "question" | "count"
export type AppearanceMode = "inherited" | "customized"

export interface SurveySettings {
  type: SurveyType
  journeyId?: string
  stageIds?: string[]
  shuffleEnabled: boolean
  shuffleMode: ShuffleMode
  postExpiryEnabled: boolean
  postExpiryMessage: string
  // ── Create/settings screen fields (optional — added incrementally) ──
  /** Internal-only description of what the survey measures and when it's sent. */
  descriptionInternal?: string
  /** Rich-text (HTML) shown before any question. */
  welcomeMessage?: string
  /** Rich-text (HTML) shown after submit. */
  thankYouMessage?: string
  /** Optional post-submit redirect. */
  redirectUrl?: string
  redirectDelaySeconds?: number
  /** How questions are distributed across pages. */
  questionLayout?: QuestionLayout
  /** Only meaningful when questionLayout === "count". */
  questionsPerPage?: number
  /** Active period once sent, before the survey expires. */
  activePeriodDays?: number
  activePeriodHours?: number
  /** Whether this survey inherits tenant branding or customizes its own theme. */
  appearanceMode?: AppearanceMode
}

export interface KpiQuestionConfig {
  questionName: string
  kpiId: string
  /** Which facet of the KPI this question measures (per-KPI list). */
  perspective?: string
  representationStyle: "Number" | "Stars" | "Faces" | "Slider" | "Thumbs"
  touchpointId?: string
  touchpointName?: string
  justificationEnabled: boolean
  justificationUnsatisfiedReasons: string[]
  justificationSatisfiedReasons: string[]
  justificationMultiSelect: boolean
  justificationHasOther: boolean
}

export interface QuestionBinding {
  questionName: string
  bindingLevel: "journey" | "stage" | "touchpoint"
  stageId?: string
  touchpointId?: string
  touchpointName?: string
}

export const DEFAULT_POST_EXPIRY_MESSAGE =
  "على الرغم من انتهاء فترة الاستبيان الأصلية، نحن نقدر آراءكم حول تجربتكم الأخيرة."

export const DEFAULT_WELCOME_MESSAGE =
  "<p>نشكر وقتكم — تساعدنا إجاباتكم على تحسين خدماتنا.</p>"

export const DEFAULT_THANKYOU_MESSAGE =
  "<p>تم تسجيل إجاباتكم — شكرًا لكم.</p>"

export const DEFAULT_WELCOME_MESSAGE_EN =
  "<p>Thank you for taking a moment to share your experience with us.</p>"

export const DEFAULT_THANKYOU_MESSAGE_EN =
  "<p>Your responses have been recorded — thank you.</p>"

/** UI-language-aware default respondent messages (survey creation). */
export const defaultWelcome = (isAr: boolean) => (isAr ? DEFAULT_WELCOME_MESSAGE : DEFAULT_WELCOME_MESSAGE_EN)
export const defaultThankYou = (isAr: boolean) => (isAr ? DEFAULT_THANKYOU_MESSAGE : DEFAULT_THANKYOU_MESSAGE_EN)

export const INDUSTRY_OPTIONS = [
  { value: "Banking", labelAr: "البنوك والمالية", labelEn: "Banking" },
  { value: "Telecommunications", labelAr: "الاتصالات", labelEn: "Telecommunications" },
  { value: "Government", labelAr: "الحكومة والقطاع العام", labelEn: "Government" },
  { value: "Automotive", labelAr: "السيارات", labelEn: "Automotive" },
  { value: "Entertainment", labelAr: "الترفيه", labelEn: "Entertainment" },
  { value: "Services", labelAr: "الخدمات", labelEn: "Services" },
]
