// The app's ONE wizard step indicator (design system: "Wizards" in CLAUDE.md).
//
// Extracted from the survey editor, which established the look, so every multi-step flow —
// survey editor, integration provisioning, and anything added later — renders the same bar
// instead of hand-rolling a row of circles. Add a new wizard by composing this; do not
// reimplement it.
//
// Behaviour worth knowing before you use it:
//   • Steps are freely clickable when given `onClick`. A wizard that must gate navigation simply
//     omits `onClick` for the steps it will not allow — the component never invents gating.
//   • `state` is the caller's call, not derived from the index: a wizard can legitimately show a
//     later step as `done` (edit mode re-entering a completed flow).
//   • Below `sm` only the active step keeps its label, so the bar can never wrap onto two lines.

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface WizardStep {
  label: string
  state: "done" | "active" | "todo"
  /** Present ⇒ the segment is a button. Omit to make the step unreachable. */
  onClick?: () => void
  /** Optional test hook, e.g. `step-indicator-2`. */
  testId?: string
}

/**
 * Segmented stepper: a bordered bar of flat segments. Reached steps carry the soft Mint→Cyan
 * brand wash, `done` shows a mint check circle, `active` a primary number circle, `todo` a muted
 * one.
 *
 * The gradient is decorative brand, not status — mint here never means D2 "Good" (Two-Palette
 * Rule); it is the same wash the logo uses, and it only marks progress.
 */
export function WizardStepper({
  steps,
  ariaLabel,
  className,
  testId,
}: {
  steps: WizardStep[]
  ariaLabel: string
  className?: string
  testId?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        "flex overflow-hidden rounded-lg border border-border bg-card motion-safe:animate-in motion-safe:fade-in-0",
        className,
      )}
    >
      {steps.map((s, i) => {
        const clickable = !!s.onClick
        const StepTag = clickable ? "button" : "div"
        return (
          <StepTag
            key={s.label}
            type={clickable ? "button" : undefined}
            onClick={s.onClick}
            data-testid={s.testId}
            data-active={s.state === "active" ? "true" : undefined}
            aria-current={s.state === "active" ? "step" : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-start transition-colors",
              // Logical `border-s` so the divider lands on the reading-start edge in RTL too.
              i > 0 && "border-s border-border",
              s.state !== "todo" && "bg-gradient-to-r from-nb-mint/15 to-nb-cyan/15",
              clickable ? "cursor-pointer hover:bg-accent" : "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                s.state === "done"
                  ? "bg-nb-mint text-white"
                  : s.state === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s.state === "done" ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "truncate text-sm font-medium",
                s.state === "active" ? "text-foreground" : "text-muted-foreground",
                s.state !== "active" && "hidden sm:block",
              )}
            >
              {s.label}
            </span>
          </StepTag>
        )
      })}
    </nav>
  )
}
