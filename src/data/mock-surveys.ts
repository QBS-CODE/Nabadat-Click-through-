import type { Survey, SurveyTemplate } from "@/types/survey"

export const MOCK_SURVEYS: Survey[] = [
  {
    id: "srv-001",
    nameAr: "رضا ما بعد الصرف",
    nameEn: "Post-disbursement satisfaction",
    type: "Transactional",
    status: "Active",
    journeyId: "j-001",
    journeyNameAr: "طلب قرض شخصي",
    journeyNameEn: "Personal Loan Application",
    version: "v2.1",
    updatedAt: "2 days ago",
    responseCount: 3420,
    questionCount: 8,
    rules: 3,
    settings: {
      type: "Transactional",
      journeyId: "j-001",
      stageIds: ["s-001", "s-002"],
      shuffleEnabled: false,
      shuffleMode: "Random",
      postExpiryEnabled: false,
      postExpiryMessage: "",
      appearanceMode: "inherited",
    },
    surveyJson: {
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "kpiQuestion",
              name: "q_csat",
              title: { ar: "كيف تقيّم تجربتك العامة مع خدمتنا؟", en: "How would you rate your overall experience?" },
            },
            {
              type: "rating",
              name: "q_nps",
              title: { ar: "ما مدى احتمال توصيتك بخدماتنا لأصدقائك وزملائك؟", en: "How likely are you to recommend us?" },
              rateMin: 0,
              rateMax: 10,
            },
            {
              type: "comment",
              name: "q_open",
              title: { ar: "ما الذي يمكننا تحسينه في تجربتك؟", en: "What could we improve about your experience?" },
            },
          ],
        },
      ],
    },
  },
  {
    id: "srv-002",
    nameAr: "ملاحظات فتح الحساب",
    nameEn: "Account onboarding feedback",
    type: "Transactional",
    status: "Active",
    journeyId: "j-002",
    journeyNameAr: "فتح الحساب",
    journeyNameEn: "Account Onboarding",
    version: "v1.3",
    updatedAt: "5 days ago",
    responseCount: 1915,
    questionCount: 5,
    rules: 1,
    settings: {
      type: "Transactional",
      journeyId: "j-002",
      shuffleEnabled: true,
      shuffleMode: "Random",
      postExpiryEnabled: true,
      postExpiryMessage:
        "على الرغم من انتهاء فترة الاستبيان، نقدر رأيك حول تجربتك الأخيرة في الفرع.",
      appearanceMode: "inherited",
    },
  },
  {
    id: "srv-003",
    nameAr: "نبض العلاقة الفصلي",
    nameEn: "Quarterly relationship pulse",
    type: "Relational",
    status: "Paused",
    version: "v1.0",
    updatedAt: "3 weeks ago",
    responseCount: 806,
    questionCount: 12,
    rules: 2,
    settings: {
      type: "Relational",
      shuffleEnabled: false,
      shuffleMode: "Random",
      postExpiryEnabled: false,
      postExpiryMessage: "",
      appearanceMode: "customized",
    },
  },
  {
    id: "srv-004",
    nameAr: "تجربة زيارة الفرع",
    nameEn: "Branch visit experience",
    type: "Transactional",
    status: "Draft",
    journeyId: "j-003",
    journeyNameAr: "زيارة الفرع",
    journeyNameEn: "Branch Visit",
    version: "v3.0",
    updatedAt: "1 day ago",
    responseCount: 0,
    questionCount: 7,
    rules: 0,
    settings: {
      type: "Transactional",
      journeyId: "j-003",
      shuffleEnabled: false,
      shuffleMode: "Random",
      postExpiryEnabled: false,
      postExpiryMessage: "",
      appearanceMode: "inherited",
    },
  },
  {
    id: "srv-005",
    nameAr: "متابعة مركز الاتصال",
    nameEn: "Call centre follow-up",
    type: "Transactional",
    status: "Active",
    journeyId: "j-002",
    journeyNameAr: "فتح الحساب",
    journeyNameEn: "Account Onboarding",
    version: "v1.0",
    updatedAt: "1 week ago",
    responseCount: 612,
    questionCount: 6,
    rules: 2,
  },
]

