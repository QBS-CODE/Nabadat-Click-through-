import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // The app-standard segmented control (see `TabsListSegmented`). The three
        // modifier-prefixed overrides are REQUIRED, not decorative: the base class pins
        // `group-data-horizontal/tabs:h-8` and `data-[variant=line]:rounded-none`, which
        // outrank plain `h-auto` / `rounded-lg` utilities and squash the trigger padding.
        segmented:
          "h-auto gap-1 rounded-lg border border-border bg-muted p-1 group-data-horizontal/tabs:h-auto data-[variant=segmented]:rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        // Segmented: the trigger keeps NO background of its own so the sliding TabsIndicator is
        // the one moving highlight, hides the underline `after` bar, sizes to its label rather
        // than stretching (`flex-none`), and takes the roomier segmented padding.
        "group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:bg-transparent group-data-[variant=segmented]/tabs-list:px-3.5 group-data-[variant=segmented]/tabs-list:py-1.5 group-data-[variant=segmented]/tabs-list:after:hidden group-data-[variant=segmented]/tabs-list:data-active:bg-transparent group-data-[variant=segmented]/tabs-list:data-active:shadow-none dark:group-data-[variant=segmented]/tabs-list:data-active:border-transparent dark:group-data-[variant=segmented]/tabs-list:data-active:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

/**
 * Sliding active-tab pill. Place as the FIRST child of `TabsList` (triggers are
 * `relative`, so they paint above it) and pair with `variant="line"` triggers so the
 * pill is the only active background. Base UI emits the position vars as physical
 * px measurements, so positioning uses physical left/top + translate — correct in
 * both RTL and LTR (an `start-*` anchor would double-flip).
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        // bg-card in BOTH themes: white pill on the cloud track in light, the
        // card surface on the raised muted track in dark (reference look — the
        // old translucent input tint was nearly invisible in dark mode).
        "absolute left-0 top-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-md bg-card shadow-sm dark:shadow-none motion-safe:transition-[transform,width,height] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * **The app-standard tab control — use this for every new tabbed page.**
 *
 * A segmented pill group (bordered `bg-muted` track + sliding white indicator), as used by the
 * Surveys library. Bundles `variant="segmented"` with the `TabsIndicator`, because the indicator
 * IS the active highlight here — forgetting it leaves the control with no visible selection at
 * all, which is exactly how hand-rolled tab groups end up looking broken.
 *
 * ```tsx
 * <Tabs value={tab} onValueChange={setTab} className="gap-5">
 *   <TabsListSegmented>
 *     <TabsTrigger value="all">All<TabsCountPill count={35} /></TabsTrigger>
 *     <TabsTrigger value="custom">Custom<TabsCountPill count={12} /></TabsTrigger>
 *   </TabsListSegmented>
 *   <TabsContent value="all">…</TabsContent>
 * </Tabs>
 * ```
 */
function TabsListSegmented({
  className,
  children,
  ...props
}: Omit<TabsPrimitive.List.Props, "variant">) {
  return (
    <TabsList variant="segmented" className={className} {...props}>
      <TabsIndicator />
      {children}
    </TabsList>
  )
}

/**
 * Count badge inside a `TabsTrigger` ("All · 35"). Renders nothing for `null`, so a tab whose
 * count is still loading shows its label alone rather than a flash of `0`. Tints to the brand
 * primary on the active tab via `in-data-active:`.
 */
function TabsCountPill({ count, className }: { count: number | null; className?: string }) {
  if (count === null) return null
  return (
    <span
      className={cn(
        "rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground in-data-active:bg-primary/10 in-data-active:text-primary",
        className,
      )}
    >
      {count}
    </span>
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export {
  Tabs,
  TabsList,
  TabsListSegmented,
  TabsTrigger,
  TabsCountPill,
  TabsContent,
  TabsIndicator,
  tabsListVariants,
}
