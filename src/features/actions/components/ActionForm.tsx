import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useDirection } from "@/hooks/use-direction";
import { DatePicker } from "@/components/cx/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  ActionApiError,
  deleteTarget,
  type Action,
  type ActionSaveInput,
  type DeactivationSource,
} from "../api";
import { todayIso } from "../lib/measurement";
import { DeleteTargetDialog } from "./DeleteTargetDialog";
import {
  KpiTargetFieldset,
  type KpiOption,
  type KpiTargetDraft,
} from "./KpiTargetFieldset";
import { MoveMonitoringStartDialog } from "./MoveMonitoringStartDialog";
import { RecaptureBaselineDialog } from "./RecaptureBaselineDialog";
import { TargetActiveToggle } from "./TargetActiveToggle";
import { STATUS_LABEL_KEY } from "./target-row-shared";
import { ThresholdChangeDialog } from "./ThresholdChangeDialog";

// ── FR-202 / FR-203: the Add/Edit Action form (SCR-02) ───────────────────────
//
// Panel 1 "Action details" (Name / Start / End / Description) + Panel 2 "KPI Targets" (repeatable
// KpiTargetFieldset + "Add KPI Target") + footer (Cancel / Save). Runs the VAL-201..211 catalogue on
// submit, showing inline errors + a first-error toast and focusing the first invalid field. Emits a
// built ActionSaveInput; the mutation itself is the page's (useCreateAction T040 / the edit save T101).
//
// EDIT MODE (T100, US4) — pass `initialAction`: the same layout, pre-filled, plus two things create
// mode has no use for.
//
//  1. **Deactivated Targets render faded + inert** (AC-2.10 / FR-207) and never block Save: the
//     Target-level rules VAL-206/208/209/210 skip them, exactly as the server's ThresholdValidator
//     does, and VAL-207 counts only the ACTIVE ones. A Target the user cannot reach must never be
//     able to fail validation. Its Activate / Delete controls arrive with US7 (T125); until then the
//     row states *why* it is inert.
//  2. **Guarded edits raise T099's confirm dialogs** before the change sticks — DLG-2 on Start Date,
//     DLG-4 on End Date, DLG-3 on a threshold (see `resolveGuard` below, which mirrors the server's
//     `EditGuardResolver`). Cancel reverts the field; Confirm applies it and is remembered for the
//     rest of the session so a picker or a slider drag does not re-prompt per keystroke.
//
// The dialogs are UI-only: `PUT /api/v1/actions/{id}` does not require one to have been shown, and
// recomputes server-side regardless (contracts/api-endpoints.md). They exist so a destructive
// recompute is never a surprise — which is why cancelling reverts the field rather than just closing.
//
// "Today" for the guard decisions comes from the shared `todayIso()` in `lib/measurement.ts`, which
// is the **local** (tenant) calendar day — the same day the server's `TimezoneDayBoundary` resolves
// from the `X-Nabadat-Timezone` header (BR-022 / NFR-8). This file used to keep its own copy while
// `measurement.ts` computed a UTC day, so a guard decision could disagree with the server's
// `EditGuardResolver` for part of every day at a non-zero offset (TODO-M15-019, now closed).

const NAME_MAX = 120;
const DESC_MAX = 500;

interface TargetRow extends KpiTargetDraft {
  /** React list key. Stable across renders; the stored Target id in edit mode. */
  key: string;
  /** The stored Target's id — `undefined` for a row added in this session (FR-210). */
  id?: string;
  /** FR-207 activation flag. `false` → faded + inert body, excluded from validation (AC-2.10). */
  active: boolean;
  deactivationSource: DeactivationSource | null;
  /** Baseline / live score for the FR-206 label above the slider; both null in create mode. */
  baselineScore: number | null;
  currentScore: number | null;
}

interface TargetErrors {
  kpiId?: string;
  targetDate?: string;
  upperThreshold?: string;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  targetsRule?: string; // VAL-207
  targets: TargetErrors[];
}

const emptyTarget = (key: string): TargetRow => ({
  key,
  kpiId: "",
  targetDate: "",
  lowerThreshold: 0,
  upperThreshold: 0,
  active: true,
  deactivationSource: null,
  baselineScore: null,
  currentScore: null,
});

