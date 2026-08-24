// Per-question results for the Survey Report (screen-report → Per-Question Results).
// Covers every render kind: KPI, single-select, boolean, multi-select, scale
// (labels / stars / smileys), free-text, and numeric.

export type PerQKind =
  | "kpi"
  | "single"
  | "bool"
  | "multi"
  | "scale"
  | "text"
  | "number"

export interface PerQBar {
  label: string
  labelAr: string
  pct: number
  count?: number
  /** Categorical fill token (chart-1..5) — used for non-sentiment breakdowns. */
  colorVar?: string
}

export interface PerQItem {
  q: string
  qAr: string
  kind: PerQKind
  /** For kind === "kpi": which KPI scale to color/label by. */
  kpiId?: "csat" | "nps" | "ces"
  score?: number
  target?: number
  targetText?: string
  n: number
  bars?: PerQBar[]
  view?: "labels" | "stars" | "smileys"
  avg?: string
  avgUnitAr?: string
  avgUnitEn?: string
  line?: number[]
  /** Free-text responses: [text, channel, when]. */
  rows?: { text: string; textAr: string; channel: string; when: string }[]
}

export const PERQ_ITEMS: PerQItem[] = [
  {
    q: "How satisfied were you with the loan disbursement?",
    qAr: "ما مدى رضاك عن صرف القرض؟",
    kind: "kpi",
    kpiId: "csat",
    score: 81,
    target: 80,
    targetText: "80%",
    n: 3180,
    bars: [
      { label: "5 — Very satisfied", labelAr: "٥ — راضٍ جداً", pct: 50 },
      { label: "4 — Satisfied", labelAr: "٤ — راضٍ", pct: 28 },
      { label: "3 — Neutral", labelAr: "٣ — محايد", pct: 12 },
      { label: "2 — Unsatisfied", labelAr: "٢ — غير راضٍ", pct: 6 },
      { label: "1 — Very unsatisfied", labelAr: "١ — غير راضٍ إطلاقاً", pct: 4 },
    ],
  },
  {
    q: "How likely are you to recommend us to a friend or colleague?",
    qAr: "ما مدى احتمال أن توصي بنا لصديق أو زميل؟",
    kind: "kpi",
    kpiId: "nps",
    score: 71,
    target: 75,
    targetText: "+50",
    n: 3010,
    bars: [
      { label: "Promoters (9–10)", labelAr: "المروّجون (٩–١٠)", pct: 51 },
      { label: "Passives (7–8)", labelAr: "المحايدون (٧–٨)", pct: 40 },
      { label: "Detractors (0–6)", labelAr: "المنتقدون (٠–٦)", pct: 9 },
    ],
  },
  {
    q: "Overall, how satisfied are you with the onboarding experience?",
    qAr: "بشكل عام، ما مدى رضاك عن تجربة فتح الحساب؟",
    kind: "kpi",
    kpiId: "csat",
    score: 76,
    target: 80,
    targetText: "80%",
    n: 2940,
    bars: [
      { label: "5 — Very satisfied", labelAr: "٥ — راضٍ جداً", pct: 42 },
      { label: "4 — Satisfied", labelAr: "٤ — راضٍ", pct: 30 },
      { label: "3 — Neutral", labelAr: "٣ — محايد", pct: 16 },
      { label: "2 — Unsatisfied", labelAr: "٢ — غير راضٍ", pct: 8 },
      { label: "1 — Very unsatisfied", labelAr: "١ — غير راضٍ إطلاقاً", pct: 4 },
    ],
  },
  {
    q: "How easy was it to complete your application?",
    qAr: "ما مدى سهولة إكمال طلبك؟",
    kind: "kpi",
    kpiId: "ces",
    score: 64,
    target: 60,
    targetText: "60%",
    n: 2895,
    bars: [
      { label: "Very easy", labelAr: "سهل جداً", pct: 30 },
      { label: "Easy", labelAr: "سهل", pct: 34 },
      { label: "Neutral", labelAr: "محايد", pct: 20 },
      { label: "Difficult", labelAr: "صعب", pct: 10 },
      { label: "Very difficult", labelAr: "صعب جداً", pct: 6 },
    ],
  },
  {
    q: "Which channel did you use to apply?",
    qAr: "أي قناة استخدمت للتقديم؟",
    kind: "single",
    n: 3180,
    bars: [
      { label: "Mobile app", labelAr: "تطبيق الجوال", pct: 54, colorVar: "chart-1" },
      { label: "Web", labelAr: "الويب", pct: 23, colorVar: "chart-2" },
      { label: "Branch", labelAr: "الفرع", pct: 15, colorVar: "chart-4" },
      { label: "Call centre", labelAr: "مركز الاتصال", pct: 8, colorVar: "chart-5" },
    ],
  },
  {
    q: "Did the disbursement arrive within the promised time?",
    qAr: "هل وصل الصرف خلال الوقت الموعود؟",
    kind: "bool",
    n: 3120,
    bars: [
      { label: "Yes", labelAr: "نعم", pct: 82, colorVar: "chart-2" },
      { label: "No", labelAr: "لا", pct: 18, colorVar: "chart-5" },
    ],
  },
  {
    q: "Which of the following did you use during the process? (select all that apply)",
    qAr: "أيّاً مما يلي استخدمت أثناء العملية؟ (اختر كل ما ينطبق)",
    kind: "multi",
    n: 2760,
    bars: [
      { label: "Mobile app", labelAr: "تطبيق الجوال", pct: 54, count: 1490 },
      { label: "Branch visit", labelAr: "زيارة الفرع", pct: 34, count: 940 },
      { label: "Call centre", labelAr: "مركز الاتصال", pct: 25, count: 680 },
      { label: "WhatsApp updates", labelAr: "تحديثات واتساب", pct: 19, count: 520 },
      { label: "Email support", labelAr: "دعم البريد", pct: 11, count: 300 },
    ],
  },
  {
    q: "How clear was the fee breakdown?",
    qAr: "ما مدى وضوح تفصيل الرسوم؟",
    kind: "scale",
    view: "smileys",
    score: 74,
    n: 1410,
    bars: [
      { label: "5", labelAr: "٥", pct: 34 },
      { label: "4", labelAr: "٤", pct: 30 },
      { label: "3", labelAr: "٣", pct: 20 },
      { label: "2", labelAr: "٢", pct: 10 },
      { label: "1", labelAr: "١", pct: 6 },
    ],
  },
  {
    q: "How helpful was the branch staff?",
    qAr: "ما مدى فائدة موظفي الفرع؟",
    kind: "scale",
    view: "stars",
    score: 83,
    n: 1385,
    bars: [
      { label: "5", labelAr: "٥", pct: 48 },
      { label: "4", labelAr: "٤", pct: 28 },
      { label: "3", labelAr: "٣", pct: 14 },
      { label: "2", labelAr: "٢", pct: 6 },
      { label: "1", labelAr: "١", pct: 4 },
    ],
  },
  {
    q: "How would you rate the clarity of the contract terms?",
    qAr: "كيف تقيّم وضوح بنود العقد؟",
    kind: "scale",
    view: "labels",
    score: 69,
    n: 1320,
    bars: [
      { label: "5 — Very clear", labelAr: "٥ — واضح جداً", pct: 30 },
      { label: "4 — Clear", labelAr: "٤ — واضح", pct: 28 },
      { label: "3 — Neutral", labelAr: "٣ — محايد", pct: 22 },
      { label: "2 — Unclear", labelAr: "٢ — غير واضح", pct: 13 },
      { label: "1 — Very unclear", labelAr: "١ — غير واضح إطلاقاً", pct: 7 },
    ],
  },
  {
    q: "What could we improve about the disbursement experience?",
    qAr: "ما الذي يمكننا تحسينه في تجربة الصرف؟",
    kind: "text",
    n: 1180,
    rows: [
      {
        text: "\"The SMS confirmation came 2 days late — I kept calling the branch.\"",
        textAr: "\"The SMS confirmation came 2 days late — I kept calling the branch.\"",
        channel: "Mobile app",
        when: "2 days ago",
      },
      {
        text: "\"سرعة التحويل ممتازة لكن الرسوم غير واضحة\"",
        textAr: "\"سرعة التحويل ممتازة لكن الرسوم غير واضحة\"",
        channel: "WhatsApp",
        when: "3 days ago",
      },
      {
        text: "\"Everything was smooth, the branch staff walked me through each step.\"",
        textAr: "\"Everything was smooth, the branch staff walked me through each step.\"",
        channel: "Branch",
        when: "4 days ago",
      },
      {
        text: "\"I wish the app showed the exact arrival time of the funds.\"",
        textAr: "\"I wish the app showed the exact arrival time of the funds.\"",
        channel: "Mobile app",
        when: "5 days ago",
      },
      { text: "\"Everything worked but I had to re-upload my documents twice.\"", textAr: "\"Everything worked but I had to re-upload my documents twice.\"", channel: "Web", when: "10 days ago" },
      { text: "\"سرعة التحويل ممتازة لكن الرسوم غير واضحة\"", textAr: "\"سرعة التحويل ممتازة لكن الرسوم غير واضحة\"", channel: "Call centre", when: "17 days ago" },
      { text: "\"Everything was smooth, the branch staff walked me through each step.\"", textAr: "\"Everything was smooth, the branch staff walked me through each step.\"", channel: "Email", when: "18 days ago" },
      { text: "\"I wish the app showed the exact arrival time of the funds.\"", textAr: "\"I wish the app showed the exact arrival time of the funds.\"", channel: "Mobile app", when: "19 days ago" },
      { text: "\"Fees were higher than I expected — please be clearer upfront.\"", textAr: "\"Fees were higher than I expected — please be clearer upfront.\"", channel: "WhatsApp", when: "20 days ago" },
      { text: "\"Great service, very fast disbursement.\"", textAr: "\"Great service, very fast disbursement.\"", channel: "Branch", when: "21 days ago" },
      { text: "\"The app kept logging me out during the process.\"", textAr: "\"The app kept logging me out during the process.\"", channel: "Web", when: "22 days ago" },
      { text: "\"Staff were friendly but the wait was long.\"", textAr: "\"Staff were friendly but the wait was long.\"", channel: "Call centre", when: "23 days ago" },
      { text: "\"Please add a wallet / Apple Pay option.\"", textAr: "\"Please add a wallet / Apple Pay option.\"", channel: "Email", when: "24 days ago" },
      { text: "\"لم أفهم تفاصيل الرسوم، أرجو التوضيح\"", textAr: "\"لم أفهم تفاصيل الرسوم، أرجو التوضيح\"", channel: "Mobile app", when: "25 days ago" },
      { text: "\"The whole thing took over a week, too slow.\"", textAr: "\"The whole thing took over a week, too slow.\"", channel: "WhatsApp", when: "26 days ago" },
    ],
  },
  {
    q: "How many days did the full process take?",
    qAr: "كم يوماً استغرقت العملية بالكامل؟",
    kind: "number",
    n: 1240,
    avg: "6.4",
    avgUnitEn: "days",
    avgUnitAr: "أيام",
    line: [18, 46, 95, 165, 245, 330, 360, 315, 255, 195, 150, 112, 85, 60, 42, 30, 20, 14, 9, 6],
  },
]
