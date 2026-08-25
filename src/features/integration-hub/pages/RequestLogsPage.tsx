// SCR-08 Request Logs (T134, US5) — the investigation screen.
//
// FR-S8-01  status-class chips + integration select + time window, AND-combined, with per-chip
//           counts scoped to the window (all filtering is server-side)
// FR-S8-02  expandable rows showing every parameter received and the full response returned
// FR-S8-03  PII masked in list, detail and export alike — masking is done server-side, so the
//           client never holds an unmasked value to leak
// FR-S8-04  export of exactly the current filtered view
// AC-S8-03  auth-rejected requests show the "rejected before parameter parsing" notice instead
//           of a parameters table
//
// BR-24: this screen is P-07-exclusive — P-01 has NO log grant at all, unlike every other M-13
// screen's cross-persona read-only pattern. The sidebar hides it; a direct URL lands on the
// access-denied state (T148), and the server independently 403s regardless.

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronRight, Download, Loader2, ScrollText, Code2, EyeOff, Frame, Inbox, Link2, Send, type LucideIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AccessDenied } from "@/features/integration-hub/components/AccessDenied"
import { useIntegrationHubAccess } from "@/features/integration-hub/hooks/useIntegrationHubAccess"
import { useIntegrations } from "@/features/integration-hub/hooks/useIntegrations"
import { useRequestLogs } from "@/features/integration-hub/hooks/useRequestLogs"
import type { LogStatusClass, LogWindow, RequestLog } from "@/features/integration-hub/api"

/** Design-system UI Label — the table-header treatment. */
const LOG_TH = "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground"

/** One icon per scenario, mirroring SCR-01 and the wizard. */
const SCENARIO_ICON: Record<string, LucideIcon> = {
  dispatch: Send,
  redirect_link: Link2,
  json_render: Code2,
  iframe_embed: Frame,
  response_ingestion: Inbox,
}

const STATUS_CHIPS: LogStatusClass[] = ["all", "success", "client_error", "server_error"]
const WINDOWS: LogWindow[] = ["last_hour", "24h", "7d", "30d"]

/** Colours the HTTP status by class — a status signal, so semantic D-tokens (Two-Palette Rule). */
function statusBadgeClass(httpStatus: number): string {
  if (httpStatus < 400) return "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light"
  if (httpStatus < 500) return "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light"
  return "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light"
}

