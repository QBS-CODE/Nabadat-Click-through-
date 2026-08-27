import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router"
import { usePersona } from "@/contexts/persona-context"
import { useDirection } from "@/hooks/use-direction"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquareText,
  Send,
  Zap,
  BarChart3,
  Clock,
  RefreshCcw,
  Target,
  Map,
  Sparkles,
  Users,
  Gauge,
  Settings,
  Plug,
  ScrollText,
  Building2,
  Table2,
  ArrowLeftRight,
  Contact,
  UserCog,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  key: string
  labelKey: string
  icon: LucideIcon
  href: string
  phase2?: boolean
}

interface NavGroup {
  groupKey: string
  items: NavItem[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    groupKey: "cx.navOverview",
    items: [
      { key: "dashboard", labelKey: "cx.navDashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    groupKey: "cx.navListening",
    items: [
      { key: "surveys", labelKey: "cx.navSurveys", icon: ClipboardList, href: "/surveys" },
      { key: "feedback", labelKey: "cx.navFeedback", icon: MessageSquareText, href: "/feedback" },
      { key: "distribution", labelKey: "cx.navDistribution", icon: Send, href: "/distribution" },
      { key: "sending_rules", labelKey: "cx.navSendingRules", icon: Zap, href: "/sending-rules" },
    ],
  },
  {
    groupKey: "cx.navAnalytics",
    items: [
      { key: "analytics", labelKey: "cx.navAnalyticsReports", icon: BarChart3, href: "/analytics" },
      { key: "post_expiry", labelKey: "cx.navPostExpiry", icon: Clock, href: "/surveys/post-expiry" },
      { key: "ai_insights", labelKey: "cx.navAiInsights", icon: Sparkles, href: "#", phase2: true },
    ],
  },
  {
    groupKey: "cx.navAction",
    items: [
      { key: "closed_loop", labelKey: "cx.navClosedLoop", icon: RefreshCcw, href: "/closed-loop" },
      { key: "actions", labelKey: "cx.navActions", icon: Target, href: "/actions" },
    ],
  },
  {
    groupKey: "cx.navCustomers",
    items: [
      { key: "journey", labelKey: "cx.navJourney", icon: Map, href: "/journeys" },
      { key: "profiles", labelKey: "cx.navProfiles", icon: Users, href: "#", phase2: true },
    ],
  },
  {
    groupKey: "cx.navPlatform",
    items: [
      { key: "kpi_management", labelKey: "cx.navKpiManagement", icon: Gauge, href: "/kpi-management" },
      { key: "settings", labelKey: "cx.navSettings", icon: Settings, href: "/settings" },
    ],
  },
  {
    // Customer Profile (M-03) — the Audience group. Customers list + tenant Profile Setup.
    groupKey: "cx.navAudience",
    items: [
      { key: "m03_customers", labelKey: "cx.navCustomers", icon: Contact, href: "/customers" },
      { key: "m03_setup", labelKey: "cx.navProfileSetup", icon: UserCog, href: "/profile-setup" },
    ],
  },
  {
    // Integration Hub (M-13) — inbound integration edge. P-07 (Tenant IT Admin) owns
    // integrations + request logs; P-01 (CX Manager) sees integrations read-only but not logs.
    groupKey: "cx.navIntegrationHub",
    items: [
      { key: "ih_integrations", labelKey: "cx.navIntegrations", icon: Plug, href: "/integration-hub/integrations" },
      { key: "ih_logs", labelKey: "cx.navRequestLogs", icon: ScrollText, href: "/integration-hub/logs" },
    ],
  },
  {
    // Integration Hub → data model (FR-GBL). Owned by P-01 (CX Manager).
    groupKey: "cx.navDataModel",
    items: [
      { key: "ih_channels", labelKey: "cx.navServiceChannels", icon: Building2, href: "/integration-hub/service-channels" },
      { key: "ih_parameters", labelKey: "cx.navParameters", icon: Table2, href: "/integration-hub/parameters" },
      { key: "ih_mappings", labelKey: "cx.navParameterMappings", icon: ArrowLeftRight, href: "/integration-hub/mappings" },
    ],
  },
]

const ROLE_NAV_KEYS: Record<string, string[]> = {
  cx_manager: ["dashboard", "surveys", "feedback", "distribution", "sending_rules", "analytics", "post_expiry", "ai_insights", "closed_loop", "actions", "journey", "profiles", "kpi_management", "settings", "ih_integrations", "ih_logs", "ih_channels", "ih_parameters", "ih_mappings", "m03_customers", "m03_setup"],
  analyst: ["dashboard", "surveys", "feedback", "analytics", "post_expiry", "ai_insights", "journey", "profiles", "m03_customers"],
  tenant_admin: ["dashboard", "surveys", "feedback", "distribution", "sending_rules", "analytics", "post_expiry", "ai_insights", "closed_loop", "actions", "journey", "profiles", "kpi_management", "settings", "ih_integrations", "ih_logs", "ih_channels", "ih_parameters", "ih_mappings", "m03_customers"],
  executive: ["dashboard", "analytics", "journey", "actions"],
  frontline: ["dashboard", "closed_loop"],
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const navigate = useNavigate()
  const location = useLocation()
  const { persona } = usePersona()
  const allowedKeys = ROLE_NAV_KEYS[persona.id] ?? ROLE_NAV_KEYS.cx_manager

  return (
    <Sidebar collapsible="icon" side={isRtl ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">
            ن
          </div>
          <span className="font-heading font-bold text-sm group-data-[collapsible=icon]:hidden">
            {t("common.appName")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_ITEMS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            allowedKeys.includes(item.key),
          )
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.groupKey}>
              <SidebarGroupLabel>{t(group.groupKey)}</SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "#" &&
                      item.href !== "/dashboard" &&
                      location.pathname.startsWith(item.href + "/")) ||
                    (item.href === "/dashboard" && location.pathname === "/")
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={t(item.labelKey)}
                        onClick={() => {
                          if (!item.phase2) navigate(item.href)
                        }}
                        className={cn(
                          item.phase2 && "opacity-40 cursor-default",
                        )}
                      >
                        <Icon className="size-4" />
                        <span>{t(item.labelKey)}</span>
                      </SidebarMenuButton>
                      {item.phase2 && (
                        <SidebarMenuBadge className="text-[9px] opacity-50">
                          {t("cx.comingSoon")}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
            {t("cx.userFullName")[0]}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium truncate">{t("cx.userFullName")}</p>
            <p className="text-[10px] text-muted-foreground truncate">{t("cx.userRole")}</p>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