/** Pre-fills one row per stored Target, in the order the server returned them (FR-210 numbering). */
const rowsFromAction = (action: Action): TargetRow[] =>
  action.targets.map((t) => ({
    key: t.id,
    id: t.id,
    kpiId: t.kpiId,
    targetDate: t.targetDate,
    lowerThreshold: t.lowerThreshold,
    upperThreshold: t.upperThreshold,
    active: t.active,
    deactivationSource: t.deactivationSource,
    baselineScore: t.baselineScore,
    currentScore: t.currentScore,
  }));

/** Which of T099's dialogs a pending change owes — 1:1 with the server's `EditGuard` enum. */
type GuardKind = "recapture" | "move-start" | "threshold";

interface PendingGuard {
  kind: GuardKind;
  /**
   * Identity of the guarded field (`"start_date"`, `"end_date"`, `"threshold:<row key>"`). A
   * confirmation is remembered per field, so one confirm covers the rest of that field's editing;
   * putting the value back to what was stored forgets it again, so a later change re-asks.
   */
  key: string;
  /** Restores the field to the value it held before the pending change (dialog Cancel). */
  revert: () => void;
}

export interface ActionFormProps {
  /** Tenant's Active KPIs (M-06) for the per-Target select. */
  kpiOptions: KpiOption[];
  /**
   * Edit mode (US4): the loaded Action to pre-fill from. Omit for create mode.
   *
   * State is seeded from this **once, on mount** — the host must render the form only after the Action
   * has loaded (`ActionFormPage` shows a skeleton until then, T101) and re-key it if the id changes.
   * Re-seeding on every render would fight the user's typing.
   */
  initialAction?: Action;
  /** Scale maximum X (tenant "max upper threshold", default 20). */
  maxUpperThreshold?: number;
  submitting?: boolean;
  /** Server-side failure to surface (e.g. VAL-202 duplicate name → 409, ERR-5). */
  submitError?: string | null;
  onSubmit: (input: ActionSaveInput) => void;
  onCancel: () => void;
}

