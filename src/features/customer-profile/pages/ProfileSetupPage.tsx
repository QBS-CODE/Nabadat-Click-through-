// SCR-M03-03 — Profile Setup (the single, tenant-scoped customer-profile setup screen).
//
// Ported from the ratified prototype `nabadat-m03-customer-profile-v4.3.html` (the `data-view`
// "designer"/"setup" section + its JS: buildParams/PARAMS, included/unnamed/removals,
// snapshot/publishNow/diffSetup/renderPending, setSave/touchSetup, renderSetup/setupRow,
// renderSetupAlert, availableParams/bindAddParameter, renderVis/applyVisibility, renderPreview).
//
// Faithful to the prototype BEHAVIOUR, rebuilt in this app's design system:
//  • BR-M03-028/030 — exactly ONE setup per tenant; we render the "edit" mode (a configured tenant).
//  • FR-M03-138/139/140/141 — every edit auto-saves (quiet inline indicator Saving…→Saved);
//    "Save and publish" is enabled only while the working state differs from the published one.
//  • BR-M03-144 — one diff powers both the pending-changes notice and publish enablement.
//  • FR-M03-068/069 + BR-M03-034/035 — live caution banners: unnamed fields, and a removal-impact
//    notice that says values stay stored on EXISTING_PROFILES profiles and return if switched back on.
//  • FR-M03-070..078 + BR-M03-041 — the parameter table, grouped by category; ONLY the match key
//    (customer_id) is locked (cannot toggle / rename / recategorise) — see the note on `locked` below.
//  • FR-M03-079..086 — the auto-saved "Add information" draft row (choosing a parameter binds it
//    immediately, marks it New, moves it to the bottom of its category, toasts the destination).
//  • FR-M03-087/088 + BR-M03-… — the visibility card; locked items (Identity header, Profile data)
//    cannot be hidden; hiding NPS hides the status badge (surfaced in its note).

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"
import {
  CATS,
  type Category,
  EXISTING_PROFILES,
  type Lang,
  M13_REGISTRY,
  pick,
  TENANT_DEFAULTS,
  VIS_DEFAULT,
  VIS_GROUPS,
  type VisState,
} from "@/features/customer-profile/data"
import {
  D_BADGE,
  pname,
  ProfilePreviewDialog,
  type WorkingParam,
} from "@/features/customer-profile/components/ProfilePreviewDialog"

// ── Working-state model, derived from the M-13 registry (never authored here, BR-M03-192) ──
// `locked` is the match key ONLY: the prototype's buildParams sets `locked: r.matchKey`, and
// FR-M03-041/072 lock the match key alone (customer_id) — every other field, identity ones
// included, can be toggled / renamed / recategorised, which the removal-impact banner relies on.
function buildInitialParams(): WorkingParam[] {
  return M13_REGISTRY.filter((r) => r.scope === "person" && r.enabled).map((r) => {
    const d = TENANT_DEFAULTS[r.code] ?? { cat: "identity" as Category["key"], on: false }
    return {
      code: r.code,
      type: r.type,
      cat: d.cat,
      on: d.on,
      locked: r.matchKey,
      rule: r.rule,
      pii: r.pii,
      secret: r.secret,
      ar: r.defAr,
      en: r.defEn,
      sAr: r.sAr,
      sEn: r.sEn,
    }
  })
}

// ── Snapshot / diff (BR-M03-144) — one comparison drives the notice AND publish enablement ──
type SnapRow = [string, boolean, string, string, string]
interface Snap {
  p: SnapRow[]
  v: VisState
}
function makeSnapshot(params: WorkingParam[], vis: VisState): string {
  return JSON.stringify({
    p: params.map((pm): SnapRow => [pm.code, pm.on, pm.cat, pm.ar, pm.en]),
    v: vis,
  })
}
interface Diff {
  added: number
  removed: number
  renamed: number
  vis: boolean
  total: number
}
function computeDiff(publishedSnap: string, currentSnap: string): Diff {
  const out: Diff = { added: 0, removed: 0, renamed: 0, vis: false, total: 0 }
  const was = JSON.parse(publishedSnap) as Snap
  const now = JSON.parse(currentSnap) as Snap
  const wm = new Map<string, SnapRow>()
  was.p.forEach((r) => wm.set(r[0], r))
  now.p.forEach((r) => {
    const w = wm.get(r[0])
    if (!w) return
    if (r[1] && !w[1]) out.added++
    else if (!r[1] && w[1]) out.removed++
    // A rename / recategorise counts whether the field is on or off — it is still a change to
    // the working state, and if it did not count it could never be published (prototype note).
    else if (r[2] !== w[2] || r[3] !== w[3] || r[4] !== w[4]) out.renamed++
  })
  out.vis = JSON.stringify(was.v) !== JSON.stringify(now.v)
  out.total = out.added + out.removed + out.renamed + (out.vis ? 1 : 0)
  return out
}
// Fields included in the PUBLISHED setup that have been switched off in the working state.
function computeRemovals(
  publishedSnap: string,
  params: WorkingParam[],
  lang: Lang,
): { code: string; name: string }[] {
  const was = JSON.parse(publishedSnap) as Snap
  const cur = new Map(params.map((p) => [p.code, p]))
  return was.p
    .filter((r) => r[1] && cur.get(r[0]) && !cur.get(r[0])!.on)
    .map((r) => ({ code: r[0], name: (lang === "ar" ? r[3] : r[4]) || r[0] }))
}

