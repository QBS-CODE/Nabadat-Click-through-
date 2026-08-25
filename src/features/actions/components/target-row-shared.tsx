import type { ReactNode } from "react"

import i18n from "@/i18n"
import { cn } from "@/lib/utils"

import type { ActionStatus } from "../api"

/**
 * i18n keys for the Action status badge, shared by the detail header (SCR-03) and the edit form's
 * status pill (SCR-02) so the two can never drift. The wire value is a lowercase enum member; it must
 * never be rendered raw.
 */
export const STATUS_LABEL_KEY: Record<ActionStatus, string> = {
  active: "actions.statusActive",
  planned: "actions.statusPlanned",
  completed: "actions.statusCompleted",
  archived: "actions.statusArchived",
}

// Shared layout parts for the SCR-03 Target rows (FR-303..308). One row card per Target in a
// 3-column grid (KPI zone · slider · side zone), collapsing to one column below 940px.

/**
 * Day-month-year in the active language. Arabic uses `ar-u-nu-latn` — native Arabic month names but
 * **Western digits**, per the design system's "use 0-9, not ٠-٩ in Arabic UI" rule; plain `"ar"`
 * would render Eastern Arabic numerals. English stays pinned to `en-GB` ("11 Sept 2026") rather than
 * `"en"`, which would flip to the US "Sep 11, 2026" order.
 *
 * Reads the i18n singleton rather than taking a `lang` argument because the callers include SVG
 * label builders and non-component helpers where a hook is unavailable.
 */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(i18n.language === "ar" ? "ar-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

/**
 * The design system's **UI Label** type role (10–12 px, weight 500, uppercase, 0.12em tracking) as a
 * component, so the same micro-label reads identically on the detail column headers, the timeline
 * captions and the row side-facts instead of each site re-typing four utilities and drifting.
 * Chrome only — `text-xs` is below the 14 px Arabic body minimum, so never use it for body copy.
 */
export function UiLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function RowGrid({
  children,
  highlight,
  className,
}: {
  children: ReactNode
  /** Inline-start accent on the featured (lowest-performing) row (FR-304). */
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        // A row INSIDE the shared table shell, not a standalone card: the page wraps the list in one
        // bordered container with dividers, so a per-row border/shadow here would double the chrome
        // and break the column alignment with the header band.
        "relative grid grid-cols-1 items-center gap-4.5 bg-card px-5 py-4.5",
        // The Figma column track, with its trailing Pace column repurposed to carry the timer ring
        // (or, on a deactivated row, the Activate / Delete controls). Pace was dropped because the
        // ring already encodes the same reading — its tooltip states time elapsed vs score progress.
        "md:grid-cols-[180px_minmax(0,1fr)_130px_120px_130px]",
        "motion-safe:transition-colors hover:bg-muted/30",
        // FR-304 — the featured (lowest-performing) row is marked with an inline-start accent rather
        // than a ring, which would cut across the dividers of the surrounding table.
        // FR-304 — featured row: tinted surface + a 3px accent pinned to the inline-start edge
        // (absolute, so it spans the full row height without disturbing the column track).
        highlight && "bg-accent",
        className,
      )}
    >
      {highlight && (
        <span aria-hidden className="absolute inset-y-0 w-[3px] bg-primary inset-s-0" />
      )}
      {children}
    </div>
  )
}


/**
 * KPI cell — the row's identity column: the KPI name plus an optional status badge, with room for
 * an extra marker (the Completed row's outcome dot) underneath.
 */
export function KpiCell({
  name,
  badge,
  /** Dashed outline instead of the solid primary fill — used by the Deactivated badge (FR-308). */
  badgeDashed,
  /** Strike the name through when the Target no longer counts toward the Action's result. */
  struck,
  children,
}: {
  name: string
  badge?: string
  badgeDashed?: boolean
  struck?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={cn("truncate text-sm font-bold", struck && "line-through")} title={name}>
        {name}
      </span>
      {badge && (
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center rounded-sm px-2 text-[10px] font-bold",
            badgeDashed
              ? "border border-dashed border-border text-muted-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {badge}
        </span>
      )}
      {children}
    </div>
  )
}

/**
 * Target-date cell — 13px semibold, muted when the row is excluded from results. Takes the raw ISO
 * date and formats it here so every row column renders the same locale-aware string.
 */
export function DateCell({
  value,
  muted,
  /** The value is an ISO `yyyy-MM-dd` string and needs formatting (as opposed to pre-formatted). */
  iso,
}: {
  value: string
  muted?: boolean
  iso?: boolean
}) {
  return (
    <span
      className={cn(
        "text-[13px] font-semibold tabular-nums",
        muted && "font-normal text-muted-foreground",
      )}
    >
      {iso ? fmtDate(value) : value}
    </span>
  )
}

/**
 * Score-progress cell — the row's headline number, so it is the largest type in the row and carries
 * the D-scale colour of its pace state. `null` renders the em-dash used for excluded rows.
 */
export function ScoreCell({ value, tone }: { value: number | null; tone?: "ahead" | "behind" }) {
  if (value == null) return <span className="text-[13px] text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        "text-base font-bold tabular-nums",
        tone === "behind" && "text-d5 dark:text-d5-light",
        tone === "ahead" && "text-d2-dark dark:text-d2-light",
      )}
    >
      {value}%
    </span>
  )
}

