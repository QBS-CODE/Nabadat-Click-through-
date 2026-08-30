// Shared visual primitives for the M-02 module, mapping the mockup's custom
// badge tones and channel glyphs onto the Nabadat design-system tokens.

import type { ReactNode } from "react"
import {
  AppWindow,
  Bell,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  TabletSmartphone,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ChannelIcon } from "../data/types"

/** Badge tone → design-system classes. D-tokens signal status; cyan/navy are brand chrome. */
export type Tone = "d1" | "d2" | "d3" | "d4" | "d5" | "cyan" | "navy" | "mute" | "line" | "soon"

const TONE: Record<Tone, string> = {
  d1: "bg-d1-light text-d1-dark dark:bg-d1-dark/25 dark:text-d1-light",
  d2: "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light",
  d3: "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light",
  d4: "bg-d4-light text-d4-dark dark:bg-d4-dark/25 dark:text-d4-light",
  d5: "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light",
  cyan: "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200",
  navy: "bg-accent text-accent-foreground",
  mute: "bg-muted text-muted-foreground",
  line: "border border-border bg-card text-foreground",
  soon: "bg-muted text-muted-foreground border border-dashed border-border",
}

export function Bdg({
  tone = "mute",
  className,
  children,
  title,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-[21px] items-center gap-1 rounded-sm px-2 text-[10.5px] font-semibold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const CHAN_ICON: Record<ChannelIcon, LucideIcon> = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  push: Bell,
  inapp: AppWindow,
  device: TabletSmartphone,
  call: Phone,
}

export function ChanIcon({ icon, className }: { icon: ChannelIcon; className?: string }) {
  const Icon = CHAN_ICON[icon]
  return <Icon className={cn("size-4", className)} aria-hidden />
}

/** Monospace code chip (the mockup's `.code-chip`). */
export function CodeChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-foreground",
        className,
      )}
      dir="ltr"
    >
      {children}
    </span>
  )
}

/** A dashboard stat tile (`.tile`). */
export function Tile({
  label,
  value,
  sub,
  suffix,
  badge,
  title,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  suffix?: ReactNode
  badge?: ReactNode
  title?: string
}) {
  return (
    <div
      title={title}
      className="rounded-lg border border-border bg-card p-4 shadow-sm dark:shadow-none"
    >
      <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2 font-heading text-2xl font-bold tabular-nums">
        <span>
          {value}
          {suffix}
        </span>
        {badge}
      </div>
      {sub != null && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

/** Small uppercase section divider (`.section-t`). */
export function SectionT({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mt-5 mb-3 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.14em] text-muted-foreground uppercase after:h-px after:flex-1 after:bg-border after:content-['']",
        className,
      )}
    >
      {children}
    </div>
  )
}
