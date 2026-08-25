import { CalendarIcon } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { arSA, enGB } from "date-fns/locale"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Shared single-date picker: a 40px control-family trigger showing the formatted date, opening the
// shadcn `Calendar`. Replaces the browser's native `<input type="date">`, whose dd/mm/yyyy spinner is
// unstyleable, ignores our tokens, and renders differently per browser and per OS locale.
//
// **Value stays an ISO `yyyy-MM-dd` string**, not a `Date` — every M-15 date crossing the wire is a
// day-granular ISO string (BR-022 day-granularity, tenant timezone), so parsing to a `Date` at the
// boundary and formatting back would invite an off-by-one whenever the browser's zone is behind UTC.
// The picker converts only for display and for what `Calendar` needs.

export interface DatePickerProps {
  id?: string
  /** ISO `yyyy-MM-dd`; `""` when unset. */
  value: string
  onChange: (next: string) => void
  placeholder?: string
  /** Earliest / latest selectable day, ISO `yyyy-MM-dd`. Used for from ≤ to range guards. */
  min?: string
  max?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
  "data-testid"?: string
}

/** Parses an ISO day string without letting the browser reinterpret it in UTC. */
const toDate = (iso: string): Date | undefined => {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? d : undefined
}

/** Formats a `Date` back to `yyyy-MM-dd` from its LOCAL parts (never `toISOString`, which shifts). */
const toIso = (d: Date): string => format(d, "yyyy-MM-dd")

export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  min,
  max,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: DatePickerProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = toDate(value)
  const locale = i18n.language === "ar" ? arSA : enGB

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        className={cn(
          // Same 40px / 12px-radius control family as Input and Select so the three line up in a
          // filter row; `outline` reads as a field rather than an action button.
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-sm",
          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="size-4 shrink-0 opacity-60" />
        <span className="truncate text-start tabular-nums">
          {selected ? format(selected, "d MMM yyyy", { locale }) : (placeholder ?? "")}
        </span>
      </PopoverTrigger>
      {/* `data-testid` on a wrapper we own, not on the Calendar's internals: react-day-picker's day
          cells are its own markup, so a test that reaches for them by role/name is coupled to that
          library's DOM. Scoping to this node keeps the E2E stable across day-picker upgrades. */}
      <PopoverContent align="start" className="w-auto p-0" data-testid="date-picker-calendar">
        <Calendar
          // The default `--cell-size` is `--spacing(7)` (28px), which leaves the day numbers cramped
          // and the selected/hover disc tight against the digits — and is under the 40px minimum the
          // rest of the control family uses. 36px gives the numbers room and a comfortable target.
          className="p-3 [--cell-size:--spacing(9)]"
          mode="single"
          locale={locale}
          selected={selected}
          defaultMonth={selected}
          disabled={[
            ...(min ? [{ before: toDate(min) as Date }] : []),
            ...(max ? [{ after: toDate(max) as Date }] : []),
          ]}
          onSelect={(d) => {
            onChange(d ? toIso(d) : "")
            setOpen(false)
          }}
          autoFocus
        />
        {selected && (
          <div className="border-t border-border p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              {t("common.clear", "Clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
