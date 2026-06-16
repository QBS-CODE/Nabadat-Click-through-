// src/pages/SettingsPage.tsx
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useDirection } from "@/hooks/use-direction"
import { Building2, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface Section {
  titleKey: string
  descKey: string
  icon: LucideIcon
  href: string
}

const SECTIONS: Section[] = [
  {
    titleKey: "settings.orgTitle",
    descKey: "settings.orgDesc",
    icon: Building2,
    href: "/settings/organization",
  },
  {
    titleKey: "settings.cjTitle",
    descKey: "settings.cjDesc",
    icon: SlidersHorizontal,
    href: "/settings/customer-journey",
  },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isRtl } = useDirection()
  const Chevron = isRtl ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-5 py-5 px-8">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("settings.sectionGroup")}
        </p>
        <Card className="overflow-hidden divide-y divide-border p-0">
          {SECTIONS.map((section) => (
            <button
              key={section.href}
              type="button"
              onClick={() => navigate(section.href)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-start cursor-pointer"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <section.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t(section.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(section.descKey)}</p>
              </div>
              <Chevron className="size-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}
