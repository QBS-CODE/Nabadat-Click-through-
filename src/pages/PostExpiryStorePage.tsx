import { useNavigate } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Info,
  Eye,
  Clock,
  Inbox,
  CalendarClock,
  MailWarning,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import {
  POST_EXPIRY_RECORDS,
  NEWEST_LATE_RESPONSE,
} from "@/data/mock-post-expiry"

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PostExpiryStorePage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const records = POST_EXPIRY_RECORDS
  const expiredSurveys = records.length
  const totalLateResponses = records.reduce((sum, r) => sum + r.lateResponses, 0)

  // Header "Open Analytics" → the per-survey funnel/analytics report.
  const primarySurveyId = records[0]?.surveyId
  const openAnalytics = (surveyId?: string) => {
    const id = surveyId ?? primarySurveyId
    if (id) navigate(`/surveys/${id}/funnel`)
  }
  // Row / eye icon → the survey's stored-responses report (its stats page).
  const openReport = (surveyId?: string) => {
    const id = surveyId ?? primarySurveyId
    if (id) navigate(`/surveys/${id}/stats`)
  }

  return (
    <div className="space-y-5 py-5 px-8">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 mt-0.5"
            onClick={() => navigate(-1)}
            aria-label={isAr ? "رجوع" : "Back"}
          >
            <BackIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold">
              {isAr ? "مخزن الردود بعد الانتهاء" : "Post-Expiry Response Store"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {isAr
                ? "الردود التي وردت بعد انتهاء الفترة النشطة للاستبيان. تعيش هذه الصفحة في وحدة التقارير (M-07) وتُبقي الردود المتأخرة بعيدًا عن تقرير الاستبيان المباشر."
                : "Responses that arrived after a survey's active period expired. This page lives in the reporting module (M-07) and keeps late responses out of the live survey report."}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          className="shrink-0"
          onClick={() => openAnalytics()}
        >
          <BarChart3 className="size-4" />
          {isAr ? "فتح التحليلات" : "Open Analytics"}
        </Button>
      </div>

      {/* ── Info note ───────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-4">
        <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-sm text-foreground leading-relaxed">
          {isAr ? (
            <>
              عندما يبلغ الاستبيان <b className="font-semibold">فترته النشطة</b>{" "}
              (المحددة في سلوك التجميع، بالأيام/الساعات)، يتوقف عن الظهور في
              التقرير المباشر. أي ردود تصل بعد ذلك تُلتقط هنا في{" "}
              <b className="font-semibold" dir="ltr">
                M-07
              </b>{" "}
              حتى لا يضيع أي رأي.
            </>
          ) : (
            <>
              When a survey reaches its{" "}
              <b className="font-semibold">active period</b> (set in Collection
              Behaviour, in days/hours), it stops appearing in the live report.
              Any responses received afterwards are captured here in{" "}
              <b className="font-semibold">M-07</b> so no feedback is lost.
            </>
          )}
        </p>
      </div>

      {/* ── Summary stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expired surveys */}
        <Card>
          <CardContent className="flex items-start gap-3 px-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "استبيانات منتهية" : "Expired surveys"}
              </p>
              <p className="text-3xl font-heading font-bold tabular-nums text-foreground mt-1">
                {expiredSurveys.toLocaleString("en-US")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "لديها ردود متأخرة مخزّنة" : "with stored late responses"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Late responses stored */}
        <Card>
          <CardContent className="flex items-start gap-3 px-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MailWarning className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "ردود متأخرة مخزّنة" : "Late responses stored"}
              </p>
              <p className="text-3xl font-heading font-bold tabular-nums text-foreground mt-1">
                {totalLateResponses.toLocaleString("en-US")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? "عبر جميع الاستبيانات المنتهية"
                  : "across all expired surveys"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Newest late response */}
        <Card>
          <CardContent className="flex items-start gap-3 px-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "أحدث رد متأخر" : "Newest late response"}
              </p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">
                {isAr ? NEWEST_LATE_RESPONSE.agoAr : NEWEST_LATE_RESPONSE.agoEn}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {isAr ? NEWEST_LATE_RESPONSE.surveyAr : NEWEST_LATE_RESPONSE.surveyEn}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Records table ───────────────────────────────────── */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center px-6 shadow-sm dark:shadow-none">
          <Inbox className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? "لا توجد ردود متأخرة" : "No late responses yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            {isAr
              ? "عند انتهاء استبيان يجمع ردودًا بعد فترته النشطة، ستظهر هنا."
              : "When an expired survey collects responses past its active period, they'll appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "الاستبيان" : "Survey"}</TableHead>
                <TableHead>{isAr ? "الرحلة" : "Journey"}</TableHead>
                <TableHead>{isAr ? "انتهى في" : "Expired On"}</TableHead>
                <TableHead>{isAr ? "الردود المتأخرة" : "Late Responses"}</TableHead>
                <TableHead>{isAr ? "آخر استلام" : "Last Received"}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r, i) => (
                <TableRow
                  key={r.surveyId ?? i}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openReport(r.surveyId)}
                >
                  <TableCell className="font-medium text-foreground">
                    {isAr ? r.nameAr : r.nameEn}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(isAr ? r.journeyNameAr : r.journeyNameEn) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span dir="ltr">{isAr ? r.expiredOnLabelAr : r.expiredOnLabelEn}</span>
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold text-foreground">
                    {r.lateResponses.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isAr ? r.lastReceivedAr : r.lastReceivedEn}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        openReport(r.surveyId)
                      }}
                      aria-label={isAr ? "عرض الردود المخزّنة" : "View stored responses"}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
