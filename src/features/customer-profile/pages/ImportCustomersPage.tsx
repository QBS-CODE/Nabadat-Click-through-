// SCR-M03-04 — Import Customers (§8.4). A three-step flow with a MANDATORY review step:
// nothing is written until the operator commits (BR-M03-049). Ported from the ratified prototype
// `nabadat-m03-customer-profile-v4.3.html` (import view + renderMergeChoice/renderReplaceWarn/
// syncCommit/setStep) using this app's design system. No backend — every figure is the mock's.
//
// The one rule that drives the interaction: an import cannot be committed until the operator makes
// the file-level Replace / Skip choice for the 340 existing IDs (BR-M03-171). Replace additionally
// surfaces the verbatim accumulative-fields warning (FR-M03-130) and only arms the commit on
// Proceed. The commit row-count follows the choice (BR-M03-172).

import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GitMerge,
  Lock,
  Plus,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { WizardStepper } from "@/components/ui/wizard-stepper"
import { useDirection } from "@/hooks/use-direction"
import { cn } from "@/lib/utils"
import { pick, TENANT_DEFAULTS, type Lang } from "@/features/customer-profile/data"

// ── Point-in-time validation figures (BR-M03-154), verbatim from the prototype ──
const IMP_NEW = 412 // customer IDs not seen before
const IMP_EXISTING = 340 // IDs that already exist → the Replace / Skip choice
const IMP_ERRORS = 18 // rejected rows — never written (BR-M03-058)

/** The chosen file — simulated; the dropzone is a no-op that re-selects this sample. */
interface FileInfo {
  name: string
  rows: number
  sizeAr: string
  sizeEn: string
}
const SAMPLE_FILE: FileInfo = {
  name: "customers-july-2026.xlsx",
  rows: 770,
  sizeAr: "1.4 ميغابايت",
  sizeEn: "1.4 MB",
}

type MergeChoice = "replace" | "skip"

// ── Rejected rows (BR-M03-052 — cause + fix, never echo a PII value) ──
interface RejectedRow {
  row: number
  id: string | null
  field: string
  ar: string
  en: string
}
const REJECTED: RejectedRow[] = [
  {
    row: 14,
    id: null,
    field: "customer_id",
    ar: "معرّف العميل فارغ. أضف المعرّف — لا يمكن إنشاء ملف بدونه.",
    en: "Customer ID is empty. Add the ID — a profile cannot exist without one.",
  },
  {
    row: 37,
    id: "CUS-0-8812",
    field: "mobile",
    ar: "رقم الجوال قصير. استخدم الصيغة الدولية ‎+9627XXXXXXXX.",
    en: "Mobile is too short. Use the international format +9627XXXXXXXX.",
  },
  {
    row: 102,
    id: "CUS-0-4471",
    field: "customer_segment",
    ar: "القيمة «بلاتيني» ليست في قائمة الشرائح. أضفها في معاملات M-13 أو اختر قيمة قائمة.",
    en: "The value “Platinum” is not in the segment list. Add it in M-13 parameters, or pick an existing value.",
  },
  {
    row: 288,
    id: "CUS-0-4471",
    field: "customer_id",
    ar: "معرّف مكرّر داخل الملف نفسه (يظهر أيضاً في الصف 102). أبقِ صفاً واحداً لكل عميل.",
    en: "Duplicate ID within the same file (also on row 102). Keep one row per customer.",
  },
]

// ── Change preview — a sample of the 340 rows that would merge (FR-M03-101) ──
interface ChangeRow {
  id: string
  field: string
  oldAr: string
  oldEn: string
  newAr: string
  newEn: string
  /** Incoming cell empty → stored value kept (BR-M03-056); new-value cell reads muted. */
  kept?: boolean
  /** Old value is an empty cell → render muted. */
  oldEmpty?: boolean
  /** New value is a raw identifier/email → monospace, LTR. */
  newMono?: boolean
}
const CHANGES: ChangeRow[] = [
  { id: "CUS-0-4471", field: "customer_segment", oldAr: "الأفراد العام", oldEn: "Mass retail", newAr: "الثروات", newEn: "Affluent" },
  { id: "CUS-0-4471", field: "branch", oldAr: "فرع إربد", oldEn: "Irbid Branch", newAr: "فرع عبدون", newEn: "Abdoun Branch" },
  { id: "CUS-0-2210", field: "vip", oldAr: "لا", oldEn: "No", newAr: "نعم", newEn: "Yes" },
  { id: "CUS-0-9034", field: "email", oldAr: "(فارغ)", oldEn: "(empty)", oldEmpty: true, newAr: "s.harb@example.com", newEn: "s.harb@example.com", newMono: true },
  { id: "CUS-0-1187", field: "nationality", oldAr: "الأردن", oldEn: "Jordan", newAr: "(فارغ) — تبقى «الأردن»", newEn: "(empty) — “Jordan” is kept", kept: true },
]

