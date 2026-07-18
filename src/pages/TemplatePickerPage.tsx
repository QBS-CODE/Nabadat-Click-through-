import { useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, ArrowLeft, Search, LayoutTemplate, Lock, Eye, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { useDirection } from "@/hooks/use-direction"
import { MOCK_TEMPLATES } from "@/data/mock-surveys"
import { INDUSTRY_OPTIONS } from "@/types/survey"
import type { TemplateClass } from "@/types/survey"

const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  Banking:            { ar: "البنوك", en: "Banking" },
  Telecommunications: { ar: "الاتصالات", en: "Telecom" },
  Government:         { ar: "الحكومة", en: "Government" },
  Automotive:         { ar: "السيارات", en: "Automotive" },
  Entertainment:      { ar: "الترفيه", en: "Entertainment" },
  Services:           { ar: "الخدمات", en: "Services" },
}

export default function TemplatePickerPage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { isRtl } = useDirection()
  const isAr = i18n.language === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const [search, setSearch] = useState("")
  const [sector, setSector] = useState("all")
  const [templateClass, setTemplateClass] = useState<"all" | TemplateClass>("all")

  const filtered = MOCK_TEMPLATES.filter((t) => {
    const name = isAr ? t.nameAr : t.nameEn
    const hay = `${name} ${(t.tags ?? []).join(" ")}`.toLowerCase()
    if (search && !hay.includes(search.toLowerCase())) return false
    if (sector !== "all" && !t.sectors.includes(sector)) return false
    if (templateClass !== "all" && t.templateClass !== templateClass) return false
    return true
  })
  // Customized (Tenant) templates first, then Built-in (Platform) — matches the reference.
  .sort((a, b) => (a.templateClass === "Tenant" ? 0 : 1) - (b.templateClass === "Tenant" ? 0 : 1))

  return (
    <div className="space-y-5 py-5 px-8">
      <p className="text-xs text-muted-foreground">{isAr ? "الاستبيانات › اختر قالباً" : "Surveys › Choose template"}</p>

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className="size-9 mt-0.5 shrink-0"
          onClick={() => navigate("/surveys/new")}
          aria-label={isAr ? "العودة" : "Back"}
        >
          <BackIcon className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-bold">
            {isAr ? "اختر قالباً" : "Choose a Template"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isAr
              ? "صفِّ حسب قطاع عملك، ثم اختر قالباً لبدء الاستبيان منه."
              : "Filter by your business sector, then pick a template to start the survey from."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث عن قالب..." : "Search templates…"}
            className="ps-9"
          />
        </div>
        <Select
          value={templateClass}
          onValueChange={(v) => setTemplateClass((v ?? "all") as "all" | TemplateClass)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>{templateClass === "all" ? (isAr ? "جميع الأنواع" : "All Types") : templateClass === "Platform" ? (isAr ? "جاهز" : "Built-in") : (isAr ? "مخصص" : "Customized")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع الأنواع" : "All Types"}</SelectItem>
            <SelectItem value="Platform">{isAr ? "جاهز" : "Built-in"}</SelectItem>
            <SelectItem value="Tenant">{isAr ? "مخصص" : "Customized"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sector} onValueChange={(v) => setSector(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>{sector === "all" ? (isAr ? "جميع القطاعات" : "All Sectors") : (isAr ? INDUSTRY_OPTIONS.find((o) => o.value === sector)?.labelAr : INDUSTRY_OPTIONS.find((o) => o.value === sector)?.labelEn) ?? sector}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع القطاعات" : "All Sectors"}</SelectItem>
            {INDUSTRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {isAr ? o.labelAr : o.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutTemplate className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">
            {isAr ? "لا توجد قوالب" : "No templates found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isAr
              ? "جرّب تعديل معايير البحث أو اختر قطاعاً مختلفاً"
              : "Try adjusting your filters or select a different sector"}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => { setSector("all"); setSearch("") }}
          >
            {isAr ? "إظهار جميع القوالب" : "Show all templates"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const name = isAr ? t.nameAr : t.nameEn
            const isBuiltIn = t.templateClass === "Platform"
            // Sectors for Built-in; #tags for Customized — matches the Templates-tab card.
            const chips = isBuiltIn
              ? t.sectors.map((s) => ({ key: s, label: isAr ? SECTOR_LABELS[s]?.ar ?? s : SECTOR_LABELS[s]?.en ?? s }))
              : (t.tags ?? []).map((tg) => ({ key: tg, label: `#${tg}` }))

            return (
              <div
                key={t.id}
                className="flex flex-col rounded-lg border border-border bg-card p-5 gap-3 hover:shadow-md transition-shadow duration-150"
              >
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

                {/* Title */}
                <h3 className="font-bold text-base text-foreground leading-snug">{name}</h3>

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
                  <span>{isAr ? `${t.questionCount} أسئلة` : `${t.questionCount} questions`}</span>
                  <span>
                    {isAr
                      ? `مستخدم في ${t.usedBySurveys} استبيان`
                      : `Used by ${t.usedBySurveys} survey${t.usedBySurveys === 1 ? "" : "s"}`}
                  </span>
                </div>

                {/* Actions: use this template (→ survey details) + preview (→ design preview) */}
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1 bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
                    onClick={() => navigate(`/surveys/new/from-template/${t.id}`)}
                  >
                    <Check className="size-4" />
                    {isAr ? "استخدم هذا القالب" : "Use this template"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label={isAr ? "معاينة استبيان القالب" : "Preview this template's survey"}
                    onClick={() => navigate(`/surveys/new/from-template/${t.id}`, { state: { preview: true } })}
                  >
                    <Eye className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {isAr
            ? `عرض ${filtered.length} من ${MOCK_TEMPLATES.length} قالب`
            : `Showing ${filtered.length} of ${MOCK_TEMPLATES.length} templates`}
        </p>
      )}
    </div>
  )
}