/** The expanded detail: parameters received + the full response returned (FR-S8-02). */
function LogDetail({ log }: { log: RequestLog }) {
  const { t } = useTranslation()
  const parameters = log.parametersReceived

  // Render the response as key/value rows when it is a flat object (the reference layout — http,
  // code, request_id, message), falling back to raw JSON only for a non-object body.
  const responseEntries =
    log.responseReturned && typeof log.responseReturned === "object" && !Array.isArray(log.responseReturned)
      ? Object.entries(log.responseReturned as Record<string, unknown>)
      : null

  return (
    // Two columns (reference): parameters received on the start, response returned on the end.
    <div className="grid gap-6 bg-muted/30 p-4 lg:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("integrationHub.requestLogs.parametersTitle")}
        </h3>
        {parameters.rejectedBeforeParameterParsing ? (
          // AC-S8-03 — rejected before parsing: show the notice, never partial or garbled data.
          <p className="text-sm text-muted-foreground" data-testid="rejected-notice">
            {parameters.notice ?? t("integrationHub.requestLogs.rejectedNotice")}
          </p>
        ) : parameters.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.requestLogs.noParameters")}
          </p>
        ) : (
          // A key/value ledger, not boxed cards: matches the reference's dense two-column read.
          <dl className="divide-y divide-border rounded-md border border-border bg-card">
            {parameters.items.map((parameter) => (
              <div
                key={parameter.apiField}
                className="grid grid-cols-[minmax(0,10rem)_1fr] items-baseline gap-3 px-3 py-2"
                data-testid={`log-param-${parameter.apiField}`}
              >
                <dt className="flex items-center gap-2 min-w-0">
                  <code dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
                    {parameter.apiField}
                  </code>
                  {/* BR-14 — an unregistered key is accepted and stored, visible only here. */}
                  {!parameter.registered && (
                    <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
                      {t("integrationHub.requestLogs.unregistered")}
                    </Badge>
                  )}
                </dt>
                <dd dir="ltr" className="font-mono text-xs break-all">
                  {parameter.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("integrationHub.requestLogs.responseTitle")}
        </h3>
        {responseEntries ? (
          <dl
            className="divide-y divide-border rounded-md border border-border bg-card"
            data-testid="log-response"
          >
            {responseEntries.map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[minmax(0,10rem)_1fr] items-baseline gap-3 px-3 py-2"
              >
                <dt dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
                  {key}
                </dt>
                <dd dir="ltr" className="font-mono text-xs break-all">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <pre
            dir="ltr"
            data-testid="log-response"
            className="max-h-64 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-xs"
          >
            {JSON.stringify(log.responseReturned, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export default function RequestLogsPage() {
  const { t } = useTranslation()
  const access = useIntegrationHubAccess()
  const {
    items,
    counts,
    loading,
    error,
    forbidden,
    statusClass,
    setStatusClass,
    integrationId,
    setIntegrationId,
    window: timeWindow,
    setWindow,
    hasMore,
    loadMore,
    loadingMore,
    exportCurrentView,
    exporting,
  } = useRequestLogs()
  // The integration select's options — the list endpoint is P-01-readable too, so this is safe.
  const { items: integrations } = useIntegrations()
  const [expanded, setExpanded] = useState<string | null>(null)

  // T148 — direct-route hit without the view grant. Checked before any render of the screen.
  // Wait for the session before refusing: `persona` is undefined during hydration, so an
  // unguarded check denies a permitted persona on any hard refresh (see `ready`'s note).
  if (!access.ready) {
    return (
      <div className="space-y-5 py-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!access.canView("requestLogs") || forbidden) {
    return <AccessDenied screenName={t("integrationHub.requestLogs.title")} />
  }

  const chipCount = (chip: LogStatusClass): number => {
    switch (chip) {
      case "success":
        return counts.success
      case "client_error":
        return counts.clientError
      case "server_error":
        return counts.serverError
      default:
        return counts.all
    }
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">
            {t("integrationHub.requestLogs.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("integrationHub.requestLogs.description")}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={exporting || items.length === 0}
          data-testid="export-logs"
          onClick={() => void exportCurrentView()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {t("integrationHub.requestLogs.export")}
        </Button>
      </div>

      {/* FR-S8-03 — masking + retention are stated up front, not discovered. */}
      <Alert>
        <EyeOff className="size-4" />
        <AlertDescription className="text-xs leading-relaxed">
          {t("integrationHub.requestLogs.maskingNotice")}
        </AlertDescription>
      </Alert>

      {/* FR-S8-01 — status chips + the two selects on ONE row (reference): chips start-side,
          Integration + Time window end-side. All three filters AND-combine. The selects carry no
          visible label here — the chosen value ("All integrations" / "Last 24 hours") is the label,
          same as the reference — so the row stays one line. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => (
            <Button
              key={chip}
              variant={statusClass === chip ? "default" : "outline"}
              size="compact"
              data-testid={`chip-${chip}`}
              onClick={() => setStatusClass(chip)}
            >
              {t(`integrationHub.requestLogs.status.${chip}`)}
              <span className="ms-2 tabular-nums opacity-80">{chipCount(chip)}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <Label htmlFor="log-integration" className="sr-only">
              {t("integrationHub.requestLogs.integrationLabel")}
            </Label>
            <Select
              value={integrationId ?? "all"}
              onValueChange={(v) => setIntegrationId(!v || v === "all" ? undefined : v)}
            >
              <SelectTrigger id="log-integration" className="w-full" data-testid="integration-filter">
                <SelectValue>
                  {integrationId
                    ? (integrations.find((i) => i.id === integrationId)?.name ??
                      t("integrationHub.requestLogs.integrationAll"))
                    : t("integrationHub.requestLogs.integrationAll")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("integrationHub.requestLogs.integrationAll")}
                </SelectItem>
                {integrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:w-44">
            <Label htmlFor="log-window" className="sr-only">
              {t("integrationHub.requestLogs.windowLabel")}
            </Label>
            <Select value={timeWindow} onValueChange={(v) => setWindow((v ?? "24h") as LogWindow)}>
              <SelectTrigger id="log-window" className="w-full" data-testid="window-filter">
                <SelectValue>{t(`integrationHub.requestLogs.window.${timeWindow}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((w) => (
                  <SelectItem key={w} value={w} data-testid={`window-${w}`}>
                    {t(`integrationHub.requestLogs.window.${w}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center shadow-sm dark:shadow-none">
          <h2 className="mb-2 text-lg font-bold">{t("integrationHub.requestLogs.errorTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("integrationHub.requestLogs.errorHint")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className={LOG_TH}>{t("integrationHub.requestLogs.colTime")}</TableHead>
                <TableHead className={LOG_TH}>
                  {t("integrationHub.requestLogs.colIntegration")}
                </TableHead>
                <TableHead className={LOG_TH}>
                  {t("integrationHub.requestLogs.colEndpoint")}
                </TableHead>
                <TableHead className={LOG_TH}>
                  {t("integrationHub.requestLogs.colScenario")}
                </TableHead>
                <TableHead className={LOG_TH}>{t("integrationHub.requestLogs.colResult")}</TableHead>
                <TableHead className={cn(LOG_TH, "text-end")}>
                  {t("integrationHub.requestLogs.colLatency")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
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
                      <ScrollText className="mb-4 size-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-bold">
                        {t("integrationHub.requestLogs.emptyTitle")}
                      </h3>
                      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {t("integrationHub.requestLogs.emptyHint")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                items.map((log) => {
                  const isOpen = expanded === log.id
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        data-testid={`log-row-${log.id}`}
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                      >
                        <TableCell>
                          <span
                            aria-label={
                              isOpen
                                ? t("integrationHub.requestLogs.collapse")
                                : t("integrationHub.requestLogs.expand")
                            }
                          >
                            {isOpen ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </span>
                        </TableCell>
                        {/* A timestamp is not a magnitude — start-aligned like every other
                            text-ish column, with the numerals kept LTR. */}
                        <TableCell className="text-sm">
                          <span dir="ltr">{new Date(log.timestamp).toLocaleString("en-GB")}</span>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {log.integrationName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {/* Method badge + the path as the standard identifier chip (SCR-03). */}
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {log.method}
                            </Badge>
                            <code
                              dir="ltr"
                              className="inline-block whitespace-nowrap rounded-sm bg-muted px-2 py-1 font-mono text-xs tracking-wide text-foreground"
                              title={log.path}
                            >
                              {log.path}
                            </code>
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.scenario ? (
                            <Badge className="gap-1.5 whitespace-nowrap bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                              {(() => {
                                const Icon = SCENARIO_ICON[log.scenario] ?? Send
                                return <Icon className="size-3.5" />
                              })()}
                              {t(`integrationHub.scenarios.${log.scenario}.label`)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {/* RESULT merges the HTTP status badge and the result code (reference) —
                            they answer the same question and belong together. */}
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <Badge className={cn("tabular-nums", statusBadgeClass(log.httpStatus))}>
                              {log.httpStatus}
                            </Badge>
                            <code dir="ltr" className="font-mono text-xs text-muted-foreground">
                              {log.resultCode}
                            </code>
                          </span>
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-sm text-muted-foreground">
                          {log.latencyMs} ms
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell colSpan={7} className="p-0">
                            <LogDetail log={log} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      )}

      {hasMore && (
        <div className={cn("flex justify-center")}>
          <Button
            variant="outline"
            disabled={loadingMore}
            data-testid="load-more"
            onClick={() => void loadMore()}
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            {t("integrationHub.requestLogs.loadMore")}
          </Button>
        </div>
      )}
    </div>
  )
}
