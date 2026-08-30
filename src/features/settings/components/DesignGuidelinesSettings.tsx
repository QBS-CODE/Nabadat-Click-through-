import { useEffect, useState, type CSSProperties } from "react"
import { toast } from "sonner"
import { Info, Eye } from "lucide-react"

import { useDirection } from "@/hooks/use-direction"
import { useSettings } from "@/contexts/settings-context"
import { SurveyDesignControls } from "@/components/surveys/SurveyDesignControls"
import {
  type SurveyTheme, radiusPx, fontFamily, surveyBackground,
} from "@/lib/survey-theme"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Settings › Design Guidelines ─────────────────────────────────────────────
// The tenant's org-wide brand system. Every survey inherits it by default; an
// author may override tokens for a single survey in the builder (M-01 · Appearance).
// Reuses the survey builder's SurveyDesignControls (same accordion field set) and
// pairs it with a wide, sticky live preview.

// ── Wide themed survey preview (reflects the theme tokens) ────────────────────
function SurveyThemePreview({ theme, isAr }: { theme: SurveyTheme; isAr: boolean }) {
  const cardRadius = radiusPx(theme.radius)
  const btnRadius = radiusPx(theme.btnRadius)

  const stageStyle: CSSProperties = { background: surveyBackground(theme) }
  const bodyStyle: CSSProperties = {
    color: theme.textColor,
    fontFamily: fontFamily(theme.bodyFont),
    fontSize: `${theme.bodySize}px`,
    lineHeight: theme.lineHeight,
  }
  const headingStyle: CSSProperties = {
    fontFamily: fontFamily(theme.headingFont),
    fontSize: `${Number(theme.headingSize) + 3}px`,
    fontWeight: 700,
  }

  const scale = [1, 2, 3, 4, 5]
  const heading = isAr ? "كيف تقيّم تجربتك العامة معنا؟" : "How satisfied were you with your visit?"
  const submit = isAr ? "إرسال" : "Submit"
  const wordmark = isAr ? "بنك نبضات" : "Nabadat Bank"

  return (
    <div
      className="overflow-hidden rounded-lg border border-border shadow-md dark:shadow-none"
      style={{ background: theme.card }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2">
        <span className="size-2.5 rounded-full bg-nb-stone-lt" />
        <span className="size-2.5 rounded-full bg-nb-stone-lt" />
        <span className="size-2.5 rounded-full bg-nb-stone-lt" />
        <span className="ms-2 text-[11px] text-muted-foreground">survey.nabadat.app</span>
      </div>

      {/* Themed survey stage */}
      <div className="p-5" style={stageStyle}>
        <div className="mx-auto max-w-md" style={bodyStyle}>
          <div
            className="p-5"
            style={{ background: theme.card, borderRadius: cardRadius, border: `1px solid ${theme.border}` }}
          >
            {/* Header */}
            {(theme.showLogo || theme.showTitle) && (
              <div
                className={cn(
                  "mb-4 flex items-center gap-2.5",
                  theme.headerAlign === "center" && "justify-center",
                )}
              >
                {theme.showLogo &&
                  (theme.logo ? (
                    <img src={theme.logo} alt="" className="size-8 rounded-md object-contain" />
                  ) : (
                    <span
                      className="size-8 rounded-md"
                      style={{ background: "linear-gradient(135deg,#1EC99A,#00B4D8)" }}
                    />
                  ))}
                {theme.showTitle && <b style={headingStyle}>{wordmark}</b>}
              </div>
            )}

            {/* Progress */}
            {theme.progress === "bar" && (
              <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: theme.border }}>
                <span className="block h-full w-2/5" style={{ background: theme.primary }} />
              </div>
            )}
            {theme.progress === "steps" && (
              <div className="mb-4 flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: i < 2 ? theme.primary : theme.border }}
                  />
                ))}
              </div>
            )}

            {/* Question */}
            <h5 className="mb-3" style={headingStyle}>{heading}</h5>
            <div className="mb-5 flex gap-2">
              {scale.map((n) => {
                const on = n === 4
                return (
                  <span
                    key={n}
                    className="grid size-9 place-items-center text-sm font-semibold"
                    style={{
                      borderRadius: btnRadius,
                      border: `1.5px solid ${on ? "transparent" : theme.border}`,
                      background: on ? theme.primary : "transparent",
                      color: on ? theme.buttonText : theme.textColor,
                    }}
                  >
                    {n}
                  </span>
                )
              })}
            </div>

            {/* CTA */}
            <button
              type="button"
              className="w-full py-2.5 text-sm font-semibold"
              style={{
                borderRadius: btnRadius,
                background: theme.buttonColor,
                color: theme.buttonText,
                border: `1px solid ${theme.btnBorder}`,
              }}
            >
              {submit}
            </button>

            {/* Footer */}
            {theme.footerText && (
              <p
                className="mt-4 border-t pt-3 text-center text-[11px]"
                style={{ borderColor: theme.border, color: theme.textColor, opacity: 0.6 }}
              >
                {theme.footerText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DesignGuidelinesSettings() {
  const { isRtl } = useDirection()
  const { designConfig, saveDesign } = useSettings()
  const t = (en: string, ar: string) => (isRtl ? ar : en)

  const [theme, setTheme] = useState<SurveyTheme>(designConfig)
  useEffect(() => setTheme(designConfig), [designConfig])

  const setKey = <K extends keyof SurveyTheme>(k: K, v: SurveyTheme[K]) =>
    setTheme((prev) => ({ ...prev, [k]: v }))

  const dirty = JSON.stringify(theme) !== JSON.stringify(designConfig)

  const handleSave = () => {
    saveDesign(theme)
    toast.success(
      t("Design guidelines saved — inherited by all surveys", "حُفظت إرشادات التصميم — ترثها جميع الاستبيانات"),
    )
  }

  return (
    <div className="space-y-4">
      {/* Inheritance note */}
      <div className="flex gap-2.5 rounded-md border border-border bg-accent px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary" />
        <span>
          {t(
            "These Design Guidelines are the organization's brand system. Every survey inherits them by default; an author may unlock ",
            "هذه الإرشادات هي نظام العلامة التجارية للمؤسسة. ترثها جميع الاستبيانات افتراضياً؛ ويمكن للمُنشئ فتح ",
          )}
          <b className="text-foreground">
            {t('"Customize this survey"', "«تخصيص هذا الاستبيان»")}
          </b>
          {t(
            " in the builder to override tokens for a single survey.",
            " في المُنشئ لتجاوز القيم لاستبيان واحد.",
          )}
        </span>
      </div>

      {/* Controls (survey builder) + wide live preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(360px,420px)] lg:items-start">
        <SurveyDesignControls
          isAr={isRtl}
          theme={theme}
          mode="customized"
          onModeChange={() => {}}
          onChange={setKey}
          hideModeCards
        />

        <div className="lg:sticky lg:top-16 space-y-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Eye className="size-3.5" />
            {t("Live preview", "معاينة حيّة")}
          </p>
          <SurveyThemePreview theme={theme} isAr={isRtl} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "Reflects the tokens on the left. Individual surveys can override them in the builder.",
              "يعكس القيم على اليسار. يمكن للاستبيانات الفردية تجاوزها في المُنشئ.",
            )}
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" disabled={!dirty} onClick={() => setTheme(designConfig)}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button
          disabled={!dirty}
          onClick={handleSave}
          className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
        >
          {t("Save changes", "حفظ التغييرات")}
        </Button>
      </div>
    </div>
  )
}
