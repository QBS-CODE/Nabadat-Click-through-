import { useState } from "react"
import { useNavigate } from "react-router"
import {
  Plus, Search, Pencil, Eye, MoreHorizontal, Inbox, FileText,
  Lock, LayoutTemplate, Trash2, Copy, Archive, BarChart2,
  TrendingUp, CircleDot, LayoutGrid, Files, AlertTriangle, Info,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { MOCK_SURVEYS, MOCK_TEMPLATES } from "@/data/mock-surveys"
import type { SurveyTemplate, SurveyStatus, SurveyType } from "@/types/survey"
import { cn } from "@/lib/utils"

// ── Status badge — a colored DOT carries the signal, on a subtle pill ──────────
const STATUS_CONFIG: Record<SurveyStatus, { labelAr: string; labelEn: string; dot: string; className: string }> = {
  Draft:    { labelAr: "مسودة",    labelEn: "Draft",    dot: "bg-muted-foreground/60", className: "bg-muted text-muted-foreground border-transparent" },
  Active:   { labelAr: "نشط",     labelEn: "Active",   dot: "bg-d2",                 className: "bg-d2-light/70 text-d2-dark dark:bg-d2-dark/20 dark:text-d2-light border-transparent" },
  Paused:   { labelAr: "موقوف",   labelEn: "Paused",   dot: "bg-d3",                 className: "bg-d3-light/70 text-d3-dark dark:bg-d3-dark/20 dark:text-d3-light border-transparent" },
  Archived: { labelAr: "مؤرشف",   labelEn: "Archived", dot: "bg-nb-navy-300",        className: "bg-nb-navy-100 text-nb-navy-700 dark:bg-nb-navy-700/50 dark:text-nb-navy-100 border-transparent" },
}

function StatusBadge({ status, isAr }: { status: SurveyStatus; isAr: boolean }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <Badge className={cn("gap-1.5 text-xs font-medium", cfg.className)}>
      <span className={cn("size-1.5 rounded-full shrink-0", cfg.dot)} aria-hidden="true" />
      {isAr ? cfg.labelAr : cfg.labelEn}
    </Badge>
  )
}

// ── Type badge — a category, not a status → neutral outline, never a colored fill ──
function TypeBadge({ type, isAr }: { type: SurveyType; isAr: boolean }) {
  return (
    <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
      {isAr
        ? type === "Transactional" ? "تشغيلي" : "دوري / علائقي"
        : type === "Transactional" ? "Transactional" : "Seasonal / Relational"}
    </Badge>
  )
}

const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  Banking:         { ar: "البنوك", en: "Banking" },
  Telecommunications: { ar: "الاتصالات", en: "Telecom" },
  Government:      { ar: "الحكومة", en: "Government" },
  Automotive:      { ar: "السيارات", en: "Automotive" },
  Entertainment:   { ar: "الترفيه", en: "Entertainment" },
  Services:        { ar: "الخدمات", en: "Services" },
}

type Survey = (typeof MOCK_SURVEYS)[number]