const catByKey = (key: Category["key"]) => CATS.find((c) => c.key === key)!
function catLabel(key: Category["key"], lang: Lang): string {
  const c = catByKey(key)
  return pick(lang, c.ar, c.en)
}
type SaveState = "idle" | "saving" | "saved" | "error"
// Prototype control for FR-M03-141 (a failure is never silent). No debug toggle is shipped here,
// so it stays false — the error/Retry path exists in the indicator for completeness.
const SIM_SAVE_FAIL = false

export default function ProfileSetupPage() {
  const { lang: rawLang } = useDirection()
  const lang: Lang = rawLang === "ar" ? "ar" : "en"
  const mode = "edit" as const // BR-M03-030: a configured tenant renders the edit mode.

  const [params, setParams] = useState<WorkingParam[]>(buildInitialParams)
  const [vis, setVis] = useState<VisState>(() => JSON.parse(JSON.stringify(VIS_DEFAULT)) as VisState)
  // The published baseline: in edit mode the initial state IS the published setup.
  const [publishedSnap, setPublishedSnap] = useState(() =>
    makeSnapshot(buildInitialParams(), JSON.parse(JSON.stringify(VIS_DEFAULT)) as VisState),
  )
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [lastEditedByYou, setLastEditedByYou] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add-information draft state (prototype addOpen / addField / addBuf).
  const [addOpen, setAddOpen] = useState(false)
  const [addField, setAddField] = useState<string | null>(null)
  const [addBuf, setAddBuf] = useState<{ name: string; cat: Category["key"] | null }>({
    name: "",
    cat: null,
  })

  const [previewOpen, setPreviewOpen] = useState(false)

  // FR-M03-138/139/141 — every change persists automatically; reported by the quiet indicator.
  function touchSetup() {
    setLastEditedByYou(true)
    setSaveState("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaveState(SIM_SAVE_FAIL ? "error" : "saved")
    }, 420)
  }

  // ── Derived state ──
  const currentSnap = useMemo(() => makeSnapshot(params, vis), [params, vis])
  const diff = useMemo(() => computeDiff(publishedSnap, currentSnap), [publishedSnap, currentSnap])
  const removalList = useMemo(
    () => computeRemovals(publishedSnap, params, lang),
    [publishedSnap, params, lang],
  )
  const included = useMemo(() => params.filter((p) => p.on && p.code && p.cat), [params])
  const unnamed = useMemo(
    () => params.filter((p) => p.on && !pname(p, lang).trim()),
    [params, lang],
  )

  const blocked = saveState === "saving" || saveState === "error"
  const canPublish = diff.total > 0 && !blocked

  // ── Mutations ──
  function setFieldOn(code: string, on: boolean) {
    setParams((prev) => prev.map((p) => (p.code === code ? { ...p, on } : p)))
    touchSetup()
  }
  function renameField(code: string, value: string) {
    setParams((prev) =>
      prev.map((p) =>
        p.code === code ? { ...p, ...(lang === "ar" ? { ar: value } : { en: value }) } : p,
      ),
    )
    touchSetup()
  }
  function setFieldCat(code: string, cat: Category["key"]) {
    setParams((prev) => prev.map((p) => (p.code === code ? { ...p, cat } : p)))
    touchSetup()
  }
  function toggleVis(g: keyof VisState, k: string) {
    setVis((prev) => ({ ...prev, [g]: { ...prev[g], [k]: !prev[g][k] } }))
    touchSetup()
  }

  // FR-M03-140/201 — publish applies the entire working state; clears New marks; disables again.
  function publish() {
    const cleared = params.map((p) => ({ ...p, justAdded: false }))
    setParams(cleared)
    setPublishedSnap(makeSnapshot(cleared, vis))
    setLastEditedByYou(false)
    setSaveState("idle")
    toast.success(
      pick(
        lang,
        "نُشر التحديث — يسري الآن على كل معاملة قادمة",
        "Update published — it now applies to every incoming transaction",
      ),
    )
  }

  // ── Add information (prototype bindAddParameter / renderAddRow) ──
  const availableParams = useMemo(() => params.filter((p) => !p.on && p.code), [params])
  const boundParam = addField ? params.find((p) => p.code === addField) : undefined
  const paramOptions = boundParam ? [...availableParams, boundParam] : availableParams

  function openAdd() {
    if (!availableParams.length) {
      toast.info(
        pick(lang, "كل المعاملات المتاحة مفعّلة بالفعل", "Every available parameter is already switched on"),
      )
      return
    }
    setAddOpen(true)
    setAddField(null)
    setAddBuf({ name: "", cat: null })
  }
  function closeAdd() {
    setAddOpen(false)
    setAddField(null)
    setAddBuf({ name: "", cat: null })
  }
  function bindAdd(code: string) {
    const target = params.find((p) => p.code === code)
    if (!target) return
    const resultCat = addBuf.cat ?? target.cat
    setParams((prev) => {
      let next = prev.map((p) => ({ ...p }))
      // Switching parameter mid-add: release the previously bound one.
      if (addField && addField !== code) {
        const prevP = next.find((p) => p.code === addField)
        if (prevP) {
          prevP.on = false
          prevP.justAdded = false
        }
      }
      const pm = next.find((p) => p.code === code)
      if (!pm) return prev
      pm.on = true
      pm.justAdded = true
      if (addBuf.cat) pm.cat = addBuf.cat
      if (addBuf.name) {
        // BR-M03-046 — a name entered in one language is written to both variants.
        if (lang === "ar") {
          pm.ar = addBuf.name
          if (!pm.en) pm.en = addBuf.name
        } else {
          pm.en = addBuf.name
          if (!pm.ar) pm.ar = addBuf.name
        }
      }
      // BR-M03-047 — placed at the bottom of its assigned category (here: end of the list).
      next = next.filter((p) => p.code !== code)
      next.push(pm)
      return next
    })
    setAddField(code)
    setAddOpen(false)
    setAddBuf({ name: "", cat: null })
    touchSetup()
    toast.success(pick(lang, "أُضيفت المعلومة إلى تصنيف ", "Added to ") + catLabel(resultCat, lang))
  }
  function renameAdd(value: string) {
    if (addField) {
      setParams((prev) =>
        prev.map((p) => {
          if (p.code !== addField) return p
          if (lang === "ar") return { ...p, ar: value, en: p.en || value }
          return { ...p, en: value, ar: p.ar || value }
        }),
      )
      touchSetup()
    } else {
      setAddBuf((b) => ({ ...b, name: value }))
    }
  }
  function setAddCat(cat: Category["key"]) {
    if (addField) setFieldCat(addField, cat)
    else setAddBuf((b) => ({ ...b, cat }))
  }

  const addName = boundParam ? pname(boundParam, lang) : addBuf.name
  const addCatVal = boundParam ? boundParam.cat : addBuf.cat ?? ""

  const visShown = VIS_GROUPS.reduce(
    (n, grp) => n + grp.items.filter((it) => vis[grp.g][it.k]).length,
    0,
  )
  const visTotal = VIS_GROUPS.reduce((n, grp) => n + grp.items.length, 0)

  // Pending-changes bits (FR-M03-068 / renderPending).
  const pendingBits: string[] = []
  if (diff.added) pendingBits.push(`${diff.added} ${pick(lang, "مضاف", "added")}`)
  if (diff.removed) pendingBits.push(`${diff.removed} ${pick(lang, "مُزال", "removed")}`)
  if (diff.renamed) pendingBits.push(`${diff.renamed} ${pick(lang, "معدّل", "changed")}`)
  if (diff.vis) pendingBits.push(pick(lang, "وما يظهر في الملف", "and what the profile shows"))

  const brandBadge = "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"

  return (
    <div className="space-y-5 py-5">
      {/* ── Header ── (title + description, then the actions in a row below) */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-heading text-2xl font-bold">
              {pick(lang, "إعداد ملف العميل", "Customer profile setup")}
            </h1>
            {/* FR-M03-139 — quiet auto-save indicator beside the title */}
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {pick(lang, "جارٍ الحفظ…", "Saving…")}
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3" />
                {pick(lang, "محفوظ", "Saved")}
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3" />
                {pick(lang, "لم يُحفظ", "Not saved")}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1 px-2 py-0.5 text-xs text-destructive"
                  onClick={touchSetup}
                >
                  <RefreshCw className="size-3" />
                  {pick(lang, "أعد المحاولة", "Retry")}
                </Button>
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {pick(
              lang,
              "إعداد واحد لهذه المنشأة. اختر المعاملات التي تُغذّي الملف، وسمِّ ما تعنيه لدى مديري التجربة.",
              "One setup for this organisation. Choose the parameters that feed the profile, and name what each one means to your CX managers.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" />
            {pick(lang, "معاينة الملف", "Preview profile")}
          </Button>
          <Button onClick={publish} disabled={!canPublish}>
            <Check className="size-4" />
            {pick(lang, "حفظ ونشر", "Save and publish")}
          </Button>
        </div>
      </div>

      {/* ── Pending-changes notice (FR-M03-068 / renderPending) ── */}
      {diff.total > 0 && lastEditedByYou && (
        <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <div className="font-bold">{pick(lang, "تغييرات غير منشورة", "Unpublished changes pending")}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {pendingBits.join(pick(lang, "، ", ", "))} {"— "}
              {pick(lang, "آخر تعديل بواسطة أنت. ", "last changed by You. ")}
              {pick(lang, "لا يسري أي تغيير حتى تنشره.", "No change takes effect until you publish.")}
            </p>
          </div>
        </div>
      )}

      {/* ── Live validation banners (FR-M03-068 / renderSetupAlert) ── */}
      {unnamed.length > 0 && (
        <div className={cn("flex gap-2 rounded-lg p-3 text-sm", D_BADGE.d3)}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-bold">
              {pick(
                lang,
                `${unnamed.length} معلومة مفعّلة بلا اسم`,
                `${unnamed.length} field(s) switched on but unnamed`,
              )}
            </div>
            <p className="mt-1 leading-relaxed">
              {pick(
                lang,
                "سمِّ كل معلومة مفعّلة حتى يعرف مديرو التجربة ما تعنيه: ",
                "Name every field you switch on, so CX managers know what it means: ",
              )}
              {unnamed.map((p) => p.code).join(pick(lang, "، ", ", "))}
            </p>
          </div>
        </div>
      )}
      {removalList.length > 0 && (
        <div className={cn("flex gap-2 rounded-lg p-3 text-sm", D_BADGE.d3)}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-bold">
              {pick(
                lang,
                `إيقاف ${removalList.length} معلومة سيخفي بيانات قائمة`,
                `Switching off ${removalList.length} field(s) will hide existing data`,
              )}
            </div>
            <p className="mt-1 leading-relaxed">
              {removalList.map((r) => r.name).join(pick(lang, "، ", ", "))}
              {" — "}
              {pick(
                lang,
                `تبقى القيم محفوظة على ${EXISTING_PROFILES.toLocaleString("en-US")} ملفاً ومخفية عن العرض، وتعود إن أعدت تفعيل المعلومة. لا يُحذف شيء.`,
                `values stay stored on ${EXISTING_PROFILES.toLocaleString("en-US")} profiles and hidden from view, and return if you switch the field back on. Nothing is deleted.`,
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Visibility card — "What appears on the customer profile" (FR-M03-087/088) ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">
                {pick(lang, "ما يظهر في ملف العميل", "What appears on the customer profile")}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {pick(
                  lang,
                  "اختر المؤشرات والأقسام التي يراها مديرو التجربة في صفحة الملف. تُقرأ قائمة المؤشرات من سجل المؤشرات المفعّلة في M-06.",
                  "Choose which KPIs and sections CX managers see on the profile page. The KPI list is read from the active KPI registry in M-06.",
                )}
              </CardDescription>
            </div>
            <Badge className={cn("shrink-0 tabular-nums", brandBadge)}>
              {visShown} / {visTotal} {pick(lang, "ظاهر", "shown")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {VIS_GROUPS.map((grp) => {
            const on = grp.items.filter((it) => vis[grp.g][it.k]).length
            return (
              <div key={grp.g} className="overflow-hidden rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {pick(lang, grp.ar, grp.en)}
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    {on} / {grp.items.length}
                  </Badge>
                </div>
                <div className="divide-y divide-border/60">
                  {grp.items.map((it) => {
                    const isOn = vis[grp.g][it.k]
                    const note = pick(lang, it.nAr ?? "", it.nEn ?? "")
                    const label = pick(lang, it.ar, it.en)
                    return (
                      <div key={it.k} className="flex items-start gap-3 px-3 py-2.5">
                        <Checkbox
                          checked={isOn}
                          disabled={it.locked}
                          className="mt-0.5"
                          aria-label={label}
                          onCheckedChange={() => toggleVis(grp.g, it.k)}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {label}
                            {it.locked && <Lock className="size-3 text-muted-foreground" />}
                          </div>
                          {note && (
                            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {note}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ── Parameters and customer information — the main table (FR-M03-070..078) ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">
                {pick(lang, "المعاملات ومعلومات العميل", "Parameters and customer information")}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {pick(
                  lang,
                  "كل معامل متاح من كتالوج M-13 معروض أدناه. فعّل ما تريد حفظه، وسمِّ المعلومة التي يمثّلها. لا تظهر معاملات مستوى المعاملة — كالرحلة ونقطة التماس — لأنها تصف الحدث لا الشخص.",
                  "Every eligible parameter from the M-13 catalogue is listed below. Switch on what you want held, and name the information it represents. Transaction-level parameters — journey, touchpoint — are not listed, because they describe the event rather than the person.",
                )}
              </CardDescription>
            </div>
            <Badge className={cn("shrink-0 tabular-nums", brandBadge)}>
              {included.length} {pick(lang, "معلومة مفعّلة", "fields on")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Column labels, aligned with the row grid (hidden on the stacked mobile layout). */}
            <div className="hidden grid-cols-[auto_1.1fr_1fr_1fr] items-center gap-3 px-4 sm:grid">
              <span className="w-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {pick(lang, "المعامل", "Parameter")}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {pick(lang, "معلومة العميل", "Customer information")}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {pick(lang, "التصنيف", "Category")}
              </span>
            </div>

            {/* One bordered card per category (prototype layout): a header band + a divided list of
                parameter rows. */}
            {CATS.map((c) => {
              const mine = params.filter((p) => p.cat === c.key)
              if (!mine.length) return null
              const onCount = mine.filter((p) => p.on).length
              // The field currently in the draft row is rendered in the draft tile, not here.
              const rows = mine.filter((p) => p.code !== addField)
              return (
                <div key={c.key} className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                    <span className="text-sm font-bold text-foreground">{pick(lang, c.ar, c.en)}</span>
                    <Badge variant="outline" className="rounded-sm tabular-nums text-muted-foreground">
                      {onCount} / {mine.length}
                    </Badge>
                  </div>
                  {rows.map((pm, idx) => {
                    const nm = pname(pm, lang)
                    const isUnnamed = pm.on && !nm.trim()
                    return (
                      <div
                        key={pm.code}
                        className={cn(
                          "grid grid-cols-1 items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:grid-cols-[auto_1.1fr_1fr_1fr]",
                          idx > 0 && "border-t border-border",
                          pm.locked && "bg-muted/30",
                          !pm.on && "opacity-60",
                          isUnnamed && "bg-d3-light/50 dark:bg-d3-dark/20",
                          pm.justAdded && !isUnnamed && "bg-nb-cyan-100/40 dark:bg-nb-cyan-900/20",
                        )}
                      >
                        {/* 1 — inclusion toggle */}
                        <Checkbox
                          checked={pm.on}
                          disabled={pm.locked}
                          aria-label={pick(lang, `تفعيل ${pm.code}`, `Include ${pm.code}`)}
                          onCheckedChange={(checked) => setFieldOn(pm.code, checked === true)}
                        />
                        {/* 2 — code + type/accum/personal/New badges + match-key hint (all inline) */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <code
                            dir="ltr"
                            className="inline-block rounded-sm bg-muted px-2 py-0.5 font-mono text-xs tracking-wide text-foreground"
                          >
                            {pm.code}
                          </code>
                          <Badge variant="outline" className="rounded-sm text-muted-foreground">
                            {pm.type}
                          </Badge>
                          {pm.rule === "all" && (
                            <Badge
                              variant="outline"
                              className="rounded-sm text-muted-foreground"
                              title={pick(lang, "يتراكم عبر المعاملات", "accumulates across transactions")}
                            >
                              <Layers className="size-3" />
                              {pick(lang, "متراكم", "accum.")}
                            </Badge>
                          )}
                          {pm.pii && (
                            <Badge variant="outline" className="rounded-sm text-muted-foreground">
                              <EyeOff className="size-3" />
                              {pick(lang, "شخصية", "personal")}
                            </Badge>
                          )}
                          {pm.locked && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="size-3" />
                              {pick(lang, "مفتاح المطابقة — مفعّل دائماً", "Match key — always on")}
                            </span>
                          )}
                          {pm.justAdded && <Badge className={brandBadge}>{pick(lang, "جديد", "New")}</Badge>}
                        </div>
                        {/* 3 — display name for the active language (FR-M03-136) */}
                        {pm.locked ? (
                          <span className="text-sm text-muted-foreground">{nm}</span>
                        ) : (
                          <Input
                            value={nm}
                            className="text-xs md:text-xs"
                            placeholder={
                              pm.on
                                ? pick(lang, "سمِّ هذه المعلومة", "name this information")
                                : pick(lang, "غير مفعّلة", "not on")
                            }
                            aria-label={pick(lang, "معلومة العميل", "Customer information")}
                            onChange={(e) => renameField(pm.code, e.target.value)}
                          />
                        )}
                        {/* 4 — category */}
                        {pm.locked ? (
                          <span className="text-xs text-muted-foreground">
                            {pick(lang, "الهوية", "Identity")}
                          </span>
                        ) : (
                          <Select
                            value={pm.cat}
                            onValueChange={(v) => v && setFieldCat(pm.code, v as Category["key"])}
                          >
                            <SelectTrigger className="w-full" aria-label={pick(lang, "التصنيف", "Category")}>
                              <SelectValue>{catLabel(pm.cat, lang)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {CATS.map((cat) => (
                                <SelectItem key={cat.key} value={cat.key}>
                                  {pick(lang, cat.ar, cat.en)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Add-information draft row (FR-M03-079..086) — its own container OUTSIDE the table's
              overflow-hidden wrapper, so the full rounded dashed border renders (never clipped). */}
          {(addOpen || addField) && (
            <div className="mt-4 rounded-md border border-dashed border-primary/50 bg-primary/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {pick(lang, "معلومة جديدة", "New information")}
                  {boundParam && <Badge className={brandBadge}>{pick(lang, "جديد", "New")}</Badge>}
                </span>
                <Button variant="ghost" size="sm" onClick={closeAdd}>
                  <X className="size-4" />
                  {pick(lang, "إغلاق", "Close")}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* parameter */}
                <Select value={addField ?? ""} onValueChange={(v) => v && bindAdd(v)}>
                  <SelectTrigger className="w-full" aria-label={pick(lang, "المعامل", "Parameter")}>
                    <SelectValue>
                      {boundParam
                        ? `${boundParam.code} · ${boundParam.type}`
                        : pick(lang, "— اختر معاملاً —", "— choose a parameter —")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paramOptions.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} · {a.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* name */}
                <Input
                  value={addName}
                  className="text-xs md:text-xs"
                  placeholder={pick(lang, "سمِّ هذه المعلومة", "name this information")}
                  aria-label={pick(lang, "معلومة العميل", "Customer information")}
                  onChange={(e) => renameAdd(e.target.value)}
                />
                {/* category */}
                <Select
                  value={addCatVal}
                  onValueChange={(v) => v && setAddCat(v as Category["key"])}
                >
                  <SelectTrigger className="w-full" aria-label={pick(lang, "التصنيف", "Category")}>
                    <SelectValue>
                      {addCatVal
                        ? catLabel(addCatVal as Category["key"], lang)
                        : pick(lang, "— اختر التصنيف —", "— choose a category —")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATS.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {pick(lang, cat.ar, cat.en)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {boundParam
                  ? pick(
                      lang,
                      "أُضيف الحقل إلى الجدول. كل تعديل يُحفظ تلقائياً.",
                      "The field is in the table. Every edit is saved automatically.",
                    )
                  : pick(
                      lang,
                      "اختر معاملاً ليُضاف الحقل. تُحفظ تعديلاتك تلقائياً بعد ذلك.",
                      "Choose a parameter to add the field. Your edits are saved automatically from then on.",
                    )}
              </p>
            </div>
          )}

          {!addOpen && !addField && (
            <Button variant="secondary" className="mt-4" onClick={openAdd}>
              <Plus className="size-4" />
              {pick(lang, "إضافة معلومة", "Add information")}
            </Button>
          )}
        </CardContent>
      </Card>

      <ProfilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        params={params}
        vis={vis}
        mode={mode}
      />
    </div>
  )
}
