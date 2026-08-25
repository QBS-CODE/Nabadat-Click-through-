// SCR-01 Integrations list (T087, US3) — the create entry point and the table.
//
// FR-S1-03 columns: integration (name + credential kind / created date, or a "suspended" sub-line
// when inactive) · service channel chip · scenario badge · authentication badge · status ·
// endpoint path · row actions (View logs, Edit).
//
// Deliberately NOT here yet: the three stat tiles and the 24h traffic/error-rate columns
// (FR-S1-01/05/06) — those need request-log aggregates and land with US5 (T133). The shipped
// controller returns no stats block, so rendering tiles now would mean inventing numbers.

import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Activity,
  Plug,
  Code2,
  Eye,
  Frame,
  Inbox,
  KeyRound,
  Link2,
  Pencil,
  Plus,
  ScrollText,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useIntegrations } from "@/features/integration-hub/hooks/useIntegrations"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import { cn } from "@/lib/utils"

/**
 * One SCR-01 stat tile. The error-rate tile colours by the server-resolved band (FR-S1-06):
 * `d2` < 1% · `d3` 1–5% · `d4` > 5% · `none` when there is no traffic. Semantic D-tokens, never
 * brand colours — this is a status signal (Two-Palette Rule).
 */
function StatTile({
  testId,
  label,
  value,
  qualifier,
  badge,
  subText,
  band,
  loading,
}: {
  testId: string
  label: string
  value: string | undefined
  /** Muted text on the headline's baseline, e.g. "5 active" — supports the metric, never competes. */
  qualifier?: string
  /** Band label ("Healthy"/"Watch"/"Degraded"), tinted by `band`. */
  badge?: string
  subText: string | undefined
  band?: string
  loading: boolean
}) {
  const BAND_TEXT: Record<string, string> = {
    d2: "text-d2-dark dark:text-d2-light",
    d3: "text-d3-dark dark:text-d3-light",
    d4: "text-d4-dark dark:text-d4-light",
  }
  const BAND_BADGE: Record<string, string> = {
    d2: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
    d3: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
    d4: "bg-d4-light text-d4-dark dark:bg-d4-dark/25 dark:text-d4-light",
  }

  return (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          // The headline number, its qualifier, and any band badge share ONE baseline row. The old
          // tile crammed "69 / 67 active" into the 3xl slot, so the qualifier competed with the
          // metric instead of supporting it.
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={cn(
                "font-heading text-3xl font-bold tabular-nums",
                band ? (BAND_TEXT[band] ?? "text-foreground") : "text-foreground",
              )}
            >
              {value ?? "—"}
            </span>
            {qualifier && (
              <span className="text-sm font-medium text-muted-foreground">{qualifier}</span>
            )}
            {badge && (
              <Badge className={cn("translate-y-[-1px]", BAND_BADGE[band ?? ""] ?? "")}>
                {badge}
              </Badge>
            )}
          </div>
        )}
        <span className="text-xs text-muted-foreground">{subText ?? ""}</span>
      </CardContent>
    </Card>
  )
}

/** Design-system UI Label: small-caps, tracked, muted — the table-header treatment. */
const TH = "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground"

/** One icon per integration scenario, so the badge is scannable before the label is read. */
const SCENARIO_ICON: Record<string, LucideIcon> = {
  dispatch: Send,
  redirect_link: Link2,
  json_render: Code2,
  iframe_embed: Frame,
  response_ingestion: Inbox,
}

/** Row-level error-rate colour. The BAND comes from the server (FR-S1-06); this only paints it. */
const BAND_TEXT_ROW: Record<string, string> = {
  d2: "text-d2-dark dark:text-d2-light",
  d3: "text-d3-dark dark:text-d3-light",
  d4: "text-d4-dark dark:text-d4-light",
}

/**
 * "2 min ago" style last-activity label. `Intl.RelativeTimeFormat` so Arabic reads natively rather
 * than as a translated English template; `numeric: "auto"` yields "yesterday" over "1 day ago".
 */
function relativeTime(iso: string | null, locale: string): string {
  if (!iso) return "—"
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour")
  return rtf.format(-Math.round(hours / 24), "day")
}