// ── Change status dialog (with pause confirmation) ────────────────────────────
function ChangeStatusDialog({ survey, isAr, onClose, onApply }: { survey: Survey | null; isAr: boolean; onClose: () => void; onApply: (id: string, status: SurveyStatus) => void }) {
  const [pausePending, setPausePending] = useState(false)
  const rules = survey?.rules ?? 0

  function pick(target: SurveyStatus) {
    if (!survey) return
    // Pausing an Active survey that has distribution rules → confirm first.
    if (target === "Paused" && survey.status === "Active" && rules > 0) {
      setPausePending(true)
      return
    }
    onApply(survey.id, target)
    toast.success(isAr ? `تم تغيير الحالة إلى ${STATUS_CONFIG[target].labelAr}` : `${survey.nameEn} → ${target}`)
    finish()
  }
  function finish() { setPausePending(false); onClose() }

  const OPTIONS: SurveyStatus[] = ["Draft", "Active", "Paused"]
  const isArchived = survey?.status === "Archived"

  return (
    <Dialog open={!!survey} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="sm:max-w-md">
        {pausePending ? (
          // ── Secondary: Pause survey? confirmation ──
          <>
            <DialogHeader>
              <DialogTitle>{isAr ? "إيقاف الاستبيان مؤقتاً؟" : "Pause survey?"}</DialogTitle>
              <DialogDescription>{survey && (isAr ? survey.nameAr : survey.nameEn)}</DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2 rounded-md bg-d3-light/50 dark:bg-d3-dark/20 border border-d3/30 p-3 text-sm text-d3-dark dark:text-d3-light">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">
                {isAr ? (
                  <>يحتوي هذا الاستبيان على <b>{rules} قاعدة توزيع</b> متصلة. القواعد تُرسل الاستبيان فقط أثناء كونه <b>نشطاً</b> — الإيقاف المؤقت سيوقف إرسالها له حتى إعادة التفعيل. القواعد نفسها تُحفظ ولا تُحذف.</>
                ) : (
                  <>This survey has <b>{rules} distribution rule{rules > 1 ? "s" : ""}</b> connected (e.g. post-transaction triggers). Rules only send a survey while it is <b>Active</b> — pausing will <b>stop these rules from sending it</b> until the survey is reactivated. The rules themselves are kept and are not deleted.</>
                )}
              </span>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPausePending(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => { if (survey) onApply(survey.id, "Paused"); toast.success(isAr ? "تم إيقاف الاستبيان — القواعد المتصلة معلّقة" : `${survey?.nameEn} paused — connected rules suspended`); finish() }}>
                {isAr ? "إيقاف الاستبيان" : "Pause survey"}
              </Button>
            </DialogFooter>
          </>
        ) : isArchived ? (
          // ── Archived → unarchive to Draft ──
          <>
            <DialogHeader>
              <DialogTitle>{isAr ? "تغيير الحالة" : "Change status"}</DialogTitle>
              <DialogDescription>{survey && (isAr ? survey.nameAr : survey.nameEn)}</DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="size-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">
                {isAr
                  ? "هذا الاستبيان مؤرشف وللقراءة فقط. يمكن فقط إلغاء أرشفته، ما يعيده كـ«مسودة». من المسودة يمكنك تفعيله أو إيقافه."
                  : "This survey is Archived and read-only. It can only be unarchived, which restores it as a Draft. From Draft you can then set it Active or Paused."}
              </span>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={finish}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => { if (survey) onApply(survey.id, "Draft"); toast.success(isAr ? "أُلغيت الأرشفة → مسودة" : "Unarchived → Draft"); finish() }}>
                {isAr ? "إلغاء الأرشفة → مسودة" : "Unarchive → Draft"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // ── Status options ──
          <>
            <DialogHeader>
              <DialogTitle>{isAr ? "تغيير الحالة" : "Change status"}</DialogTitle>
              <DialogDescription>{survey && (isAr ? survey.nameAr : survey.nameEn)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {OPTIONS.map((st) => {
                const current = survey?.status === st
                return (
                  <button
                    key={st}
                    onClick={() => pick(st)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors",
                      current ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                    )}
                  >
                    <StatusBadge status={st} isAr={isAr} />
                    <span className={cn("text-xs font-medium", current ? "text-primary" : "text-muted-foreground")}>
                      {current ? (isAr ? "الحالية" : "Current") : (isAr ? "تعيين" : "Set")}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAr
                ? "الاستبيانات النشطة فقط تجمع الردود وتُرسل وفق قواعد التوزيع؛ الموقوفة تحتفظ بالإعدادات لكنها تتوقف عن الإرسال. استخدم إجراء الأرشفة للأرشفة."
                : "Only Active surveys collect responses and are sent by distribution rules; Paused keeps config and rules but stops sending. Use the Archive action to archive."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Sections & Question Sets dialog (functional) ──────────────────────────────
interface QSet { id: string; name: string; show: number; count: number; mode: "random" | "low" }
interface Sec { id: string; name: string; standalone: number; sets: QSet[] }
let secc = 1
const uidS = (p: string) => `${p}${secc++}_${Date.now()}`
const seedSecs = (): Sec[] => [
  { id: uidS("g"), name: "Service Experience", standalone: 2, sets: [{ id: uidS("s"), name: "Service quality pool", show: 2, count: 3, mode: "low" }] },
  { id: uidS("g"), name: "Application Process", standalone: 2, sets: [] },
  { id: uidS("g"), name: "Closing & Loyalty", standalone: 1, sets: [{ id: uidS("s"), name: "Loyalty drivers pool", show: 2, count: 4, mode: "random" }] },
]

function SectionsDialog({ survey, isAr, onClose }: { survey: Survey | null; isAr: boolean; onClose: () => void }) {
  const [secs, setSecs] = useState<Sec[]>(seedSecs)
  const [newName, setNewName] = useState("")

  const mutate = (fn: (s: Sec[]) => void) => setSecs((prev) => { const n = structuredClone(prev) as Sec[]; fn(n); return n })
  const addSection = () => { if (!newName.trim()) return; setSecs((p) => [...p, { id: uidS("g"), name: newName.trim(), standalone: 0, sets: [] }]); setNewName("") }
  const delSection = (id: string) => setSecs((p) => p.filter((s) => s.id !== id))
  const renameSec = (id: string, name: string) => mutate((s) => { const x = s.find((y) => y.id === id); if (x) x.name = name })
  const addSet = (id: string) => mutate((s) => { s.find((y) => y.id === id)?.sets.push({ id: uidS("s"), name: isAr ? "مجموعة أسئلة جديدة" : "New Questions Set", show: 1, count: 0, mode: "random" }) })
  const delSet = (secId: string, setId: string) => mutate((s) => { const x = s.find((y) => y.id === secId); if (x) x.sets = x.sets.filter((z) => z.id !== setId) })
  const renameSet = (secId: string, setId: string, name: string) => mutate((s) => { const st = s.find((y) => y.id === secId)?.sets.find((z) => z.id === setId); if (st) st.name = name })

  return (
    <Dialog open={!!survey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAr ? "الأقسام ومجموعات الأسئلة" : "Sections & Questions Sets"}</DialogTitle>
          <DialogDescription>{survey && (isAr ? survey.nameAr : survey.nameEn)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {secs.map((sec) => (
            <div key={sec.id} className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="size-2.5 rounded-full bg-nb-mint shrink-0" />
                <input
                  value={sec.name}
                  onChange={(e) => renameSec(sec.id, e.target.value)}
                  className="text-sm font-semibold flex-1 min-w-0 bg-transparent outline-none rounded-md px-1.5 py-0.5 -mx-1 focus:bg-muted/70 transition-colors"
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {sec.standalone} {isAr ? "مستقل" : "standalone"} · {sec.sets.length} {isAr ? "مجموعة" : sec.sets.length === 1 ? "set" : "sets"}
                </span>
                <button onClick={() => addSet(sec.id)} aria-label={isAr ? "إضافة مجموعة" : "Add Questions Set"} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"><Plus className="size-4" /></button>
                <button onClick={() => delSection(sec.id)} aria-label={isAr ? "حذف القسم" : "Delete section"} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
              </div>
              {sec.sets.map((st) => (
                <div key={st.id} className="flex items-center gap-2 rounded-md border border-dashed border-nb-cyan-300 dark:border-nb-cyan-900/60 bg-nb-cyan-100/30 dark:bg-nb-cyan-900/10 px-3 py-2 ms-6">
                  <span className="size-2.5 rounded-full bg-nb-cyan shrink-0" />
                  <input
                    value={st.name}
                    onChange={(e) => renameSet(sec.id, st.id, e.target.value)}
                    className="text-sm font-medium flex-1 min-w-0 bg-transparent outline-none rounded-md px-1.5 py-0.5 -mx-1 focus:bg-muted/70 transition-colors"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {isAr ? "يعرض" : "shows"} {st.show} {isAr ? "من" : "of"} {st.count} · {st.mode === "low" ? (isAr ? "الأقل استجابة أولاً" : "low-response first") : (isAr ? "عشوائي" : "random")}
                  </span>
                  <button aria-label={isAr ? "إعدادات المجموعة" : "Questions Set settings"} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"><LayoutGrid className="size-4" /></button>
                  <button onClick={() => delSet(sec.id, st.id)} aria-label={isAr ? "حذف المجموعة" : "Delete set"} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSection()} placeholder={isAr ? "اسم قسم جديد..." : "New section name…"} className="flex-1" />
          <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={addSection}>
            {isAr ? "إضافة قسم" : "Add Section"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Save as template dialog ───────────────────────────────────────────────────
function SaveTemplateDialog({ survey, isAr, onClose, onSaved }: { survey: Survey | null; isAr: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  return (
    <Dialog open={!!survey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAr ? "حفظ كقالب" : "Save as template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium">{isAr ? "اسم القالب" : "Template name"}</label>
            <Input value={name || (survey ? (isAr ? survey.nameAr : survey.nameEn) : "")} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">{isAr ? "الوصف" : "Description"} <span className="text-muted-foreground font-normal">{isAr ? "اختياري" : "optional"}</span></label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={isAr ? "متى يجب على فرق تجربة العملاء استخدام هذا القالب." : "When CX teams should reach for this template."} className="min-h-20" />
          </div>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <FileText className="size-3.5 mt-0.5 shrink-0" />
            <span>
              {isAr
                ? "يحتفظ القالب بإعدادات الاستبيان وأسئلته (وروابط KPI) لكنه يزيل روابط الرحلة/نقاط التماس."
                : "The template keeps the survey's settings and questions (plus KPI links) but strips journey/touchpoint bindings."}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground" onClick={() => { toast.success(isAr ? "تم حفظ القالب" : "Template saved"); onClose(); onSaved() }}>
            {isAr ? "حفظ القالب" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Surveys tab ───────────────────────────────────────────────────────────────
function SurveysTab({ onSavedTemplate }: { onSavedTemplate: () => void }) {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isAr = i18n.language === "ar"

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [journeyFilter, setJourneyFilter] = useState("all")
  const [statusFor, setStatusFor] = useState<Survey | null>(null)
  const [sectionsFor, setSectionsFor] = useState<Survey | null>(null)
  const [templateFor, setTemplateFor] = useState<Survey | null>(null)
  // Live list — lifted so row actions (archive / status / clone) actually mutate + re-render.
  const [surveys, setSurveys] = useState<Survey[]>(MOCK_SURVEYS)

  const setSurveyStatus = (id: string, status: Survey["status"]) =>
    setSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  // Clone opens the survey-details create flow prefilled with "Copy of - <name>"
  // (matches reference) rather than silently inserting a table row.
  const cloneSurvey = (src: Survey) =>
    navigate("/surveys/new", {
      state: { cloneName: `${isAr ? "نسخة من - " : "Copy of - "}${isAr ? src.nameAr : src.nameEn}` },
    })

  const journeyOptions = Array.from(
    new Set(surveys.filter((s) => s.journeyId).map((s) => s.journeyId!))
  ).map((id) => {
    const s = surveys.find((x) => x.journeyId === id)!
    return { id, labelAr: s.journeyNameAr!, labelEn: s.journeyNameEn! }
  })

  const filtered = surveys.filter((s) => {
    const name = isAr ? s.nameAr : s.nameEn
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== "all" && s.type !== typeFilter) return false
    if (statusFilter !== "all" && s.status !== statusFilter) return false
    if (journeyFilter !== "all" && s.journeyId !== journeyFilter) return false
    return true
  })

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold mb-2">
          {isAr ? "لا توجد استبيانات بعد" : "No surveys yet"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {isAr
            ? "ابدأ بإنشاء أول استبيان لجمع آراء عملائك"
            : "Create your first survey to start collecting customer feedback"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-9"
            placeholder={isAr ? "ابحث عن استبيان..." : "Search surveys..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {typeFilter === "all"
                ? <span className="text-muted-foreground">{isAr ? "النوع" : "Type"}</span>
                : typeFilter === "Transactional" ? (isAr ? "تشغيلي" : "Transactional") : (isAr ? "دوري / علائقي" : "Seasonal / Relational")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الأنواع" : "All Types"}</SelectItem>
            <SelectItem value="Transactional">{isAr ? "تشغيلي" : "Transactional"}</SelectItem>
            <SelectItem value="Relational">{isAr ? "دوري / علائقي" : "Seasonal / Relational"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {statusFilter === "all"
                ? <span className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</span>
                : (isAr ? STATUS_CONFIG[statusFilter as SurveyStatus].labelAr : STATUS_CONFIG[statusFilter as SurveyStatus].labelEn)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الحالات" : "All Statuses"}</SelectItem>
            <SelectItem value="Active">{isAr ? "نشط" : "Active"}</SelectItem>
            <SelectItem value="Draft">{isAr ? "مسودة" : "Draft"}</SelectItem>
            <SelectItem value="Paused">{isAr ? "موقوف" : "Paused"}</SelectItem>
            <SelectItem value="Archived">{isAr ? "مؤرشف" : "Archived"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={journeyFilter} onValueChange={(v) => setJourneyFilter(v ?? "all")}>
          <SelectTrigger className="w-52">
            <SelectValue>
              {journeyFilter === "all"
                ? <span className="text-muted-foreground">{isAr ? "الرحلة" : "Journey"}</span>
                : (() => { const j = journeyOptions.find((x) => x.id === journeyFilter); return j ? (isAr ? j.labelAr : j.labelEn) : (isAr ? "الرحلة" : "Journey") })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الرحلات" : "All Journeys"}</SelectItem>
            {journeyOptions.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {isAr ? j.labelAr : j.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-start font-semibold">
                {isAr ? "الاستبيان" : "Survey"}
              </TableHead>
              <TableHead className="text-start font-semibold">
                {isAr ? "النوع" : "Type"}
              </TableHead>
              <TableHead className="text-start font-semibold">
                {isAr ? "الرحلة" : "Journey"}
              </TableHead>
              <TableHead className="text-start font-semibold tabular-nums">
                {isAr ? "الردود" : "Responses"}
              </TableHead>
              <TableHead className="text-start font-semibold">
                {isAr ? "الحالة" : "Status"}
              </TableHead>
              <TableHead className="text-start font-semibold">
                {isAr ? "آخر تحديث" : "Updated"}
              </TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  {isAr ? "لا توجد نتائج مطابقة" : "No matching surveys"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((survey) => (
                <TableRow
                  key={survey.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/surveys/${survey.id}/edit`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {isAr ? survey.nameAr : survey.nameEn}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={survey.type} isAr={isAr} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {survey.journeyId
                      ? (isAr ? survey.journeyNameAr : survey.journeyNameEn)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-start tabular-nums font-medium text-sm">
                    {survey.responseCount.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={survey.status} isAr={isAr} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span dir="ltr" className="inline-block text-start">{survey.updatedAt}</span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/surveys/${survey.id}/preview`) }}
                            aria-label={isAr ? "معاينة الاستبيان" : "Preview survey"}
                          >
                            <Eye className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>{isAr ? "معاينة الاستبيان" : "Preview survey"}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/surveys/${survey.id}/stats`) }}
                            aria-label={isAr ? "تقرير الاستبيان" : "Survey report"}
                          >
                            <BarChart2 className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>{isAr ? "تقرير الاستبيان" : "Survey report"}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/surveys/${survey.id}/funnel`) }}
                            aria-label={isAr ? "التحليلات" : "Analytics"}
                          >
                            <TrendingUp className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>{isAr ? "التحليلات" : "Analytics"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={isAr ? "المزيد" : "More"}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/surveys/${survey.id}/edit`) }}>
                            <Pencil className="size-4 me-2" />{isAr ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStatusFor(survey) }}>
                            <CircleDot className="size-4 me-2" />{isAr ? "تغيير الحالة" : "Change status"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); cloneSurvey(survey); toast.success(isAr ? "تم استنساخ الاستبيان" : `Cloned — "Copy of - ${survey.nameEn}"`) }}>
                            <Copy className="size-4 me-2" />{isAr ? "استنساخ" : "Clone"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSectionsFor(survey) }}>
                            <LayoutGrid className="size-4 me-2" />{isAr ? "الأقسام" : "Sections"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTemplateFor(survey) }}>
                            <LayoutTemplate className="size-4 me-2" />{isAr ? "حفظ كقالب" : "Save as template"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {survey.status === "Archived" ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSurveyStatus(survey.id, "Draft"); toast.success(isAr ? "أُلغيت الأرشفة → مسودة" : `${survey.nameEn} unarchived — restored as Draft`) }}>
                              <Archive className="size-4 me-2" />{isAr ? "إلغاء الأرشفة" : "Unarchive"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setSurveyStatus(survey.id, "Archived"); toast.success(isAr ? "تمت أرشفة الاستبيان — للقراءة فقط" : `${survey.nameEn} archived — read-only`) }}>
                              <Archive className="size-4 me-2" />{isAr ? "أرشفة" : "Archive"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {isAr
          ? `${filtered.length} استبيان من أصل ${surveys.length}`
          : `Showing ${filtered.length} of ${surveys.length} surveys`}
      </p>

      <ChangeStatusDialog survey={statusFor} isAr={isAr} onClose={() => setStatusFor(null)} onApply={setSurveyStatus} />
      <SectionsDialog survey={sectionsFor} isAr={isAr} onClose={() => setSectionsFor(null)} />
      <SaveTemplateDialog survey={templateFor} isAr={isAr} onClose={() => setTemplateFor(null)} onSaved={onSavedTemplate} />
    </div>
  )
}

// ── Templates tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isAr = i18n.language === "ar"

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")

  const filtered = MOCK_TEMPLATES
    .filter((t) => {
      const name = isAr ? t.nameAr : t.nameEn
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
      if (classFilter !== "all" && t.templateClass !== classFilter) return false
      if (sectorFilter !== "all" && !t.sectors.includes(sectorFilter)) return false
      return true
    })
    // Customized (Tenant) templates first, then Built-in (Platform) — matches the
    // reference. Array.sort is stable, so within each group the data order holds.
    .sort((a, b) => (a.templateClass === "Tenant" ? 0 : 1) - (b.templateClass === "Tenant" ? 0 : 1))

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-9"
            placeholder={isAr ? "ابحث عن قالب..." : "Search templates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {classFilter === "all"
                ? (isAr ? "كل الأنواع" : "All Types")
                : classFilter === "Platform" ? (isAr ? "جاهز" : "Built-in") : (isAr ? "مخصص" : "Customized")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الأنواع" : "All Types"}</SelectItem>
            <SelectItem value="Platform">{isAr ? "جاهز" : "Built-in"}</SelectItem>
            <SelectItem value="Tenant">{isAr ? "مخصص" : "Customized"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={(v) => setSectorFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {sectorFilter === "all"
                ? (isAr ? "كل القطاعات" : "All Sectors")
                : (isAr ? SECTOR_LABELS[sectorFilter]?.ar : SECTOR_LABELS[sectorFilter]?.en) ?? sectorFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل القطاعات" : "All Sectors"}</SelectItem>
            {Object.entries(SECTOR_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {isAr ? label.ar : label.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? "لا توجد قوالب مطابقة" : "No matching templates"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isAr ? "جرّب تغيير الفلاتر أو القطاع" : "Try adjusting the filters or sector"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} isAr={isAr} navigate={navigate} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isAr
          ? `${filtered.length} قالب من أصل ${MOCK_TEMPLATES.length}`
          : `Showing ${filtered.length} of ${MOCK_TEMPLATES.length} templates`}
      </p>
    </div>
  )
}

function TemplateCard({
  template,
  isAr,
  navigate,
}: {
  template: SurveyTemplate
  isAr: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  const isBuiltIn = template.templateClass === "Platform"
  const chips = isBuiltIn
    ? template.sectors.map((s) => ({ key: s, label: isAr ? SECTOR_LABELS[s]?.ar ?? s : SECTOR_LABELS[s]?.en ?? s }))
    : (template.tags ?? []).map((tg) => ({ key: tg, label: `#${tg}` }))

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5 gap-3 hover:shadow-md transition-shadow duration-150">
      {/* Top: Built-in badge + lock, or "Customized" label */}
      <div className="flex items-center gap-2 min-h-5">
        {isBuiltIn ? (
          <>
            <Badge className="text-xs font-medium bg-nb-navy-100 text-nb-navy-800 dark:bg-nb-navy-700/40 dark:text-nb-navy-100 border-transparent">
              {isAr ? "جاهز" : "Built-in"}
            </Badge>
            <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label={isAr ? "للقراءة فقط" : "Read-only"} />
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{isAr ? "مخصص" : "Customized"}</span>
        )}
      </div>

      {/* Title (single name) */}
      <h3 className="font-bold text-base text-foreground leading-snug">
        {isAr ? template.nameAr : template.nameEn}
      </h3>

      {/* Tags — sectors (built-in) or #tags (customized) */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Badge key={c.key} variant="outline" className="text-xs text-muted-foreground">
              {c.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
        <span>{isAr ? `${template.questionCount} أسئلة` : `${template.questionCount} questions`}</span>
        <span>
          {isAr
            ? `مستخدم في ${template.usedBySurveys} استبيان`
            : `Used by ${template.usedBySurveys} survey${template.usedBySurveys === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Actions — edit only for Customized (Built-in is read-only) */}
      <div className="flex items-center gap-2">
        <Button
          className="flex-1 bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
          onClick={() => navigate(`/surveys/new/from-template/${template.id}`)}
        >
          {isAr ? "استخدم كاستبيان" : "Use as Survey"}
        </Button>
        {!isBuiltIn && (
          <Button
            variant="secondary"
            size="icon"
            className="size-10 shrink-0"
            onClick={() => navigate(`/surveys/templates/${template.id}/edit`)}
            aria-label={isAr ? "تعديل القالب" : "Edit template"}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SurveysLibraryPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === "ar"
  const navigate = useNavigate()
  const [tab, setTab] = useState<"surveys" | "templates">("surveys")

  return (
    <div className="space-y-5 py-5 px-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">
            {isAr ? "مكتبة الاستبيانات" : "Survey Library"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "إدارة استبياناتك وقوالبك في مكان واحد"
              : "Manage Your Surveys And Templates In One Place."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/surveys/templates/new")}
          >
            <Files className="size-4" />
            {isAr ? "إضافة قالب" : "Add Template"}
          </Button>
          <Button
            className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
            onClick={() => navigate("/surveys/new")}
          >
            <Plus className="size-4 me-2" />
            {isAr ? "إضافة استبيان" : "Add Survey"}
          </Button>
        </div>
      </div>

      {/* Tabs (segmented pill) */}
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
          {([
            { key: "surveys" as const, label: isAr ? "الاستبيانات" : "Surveys", count: MOCK_SURVEYS.length },
            { key: "templates" as const, label: isAr ? "القوالب" : "Templates", count: MOCK_TEMPLATES.length },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn(
                "rounded-full text-xs px-1.5 py-0.5 font-medium tabular-nums",
                tab === t.key ? "bg-primary/10 text-primary" : "bg-muted-foreground/15 text-muted-foreground",
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === "surveys" ? <SurveysTab onSavedTemplate={() => setTab("templates")} /> : <TemplatesTab />}
      </div>
    </div>
  )
}