export function ActionForm({
  kpiOptions,
  initialAction,
  maxUpperThreshold = 20,
  submitting = false,
  submitError,
  onSubmit,
  onCancel,
}: ActionFormProps) {
  // `tr`, not `t` — this component uses `t` as the loop variable for a Target row in several
  // `targets.map(...)` / `.filter(...)` callbacks, which would shadow the translator.
  const { t: tr } = useTranslation();
  const { isRtl } = useDirection();
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const keySeq = useRef(1);
  const [actionName, setActionName] = useState(
    () => initialAction?.actionName ?? "",
  );
  const [startDate, setStartDate] = useState(
    () => initialAction?.actionStartDate ?? "",
  );
  const [endDate, setEndDate] = useState(
    () => initialAction?.actionEndDate ?? "",
  );
  const [description, setDescription] = useState(
    () => initialAction?.description ?? "",
  );
  const [targets, setTargets] = useState<TargetRow[]>(() =>
    initialAction ? rowsFromAction(initialAction) : [emptyTarget("t0")],
  );
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const [pendingGuard, setPendingGuard] = useState<PendingGuard | null>(null);
  const [confirmedGuards, setConfirmedGuards] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // US7 — the Target pending DLG-1 confirmation, and whether its DELETE call is in flight.
  const [pendingDelete, setPendingDelete] = useState<{
    key: string;
    id?: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const isEdit = initialAction != null;
  const todayStr = todayIso();
  const startDateInPast = startDate !== "" && startDate <= todayStr;

  // ── The pre-edit facts the guard table asks about ──────────────────────────
  // Read from the LOADED Action, never from live form state — the guards ask what the user is editing
  // *away from*. This is the same reason `ActionService.UpdateAsync` snapshots `statusBefore` /
  // `hasBaselineBefore` / `targetStartDateBefore` before it applies a single field (T098).
  const hasBaseline =
    initialAction?.targets.some((t) => t.baselineScore != null) ?? false;
  const isActiveAction = initialAction?.status === "active";
  // DLG-3's window: strictly after the Target Start Date (End + 1, BR-006) — on the day monitoring
  // opens, no progress has accrued yet, so nothing is owed. Same `>` as `EditGuardResolver`.
  const midMonitoring =
    initialAction != null && todayStr > initialAction.targetStartDate;
  const storedTargets = new Map(
    (initialAction?.targets ?? []).map((t) => [t.id, t] as const),
  );

  const chosenKpiIds = targets.map((t) => t.kpiId).filter(Boolean);
  const addDisabled =
    kpiOptions.length > 0 && targets.length >= kpiOptions.length;

  const forgetGuard = (key: string) =>
    setConfirmedGuards((keys) => {
      if (!keys.has(key)) return keys;
      const next = new Set(keys);
      next.delete(key);
      return next;
    });

  /**
   * Raises `kind`'s dialog unless the field is already confirmed, and remembers how to put the field
   * back if the user cancels. `changedFromStored` is measured against the **stored** value, not the
   * previous keystroke: putting the field back to what the server holds forgets the confirmation, so
   * re-making the change asks again.
   */
  const guard = (
    kind: GuardKind,
    key: string,
    condition: boolean,
    changedFromStored: boolean,
    revert: () => void,
  ) => {
    if (!isEdit) return;
    if (!changedFromStored) {
      forgetGuard(key);
      return;
    }
    if (!condition || confirmedGuards.has(key)) return;
    setPendingGuard({ kind, key, revert });
  };

  const confirmGuard = () => {
    if (!pendingGuard) return;
    setConfirmedGuards((keys) => new Set(keys).add(pendingGuard.key));
    setPendingGuard(null);
  };

  /** Dialog Cancel / Esc / scrim — DLG-2..4 all revert the field rather than merely closing. */
  const cancelGuard = () => {
    pendingGuard?.revert();
    setPendingGuard(null);
  };

  /**
   * A date that is being **typed** is reported as `""` until every segment is valid (the browser keeps
   * `<input type="date">`'s value empty while it is incomplete). Guarding on that would pop the dialog
   * on the first keystroke, over a field the user has just emptied — so an empty value is never a
   * guarded change. VAL-203 owns "date is required" at submit time.
   */
  const isGuardedDateChange = (next: string, stored: string | undefined) =>
    next !== "" && next !== stored;

  const changeStartDate = (next: string) => {
    const previous = startDate;
    setStartDate(next);
    // DLG-2 keys on an existing Baseline, not on the status (SRS §15.2 "after Baseline exists"):
    // nothing captured ⇒ nothing to re-snapshot, which is what makes the Planned case need no branch.
    guard(
      "recapture",
      "start_date",
      hasBaseline,
      isGuardedDateChange(next, initialAction?.actionStartDate),
      () => setStartDate(previous),
    );
  };

  const changeEndDate = (next: string) => {
    const previous = endDate;
    setEndDate(next);
    // DLG-4 is independent of the Baseline: it is about Target Start (End + 1) and Time Progress,
    // which exist whether or not a score was ever captured.
    guard(
      "move-start",
      "end_date",
      isActiveAction,
      isGuardedDateChange(next, initialAction?.actionEndDate),
      () => setEndDate(previous),
    );
  };

  const patchTarget = (key: string, next: KpiTargetDraft) => {
    const row = targets.find((r) => r.key === key);
    setTargets((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...next } : r)),
    );
    if (row == null) return;

    const stored = row.id != null ? storedTargets.get(row.id) : undefined;
    // A row added in this session has no stored progress to recompute — DLG-3 would warn about
    // nothing. Its first Baseline is captured on save (`baseline.captured`, not `recaptured`).
    if (stored == null) return;

    const moved =
      next.lowerThreshold !== row.lowerThreshold ||
      next.upperThreshold !== row.upperThreshold;
    if (!moved) return;

    const previous = {
      lowerThreshold: row.lowerThreshold,
      upperThreshold: row.upperThreshold,
    };
    guard(
      "threshold",
      `threshold:${key}`,
      midMonitoring,
      next.lowerThreshold !== stored.lowerThreshold ||
        next.upperThreshold !== stored.upperThreshold,
      () =>
        setTargets((rows) =>
          rows.map((r) => (r.key === key ? { ...r, ...previous } : r)),
        ),
    );
  };

  const addTarget = () =>
    setTargets((rows) => [...rows, emptyTarget(`t${keySeq.current++}`)]);

  // US7 — the activate/deactivate toggle is a *draft* flag saved on PUT (the create path never shows
  // it, so `active: false` can't leak into a POST). Deactivating manually sets `deactivationSource`
  // so the row explains itself; reactivating clears it. A force-deactivated Target's switch is locked
  // (TargetActiveToggle), so `next` is only ever a manual transition here.
  const toggleTargetActive = (key: string, next: boolean) =>
    setTargets((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, active: next, deactivationSource: next ? null : "manual" }
          : r,
      ),
    );

  // DLG-1 confirm (BR-012 — only a deactivated Target reaches here). A stored Target is deleted
  // server-side at once, because deletion is not expressible through the PUT save (a row omitted from
  // the payload means "unchanged", never "delete"); a row the user only just added is dropped locally.
  // Either way the KPI frees up in the other selects and the rest renumber (both index-driven).
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { key, id } = pendingDelete;
    if (id != null && initialAction != null) {
      setDeleteBusy(true);
      try {
        await deleteTarget(initialAction.id, id);
      } catch (e) {
        toast.error(
          e instanceof ActionApiError
            ? e.message
            : tr("actions.toastTargetDeleteFailed"),
        );
        setDeleteBusy(false);
        return;
      }
      setDeleteBusy(false);
    }
    setTargets((rows) => rows.filter((r) => r.key !== key));
    forgetGuard(`threshold:${key}`);
    setPendingDelete(null);
    toast.success(tr("actions.toastTargetRemoved"));
  };

  const validate = (): FormErrors => {
    const targetErrors: TargetErrors[] = targets.map((t, i) => {
      const te: TargetErrors = {};
      // AC-2.10 — a deactivated Target is faded and inert, so its fields cannot be corrected: they
      // must never block Save. Mirrors ThresholdValidator, which skips VAL-206/208/209/210 for it.
      // The entry stays in the array so error indices keep matching the rendered rows.
      if (!t.active) return te;
      if (!t.kpiId) te.kpiId = tr("actions.valSelectKpi", { n: i + 1 }); // VAL-208
      if (!t.targetDate) te.targetDate = tr("actions.valTargetDate");
      else if (endDate && t.targetDate <= endDate)
        te.targetDate = tr("actions.valTargetDateAfterEnd"); // VAL-206
      if (!(t.upperThreshold > 0)) te.upperThreshold = tr("actions.valUpper"); // VAL-210
      return te;
    });

    // VAL-207 counts ACTIVE targets only — an Action whose every Target is switched off has nothing
    // to measure, and R-17 keeps it that way by refusing to delete the last remaining Target.
    const activeWithKpi = targets.filter((t) => t.active && t.kpiId).length;

    return {
      name: !actionName.trim() ? tr("actions.valName") : undefined, // VAL-201
      startDate: !startDate ? tr("actions.valStart") : undefined, // VAL-203
      endDate: !endDate
        ? tr("actions.valEnd") // VAL-203
        : startDate && endDate < startDate
          ? tr("actions.valEndBeforeStart") // VAL-204
          : undefined,
      targetsRule: activeWithKpi < 1 ? tr("actions.valTargetsRule") : undefined, // VAL-207
      targets: targetErrors,
    };
  };

  const firstErrorMessage = (e: FormErrors): string | null => {
    if (e.name) return e.name;
    if (e.startDate) return e.startDate;
    if (e.endDate) return e.endDate;
    if (e.targetsRule) return e.targetsRule;
    for (const te of e.targets) {
      if (te.kpiId) return te.kpiId;
      if (te.targetDate) return te.targetDate;
      if (te.upperThreshold) return te.upperThreshold;
    }
    return null;
  };

  const focusFirstError = (e: FormErrors) => {
    let id: string | null = null;
    if (e.name) id = "action-name";
    else if (e.startDate) id = "action-start";
    else if (e.endDate) id = "action-end";
    else {
      const idx = e.targets.findIndex(
        (te) => te.kpiId || te.targetDate || te.upperThreshold,
      );
      if (idx >= 0) {
        const te = e.targets[idx];
        const field = te.kpiId ? "kpi" : te.targetDate ? "date" : "upper";
        id = `target-${idx + 1}-${field}`;
      }
    }
    if (id) document.getElementById(id)?.focus();
  };

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    const e = validate();
    const msg = firstErrorMessage(e);
    if (msg) {
      setErrors(e);
      toast.error(msg);
      focusFirstError(e);
      return;
    }
    setErrors(null);
    onSubmit({
      actionName: actionName.trim(),
      description: description.trim() || undefined,
      actionStartDate: startDate,
      actionEndDate: endDate,
      // The `updated_at` echo (ERR-8) is the page's to add — it owns the loaded Action (T101).
      targets: targets.map((t) => ({
        // Both are edit-only: a create payload carries no Target id, and the server defaults
        // `active` to true. Sending a deactivated row with `active: false` keeps it switched off;
        // omitting it would mean "unchanged", never "delete" (US7 owns deletion).
        ...(isEdit ? { id: t.id, active: t.active } : {}),
        kpiId: t.kpiId,
        targetDate: t.targetDate,
        lowerThreshold: t.lowerThreshold,
        upperThreshold: t.upperThreshold,
      })),
    });
  };

  return (
    <form className="space-y-5 py-5" onSubmit={handleSubmit} noValidate>
      {/* Back link + heading (FR-202) */}
      <div className="space-y-3">
        {/* Back affordance matches /surveys/new/settings: a square outline icon button sitting to
            the INLINE-START of the title block, rather than a ghost text link stacked above it.
            `BackIcon` flips to ArrowRight in RTL — an arrow is directional, so mirroring it is
            required for the Arabic-first layout (a `ps-*`/`ms-*` class cannot rotate a glyph). */}
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-0.5 size-9 shrink-0"
            onClick={onCancel}
            aria-label={
              isEdit ? tr("actions.backToDetails") : tr("actions.backToActions")
            }
          >
            <BackIcon className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-heading font-bold">
                {isEdit
                  ? tr("actions.formTitleEdit")
                  : tr("actions.formTitleCreate")}
              </h1>
              {initialAction && (
                <Badge variant="outline" data-testid="action-form-status">
                  {tr(STATUS_LABEL_KEY[initialAction.status])}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit
                ? tr("actions.formIntroEdit")
                : tr("actions.formIntroCreate")}
            </p>
          </div>
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      {/* Panel 1 — Action details */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("actions.panelDetailsTitle")}</CardTitle>
          <CardDescription>{tr("actions.panelDetailsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2.1fr_1fr_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-name">
                {tr("actions.fieldName")}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="action-name"
                value={actionName}
                maxLength={NAME_MAX}
                placeholder={tr("actions.fieldNamePlaceholder")}
                onChange={(e) => setActionName(e.currentTarget.value)}
                data-testid="action-name"
              />
              {errors?.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-start">
                {tr("actions.fieldStart")}
                <span className="text-destructive"> *</span>
              </Label>
              <DatePicker
                id="action-start"
                value={startDate}
                onChange={changeStartDate}
                aria-label={tr("actions.fieldStartTitle")}
                data-testid="action-start"
              />
              {errors?.startDate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-end">
                {tr("actions.fieldEnd")}
                <span className="text-destructive"> *</span>
              </Label>
              <DatePicker
                id="action-end"
                value={endDate}
                min={startDate || undefined}
                onChange={changeEndDate}
                aria-label={tr("actions.fieldEndTitle")}
                data-testid="action-end"
              />
              {errors?.endDate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-description">
              {tr("actions.fieldDescription")}
            </Label>
            <Textarea
              id="action-description"
              value={description}
              maxLength={DESC_MAX}
              rows={3}
              placeholder={tr("actions.fieldDescriptionPlaceholder")}
              onChange={(e) => setDescription(e.currentTarget.value)}
              data-testid="action-description"
            />
            <p className="text-xs text-muted-foreground text-end tabular-nums">
              {description.length}/{DESC_MAX}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Panel 2 — KPI Targets */}
      <Card>
        {/* `flex` is load-bearing, not redundant with `flex-row`: the base CardHeader is a GRID, and
            `flex-row` only sets flex-direction — it does not change `display`. Without it the button
            stayed a full-width grid item, which is why `w-auto shrink-0` had no effect. */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>{tr("actions.panelTargetsTitle")}</CardTitle>
            <CardDescription className="max-w-3xl leading-relaxed">
              {tr("actions.panelTargetsDesc")}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={addTarget}
            disabled={addDisabled}
            className="w-auto shrink-0 self-start"
            data-testid="add-kpi-target"
          >
            <Plus className="size-4" />
            {tr("actions.addKpiTarget")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors?.targetsRule && (
            <p className="text-sm text-destructive" role="alert">
              {errors.targetsRule}
            </p>
          )}
          {targets.map((t, i) => (
            <KpiTargetFieldset
              key={t.key}
              index={i + 1}
              value={t}
              onChange={(next) => patchTarget(t.key, next)}
              kpiOptions={kpiOptions}
              disabledKpiIds={chosenKpiIds}
              max={maxUpperThreshold}
              // Edit mode shows what the label promises: the captured Baseline once the Action has
              // started, the live score while it is still Planned. Both are null under C-01
              // (TODO-M15-001), which renders as "—".
              currentScore={startDateInPast ? t.baselineScore : t.currentScore}
              startDateInPast={startDateInPast}
              errors={errors?.targets[i]}
              disabled={!t.active}
              kpiLocked={t.id != null}
              headerActions={
                // US7 (T125) — the activate/deactivate toggle + Delete live in edit mode only; create
                // (US1) never deactivates a Target and its POST carries no `active` flag. A
                // force-deactivated Target's toggle is locked until M-06 reactivates the KPI (BR-011);
                // Delete (deactivated rows only, BR-012) is behind DLG-1 and R-17-guarded against
                // removing the last Target.
                isEdit ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <TargetActiveToggle
                      index={i + 1}
                      active={t.active}
                      forced={t.deactivationSource === "forced"}
                      onActiveChange={(next) => toggleTargetActive(t.key, next)}
                      disabled={deleteBusy}
                    />
                    {!t.active && (
                      <>
                        <span
                          className="text-sm text-muted-foreground"
                          data-testid={`target-${i + 1}-deactivated`}
                        >
                          {t.deactivationSource === "forced"
                            ? tr("actions.deactivatedForced")
                            : tr("actions.deactivatedManual")}
                        </span>
                        {(() => {
                          // A stored Target can only be DELETEd once it is deactivated *server-side*
                          // (BR-012). The toggle above is a draft flag until Save, so a row switched off
                          // only in this session isn't deletable yet — the DELETE would 409. An unsaved
                          // row (no id) is always removable locally.
                          const deletable =
                            t.id == null ||
                            storedTargets.get(t.id)?.active === false;
                          return (
                            <Button
                              type="button"
                              variant="ghost"
                              size="compact"
                              disabled={
                                !deletable || targets.length <= 1 || deleteBusy
                              }
                              title={
                                !deletable
                                  ? tr("actions.deleteNeedsSave")
                                  : undefined
                              }
                              onClick={() =>
                                setPendingDelete({ key: t.key, id: t.id })
                              }
                              data-testid={`target-${i + 1}-delete`}
                            >
                              {tr("actions.delete")}
                            </Button>
                          );
                        })()}
                      </>
                    )}
                  </div>
                ) : undefined
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {tr("actions.cancel")}
        </Button>
        <Button type="submit" disabled={submitting} data-testid="save-action">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? tr("actions.saveChanges") : tr("actions.saveAction")}
        </Button>
      </div>

      {/* Guarded-edit confirmations (DLG-2 / DLG-4 / DLG-3) — edit mode only. */}
      <RecaptureBaselineDialog
        open={pendingGuard?.kind === "recapture"}
        onOpenChange={(open) => {
          if (!open) cancelGuard();
        }}
        onConfirm={confirmGuard}
      />
      <MoveMonitoringStartDialog
        open={pendingGuard?.kind === "move-start"}
        onOpenChange={(open) => {
          if (!open) cancelGuard();
        }}
        onConfirm={confirmGuard}
      />
      <ThresholdChangeDialog
        open={pendingGuard?.kind === "threshold"}
        onOpenChange={(open) => {
          if (!open) cancelGuard();
        }}
        onConfirm={confirmGuard}
      />

      {/* DLG-1 — delete a deactivated Target (US7). */}
      <DeleteTargetDialog
        open={pendingDelete != null}
        busy={deleteBusy}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </form>
  );
}
