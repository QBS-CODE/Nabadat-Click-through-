// Shared date-filter/picker control — a field-styled trigger (matching the 40px input
// family) that opens the design-system Calendar in a popover. Value is an ISO date string
// (YYYY-MM-DD) so callers can compare/store it as plain text.

import { useState } from "react"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const fromISO = (s: string): Date | undefined => {
  if (!s) return undefined
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function DateField({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const d = fromISO(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-sm outline-none transition-colors hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          !d && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 opacity-70" />
        <span className="truncate">{d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={d}
          autoFocus
          onSelect={(nd) => {
            onChange(nd ? toISO(nd) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
