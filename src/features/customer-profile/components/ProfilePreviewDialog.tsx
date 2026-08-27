// SCR-M03-06 — Profile Preview (a wide, read-only dialog).
//
// Renders the customer profile *exactly as a CX manager will see it*, honouring the LIVE
// visibility state (`vis`) the manager is editing on SCR-M03-03. It reuses the very same
// <CustomerProfileView> the profile page renders, so the preview cannot drift from what
// publishing would produce — a truthful preview, not a decorative one (prototype
// `renderPreview`, which clones the live profile node rather than re-describing it).
//
// The dialog chrome adds a summary-stats strip + info note computed from the live setup,
// and a caution listing every visibility item currently switched off.

import { EyeOff, Info } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useDirection } from "@/hooks/use-direction"
import {
  CATS,
  type Category,
  type DLevel,
  EXISTING_PROFILES,
  type Lang,
  pick,
  type ValueRule,
  type VisState,
  VIS_GROUPS,
} from "@/features/customer-profile/data"
import { CustomerProfileView } from "@/features/customer-profile/components/CustomerProfileView"

/** The working profile-field shape the setup screen edits and the preview reads. */
export interface WorkingParam {
  code: string
  type: string
  cat: Category["key"]
  on: boolean
  locked: boolean
  rule: ValueRule
  pii: boolean
  secret?: string
  ar: string
  en: string
  sAr?: string
  sEn?: string
  justAdded?: boolean
}

/** D-scale semantic badge — pale fill + deep text in light, soft tint + light text in dark. */
export const D_BADGE: Record<DLevel, string> = {
  d1: "bg-d1-light text-d1-dark dark:bg-d1-dark/25 dark:text-d1-light",
  d2: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  d3: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  d4: "bg-d4-light text-d4-dark dark:bg-d4-dark/25 dark:text-d4-light",
  d5: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
}

export function pname(pm: WorkingParam, lang: Lang): string {
  return lang === "ar" ? pm.ar : pm.en
}

interface ProfilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  params: WorkingParam[]
  vis: VisState
  mode: "edit" | "first"
}

export function ProfilePreviewDialog({
  open,
  onOpenChange,
  params,
  vis,
  mode,
}: ProfilePreviewDialogProps) {
  const { lang: rawLang } = useDirection()
  const lang: Lang = rawLang === "ar" ? "ar" : "en"

  const included = params.filter((pm) => pm.on && pm.code && pm.cat)

  // Every visibility item currently switched off — surfaced as a caution so the manager sees
  // exactly what the profile will NOT show (prototype `renderPreview` hidden[]).
  const hidden: string[] = []
  VIS_GROUPS.forEach((grp) => {
    grp.items.forEach((it) => {
      if (!vis[grp.g][it.k]) hidden.push(pick(lang, it.ar, it.en))
    })
  })

  const sums: [string, string][] = [
    [String(included.length), pick(lang, "معلومة في الملف", "fields in the profile")],
    [
      String(CATS.filter((c) => included.some((pm) => pm.cat === c.key)).length),
      pick(lang, "تصنيفاً مستخدماً", "categories used"),
    ],
    [
      String(included.filter((pm) => pm.rule === "all").length),
      pick(lang, "معلومة متراكمة", "accumulating"),
    ],
    [String(included.filter((pm) => pm.pii).length), pick(lang, "بيانات شخصية", "personal data")],
  ]

  const sub =
    mode === "edit"
      ? pick(
          lang,
          `سيسري هذا على ${EXISTING_PROFILES.toLocaleString("en-US")} ملفاً بعد النشر.`,
          `This will apply to ${EXISTING_PROFILES.toLocaleString("en-US")} profiles once published.`,
        )
      : pick(lang, "بيانات تجريبية — لا ملفات بعد.", "Sample data — no profiles yet.")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-[1180px]">
        <DialogHeader className="shrink-0 gap-1 border-b border-border p-4">
          <DialogTitle className="text-base font-bold">
            {pick(lang, "معاينة ملف العميل", "Customer profile preview")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">{sub}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Hidden-items caution */}
          {hidden.length > 0 && (
            <div className={cn("flex gap-2 rounded-md p-3 text-sm", D_BADGE.d3)}>
              <EyeOff className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-bold">
                  {pick(
                    lang,
                    `مخفي عن الملف: ${hidden.length} عنصراً`,
                    `${hidden.length} item(s) hidden from the profile`,
                  )}
                </div>
                <p className="mt-1 leading-relaxed">{hidden.join(pick(lang, "، ", ", "))}</p>
              </div>
            </div>
          )}

          {/* Summary stats — computed from the live setup */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sums.map(([v, k]) => (
              <div key={k} className="rounded-md border border-border bg-muted/30 p-3 text-center">
                <div className="font-heading text-2xl font-bold tabular-nums">{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0" />
            <span className="leading-relaxed">
              {pick(
                lang,
                "هذه الصفحة كما سيراها مدير التجربة. القيم تجريبية والعناصر معطّلة.",
                "The page exactly as a CX manager will see it. Values are samples and controls are inactive.",
              )}
            </span>
          </div>

          {/* The live profile clone (read-only), honouring the current visibility state */}
          <div className="rounded-lg border border-dashed border-primary/40 bg-background p-4">
            <CustomerProfileView preview vis={vis} params={params} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
