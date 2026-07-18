import { useState } from "react"
import {
  Settings2, MessageSquare, SlidersHorizontal, AlertTriangle,
  Plus, Minus,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/surveys/RichTextEditor"
import { MOCK_JOURNEYS_FOR_BINDING } from "@/data/mock-surveys"
import type {
  SurveySettings, SurveyType, QuestionLayout,
} from "@/types/survey"

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Settings2
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-base font-bold">{children}</h2>
    </div>
  )
}

// Reusable survey/template details form (Survey Settings · Respondent messages ·
// Collection behaviour · Appearance). Used by the standalone Create page and the wizard.
export function SurveyDetailsForm({
  isAr,
  name,
  onNameChange,
  settings,
  onPatch,
}: {
  isAr: boolean
  name: string
  onNameChange: (v: string) => void
  settings: SurveySettings
  onPatch: (p: Partial<SurveySettings>) => void
}) {
  const patch = onPatch
  // Disruptive layouts (one-per-page / set-count) require a confirmation first.
  const [pendingLayout, setPendingLayout] = useState<QuestionLayout | null>(null)
  const onLayoutChange = (v: string | null) => {
    if (!v) return
    const layout = v as QuestionLayout
    if (layout === "question" || layout === "count") setPendingLayout(layout)
    else patch({ questionLayout: layout })
  }
  // Survey-type advisory. Only a Seasonal / Relational survey ever warrants a note —
  // a Transactional survey (the user's explicit choice) never shows one, so the type
  // and the message can never contradict each other:
  //  • Relational + no journey → treated as Seasonal / Relational (bind a journey to
  //    make it transactional).
  //  • Relational + bound      → unusual combination, confirm it's intentional.
  //  • Transactional (either)  → no advisory.
  const hasJourney = !!settings.journeyId
  const typeAdvisory: "no-journey" | "seasonal-bound" | null =
    settings.type === "Relational" ? (hasJourney ? "seasonal-bound" : "no-journey") : null

  return (
    <div className="space-y-5">
      {/* ── Card 1: Survey settings ──────────────────────────── */}
      <Card>
        <CardContent className="px-6 space-y-4">
          <SectionTitle icon={Settings2}>
            {isAr ? "إعدادات الاستبيان" : "Survey Settings"}
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="f-name">{isAr ? "اسم الاستبيان" : "Survey name"}</Label>
              <Input
                id="f-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={isAr ? "مثال: رضا ما بعد الصرف" : "e.g. Post-disbursement satisfaction"}
              />
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "الاسم الأساسي. تُدار الترجمات (بما فيها الإنجليزية) في مساحة الترجمة."
                  : "The primary name. Translations (including Arabic) are managed in the Translate workspace."}
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="f-desc">
                {isAr ? "الوصف" : "Description"}{" "}
                <span className="text-muted-foreground font-normal">{isAr ? "— داخلي" : "— internal"}</span>
              </Label>
              <Textarea
                id="f-desc"
                value={settings.descriptionInternal ?? ""}
                onChange={(e) => patch({ descriptionInternal: e.target.value })}
                placeholder={isAr ? "ما الذي يقيسه هذا الاستبيان ومتى يُرسل." : "What this survey measures and when it is sent."}
                className="min-h-20"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "نوع الاستبيان" : "Survey type"}</Label>
              <Select value={settings.type} onValueChange={(v) => patch({ type: v as SurveyType })}>
                <SelectTrigger className="w-full"><SelectValue>
                  {settings.type === "Transactional"
                    ? (isAr ? "تشغيلي" : "Transactional")
                    : (isAr ? "موسمي / علائقي" : "Seasonal / Relational")}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transactional">{isAr ? "تشغيلي" : "Transactional"}</SelectItem>
                  <SelectItem value="Relational">{isAr ? "موسمي / علائقي" : "Seasonal / Relational"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                {isAr ? "الرحلة المرتبطة" : "Bound journey"}{" "}
                <span className="text-muted-foreground font-normal">{isAr ? "— اختياري" : "— optional"}</span>
              </Label>
              <Select
                value={settings.journeyId ?? "none"}
                onValueChange={(v) => {
                  // Survey type follows the journey binding (mirrors the reference):
                  //  • None → treated as Seasonal / Relational.
                  //  • A journey → flip a Relational type to Transactional (a bound
                  //    journey is the transactional case); leave an intentional
                  //    Seasonal choice alone so the "unusual" advisory can surface.
                  if (!v || v === "none") patch({ journeyId: undefined, type: "Relational" })
                  else patch({ journeyId: v, type: settings.type === "Relational" ? "Transactional" : settings.type })
                }}
              >
                <SelectTrigger className="w-full"><SelectValue>
                  {settings.journeyId
                    ? (MOCK_JOURNEYS_FOR_BINDING.find((j) => j.id === settings.journeyId)?.[isAr ? "nameAr" : "nameEn"] ?? (isAr ? "بدون" : "None"))
                    : (isAr ? "بدون" : "None")}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isAr ? "بدون" : "None"}</SelectItem>
                  {MOCK_JOURNEYS_FOR_BINDING.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{isAr ? j.nameAr : j.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {typeAdvisory && (
            <div className="flex items-start gap-2 rounded-md bg-accent border border-border p-3 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                {typeAdvisory === "no-journey" ? (
                  isAr ? (
                    <>لا توجد رحلة مرتبطة، لذا يُعامَل هذا الاستبيان على أنه <b className="text-foreground">موسمي / علائقي</b> — فهو غير مرتبط بنقطة تماس تشغيلية. اربط رحلة لجعله تشغيلياً.</>
                  ) : (
                    <>No journey is bound, so this survey is treated as <b className="text-foreground">Seasonal / Relational</b> — it is not tied to a transactional touchpoint. Bind a journey to make it transactional.</>
                  )
                ) : (
                  isAr ? (
                    <>استبيان <b className="text-foreground">موسمي / علائقي</b> مرتبط برحلة محددة أمر غير معتاد. تابع إذا كان ذلك مقصوداً — نوع الاستبيان مستقل عن نوع الرحلة.</>
                  ) : (
                    <>A <b className="text-foreground">Seasonal / Relational</b> survey bound to a specific journey is unusual. Continue if intentional — survey type is independent of journey type.</>
                  )
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Respondent messages ──────────────────────── */}
      <Card>
        <CardContent className="px-6 space-y-4">
          <SectionTitle icon={MessageSquare}>
            {isAr ? "رسائل المشاركين" : "Respondent messages"}
          </SectionTitle>

          <div className="space-y-1.5">
            <Label>{isAr ? "رسالة الترحيب" : "Welcome message"}</Label>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "تظهر قبل أي سؤال. محرّر محتوى كامل — بدّل إلى ‏</>‏ HTML لتحرير المصدر."
                : "Shown before any question. Full content editor — switch to </> HTML to edit source."}
            </p>
            <RichTextEditor
              ariaLabel={isAr ? "رسالة الترحيب" : "Welcome message"}
              dir={isAr ? "rtl" : "ltr"}
              value={settings.welcomeMessage ?? ""}
              onChange={(html) => patch({ welcomeMessage: html })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{isAr ? "رسالة الشكر" : "Thank-you message"}</Label>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "تظهر بعد الإرسال، مع إمكانية إعادة التوجيه. محرّر محتوى كامل."
                : "Shown after submit, with an optional redirect. Full content editor."}
            </p>
            <RichTextEditor
              ariaLabel={isAr ? "رسالة الشكر" : "Thank-you message"}
              dir={isAr ? "rtl" : "ltr"}
              value={settings.thankYouMessage ?? ""}
              onChange={(html) => patch({ thankYouMessage: html })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-redirect">
                  {isAr ? "رابط إعادة التوجيه" : "Redirect link"}{" "}
                  <span className="text-muted-foreground font-normal">{isAr ? "اختياري" : "optional"}</span>
                </Label>
                <Input
                  id="f-redirect"
                  dir="ltr"
                  value={settings.redirectUrl ?? ""}
                  onChange={(e) => patch({ redirectUrl: e.target.value })}
                  placeholder="https://bank.example/thanks"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-redirect-after">{isAr ? "إعادة التوجيه بعد" : "Redirect after"}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="f-redirect-after"
                    type="number"
                    min={0}
                    className="w-24 tabular-nums"
                    value={settings.redirectDelaySeconds ?? 0}
                    onChange={(e) => patch({ redirectDelaySeconds: Number(e.target.value) })}
                  />
                  <span className="text-sm text-muted-foreground">{isAr ? "ثانية" : "seconds"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Collection behaviour ─────────────────────── */}
      <Card>
        <CardContent className="px-6 space-y-4">
          <SectionTitle icon={SlidersHorizontal}>
            {isAr ? "سلوك التجميع" : "Collection behaviour"}
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isAr ? "تخطيط الأسئلة" : "Question layout"}</Label>
              <Select
                value={settings.questionLayout ?? "group"}
                onValueChange={onLayoutChange}
              >
                <SelectTrigger className="w-full"><SelectValue>
                  {{
                    single: isAr ? "كل الأسئلة في صفحة واحدة" : "All questions on one page",
                    group: isAr ? "صفحة لكل قسم" : "One page per section",
                    question: isAr ? "سؤال واحد لكل صفحة" : "One question per page",
                    count: isAr ? "عدد محدد من الأسئلة لكل صفحة" : "A set number of questions per page",
                  }[settings.questionLayout ?? "group"]}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{isAr ? "كل الأسئلة في صفحة واحدة" : "All questions on one page"}</SelectItem>
                  <SelectItem value="group">{isAr ? "صفحة لكل قسم" : "One page per section"}</SelectItem>
                  <SelectItem value="question">{isAr ? "سؤال واحد لكل صفحة" : "One question per page"}</SelectItem>
                  <SelectItem value="count">{isAr ? "عدد محدد من الأسئلة لكل صفحة" : "A set number of questions per page"}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "يتحكم في توزيع الأسئلة عبر الصفحات، بشكل مستقل عن الأقسام."
                  : "Controls how questions are distributed across pages, independent of sections."}
              </p>
              {settings.questionLayout === "count" && (
                <div className="space-y-1.5 pt-1">
                  <Label>{isAr ? "أسئلة لكل صفحة" : "Questions per page"}</Label>
                  <div className="inline-flex items-center rounded-md border border-input">
                    <button
                      type="button"
                      aria-label={isAr ? "إنقاص" : "Decrease"}
                      onClick={() => patch({ questionsPerPage: Math.max(1, (settings.questionsPerPage ?? 3) - 1) })}
                      className="inline-flex size-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors rounded-s-md"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold tabular-nums">{settings.questionsPerPage ?? 3}</span>
                    <button
                      type="button"
                      aria-label={isAr ? "زيادة" : "Increase"}
                      onClick={() => patch({ questionsPerPage: (settings.questionsPerPage ?? 3) + 1 })}
                      className="inline-flex size-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors rounded-e-md"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                {isAr ? "الفترة النشطة للاستبيان" : "Survey active period"}{" "}
                <span className="text-muted-foreground font-normal">{isAr ? "— اختياري" : "— optional"}</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="tabular-nums"
                  value={settings.activePeriodDays ?? ""}
                  onChange={(e) => patch({ activePeriodDays: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder={isAr ? "أيام" : "Days"}
                />
                <Input
                  type="number"
                  min={0}
                  max={23}
                  className="tabular-nums"
                  value={settings.activePeriodHours ?? ""}
                  onChange={(e) => patch({ activePeriodHours: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder={isAr ? "ساعات" : "Hours"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "مدة بقاء الاستبيان نشطاً بعد إرساله قبل أن ينتهي. تُخزّن الردود المتأخرة في صفحة مخصّصة ضمن وحدة التقارير (M-07)."
                  : "How long the survey stays active once sent before it expires. Post-expiry responses are stored in a dedicated page in the Reporting module (M-07)."}
              </p>
            </div>
          </div>

          {/* Shuffle */}
          <div className="rounded-md border border-border p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{isAr ? "خلط الأسئلة" : "Shuffle questions"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "ترتيب عشوائي للعرض لتقليل انحياز الموضع." : "Randomise presentation order to reduce position bias."}
                </p>
              </div>
              <Switch
                checked={settings.shuffleEnabled}
                onCheckedChange={(v) => patch({ shuffleEnabled: v })}
                aria-label={isAr ? "تفعيل الخلط" : "Enable shuffling"}
              />
            </div>
            {settings.shuffleEnabled && (
              <div className="space-y-1.5 max-w-sm">
                <Label>{isAr ? "وضع الخلط" : "Shuffle mode"}</Label>
                <Select
                  value={settings.shuffleMode}
                  onValueChange={(v) => patch({ shuffleMode: v as SurveySettings["shuffleMode"] })}
                >
                  <SelectTrigger className="w-full"><SelectValue>
                    {settings.shuffleMode === "Random"
                      ? (isAr ? "خلط عشوائي" : "Random shuffling")
                      : (isAr ? "إعطاء أولوية للأسئلة قليلة الردود" : "Prioritize low-response questions")}
                  </SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Random">{isAr ? "خلط عشوائي" : "Random shuffling"}</SelectItem>
                    <SelectItem value="LowResponse">{isAr ? "إعطاء أولوية للأسئلة قليلة الردود" : "Prioritize low-response questions"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "يخزّن M-01 الوضع؛ وتنفّذه طبقة العرض." : "M-01 stores the mode; the render layer executes it."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disruptive-layout confirmation */}
      <Dialog open={!!pendingLayout} onOpenChange={(o) => !o && setPendingLayout(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "استخدام هذا العرض؟" : "Use this view?"}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {isAr
                ? "هل أنت متأكد أنك تريد استخدام هذا العرض؟ قد يؤثر على تجربة المستخدم."
                : "Are you sure you would like to use this view? It might disturb the user experience."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLayout(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => { if (pendingLayout) patch({ questionLayout: pendingLayout }); setPendingLayout(null) }}>
              {isAr ? "موافق" : "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const DEFAULT_DRAFT_SETTINGS = (
  welcome: string,
  thanks: string,
): SurveySettings => ({
  // A brand-new survey has no bound journey yet, so it starts Seasonal / Relational
  // (consistent with the "no journey bound" advisory). Binding a journey flips it to
  // Transactional automatically (see the journey select in SurveyDetailsForm).
  type: "Relational",
  shuffleEnabled: false,
  shuffleMode: "Random",
  postExpiryEnabled: false,
  postExpiryMessage: "",
  descriptionInternal: "",
  welcomeMessage: welcome,
  thankYouMessage: thanks,
  redirectUrl: "",
  redirectDelaySeconds: 5,
  questionLayout: "group",
  questionsPerPage: 3,
  appearanceMode: "inherited",
})