export const MOCK_TEMPLATES: SurveyTemplate[] = [
  {
    id: "tpl-001",
    nameAr: "قالب NPS المصرفي القياسي",
    nameEn: "Standard Banking NPS Template",
    templateClass: "Platform",
    sectors: ["Banking"],
    usedBySurveys: 14,
    updatedAt: "2026-05-01",
    questionCount: 4,
  },
  {
    id: "tpl-002",
    nameAr: "قالب رضا الخدمة الحكومية",
    nameEn: "Government Service Satisfaction",
    templateClass: "Platform",
    sectors: ["Government"],
    usedBySurveys: 8,
    updatedAt: "2026-04-15",
    questionCount: 6,
  },
  {
    id: "tpl-003",
    nameAr: "نبض التجربة الرقمية",
    nameEn: "Digital Experience Pulse",
    templateClass: "Platform",
    sectors: ["Banking", "Telecommunications", "Services"],
    usedBySurveys: 9,
    updatedAt: "2026-04-20",
    questionCount: 5,
  },
  {
    id: "tpl-004",
    nameAr: "قالب تقييم رحلة الاشتراك",
    nameEn: "Onboarding Journey Assessment",
    templateClass: "Tenant",
    sectors: ["Banking"],
    tags: ["onboarding", "journey", "activation"],
    usedBySurveys: 3,
    updatedAt: "2026-06-01",
    questionCount: 7,
  },
  {
    id: "tpl-005",
    nameAr: "استبيان جودة خدمة الاتصالات",
    nameEn: "Telecom Service Quality Survey",
    templateClass: "Platform",
    sectors: ["Telecommunications"],
    usedBySurveys: 11,
    updatedAt: "2026-03-28",
    questionCount: 8,
  },
  {
    id: "tpl-006",
    nameAr: "قالب ما بعد المعاملة — مخصص",
    nameEn: "Post-Transaction — Custom",
    templateClass: "Tenant",
    sectors: ["Banking", "Services"],
    tags: ["post-transaction", "CSAT", "pilot"],
    usedBySurveys: 1,
    updatedAt: "2026-06-10",
    questionCount: 5,
  },
]

export const MOCK_JOURNEYS_FOR_BINDING = [
  { id: "j-001", nameAr: "رحلة الاشتراك الرقمي", nameEn: "Digital Onboarding Journey" },
  { id: "j-002", nameAr: "رحلة الخدمة في الفرع", nameEn: "Branch Service Journey" },
  { id: "j-003", nameAr: "رحلة دعم العملاء", nameEn: "Customer Support Journey" },
]

export const MOCK_STAGES_BY_JOURNEY: Record<string, { id: string; nameAr: string; nameEn: string }[]> = {
  "j-001": [
    { id: "s-001", nameAr: "التسجيل والتحقق", nameEn: "Registration & Verification" },
    { id: "s-002", nameAr: "إعداد الحساب", nameEn: "Account Setup" },
    { id: "s-003", nameAr: "الاستخدام الأول", nameEn: "First Use" },
  ],
  "j-002": [
    { id: "s-011", nameAr: "الوصول إلى الفرع", nameEn: "Branch Arrival" },
    { id: "s-012", nameAr: "الانتظار في الطابور", nameEn: "Queue Wait" },
    { id: "s-013", nameAr: "تنفيذ المعاملة", nameEn: "Transaction Execution" },
  ],
  "j-003": [
    { id: "s-021", nameAr: "إنشاء الطلب", nameEn: "Ticket Creation" },
    { id: "s-022", nameAr: "المعالجة", nameEn: "Resolution" },
    { id: "s-023", nameAr: "الإغلاق وتقييم الرضا", nameEn: "Closure & CSAT" },
  ],
}

