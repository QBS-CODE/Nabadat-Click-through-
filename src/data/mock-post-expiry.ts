// Post-Expiry Response Store (M-07) — late responses captured after a survey's
// active period expired. Kept out of the live survey report so no feedback is lost.

export interface PostExpiryRecord {
  /** Links back to the survey in MOCK_SURVEYS when one exists. */
  surveyId?: string
  nameAr: string
  nameEn: string
  journeyNameAr?: string
  journeyNameEn?: string
  /** ISO date the survey's active period ended. */
  expiredOn: string
  expiredOnLabelAr: string
  expiredOnLabelEn: string
  /** Count of responses received after expiry, stored here. */
  lateResponses: number
  lastReceivedAr: string
  lastReceivedEn: string
}

export const POST_EXPIRY_RECORDS: PostExpiryRecord[] = [
  {
    surveyId: "srv-002",
    nameAr: "رضا ما بعد الصرف",
    nameEn: "Post-disbursement satisfaction",
    journeyNameAr: "طلب قرض شخصي",
    journeyNameEn: "Personal Loan Application",
    expiredOn: "2026-06-12",
    expiredOnLabelAr: "١٢ يونيو ٢٠٢٦",
    expiredOnLabelEn: "12 Jun 2026",
    lateResponses: 742,
    lastReceivedAr: "قبل يومين",
    lastReceivedEn: "2 days ago",
  },
  {
    surveyId: "srv-003",
    nameAr: "النبض الفصلي للعلاقة",
    nameEn: "Quarterly relationship pulse",
    expiredOn: "2026-04-30",
    expiredOnLabelAr: "٣٠ أبريل ٢٠٢٦",
    expiredOnLabelEn: "30 Apr 2026",
    lateResponses: 361,
    lastReceivedAr: "قبل ٣ أسابيع",
    lastReceivedEn: "3 weeks ago",
  },
  {
    surveyId: "srv-004",
    nameAr: "متابعة مركز الاتصال",
    nameEn: "Call centre follow-up",
    journeyNameAr: "تفعيل الحساب",
    journeyNameEn: "Account Onboarding",
    expiredOn: "2026-05-18",
    expiredOnLabelAr: "١٨ مايو ٢٠٢٦",
    expiredOnLabelEn: "18 May 2026",
    lateResponses: 181,
    lastReceivedAr: "قبل شهر",
    lastReceivedEn: "1 month ago",
  },
]

/** The most recently received late response drives the summary tile. */
export const NEWEST_LATE_RESPONSE = {
  agoAr: "قبل يومين",
  agoEn: "2 days ago",
  surveyAr: POST_EXPIRY_RECORDS[0].nameAr,
  surveyEn: POST_EXPIRY_RECORDS[0].nameEn,
}