/** A monospace field-code chip, always LTR (codes are Latin identifiers). */
function CodeChip({ children }: { children: string }) {
  return (
    <code
      dir="ltr"
      className="inline-block rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wide text-foreground"
    >
      {children}
    </code>
  )
}

export default function ImportCustomersPage() {
  const navigate = useNavigate()
  const { lang: rawLang, isRtl } = useDirection()
  const lang = rawLang as Lang

  const [step, setStep] = useState(1)
  const [file, setFile] = useState<FileInfo | null>(SAMPLE_FILE)
  // BR-M03-171 — no default. REPLACE_OK arms the destructive path only after Proceed (FR-M03-130).
  const [mergeChoice, setMergeChoice] = useState<MergeChoice | null>(null)
  const [replaceOk, setReplaceOk] = useState(false)

  // The workbook's columns are the profile setup's INCLUDED fields, in order (BR-M03-051).
  const columnCount = Object.values(TENANT_DEFAULTS).filter((d) => d.on).length

  // Commit gating (syncCommit): ready only on Skip, or on Replace once confirmed.
  const commitReady = mergeChoice === "skip" || (mergeChoice === "replace" && replaceOk)
  // Row count follows the choice (BR-M03-172): Replace writes new + matching, Skip writes new only.
  const commitRows = mergeChoice === "replace" ? IMP_NEW + IMP_EXISTING : IMP_NEW

  /** Navigate the wizard. Returning to step 1 resets the choice (setStep import, n===1). */
  function goStep(n: number) {
    if (n === 1) {
      setMergeChoice(null)
      setReplaceOk(false)
    }
    setStep(n)
    window.scrollTo({ top: 0 })
  }

  function chooseMerge(choice: MergeChoice) {
    setMergeChoice(choice)
    setReplaceOk(false)
  }

  // Step-3 outcome, computed from the choice so the report is truthful for either path:
  // Replace → 340 merged, 18 skipped (the prototype's figures); Skip → 0 merged, 340+18 skipped.
  const merged = mergeChoice === "replace" ? IMP_EXISTING : 0
  const skipped = IMP_ERRORS + (mergeChoice === "replace" ? 0 : IMP_EXISTING)

  return (
    <div className="space-y-5 py-5">
      {/* Back link → Customers list */}
      <Button
        variant="ghost"
        size="compact"
        className="-mb-1 w-fit ps-2 pe-3 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/customers")}
      >
        <ArrowLeft className={cn("size-4", isRtl && "rotate-180")} />
        {pick(lang, "العملاء", "Customers")}
      </Button>

      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold">
          {pick(lang, "استيراد العملاء", "Import customers")}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {pick(
            lang,
            "حمّل ملف Excel لإنشاء ملفات جديدة ودمج القائم منها. لا شيء يُكتب قبل مراجعتك.",
            "Upload an Excel file to create new profiles and merge existing ones. Nothing is written until you review it.",
          )}
        </p>
      </div>

      {/* Three-step indicator (FR-M03-091/092). Gated navigation ⇒ no per-step onClick. */}
      <WizardStepper
        ariaLabel={pick(lang, "خطوات الاستيراد", "Import steps")}
        steps={[
          pick(lang, "تحميل الملف", "Upload file"),
          pick(lang, "مراجعة", "Review"),
          pick(lang, "تنفيذ", "Commit"),
        ].map((label, i) => ({
          label,
          state: step === i + 1 ? "active" : step > i + 1 ? "done" : "todo",
        }))}
      />

      {/* ── Step 1 — Upload file ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* File & template */}
            <Card>
              <CardHeader>
                <CardTitle>{pick(lang, "الملف والقالب", "File & template")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                  <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {pick(
                      lang,
                      `تتبع أعمدة ملف Excel حقول إعداد الملف الحالي (${columnCount} عموداً) بالترتيب نفسه. نزّل القالب الفارغ أدناه لتضمن تطابق الأعمدة.`,
                      `The Excel columns follow the current profile setup's fields (${columnCount} columns), in the same order. Download the blank template below so the columns match.`,
                    )}
                  </p>
                </div>

                {/* Dropzone — simulated; selecting re-attaches the sample file. */}
                <button
                  type="button"
                  onClick={() => setFile(SAMPLE_FILE)}
                  className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border bg-card px-4 py-8 text-center transition-colors hover:border-primary hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <UploadCloud className="mb-1 size-8 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {pick(lang, "أفلت ملف Excel هنا أو استعرض", "Drop an Excel file here, or browse")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pick(
                      lang,
                      "‎.xlsx حتى 10 ميغابايت · حد أقصى 50,000 صف",
                      ".xlsx up to 10 MB · 50,000 rows max",
                    )}
                  </span>
                </button>

                {/* Selected-file tile */}
                {file && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileSpreadsheet className="size-5 shrink-0 text-d2" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold" dir="ltr">
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="tabular-nums" dir="ltr">
                            {file.rows.toLocaleString("en-US")}
                          </span>{" "}
                          {pick(lang, `صفاً · ${file.sizeAr}`, `rows · ${file.sizeEn}`)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={pick(lang, "إزالة الملف", "Remove file")}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setFile(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Before you start */}
            <Card>
              <CardHeader>
                <CardTitle>{pick(lang, "قبل أن تبدأ", "Before you start")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    Icon: Lock,
                    ar: "عمود معرّف العميل إلزامي. هو مفتاح المطابقة الوحيد، والصف الذي يخلو منه يُرفض.",
                    en: "The customer ID column is required. It is the only match key, and a row without it is rejected.",
                  },
                  {
                    Icon: GitMerge,
                    ar: "معرّف عميل موجود مسبقاً يعني دمجاً لا تكراراً. الخلية الفارغة تُبقي القيمة القائمة كما هي.",
                    en: "An existing customer ID means a merge, not a duplicate. An empty cell leaves the stored value untouched.",
                  },
                  {
                    Icon: ShieldCheck,
                    ar: "لا يُلغي الاستيراد انسحاب أي عميل. تبقى حالة الموافقة كما سجّلها العميل.",
                    en: "An import never overturns an opt-out. Consent stays as the customer set it.",
                  },
                ].map(({ Icon, ar, en }) => (
                  <div key={en} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {pick(lang, ar, en)}
                    </p>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  className="mt-1 w-fit"
                  onClick={() =>
                    toast(pick(lang, "جارٍ تنزيل قالب Excel", "Downloading the Excel template"))
                  }
                >
                  <Download className="size-4" />
                  {pick(lang, "تنزيل القالب الفارغ", "Download the blank template")}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button disabled={!file} onClick={() => goStep(2)}>
              {pick(lang, "التحقّق من الملف", "Validate file")}
              <ArrowRight className={cn("size-4", isRtl && "rotate-180")} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2 — Review ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary buckets (FR-M03-099) */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* New — brand (not a status): a fresh profile is neutral, not "good". */}
            <Card>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {pick(lang, "ملفات جديدة", "New profiles")}
                  </span>
                  <Badge className="bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                    <Plus className="size-3" />
                    {IMP_NEW.toLocaleString("en-US")}
                  </Badge>
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums text-primary">
                  {IMP_NEW.toLocaleString("en-US")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pick(lang, "معرّفات لم تُصادف من قبل", "Customer IDs not seen before")}
                </p>
              </CardContent>
            </Card>

            {/* Existing — caution D3: the merge decision is the operator's, still pending. */}
            <Card>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {pick(lang, "ملفات قائمة", "Existing profiles")}
                  </span>
                  <Badge className="bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">
                    <GitMerge className="size-3" />
                    {IMP_EXISTING.toLocaleString("en-US")}
                  </Badge>
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums text-d3-dark dark:text-d3-light">
                  {IMP_EXISTING.toLocaleString("en-US")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pick(lang, "اختر الاستبدال أو التجاوز", "Choose Replace or Skip")}
                </p>
              </CardContent>
            </Card>

            {/* Errors — critical D5: rejected rows, will not be written. */}
            <Card>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {pick(lang, "أخطاء", "Errors")}
                  </span>
                  <Badge className="bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light">
                    <AlertTriangle className="size-3" />
                    {IMP_ERRORS.toLocaleString("en-US")}
                  </Badge>
                </div>
                <div className="font-heading text-3xl font-bold tabular-nums text-d5-dark dark:text-d5-light">
                  {IMP_ERRORS.toLocaleString("en-US")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pick(lang, "صفوف مرفوضة — لن تُكتب", "Rejected rows — these will not be written")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rejected rows (FR-M03-100) */}
          <Card>
            <CardHeader>
              <CardTitle>{pick(lang, "الصفوف المرفوضة", "Rejected rows")}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {pick(
                  lang,
                  "صحّح هذه الصفوف وأعِد تحميلها لاحقاً — أو تابع الآن وستُتجاهل.",
                  "Fix these rows and re-upload them later — or continue now and they'll be skipped.",
                )}
              </CardDescription>
              <CardAction>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() =>
                    toast(
                      pick(
                        lang,
                        "جارٍ تنزيل تقرير الأخطاء (18 صفاً)",
                        "Downloading the error report (18 rows)",
                      ),
                    )
                  }
                >
                  <Download className="size-4" />
                  {pick(lang, "تنزيل تقرير الأخطاء", "Download error report")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-end">{pick(lang, "الصف", "Row")}</TableHead>
                      <TableHead>{pick(lang, "معرّف العميل", "Customer ID")}</TableHead>
                      <TableHead>{pick(lang, "الحقل", "Field")}</TableHead>
                      <TableHead>{pick(lang, "السبب والإصلاح", "Cause & fix")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REJECTED.map((r) => (
                      <TableRow key={`${r.row}-${r.field}`} className="hover:bg-muted/50">
                        <TableCell className="text-end tabular-nums">
                          <span dir="ltr">{r.row}</span>
                        </TableCell>
                        <TableCell>
                          {r.id ? (
                            <span dir="ltr" className="font-mono text-xs">
                              {r.id}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {pick(lang, "(فارغ)", "(empty)")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <CodeChip>{r.field}</CodeChip>
                        </TableCell>
                        <TableCell className="text-xs leading-relaxed text-muted-foreground">
                          {pick(lang, r.ar, r.en)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Change preview (FR-M03-101) */}
          <Card>
            <CardHeader>
              <CardTitle>
                {pick(lang, "ما سيتغيّر في الملفات القائمة", "What will change on existing profiles")}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {pick(
                  lang,
                  "عيّنة من 340 صفاً ستُدمج. القيمة الجديدة تحلّ محلّ القديمة.",
                  "A sample of the 340 rows that will merge. The new value replaces the old one.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{pick(lang, "العميل", "Customer")}</TableHead>
                      <TableHead>{pick(lang, "الحقل", "Field")}</TableHead>
                      <TableHead>{pick(lang, "القيمة الحالية", "Stored value")}</TableHead>
                      <TableHead>{pick(lang, "القيمة الجديدة", "New value")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CHANGES.map((c, i) => (
                      <TableRow key={`${c.id}-${c.field}-${i}`} className="hover:bg-muted/50">
                        <TableCell>
                          <span dir="ltr" className="font-mono text-xs">
                            {c.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <CodeChip>{c.field}</CodeChip>
                        </TableCell>
                        <TableCell
                          className={cn("text-sm", c.oldEmpty && "text-muted-foreground")}
                        >
                          {pick(lang, c.oldAr, c.oldEn)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.kept ? (
                            <span className="text-muted-foreground">{pick(lang, c.newAr, c.newEn)}</span>
                          ) : (
                            <Badge
                              className={cn(
                                "rounded-sm h-auto px-2 py-0.5 font-medium bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
                                c.newMono && "font-mono text-xs",
                              )}
                              dir={c.newMono ? "ltr" : undefined}
                            >
                              {pick(lang, c.newAr, c.newEn)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Existing-profile file-level choice (FR-M03-129 / BR-M03-168/171) */}
          <Card>
            <CardHeader>
              <CardTitle>{pick(lang, "الملفات القائمة", "Existing profiles")}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {pick(
                  lang,
                  "‏340 معرّفاً في الملف موجود بالفعل. اختر ما يحدث لها — لا يمكن تنفيذ الاستيراد قبل الاختيار.",
                  "340 IDs in the file already exist. Choose what happens to them — the import cannot be committed until you choose.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <RadioGroup
                value={mergeChoice ?? ""}
                onValueChange={(v) => chooseMerge(v as MergeChoice)}
                aria-label={pick(lang, "خيار الملفات القائمة", "Existing-profiles choice")}
                className="gap-3 sm:grid-cols-2"
              >
                {(
                  [
                    {
                      key: "replace",
                      titleAr: "استبدال الملفات القائمة",
                      titleEn: "Replace existing profiles",
                      descAr: "تُطبّق قيم الملف على الملفات القائمة. الخلية الفارغة تُبقي القيمة المحفوظة.",
                      descEn:
                        "The file's values are applied to existing profiles. An empty cell keeps the stored value.",
                    },
                    {
                      key: "skip",
                      titleAr: "تجاوز الملفات القائمة",
                      titleEn: "Skip existing profiles",
                      descAr: "لا يُمسّ أي ملف قائم. تُنشأ الملفات الجديدة فقط.",
                      descEn: "No existing profile is touched. Only new profiles are created.",
                    },
                  ] as const
                ).map((o) => {
                  const selected = mergeChoice === o.key
                  return (
                    <label
                      key={o.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors",
                        selected
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <RadioGroupItem value={o.key} className="mt-0.5" />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-semibold">{pick(lang, o.titleAr, o.titleEn)}</span>
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {pick(lang, o.descAr, o.descEn)}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>

              {/* Replace warning (FR-M03-130) — inline caution banner, not a dialog. Armed only
                  once Proceed is clicked; Skip reverts to the non-destructive choice. */}
              {mergeChoice === "replace" && !replaceOk && (
                <div className="flex items-start gap-3 rounded-md border border-d3-dark/25 bg-d3-light p-4 dark:border-d3-light/20 dark:bg-d3-dark/25">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-d3-dark dark:text-d3-light" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-d3-dark dark:text-d3-light">
                      {pick(lang, "تنبيه قبل الاستبدال", "Before you replace")}
                    </p>
                    <p className="text-xs leading-relaxed text-d3-dark dark:text-d3-light">
                      {pick(
                        lang,
                        "إذا تابعت الاستبدال، ستفقد قيم الحقول المتراكمة. للحفاظ على القيم الحالية، أفرغ الحقول المتراكمة من ملفك قبل الرفع.",
                        "If you proceed with replace, you will lose the accumulative fields values. To keep the current values please empty the accumulative fields from your sheet before uploading",
                      )}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="secondary" size="compact" onClick={() => setReplaceOk(true)}>
                        <Check className="size-4" />
                        {pick(lang, "متابعة", "Proceed")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="compact"
                        className="text-d3-dark hover:bg-d3-dark/10 dark:text-d3-light dark:hover:bg-d3-light/10"
                        onClick={() => chooseMerge("skip")}
                      >
                        {pick(lang, "تجاوز", "Skip")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer (FR-M03-102) — Back resets the choice; Commit is gated + row-count aware. */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => goStep(1)}>
              <ArrowLeft className={cn("size-4", isRtl && "rotate-180")} />
              {pick(lang, "رجوع", "Back")}
            </Button>
            <Button disabled={!commitReady} onClick={() => goStep(3)}>
              <Check className="size-4" />
              {mergeChoice
                ? pick(
                    lang,
                    `تنفيذ الاستيراد (${commitRows.toLocaleString("en-US")} صفاً)`,
                    `Commit import (${commitRows.toLocaleString("en-US")} rows)`,
                  )
                : pick(lang, "اختر الاستبدال أو التجاوز أولاً", "Choose Replace or Skip first")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Commit (FR-M03-103) ───────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="size-12 text-d2" />
              <h3 className="text-lg font-bold">{pick(lang, "اكتمل الاستيراد", "Import complete")}</h3>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {pick(
                  lang,
                  `أُنشئ ${IMP_NEW.toLocaleString("en-US")} ملفاً جديداً ودُمج ${merged.toLocaleString("en-US")} ملفاً قائماً. تُخطّي ${skipped.toLocaleString("en-US")} صفاً — تقرير الأخطاء متاح للتنزيل.`,
                  `${IMP_NEW.toLocaleString("en-US")} profiles created and ${merged.toLocaleString("en-US")} existing profiles merged. ${skipped.toLocaleString("en-US")} rows were skipped — the error report is available to download.`,
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast(
                      pick(
                        lang,
                        "جارٍ تنزيل تقرير الأخطاء (18 صفاً)",
                        "Downloading the error report (18 rows)",
                      ),
                    )
                  }
                >
                  <Download className="size-4" />
                  {pick(lang, "تقرير الأخطاء", "Error report")}
                </Button>
                <Button onClick={() => navigate("/customers")}>
                  {pick(lang, "عرض العملاء", "View customers")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