export const MOCK_TOUCHPOINTS_BY_STAGE: Record<string, { id: string; nameAr: string; nameEn: string }[]> = {
  "s-001": [
    { id: "tp-001", nameAr: "نموذج التسجيل عبر الإنترنت", nameEn: "Online Registration Form" },
    { id: "tp-002", nameAr: "رسالة التحقق عبر SMS", nameEn: "SMS Verification" },
  ],
  "s-002": [
    { id: "tp-003", nameAr: "شاشة إنشاء ملف المستخدم", nameEn: "Profile Setup Screen" },
    { id: "tp-004", nameAr: "رفع المستندات", nameEn: "Document Upload" },
  ],
  "s-013": [
    { id: "tp-011", nameAr: "نافذة الصراف", nameEn: "Teller Window" },
    { id: "tp-012", nameAr: "نقطة البيع", nameEn: "POS Terminal" },
  ],
}

// KPI list + scales mirror the reference's KPI_LIST / KPI_SCALE exactly
// (CSAT 1–5 · NPS 0–10 · CES 1–10 · FCR 0–1 · VFM 1–5 · Agent 1–5 · CHS 1–5).
export const MOCK_ACTIVE_KPIS = [
  { id: "csat", shortName: "CSAT", fullName: "Customer Satisfaction Score", scale: "1–5" },
  { id: "nps", shortName: "NPS", fullName: "Net Promoter Score", scale: "0–10" },
  { id: "ces", shortName: "CES", fullName: "Customer Effort Score", scale: "1–10" },
  { id: "fcr", shortName: "FCR", fullName: "First Contact Resolution", scale: "0–1" },
  { id: "vfm", shortName: "VFM", fullName: "Value for Money", scale: "1–5" },
  { id: "agent", shortName: "Agent Score", fullName: "Agent Performance Score", scale: "1–5" },
  { id: "chs", shortName: "CHS", fullName: "Customer Health Score", scale: "1–5" },
]

// Per-KPI perspectives — the facet of the KPI a question measures.
// Per-KPI perspectives mirror the reference's KPI_PERSPECTIVES exactly. "overall"
// is the no-perspective aggregate (shown as "— Overall (no perspective)"); KPIs
// listed with only "overall" have NO named perspectives (NPS, FCR, CHS).
export const KPI_PERSPECTIVES: Record<string, { value: string; labelAr: string; labelEn: string }[]> = {
  csat:  [{ value: "overall", labelAr: "عام", labelEn: "Overall" }, { value: "speed", labelAr: "السرعة", labelEn: "Speed" }, { value: "quality", labelAr: "الجودة", labelEn: "Quality" }, { value: "communication", labelAr: "التواصل", labelEn: "Communication" }],
  nps:   [{ value: "overall", labelAr: "عام", labelEn: "Overall" }],
  ces:   [{ value: "overall", labelAr: "عام", labelEn: "Overall" }, { value: "clarity", labelAr: "الوضوح", labelEn: "Clarity" }, { value: "steps", labelAr: "الخطوات المطلوبة", labelEn: "Steps required" }],
  fcr:   [{ value: "overall", labelAr: "عام", labelEn: "Overall" }],
  vfm:   [{ value: "overall", labelAr: "عام", labelEn: "Overall" }, { value: "price", labelAr: "السعر", labelEn: "Price" }, { value: "value", labelAr: "القيمة", labelEn: "Value" }],
  agent: [{ value: "overall", labelAr: "عام", labelEn: "Overall" }, { value: "knowledge", labelAr: "المعرفة", labelEn: "Knowledge" }, { value: "willingness", labelAr: "الاستعداد للمساعدة", labelEn: "Willingness to help" }, { value: "attitude", labelAr: "السلوك", labelEn: "Attitude" }, { value: "appearance", labelAr: "المظهر", labelEn: "Appearance" }, { value: "professionalism", labelAr: "الاحترافية", labelEn: "Professionalism" }],
  chs:   [{ value: "overall", labelAr: "عام", labelEn: "Overall" }],
}