export default function AllIntegrationsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const access = useIntegrationHubAccess()
  const canManage = access.canManage("integrations")
  const canViewLogs = access.canView("requestLogs")
  const {
    items,
    tiles,
    truncated,
    loading,
    error,
    search,
    setSearch,
    channel,
    setChannel,
    channelOptions,
    isFiltered,
    clearFilters,
    setActive,
    togglingId,
  } = useIntegrations()

  // US10 — Active ⇄ Inactive. Deactivating suspends the endpoint immediately, so the toast says
  // so rather than leaving the operator to infer it.
  async function handleToggle(id: string, name: string, active: boolean) {
    try {
      await setActive(id, active)
      toast.success(
        active
          ? t("integrationHub.integrations.activatedToast", { name })
          : t("integrationHub.integrations.deactivatedToast", { name }),
      )
    } catch {
      toast.error(t("integrationHub.integrations.toggleError"))
    }
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {t("integrationHub.integrations.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.integrations.description")}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {/* BR-24 — Request logs are P-07-exclusive (P-01 has NO grant, not read-only), so this
              route is offered only when the persona may actually reach the screen. */}
          {canViewLogs && (
            <Button
              variant="secondary"
              onClick={() => navigate("/integration-hub/logs")}
              data-testid="view-request-logs"
            >
              <ScrollText className="size-4" />
              {t("integrationHub.integrations.viewRequestLogs")}
            </Button>
          )}
          {/* FR-GBL-05 — P-01 gets Integrations read-only (BR-24), so no create control at all. */}
          {canManage && (
            <Button
              onClick={() => navigate("/integration-hub/integrations/new")}
              data-testid="new-integration"
            >
              <Plus className="size-4" />
              {t("integrationHub.integrations.newIntegration")}
            </Button>
          )}
        </div>
      </div>

      {/* FR-S1-01 — three stat tiles over the rolling 24h window. Every display string and the
          error-rate band come from the server, so the client never re-derives FR-S1-06. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          testId="tile-integrations"
          label={t("integrationHub.integrations.tileIntegrations")}
          value={tiles ? String(tiles.totalIntegrations) : undefined}
          qualifier={
            tiles
              ? t("integrationHub.integrations.tileActiveQualifier", {
                  n: tiles.activeIntegrations,
                })
              : undefined
          }
          subText={tiles?.integrationsSubText}
          loading={loading}
        />
        <StatTile
          testId="tile-requests"
          label={t("integrationHub.integrations.tileRequests")}
          value={tiles?.requests24hDisplay}
          subText={tiles?.requests24hSubText}
          loading={loading}
        />
        <StatTile
          testId="tile-error-rate"
          label={t("integrationHub.integrations.tileErrorRate")}
          value={tiles?.errorRateDisplay}
          subText={tiles?.errorRateSubText}
          band={tiles?.errorRateBand}
          badge={
            tiles && tiles.errorRateBand !== "neutral" && tiles.errorRateBand !== "none"
              ? t(`integrationHub.integrations.bands.${tiles.errorRateBand}`, {
                  defaultValue: "",
                })
              : undefined
          }
          loading={loading}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="integration-search">
            {t("integrationHub.integrations.searchLabel")}
          </Label>
          <Input
            id="integration-search"
            value={search}
            placeholder={t("integrationHub.integrations.searchPlaceholder")}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:w-56">
          <Label htmlFor="integration-channel-filter">
            {t("integrationHub.integrations.channelLabel")}
          </Label>
          <Select value={channel} onValueChange={(v) => setChannel(v ?? "all")}>
            <SelectTrigger
              id="integration-channel-filter"
              className="w-full"
              data-testid="channel-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("integrationHub.integrations.channelAll")}</SelectItem>
              {channelOptions.map((option) => (
                <SelectItem key={option.channelId} value={option.channelId}>
                  {option.name} — {option.channelId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isFiltered && (
          <div className="flex h-10 items-center">
            <Button variant="outline" onClick={clearFilters} data-testid="clear-filters">
              {t("integrationHub.integrations.clearFilters")}
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <h2 className="mb-2 text-lg font-bold">
            {t("integrationHub.integrations.errorTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.integrations.errorHint")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className={cn(TH, "w-[17%]")}>
                  {t("integrationHub.integrations.colIntegration")}
                </TableHead>
                <TableHead className={cn(TH, "w-[10%]")}>
                  {t("integrationHub.integrations.colChannel")}
                </TableHead>
                <TableHead className={cn(TH, "w-[15%]")}>
                  {t("integrationHub.integrations.colScenario")}
                </TableHead>
                <TableHead className={cn(TH, "w-[11%]")}>
                  {t("integrationHub.integrations.colAuth")}
                </TableHead>
                <TableHead className={cn(TH, "w-[12%]")}>
                  {t("integrationHub.integrations.colStatus")}
                </TableHead>
                <TableHead className={cn(TH, "w-[9%] text-end")}>
                  {t("integrationHub.integrations.colRequests")}
                </TableHead>
                <TableHead className={cn(TH, "w-[9%] text-end")}>
                  {t("integrationHub.integrations.colErrorRate")}
                </TableHead>
                <TableHead className={cn(TH, "w-[10%]")}>
                  {t("integrationHub.integrations.colLastActivity")}
                </TableHead>
                <TableHead className="w-[7%] pe-4 text-end">
                  <span className="sr-only">{t("integrationHub.integrations.colActions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Plug className="mb-4 size-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-bold">
                        {isFiltered
                          ? t("integrationHub.integrations.emptyFilteredTitle")
                          : t("integrationHub.integrations.emptyTitle")}
                      </h3>
                      <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {isFiltered
                          ? t("integrationHub.integrations.emptyFilteredHint")
                          : t("integrationHub.integrations.emptyHint")}
                      </p>
                      {isFiltered ? (
                        <Button variant="outline" onClick={clearFilters}>
                          {t("integrationHub.integrations.clearFilters")}
                        </Button>
                      ) : (
                        canManage && (
                          <Button onClick={() => navigate("/integration-hub/integrations/new")}>
                            <Plus className="size-4" />
                            {t("integrationHub.integrations.newIntegration")}
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                items.map((integration) => (
                  <TableRow
                    key={integration.id}
                    className="hover:bg-muted/50"
                    data-testid={`integration-row-${integration.id}`}
                  >
                    <TableCell>
                      <div className="flex min-w-0 flex-col items-start">
                        <span className="max-w-full truncate font-semibold">
                          {integration.name}
                        </span>
                        <span className="max-w-full truncate text-xs text-muted-foreground">
                          {t("integrationHub.integrations.rowMeta", {
                            kind: integration.credentialMechanism
                              ? t(
                                  `integrationHub.integrations.credentialKind.${integration.credentialMechanism}`,
                                )
                              : t("integrationHub.integrations.credentialKind.none"),
                            date: new Date(integration.createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }),
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code
                        dir="ltr"
                        className="inline-block rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                      >
                        {integration.channelId}
                      </code>
                    </TableCell>
                    <TableCell>
                      {/* Brand cyan, never mint — mint reads as the D2 "Good" semantic state. */}
                      <Badge className="max-w-full gap-1.5 bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                        {(() => {
                          const Icon = SCENARIO_ICON[integration.scenario] ?? Send
                          return <Icon className="size-3.5 shrink-0" />
                        })()}
                        <span className="truncate">
                          {t(`integrationHub.scenarios.${integration.scenario}.label`)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {integration.credentialMechanism ? (
                        <Badge variant="outline" className="max-w-full gap-1.5">
                          {integration.credentialMechanism === "oauth_client" ? (
                            <ShieldCheck className="size-3.5 shrink-0" />
                          ) : (
                            <KeyRound className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">
                            {t(
                              `integrationHub.wizard.mechanisms.${integration.credentialMechanism}.label`,
                            )}
                          </span>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* FR-GBL-05 — the toggle is a manage action; P-01 sees the badge only. */}
                        {canManage && (
                          <Switch
                            checked={integration.active}
                            disabled={togglingId === integration.id}
                            aria-label={t("integrationHub.integrations.toggleFor", {
                              name: integration.name,
                            })}
                            data-testid={`status-toggle-${integration.id}`}
                            onCheckedChange={(checked) =>
                              void handleToggle(integration.id, integration.name, checked === true)
                            }
                          />
                        )}
                        {integration.active ? (
                          <Badge
                            className="bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light"
                            data-testid={`status-badge-${integration.id}`}
                          >
                            {t("integrationHub.integrations.statusActive")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                            data-testid={`status-badge-${integration.id}`}
                          >
                            {t("integrationHub.integrations.statusInactive")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {/* FR-S1-03 — shipped by T130 and previously unrendered. The error-rate band is
                        server-computed (FR-S1-06); the client only paints it. */}
                    <TableCell className="text-end tabular-nums">
                      {integration.traffic.requests24h.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-end font-medium tabular-nums",
                        BAND_TEXT_ROW[integration.traffic.errorRateBand] ?? "text-muted-foreground",
                      )}
                    >
                      {integration.traffic.errorRateDisplay}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {relativeTime(integration.traffic.lastActivityAt, i18n.language)}
                    </TableCell>
                    <TableCell className="w-[7%] pe-4">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* BR-24 — P-01 has no log grant at all, so don't offer a dead link. */}
                        {canViewLogs && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={t("integrationHub.integrations.viewLogs")}
                            title={t("integrationHub.integrations.viewLogs")}
                            data-testid={`logs-${integration.id}`}
                            onClick={() => navigate("/integration-hub/logs")}
                          >
                            <Activity className="size-4" />
                          </Button>
                        )}
                        {/* No delete action exists, ever (Status Lifecycle table). Edit is a
                            manage action, so P-01 sees View instead — same route, read-only. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={
                            canManage
                              ? t("integrationHub.integrations.edit")
                              : t("integrationHub.integrations.view")
                          }
                          title={
                            canManage
                              ? t("integrationHub.integrations.edit")
                              : t("integrationHub.integrations.view")
                          }
                          data-testid={canManage ? `edit-${integration.id}` : `view-${integration.id}`}
                          onClick={() =>
                            navigate(`/integration-hub/integrations/${integration.id}`)
                          }
                        >
                          {canManage ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {truncated && (
        <p className="text-sm text-muted-foreground">
          {t("integrationHub.integrations.truncated")}
        </p>
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("integrationHub.integrations.footerNote")}
      </p>
    </div>
  )
}
