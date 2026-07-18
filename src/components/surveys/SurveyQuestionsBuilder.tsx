import { useRef, useState } from "react";
import {
  Gauge,
  TrendingUp,
  TextCursorInput,
  CircleDot,
  ListChecks,
  ToggleLeft,
  Grid3x3,
  ListOrdered,
  Layers,
  Plus,
  Minus,
  Trash2,
  GripVertical,
  MessageSquare,
  Lightbulb,
  Settings2,
  X,
  Star,
  Smile,
  Meh,
  Frown,
  MoreVertical,
  GitBranch,
  Pilcrow,
  ChevronDown,
  Square,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_ACTIVE_KPIS,
  KPI_PERSPECTIVES,
  MOCK_JOURNEYS_FOR_BINDING,
  MOCK_STAGES_BY_JOURNEY,
  MOCK_TOUCHPOINTS_BY_STAGE,
} from "@/data/mock-surveys";

// ── Types ─────────────────────────────────────────────────────────────────────
type QType =
  | "KPI"
  | "Scale"
  | "Input Field"
  | "Single select"
  | "Multi-select dropdown"
  | "Yes/No (Boolean)"
  | "Single-select matrix"
  | "Ranking"
  | "Paragraph";

interface Reason {
  on: boolean;
  prompt?: string;
  multi?: boolean;
  reasons?: string[];
  hasOther?: boolean;
}

interface BQuestion {
  id: string;
  text: string;
  desc?: string;
  type: QType;
  required: boolean;
  comments?: boolean;
  // KPI binding
  kpi?: string;
  perspective?: string;
  boundJourney?: boolean;
  journeyId?: string;
  stageId?: string;
  touchpointId?: string;
  touchpoint?: string; // display "stage → touchpoint"
  allowNA?: boolean;
  // Scale
  scaleView?: "labels" | "stars" | "smileys" | "slider";
  scalePoints?: number;
  pointLabels?: string[];
  sliderMin?: number;
  sliderMax?: number;
  sliderSteps?: number;
  // Choice (single / multi / ranking)
  options?: string[];
  selectDisplay?: "radio" | "dropdown";
  multiDisplay?: "checkboxes" | "dropdown";
  rankDisplay?: "drag" | "numbered";
  // Yes/No
  trueLabel?: string;
  falseLabel?: string;
  boolDisplay?: "buttons" | "toggle";
  // Matrix
  matrixMode?: "custom" | "kpi";
  matrixRows?: string[];
  matrixCols?: string[];
  matrixKpi?: string;
  // Input
  inputType?: string;
  sentiment?: boolean;
  // Score-based follow-up (justification)
  reason?: Reason;
  // Answer routing: answer/score value → target ("next" | "end" | question id)
  routes?: Record<string, string>;
}
interface QSet {
  id: string;
  title: string;
  desc?: string;
  selMode: "random" | "low";
  count: number;
  questions: BQuestion[];
}
// One entry of a section's display order — questions and sets interleave freely
// (mirrors the reference's `g.order`). Sections without an order render their
// questions first, then their sets (the derived default).
type OrderEntry = { t: "q" | "set"; id: string };
interface Section {
  id: string;
  name: string;
  questions: BQuestion[];
  sets: QSet[];
  order?: OrderEntry[];
}

// Non-mutating derived order: stored entries that still exist, then anything missing.
function orderedOf(sec: Section): OrderEntry[] {
  const valid = (sec.order ?? []).filter((o) =>
    o.t === "q"
      ? sec.questions.some((q) => q.id === o.id)
      : sec.sets.some((s) => s.id === o.id),
  );
  const seen = new Set(valid.map((o) => `${o.t}:${o.id}`));
  for (const q of sec.questions)
    if (!seen.has(`q:${q.id}`)) valid.push({ t: "q", id: q.id });
  for (const s of sec.sets)
    if (!seen.has(`set:${s.id}`)) valid.push({ t: "set", id: s.id });
  return valid;
}

// Mutating placement (call inside mutate()): put `entry` before/after `anchor`,
// or at the end when no anchor is given.
function placeInOrder(
  sec: Section,
  entry: OrderEntry,
  anchor?: OrderEntry,
  after?: boolean,
) {
  sec.order = orderedOf(sec).filter(
    (o) => !(o.t === entry.t && o.id === entry.id),
  );
  if (!anchor) {
    sec.order.push(entry);
    return;
  }
  const i = sec.order.findIndex((o) => o.t === anchor.t && o.id === anchor.id);
  if (i < 0) sec.order.push(entry);
  else sec.order.splice(after ? i + 1 : i, 0, entry);
}

// Strip an entry from every section's order (call inside mutate()).
function dropFromOrder(secs: Section[], entry: OrderEntry) {
  for (const s of secs)
    if (s.order)
      s.order = s.order.filter((o) => !(o.t === entry.t && o.id === entry.id));
}

const PALETTE_TYPES: {
  type: QType;
  icon: typeof Gauge;
  label: string;
  labelAr: string;
}[] = [
  { type: "Scale", icon: TrendingUp, label: "Scale", labelAr: "مقياس" },
  {
    type: "Input Field",
    icon: TextCursorInput,
    label: "Input Field",
    labelAr: "حقل إدخال",
  },
  {
    type: "Single select",
    icon: CircleDot,
    label: "Single select",
    labelAr: "اختيار واحد",
  },
  {
    type: "Multi-select dropdown",
    icon: ListChecks,
    label: "Multi-select",
    labelAr: "اختيار متعدد",
  },
  {
    type: "Yes/No (Boolean)",
    icon: ToggleLeft,
    label: "Yes/No (Boolean)",
    labelAr: "نعم/لا",
  },
  {
    type: "Single-select matrix",
    icon: Grid3x3,
    label: "Single-select matrix",
    labelAr: "مصفوفة اختيار واحد",
  },
  { type: "Ranking", icon: ListOrdered, label: "Ranking", labelAr: "ترتيب" },
];

const INPUT_TYPES = [
  "Text",
  "Paragraph",
  "Number",
  "Date",
  "Time",
  "Date and Time",
  "Month",
];

let idc = 1;
const uid = (p: string) => `${p}${idc++}_${Date.now()}`;

function makeQuestion(type: QType): BQuestion {
  const isChoice =
    type === "Single select" ||
    type === "Multi-select dropdown" ||
    type === "Ranking";
  return {
    id: uid("q"),
    text:
      type === "Paragraph"
        ? "New paragraph text…"
        : `Untitled ${type} question`,
    type,
    required: false,
    comments: false,
    kpi: type === "KPI" ? "csat" : undefined,
    perspective: type === "KPI" ? "overall" : undefined,
    scaleView: type === "Scale" ? "labels" : undefined,
    scalePoints: type === "Scale" || type === "KPI" ? 5 : undefined,
    pointLabels: [],
    sliderMin: 0,
    sliderMax: 100,
    sliderSteps: 5,
    options: isChoice
      ? type === "Ranking"
        ? ["Item 1", "Item 2"]
        : ["Option 1", "Option 2"]
      : [],
    selectDisplay: type === "Single select" ? "radio" : undefined,
    multiDisplay: type === "Multi-select dropdown" ? "checkboxes" : undefined,
    rankDisplay: type === "Ranking" ? "drag" : undefined,
    trueLabel: type === "Yes/No (Boolean)" ? "Yes" : undefined,
    falseLabel: type === "Yes/No (Boolean)" ? "No" : undefined,
    boolDisplay: type === "Yes/No (Boolean)" ? "buttons" : undefined,
    matrixMode: type === "Single-select matrix" ? "custom" : undefined,
    matrixRows:
      type === "Single-select matrix" ? ["Row 1", "Row 2"] : undefined,
    matrixCols:
      type === "Single-select matrix" ? ["Column 1", "Column 2"] : undefined,
    matrixKpi: type === "Single-select matrix" ? "csat" : undefined,
    inputType: type === "Input Field" ? "Text" : undefined,
    sentiment: false,
    reason: {
      on: false,
      prompt: "",
      multi: false,
      reasons: [],
      hasOther: false,
    },
  };
}

// A KPI's named perspectives (excluding "overall", which is the aggregate) — used
// to auto-seed the rows of a KPI-scale matrix.
function perspectiveRows(kpiId: string | undefined, isAr: boolean): string[] {
  return (KPI_PERSPECTIVES[kpiId ?? ""] ?? [])
    .filter((p) => p.value !== "overall")
    .map((p) => (isAr ? p.labelAr : p.labelEn));
}

// The evenly-spaced tick values of a slider scale (min…max split into `steps`).
function sliderTicks(q: BQuestion): number[] {
  const min = q.sliderMin ?? 0,
    max = q.sliderMax ?? 100;
  const steps = Math.max(1, Math.min(20, q.sliderSteps ?? 5));
  return Array.from(
    { length: steps + 1 },
    (_, i) => Math.round((min + ((max - min) * i) / steps) * 100) / 100,
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────
const SMILEY_ICONS = [Frown, Frown, Meh, Smile, Smile];

// The integer points of a KPI's configured scale ("0–10" → [0..10]). Returns null
// for a very wide scale (e.g. 1–100), where the caller shows a compact range line.
export function kpiScalePoints(kpiId?: string): number[] | null {
  const scale = MOCK_ACTIVE_KPIS.find((k) => k.id === kpiId)?.scale;
  const m = scale?.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (!m) return [1, 2, 3, 4, 5];
  const a = parseInt(m[1], 10),
    b = parseInt(m[2], 10);
  if (isNaN(a) || isNaN(b) || b <= a) return [1, 2, 3, 4, 5];
  const count = b - a + 1;
  if (count > 12) return null;
  return Array.from({ length: count }, (_, i) => a + i);
}

function QPreview({ q }: { q: BQuestion }) {
  const dot =
    "flex size-8 items-center justify-center rounded-md border border-input text-xs font-medium text-muted-foreground";
  const dotSel =
    "flex size-8 items-center justify-center rounded-md border border-primary bg-primary text-xs font-semibold text-primary-foreground";
  const chip =
    "rounded-md border border-input bg-card px-2.5 py-1 text-xs text-muted-foreground";

  if (q.type === "Paragraph")
    return (
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
        {q.text}
      </p>
    );

  // KPI — the preview follows the KPI's own configured scale (NPS 0–10, CSAT 1–5, …).
  if (q.type === "KPI") {
    const pts = kpiScalePoints(q.kpi);
    if (!pts) {
      const scale = MOCK_ACTIVE_KPIS.find((k) => k.id === q.kpi)?.scale ?? "";
      const [mn = "1", mx = "100"] = scale.split(/[–-]/);
      return (
        <div className="w-full max-w-xs">
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full w-3/4 rounded-full bg-primary/60" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{mn.trim()}</span>
            <span>{mx.trim()}</span>
          </div>
        </div>
      );
    }
    const selIdx = Math.floor(pts.length * 0.7);
    return (
      <div className="flex flex-wrap gap-1.5">
        {pts.map((v, i) => (
          <span key={i} className={i === selIdx ? dotSel : dot}>
            {v}
          </span>
        ))}
        {q.allowNA && <span className={chip}>N/A</span>}
      </div>
    );
  }

  if (q.type === "Scale") {
    const n = q.scalePoints ?? 5;
    const sel = Math.ceil(n * 0.8);
    if (q.scaleView === "stars")
      return (
        <div className="flex gap-0.5">
          {Array.from({ length: n }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "size-5",
                i < sel ? "fill-d3 stroke-d3" : "stroke-border",
              )}
            />
          ))}
        </div>
      );
    if (q.scaleView === "smileys")
      return (
        <div className="flex gap-1.5">
          {Array.from({ length: n }).map((_, i) => {
            const Icon =
              SMILEY_ICONS[n <= 1 ? 2 : Math.round((i / (n - 1)) * 4)];
            return (
              <Icon
                key={i}
                className={cn(
                  "size-6",
                  i + 1 === sel ? "text-d3" : "text-muted-foreground/40",
                )}
              />
            );
          })}
        </div>
      );
    if (q.scaleView === "slider") {
      const steps = Math.max(1, Math.min(20, q.sliderSteps ?? 5));
      const min = q.sliderMin ?? 0,
        max = q.sliderMax ?? 100;
      const ticks = Array.from(
        { length: steps + 1 },
        (_, i) => Math.round((min + ((max - min) * i) / steps) * 100) / 100,
      );
      return (
        <div className="w-full max-w-sm">
          {/* Clean track with a single handle (matches the reference). */}
          <div className="relative h-1.5 rounded-full bg-muted">
            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-card shadow-sm rtl:translate-x-1/2"
              style={{ insetInlineStart: "40%" }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            {ticks.map((tk, i) => (
              <span key={i}>{tk}</span>
            ))}
          </div>
        </div>
      );
    }
    // Labelled scale → auto-width pills (long labels overflow the fixed number dots).
    const hasLabels = q.pointLabels?.some((l) => l && l.trim());
    if (hasLabels)
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: n }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs",
                i + 1 === sel
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-input bg-card text-muted-foreground",
              )}
            >
              {q.pointLabels?.[i] || i + 1}
            </span>
          ))}
          {q.allowNA && <span className={chip}>N/A</span>}
        </div>
      );
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} className={i + 1 === sel ? dotSel : dot}>
            {i + 1}
          </span>
        ))}
        {q.allowNA && <span className={chip}>N/A</span>}
      </div>
    );
  }
  if (q.type === "Yes/No (Boolean)")
    return (
      <div className="flex gap-1.5">
        <span className={chip}>{q.trueLabel || "Yes"}</span>
        <span className={chip}>{q.falseLabel || "No"}</span>
      </div>
    );
  if (q.type === "Ranking") {
    const opts = q.options?.length ? q.options : ["Item 1", "Item 2"];
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {opts.map((o, i) => (
          <span
            key={i}
            className="flex items-center gap-2 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            <b className="text-primary">{i + 1}</b> {o}
          </span>
        ))}
      </div>
    );
  }
  if (q.type === "Input Field") {
    if (q.inputType === "Paragraph")
      return (
        <div className="h-16 rounded-md border border-input bg-muted/30 max-w-sm px-3 py-2 text-xs text-muted-foreground">
          {q.inputType} field…
        </div>
      );
    return (
      <div className="h-9 rounded-md border border-input bg-muted/30 max-w-sm flex items-center px-3 text-xs text-muted-foreground">
        {q.inputType ?? "Text"} field…
      </div>
    );
  }
  if (q.type === "Single-select matrix") {
    const rows = q.matrixRows?.length ? q.matrixRows : ["Row 1", "Row 2"];
    const kpiMode = q.matrixMode === "kpi";
    // KPI mode: columns follow the selected KPI's scale, shown as faces (capped for width).
    const faceCount = Math.min(
      (kpiScalePoints(q.matrixKpi) ?? [1, 2, 3, 4, 5]).length,
      7,
    );
    const cols = kpiMode
      ? Array.from({ length: faceCount })
      : q.matrixCols?.length
        ? q.matrixCols
        : ["A", "B"];
    return (
      <div className="text-xs text-muted-foreground space-y-1">
        {rows.map((r, ri) => (
          <div key={ri} className="flex items-center gap-2">
            <span className="w-20 truncate">{r}</span>
            <div className="flex gap-1.5">
              {cols.map((_, ci) => {
                if (!kpiMode)
                  return (
                    <span
                      key={ci}
                      className="size-4 rounded-full border border-input"
                    />
                  );
                const Icon =
                  SMILEY_ICONS[
                    faceCount <= 1 ? 2 : Math.round((ci / (faceCount - 1)) * 4)
                  ];
                return (
                  <Icon
                    key={ci}
                    className={cn(
                      "size-4",
                      ci === faceCount - 2
                        ? "text-d2"
                        : "text-muted-foreground/40",
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const opts = q.options?.length
    ? q.options
    : ["Option 1", "Option 2", "Option 3"];
  // Multi-select and single-select can render as a dropdown mock.
  const asDropdown =
    (q.type === "Single select" && q.selectDisplay === "dropdown") ||
    (q.type === "Multi-select dropdown" && q.multiDisplay === "dropdown");
  if (asDropdown)
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-card px-3 py-1.5 max-w-sm text-xs text-muted-foreground">
        <span>
          {q.type === "Multi-select dropdown"
            ? `${opts.length} options…`
            : opts[0]}
        </span>
        <ChevronDown className="size-3.5" />
      </div>
    );
  const isMulti = q.type === "Multi-select dropdown";
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-md">
      {opts.map((o, i) => (
        <span
          key={i}
          className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs text-muted-foreground"
        >
          {isMulti ? (
            <Square className="size-3.5 shrink-0 text-muted-foreground/50" />
          ) : (
            <span className="size-3.5 shrink-0 rounded-full border border-input" />
          )}
          {o}
        </span>
      ))}
    </div>
  );
}

// ── Editable list (options / reasons / rows / columns) ────────────────────────
function ListEditor({
  items,
  onChange,
  addLabel,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={it}
            onChange={(e) => {
              const n = [...items];
              n[i] = e.target.value;
              onChange(n);
            }}
            className="h-8 text-sm"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Remove"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Plus className="size-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-input">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="inline-flex size-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors rounded-s-md"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="inline-flex size-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors rounded-e-md"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SurveyQuestionsBuilder({
  isAr,
  initialSections,
  routingEnabled = false,
  boundJourneyId,
  sections: controlledSections,
  onSectionsChange,
}: {
  isAr: boolean;
  initialSections?: Section[];
  routingEnabled?: boolean;
  /** The SURVEY's bound journey (set in Survey details) — KPI questions reflect onto its stages/touchpoints. */
  boundJourneyId?: string;
  /** Controlled mode — the parent owns the sections (e.g. the wizard, for its live preview). */
  sections?: Section[];
  onSectionsChange?: (next: Section[]) => void;
}) {
  const [internalSections, setInternalSections] = useState<Section[]>(
    controlledSections ??
      initialSections ?? [
        {
          id: uid("g"),
          name: isAr ? "عام" : "General",
          questions: [],
          sets: [],
        },
      ],
  );
  const sections = controlledSections ?? internalSections;
  const setSections: React.Dispatch<React.SetStateAction<Section[]>> = (
    updater,
  ) => {
    if (onSectionsChange) {
      const next =
        typeof updater === "function"
          ? (updater as (p: Section[]) => Section[])(sections)
          : updater;
      onSectionsChange(next);
    } else {
      setInternalSections(updater);
    }
  };
  const [selId, setSelId] = useState<string | null>(null);
  const [setSettingsFor, setSetSettingsFor] = useState<{
    secId: string;
    setId: string;
  } | null>(null);
  const [routingFor, setRoutingFor] = useState<string | null>(null);
  // Drag payload: an existing question / section / set being moved, or a brand-new
  // question type dragged in from the palette on the left.
  const dragRef = useRef<
    | { kind: "q"; id: string }
    | { kind: "sec"; id: string }
    | { kind: "set"; id: string }
    | { kind: "new"; qtype: QType }
    | { kind: "newset" }
    | null
  >(null);
  // Visual DnD feedback: id of the item being dragged + the drop target under the cursor.
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const findQ = (): { q: BQuestion; sec: Section } | null => {
    for (const sec of sections) {
      const q = sec.questions.find((x) => x.id === selId);
      if (q) return { q, sec };
      for (const st of sec.sets) {
        const q2 = st.questions.find((x) => x.id === selId);
        if (q2) return { q: q2, sec };
      }
    }
    return null;
  };

  function mutate(fn: (secs: Section[]) => void) {
    setSections((prev) => {
      const next = structuredClone(prev) as Section[];
      fn(next);
      return next;
    });
  }

  // Add into the selected question's section if one is selected, else the first section.
  function addQuestion(type: QType, sectionId?: string) {
    const selSec = sections.find(
      (s) =>
        s.questions.some((x) => x.id === selId) ||
        s.sets.some((st) => st.questions.some((x) => x.id === selId)),
    );
    const targetId = sectionId ?? selSec?.id ?? sections[0]?.id;
    if (!targetId) return;
    const q = makeQuestion(type);
    mutate((secs) => {
      secs.find((s) => s.id === targetId)?.questions.push(q);
    });
    setSelId(q.id);
  }
  function addSection(afterId?: string) {
    const s: Section = {
      id: uid("g"),
      name: `${t("Section", "قسم")} ${sections.length + 1}`,
      questions: [],
      sets: [],
    };
    setSections((prev) => {
      if (!afterId) return [...prev, s];
      const i = prev.findIndex((x) => x.id === afterId);
      if (i < 0) return [...prev, s];
      const arr = [...prev];
      arr.splice(i + 1, 0, s);
      return arr;
    });
  }
  function addSet(sectionId: string, openSettings = true) {
    const newId = uid("s");
    mutate((secs) => {
      secs
        .find((s) => s.id === sectionId)
        ?.sets.push({
          id: newId,
          title: t("New Questions Set", "مجموعة أسئلة جديدة"),
          desc: "",
          selMode: "random",
          count: 2,
          questions: [],
        });
    });
    if (openSettings) setSetSettingsFor({ secId: sectionId, setId: newId });
  }
  function addQToSet(setId: string) {
    const qq = makeQuestion("Single select");
    mutate((secs) => {
      for (const s of secs) {
        const st = s.sets.find((x) => x.id === setId);
        if (st) {
          st.questions.push(qq);
          return;
        }
      }
    });
    setSelId(qq.id);
  }
  function deleteSet(setId: string) {
    mutate((secs) => {
      for (const s of secs) s.sets = s.sets.filter((x) => x.id !== setId);
    });
  }
  function updateSet(setId: string, patch: Partial<QSet>) {
    mutate((secs) => {
      for (const s of secs) {
        const st = s.sets.find((x) => x.id === setId);
        if (st) {
          Object.assign(st, patch);
          return;
        }
      }
    });
  }
  function addParagraph(sectionId: string) {
    const p = makeQuestion("Paragraph");
    mutate((secs) => {
      secs.find((s) => s.id === sectionId)?.questions.push(p);
    });
    setSelId(p.id);
  }
  // ── Drag & drop ──────────────────────────────────────────────
  function moveQuestion(
    qid: string,
    target: {
      secId: string;
      setId?: string;
      beforeQid?: string;
      beforeSetId?: string;
      after?: boolean;
    },
  ) {
    mutate((secs) => {
      let moved: BQuestion | undefined;
      for (const s of secs) {
        const i = s.questions.findIndex((x) => x.id === qid);
        if (i >= 0) {
          moved = s.questions.splice(i, 1)[0];
          break;
        }
        let done = false;
        for (const st of s.sets) {
          const j = st.questions.findIndex((x) => x.id === qid);
          if (j >= 0) {
            moved = st.questions.splice(j, 1)[0];
            done = true;
            break;
          }
        }
        if (done) break;
      }
      if (!moved) return;
      dropFromOrder(secs, { t: "q", id: qid });
      const sec = secs.find((s) => s.id === target.secId);
      if (!sec) return;
      if (target.setId) {
        const list = sec.sets.find((st) => st.id === target.setId)?.questions;
        if (!list) return;
        if (target.beforeQid) {
          const idx = list.findIndex((x) => x.id === target.beforeQid);
          if (idx < 0) list.push(moved);
          else list.splice(target.after ? idx + 1 : idx, 0, moved);
        } else list.push(moved);
        return;
      }
      // Top-level: array position doesn't matter — the order array decides.
      sec.questions.push(moved);
      placeInOrder(
        sec,
        { t: "q", id: qid },
        target.beforeQid
          ? { t: "q", id: target.beforeQid }
          : target.beforeSetId
            ? { t: "set", id: target.beforeSetId }
            : undefined,
        target.after,
      );
    });
  }
  function moveSection(dragId: string, beforeId: string) {
    if (dragId === beforeId) return;
    setSections((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((s) => s.id === dragId);
      if (from < 0) return prev;
      const [m] = arr.splice(from, 1);
      const to = arr.findIndex((s) => s.id === beforeId);
      arr.splice(to < 0 ? arr.length : to, 0, m);
      return arr;
    });
  }
  // Palette drop: create a fresh question of `type` at the drop target.
  function insertNewQuestion(
    type: QType,
    target: {
      secId: string;
      setId?: string;
      beforeQid?: string;
      beforeSetId?: string;
      after?: boolean;
    },
  ) {
    const nq = makeQuestion(type);
    mutate((secs) => {
      const sec = secs.find((s) => s.id === target.secId);
      if (!sec) return;
      if (target.setId) {
        const list = sec.sets.find((st) => st.id === target.setId)?.questions;
        if (!list) return;
        if (target.beforeQid) {
          const idx = list.findIndex((x) => x.id === target.beforeQid);
          if (idx < 0) list.push(nq);
          else list.splice(target.after ? idx + 1 : idx, 0, nq);
        } else list.push(nq);
        return;
      }
      sec.questions.push(nq);
      placeInOrder(
        sec,
        { t: "q", id: nq.id },
        target.beforeQid
          ? { t: "q", id: target.beforeQid }
          : target.beforeSetId
            ? { t: "set", id: target.beforeSetId }
            : undefined,
        target.after,
      );
    });
    setSelId(nq.id);
  }
  // Move a Questions Set to another section / position it relative to an anchor.
  function moveSet(
    setId: string,
    targetSecId: string,
    anchor?: OrderEntry,
    after?: boolean,
  ) {
    if (anchor?.t === "set" && anchor.id === setId) return;
    mutate((secs) => {
      let moved: QSet | undefined;
      for (const s of secs) {
        const i = s.sets.findIndex((x) => x.id === setId);
        if (i >= 0) {
          moved = s.sets.splice(i, 1)[0];
          break;
        }
      }
      if (!moved) return;
      dropFromOrder(secs, { t: "set", id: setId });
      const sec = secs.find((s) => s.id === targetSecId);
      if (!sec) return;
      sec.sets.push(moved);
      placeInOrder(sec, { t: "set", id: setId }, anchor, after);
    });
  }
  const onQuestionDrop = (
    e: React.DragEvent,
    target: {
      secId: string;
      setId?: string;
      beforeQid?: string;
      beforeSetId?: string;
      after?: boolean;
    },
  ) => {
    const d = dragRef.current;
    if (d?.kind === "q") {
      e.preventDefault();
      e.stopPropagation();
      moveQuestion(d.id, target);
    } else if (d?.kind === "new") {
      e.preventDefault();
      e.stopPropagation();
      insertNewQuestion(d.qtype, target);
    }
    dragRef.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  // Card drop with midpoint detection — the reference places the dragged item
  // BEFORE the anchor when dropped on its top half, AFTER on its bottom half.
  const onQCardDrop = (
    e: React.DragEvent,
    where: { secId: string; setId?: string },
    anchorQid: string,
  ) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    onQuestionDrop(e, { ...where, beforeQid: anchorQid, after });
  };
  // Whole-card drag (matches the reference) — the card itself is the drag image.
  // IMPORTANT: the `setDragging` re-render is DEFERRED past the dragstart frame.
  // Setting state synchronously here re-renders the card (opacity class change)
  // while Chrome is still capturing the drag, which silently cancels it — the
  // source of "drag sometimes works, sometimes not".
  const startQDrag = (e: React.DragEvent, id: string) => {
    dragRef.current = { kind: "q", id };
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
    const card = (e.currentTarget as HTMLElement).closest(
      "[data-qcard]",
    ) as HTMLElement | null;
    if (card) e.dataTransfer.setDragImage(card, 20, 20);
    setTimeout(() => setDragging(id), 0);
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  // Hover over a card: track before/after by cursor midpoint, and stop the event
  // here so the enclosing set/section containers don't fight over the highlight.
  const overQCard = (e: React.DragEvent, id: string) => {
    const d = dragRef.current;
    if ((d?.kind === "q" && d.id !== id) || d?.kind === "new") {
      e.preventDefault();
      e.stopPropagation();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      setDropTarget(after ? `${id}|after` : id);
    }
  };
  function deleteQuestion(qid: string) {
    mutate((secs) => {
      for (const s of secs) {
        s.questions = s.questions.filter((q) => q.id !== qid);
        for (const st of s.sets)
          st.questions = st.questions.filter((q) => q.id !== qid);
      }
    });
    if (selId === qid) setSelId(null);
  }
  function deleteSection(sid: string) {
    setSections((prev) =>
      prev.length > 1 ? prev.filter((s) => s.id !== sid) : prev,
    );
  }
  function updateQ(qid: string, patch: Partial<BQuestion>) {
    mutate((secs) => {
      for (const s of secs) {
        const q = s.questions.find((x) => x.id === qid);
        if (q) {
          Object.assign(q, patch);
          return;
        }
        for (const st of s.sets) {
          const q2 = st.questions.find((x) => x.id === qid);
          if (q2) {
            Object.assign(q2, patch);
            return;
          }
        }
      }
    });
  }
  // Changing the question type reseeds the type-specific fields (options, scale,
  // matrix rows, …) from a fresh template while preserving what the respondent-
  // facing question already carries: its text, description, and common toggles.
  function changeType(qid: string, next: QType) {
    mutate((secs) => {
      const apply = (q: BQuestion) => {
        const fresh = makeQuestion(next);
        const keep = {
          id: q.id,
          text: q.text,
          desc: q.desc,
          required: q.required,
          comments: q.comments,
        };
        Object.assign(q, fresh, keep);
      };
      for (const s of secs) {
        const q = s.questions.find((x) => x.id === qid);
        if (q) {
          apply(q);
          return;
        }
        for (const st of s.sets) {
          const q2 = st.questions.find((x) => x.id === qid);
          if (q2) {
            apply(q2);
            return;
          }
        }
      }
    });
  }
  function updateReason(
    qid: string,
    patch: Partial<Reason>,
    cur: Reason | undefined,
  ) {
    updateQ(qid, { reason: { on: false, ...cur, ...patch } });
  }
  function renameSection(sid: string, name: string) {
    mutate((secs) => {
      const s = secs.find((x) => x.id === sid);
      if (s) s.name = name;
    });
  }

  const sel = findQ();

  // ── Question card ─────────────────────────────────────────────
  const ROUTABLE: QType[] = [
    "Single select",
    "Scale",
    "Yes/No (Boolean)",
    "KPI",
  ];
  function QCard({
    q,
    secId,
    setId,
  }: {
    q: BQuestion;
    secId: string;
    setId?: string;
  }) {
    const kpiShort = MOCK_ACTIVE_KPIS.find((k) => k.id === q.kpi)?.shortName;
    const hasRoutes = q.routes && Object.keys(q.routes).length > 0;
    if (q.type === "Paragraph") {
      return (
        <div
          data-qcard
          draggable
          onDragStart={(e) => startQDrag(e, q.id)}
          onDragEnd={endDrag}
          onDragOver={(e) => overQCard(e, q.id)}
          onDragLeave={() =>
            setDropTarget((t) =>
              t === q.id || t === `${q.id}|after` ? null : t,
            )
          }
          onDrop={(e) => onQCardDrop(e, { secId, setId }, q.id)}
          onClick={() => setSelId(q.id)}
          className={cn(
            "relative rounded-lg border bg-muted/30 p-4 cursor-grab active:cursor-grabbing transition-all flex items-start gap-2.5",
            dragging === q.id && "opacity-40",
            dropTarget === q.id &&
              "before:absolute before:inset-x-0 before:-top-1.5 before:h-0.5 before:rounded-full before:bg-primary",
            dropTarget === `${q.id}|after` &&
              "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary",
            selId === q.id
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/40",
          )}
        >
          <span
            className="shrink-0 mt-0.5 text-muted-foreground/50"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </span>
          <Pilcrow className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="flex-1 text-sm text-muted-foreground whitespace-pre-wrap">
            {q.text}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteQuestion(q.id);
            }}
            aria-label={t("Delete paragraph", "حذف الفقرة")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      );
    }
    return (
      <div
        data-qcard
        draggable
        onDragStart={(e) => startQDrag(e, q.id)}
        onDragEnd={endDrag}
        onDragOver={(e) => overQCard(e, q.id)}
        onDragLeave={() =>
          setDropTarget((t) => (t === q.id || t === `${q.id}|after` ? null : t))
        }
        onDrop={(e) => onQCardDrop(e, { secId, setId }, q.id)}
        onClick={() => setSelId(q.id)}
        className={cn(
          "relative rounded-lg border bg-card p-4 cursor-grab active:cursor-grabbing transition-all",
          dragging === q.id && "opacity-40",
          dropTarget === q.id &&
            "before:absolute before:inset-x-0 before:-top-1.5 before:h-0.5 before:rounded-full before:bg-primary",
          dropTarget === `${q.id}|after` &&
            "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary",
          selId === q.id
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-primary/40 hover:shadow-sm",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="shrink-0 mt-0.5 text-muted-foreground/50"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {q.text || t("Untitled question", "سؤال بلا عنوان")}
              {q.required && <span className="text-destructive ms-1">*</span>}
            </p>
            {q.desc && (
              <p className="text-xs text-muted-foreground">{q.desc}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {q.type === "KPI" ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-nb-mint-100 text-nb-mint-800 dark:bg-nb-mint-900/40 dark:text-nb-mint-200 px-1.5 py-0.5 text-xs font-medium">
                    <Gauge className="size-3" /> KPI · {kpiShort ?? "—"}
                  </span>
                  {q.touchpoint && (
                    <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                      {q.touchpoint}
                    </span>
                  )}
                </>
              ) : (
                <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                  {q.type}
                </span>
              )}
              {q.required && (
                <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                  {t("Required", "مطلوب")}
                </span>
              )}
              {q.comments && (
                <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                  {t("Comments field", "حقل تعليق")}
                </span>
              )}
              {q.reason?.on && (
                <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                  {t("Reason follow-up", "متابعة السبب")}
                </span>
              )}
              {hasRoutes && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200 px-1.5 py-0.5 text-xs font-medium">
                  <GitBranch className="size-3" />
                  {t("Routing set", "توجيه مضبوط")}
                </span>
              )}
            </div>
            <div className="pt-1">
              <QPreview q={q} />
            </div>
            {q.comments && (
              <Input
                disabled
                placeholder={t(
                  "Add a comment (optional)…",
                  "أضف تعليقاً (اختياري)…",
                )}
                className="h-8 text-xs"
              />
            )}
            {q.reason?.on && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Lightbulb className="size-3.5 shrink-0" />
                {q.reason.prompt || t("Reason on answer", "السبب عند الإجابة")}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {routingEnabled && ROUTABLE.includes(q.type) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelId(q.id);
                  setRoutingFor(q.id);
                }}
                aria-label={t("Answer routing", "توجيه الإجابات")}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                  hasRoutes
                    ? "text-nb-cyan-700 dark:text-nb-cyan-200 hover:bg-accent"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <GitBranch className="size-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteQuestion(q.id);
              }}
              aria-label={t("Delete question", "حذف السؤال")}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = sel?.q;
  const kpiScale = q
    ? MOCK_ACTIVE_KPIS.find((k) => k.id === q.kpi)?.scale
    : undefined;
  // NAMED perspectives only — "overall" is the no-perspective aggregate, offered
  // as the "— Overall (no perspective)" default (mirrors the reference).
  const namedPerspectives = (q?.kpi ? (KPI_PERSPECTIVES[q.kpi] ?? []) : []).filter(
    (p) => p.value !== "overall",
  );
  // The survey's bound journey drives the stage list; with none set, fall back to
  // the first journey's stages (mirrors the reference's default stage list).
  const boundJourney = MOCK_JOURNEYS_FOR_BINDING.find((j) => j.id === boundJourneyId);
  const boundJourneyLabel = boundJourney
    ? isAr
      ? boundJourney.nameAr
      : boundJourney.nameEn
    : undefined;
  const stages =
    MOCK_STAGES_BY_JOURNEY[boundJourneyId ?? ""] ??
    MOCK_STAGES_BY_JOURNEY[MOCK_JOURNEYS_FOR_BINDING[0]?.id ?? ""] ??
    [];
  const touchpoints = q?.stageId
    ? (MOCK_TOUCHPOINTS_BY_STAGE[q.stageId] ?? [])
    : [];

  // Shared "Question sub-type" descriptor — the one control right under Question type
  // whose options depend on the type (mirrors the reference's SUBTYPES map). For a KPI
  // question the sub-type is the KPI metric itself (CSAT/NPS/…), synced with the KPI
  // select in the KPI-connection section below.
  const mkSub = (
    value: string,
    options: [string, string][],
    set: (v: string) => void,
  ) => ({ value, options, set });
  const subType = !q
    ? null
    : ((): {
        value: string;
        options: [string, string][];
        set: (v: string) => void;
      } | null => {
        switch (q.type) {
          case "KPI":
            return mkSub(
              q.kpi ?? "csat",
              MOCK_ACTIVE_KPIS.map(
                (k) => [k.id, k.shortName] as [string, string],
              ),
              (v) => updateQ(q.id, { kpi: v, perspective: "overall" }),
            );
          case "Scale":
            return mkSub(
              q.scaleView ?? "labels",
              [
                ["labels", t("Labels", "تسميات")],
                ["stars", t("Stars", "نجوم")],
                ["smileys", t("Smileys", "وجوه")],
                ["slider", t("Slider", "شريط تمرير")],
              ],
              (v) => updateQ(q.id, { scaleView: v as BQuestion["scaleView"] }),
            );
          case "Input Field":
            return mkSub(
              q.inputType ?? "Text",
              INPUT_TYPES.map((x) => [x, x] as [string, string]),
              (v) => updateQ(q.id, { inputType: v }),
            );
          case "Single select":
            return mkSub(
              q.selectDisplay ?? "radio",
              [
                ["radio", t("Radio", "أزرار اختيار")],
                ["dropdown", t("Dropdown", "قائمة منسدلة")],
              ],
              (v) =>
                updateQ(q.id, {
                  selectDisplay: v as BQuestion["selectDisplay"],
                }),
            );
          case "Multi-select dropdown":
            return mkSub(
              q.multiDisplay ?? "checkboxes",
              [
                ["checkboxes", t("Checkboxes", "مربعات اختيار")],
                ["dropdown", t("Dropdown", "قائمة منسدلة")],
              ],
              (v) =>
                updateQ(q.id, { multiDisplay: v as BQuestion["multiDisplay"] }),
            );
          case "Yes/No (Boolean)":
            return mkSub(
              q.boolDisplay ?? "buttons",
              [
                ["buttons", t("Buttons", "أزرار")],
                ["toggle", t("Toggle switch", "مفتاح تبديل")],
              ],
              (v) =>
                updateQ(q.id, { boolDisplay: v as BQuestion["boolDisplay"] }),
            );
          case "Ranking":
            return mkSub(
              q.rankDisplay ?? "drag",
              [
                ["drag", t("Drag to rank", "سحب للترتيب")],
                ["numbered", t("Numbered list", "قائمة مرقّمة")],
              ],
              (v) =>
                updateQ(q.id, { rankDisplay: v as BQuestion["rankDisplay"] }),
            );
          case "Single-select matrix":
            return mkSub(
              q.matrixMode ?? "custom",
              [
                ["custom", t("Custom columns", "أعمدة مخصصة")],
                ["kpi", t("KPI scale (faces)", "مقياس KPI (وجوه)")],
              ],
              (v) => {
                if (v === "kpi")
                  updateQ(q.id, {
                    matrixMode: "kpi",
                    matrixRows: perspectiveRows(q.matrixKpi ?? "csat", isAr),
                  });
                else updateQ(q.id, { matrixMode: "custom" });
              },
            );
          default:
            return null;
        }
      })();

  function bindTouchpoint(qq: BQuestion, tpId: string) {
    // Stage comes from the survey's bound journey (the derived `stages` list).
    const stage = stages.find((s) => s.id === qq.stageId);
    const tp = MOCK_TOUCHPOINTS_BY_STAGE[qq.stageId ?? ""]?.find(
      (x) => x.id === tpId,
    );
    updateQ(qq.id, {
      touchpointId: tpId,
      touchpoint:
        stage && tp
          ? `${isAr ? stage.nameAr : stage.nameEn} → ${isAr ? tp.nameAr : tp.nameEn}`
          : undefined,
    });
  }

  return (
    <div style={{ zoom: 0.95 }} className="flex items-stretch gap-4">
      {/* ── Palette ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 rounded-lg border border-border bg-card shadow-sm dark:shadow-none overflow-y-auto p-3 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t("Metric", "المقياس")}
          </p>
          <button
            draggable
            onDragStart={(e) => {
              dragRef.current = { kind: "new", qtype: "KPI" };
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={endDrag}
            onClick={() => addQuestion("KPI")}
            className="w-full flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-start hover:border-primary hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-nb-mint-100 text-nb-mint-700 dark:bg-nb-mint-900/40 dark:text-nb-mint-200 shrink-0">
              <Gauge className="size-4" />
            </span>
            <span className="text-xs font-medium">
              {t("KPI question", "سؤال KPI")}
            </span>
          </button>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t("Question types", "أنواع الأسئلة")}
          </p>
          <div className="space-y-1.5">
            {PALETTE_TYPES.map((pt) => {
              const Icon = pt.icon;
              return (
                <button
                  key={pt.type}
                  draggable
                  onDragStart={(e) => {
                    dragRef.current = { kind: "new", qtype: pt.type };
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={endDrag}
                  onClick={() => addQuestion(pt.type)}
                  className="w-full flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-start hover:border-primary hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium">
                    {isAr ? pt.labelAr : pt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t("Structure", "البنية")}
          </p>
          <button
            draggable
            onDragStart={(e) => {
              dragRef.current = { kind: "newset" };
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={endDrag}
            onClick={() => sections[0] && addSet(sections[0].id)}
            className="w-full flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-start hover:border-primary hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
              <Layers className="size-4" />
            </span>
            <span className="text-xs font-medium">
              {t("Questions Set", "مجموعة أسئلة")}
            </span>
          </button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto rounded-lg border border-border border-0 bg-muted/40 dark:bg-muted/20 p-0 space-y-4">
        {sections.map((sec, si) => (
          <div
            key={sec.id}
            className={cn(
              "relative rounded-lg border border-border bg-card shadow-sm dark:shadow-none transition-opacity",
              dragging === sec.id && "opacity-50",
              dropTarget === `sec-${sec.id}` &&
                "before:absolute before:inset-x-0 before:-top-2 before:h-0.5 before:rounded-full before:bg-primary",
            )}
            onDragOver={(e) => {
              const d = dragRef.current;
              if (!d) return;
              if (d.kind === "sec" && d.id !== sec.id) {
                e.preventDefault();
                setDropTarget(`sec-${sec.id}`);
              } else if (d.kind !== "sec") {
                // Anything droppable is accepted anywhere on the section block
                // (header included) — mirrors the reference's groupDrop.
                e.preventDefault();
              }
            }}
            onDragLeave={() =>
              setDropTarget((t) => (t === `sec-${sec.id}` ? null : t))
            }
            onDrop={(e) => {
              const d = dragRef.current;
              if (!d) return;
              e.preventDefault();
              if (d.kind === "sec") {
                moveSection(d.id, sec.id);
                endDrag();
              } else if (d.kind === "set") {
                moveSet(d.id, sec.id);
                endDrag();
              } else if (d.kind === "newset") {
                addSet(sec.id, false);
                endDrag();
              } else {
                // q / new → append to the end of this section.
                onQuestionDrop(e, { secId: sec.id });
              }
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span
                draggable
                onDragStart={(e) => {
                  dragRef.current = { kind: "sec", id: sec.id };
                  e.dataTransfer.effectAllowed = "move";
                  e.stopPropagation();
                  // Deferred — a sync re-render during dragstart cancels the drag.
                  setTimeout(() => setDragging(sec.id), 0);
                }}
                onDragEnd={endDrag}
                className="shrink-0 cursor-grab active:cursor-grabbing"
                aria-label={t("Drag section", "اسحب القسم")}
              >
                <GripVertical className="size-4 text-muted-foreground/50" />
              </span>
              <span className="size-2.5 rounded-full bg-nb-mint shrink-0" />
              <input
                defaultValue={sec.name}
                onBlur={(e) => renameSection(sec.id, e.target.value)}
                className="text-sm font-bold bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-1 min-w-0"
              />
              <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground shrink-0">
                {t("Section", "قسم")} {si + 1}
              </span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">
                {sec.questions.length} {t("questions", "سؤال")} ·{" "}
                {sec.sets.length} {t("sets", "مجموعة")}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("Section menu", "قائمة القسم")}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors shrink-0"
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => addParagraph(sec.id)}>
                    <Pilcrow className="size-4 me-2" />
                    {t("Add paragraph", "إضافة فقرة")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection(sec.id)}>
                    <Plus className="size-4 me-2" />
                    {t("Add section", "إضافة قسم")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteSection(sec.id)}
                  >
                    <Trash2 className="size-4 me-2" />
                    {t("Delete section", "حذف القسم")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div
              className="p-4 space-y-3 min-h-16"
              onDragOver={(e) => {
                const k = dragRef.current?.kind;
                if (k === "q" || k === "new" || k === "set" || k === "newset")
                  e.preventDefault();
              }}
              onDrop={(e) => {
                const d = dragRef.current;
                if (d?.kind === "set") {
                  e.preventDefault();
                  e.stopPropagation();
                  moveSet(d.id, sec.id);
                  endDrag();
                } else if (d?.kind === "newset") {
                  e.preventDefault();
                  e.stopPropagation();
                  addSet(sec.id, false);
                  endDrag();
                } else onQuestionDrop(e, { secId: sec.id });
              }}
            >
              {/* Questions and sets interleave freely, driven by the section's order. */}
              {orderedOf(sec).map((entry) => {
                if (entry.t === "q") {
                  const qq = sec.questions.find((x) => x.id === entry.id);
                  return qq ? (
                    <QCard key={qq.id} q={qq} secId={sec.id} />
                  ) : null;
                }
                const st = sec.sets.find((x) => x.id === entry.id);
                if (!st) return null;
                return (
                  <div
                    key={st.id}
                    className={cn(
                      "relative rounded-lg border border-nb-cyan-200 dark:border-nb-cyan-900/60 bg-nb-cyan-100/30 dark:bg-nb-cyan-900/10 p-3 space-y-2 transition-opacity",
                      dragging === st.id && "opacity-40",
                      dropTarget === `setrow-${st.id}` &&
                        "before:absolute before:inset-x-0 before:-top-2 before:h-0.5 before:rounded-full before:bg-primary",
                      dropTarget === `setrow-${st.id}|after` &&
                        "after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-primary",
                    )}
                    data-setblock={st.id}
                    onDragOver={(e) => {
                      // The set HEAD/edges anchor drops relative to the whole set:
                      // a set reorders around it; a question / palette type lands
                      // before or after it in the section's order. (The set BODY
                      // below stops propagation, so "into the pool" still wins there.)
                      const d = dragRef.current;
                      const anchorable =
                        (d?.kind === "set" && d.id !== st.id) ||
                        d?.kind === "q" ||
                        d?.kind === "new";
                      if (!anchorable) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const r = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const after = e.clientY > r.top + r.height / 2;
                      setDropTarget(
                        after ? `setrow-${st.id}|after` : `setrow-${st.id}`,
                      );
                    }}
                    onDragLeave={() =>
                      setDropTarget((t) =>
                        t === `setrow-${st.id}` || t === `setrow-${st.id}|after`
                          ? null
                          : t,
                      )
                    }
                    onDrop={(e) => {
                      const d = dragRef.current;
                      if (!d) return;
                      const r = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const after = e.clientY > r.top + r.height / 2;
                      if (d.kind === "set") {
                        e.preventDefault();
                        e.stopPropagation();
                        moveSet(d.id, sec.id, { t: "set", id: st.id }, after);
                        endDrag();
                      } else if (d.kind === "q" || d.kind === "new") {
                        // Place the question before/after this set in the section order.
                        onQuestionDrop(e, {
                          secId: sec.id,
                          beforeSetId: st.id,
                          after,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        draggable
                        onDragStart={(e) => {
                          dragRef.current = { kind: "set", id: st.id };
                          e.dataTransfer.effectAllowed = "move";
                          e.stopPropagation();
                          const block = (
                            e.currentTarget as HTMLElement
                          ).closest("[data-setblock]") as HTMLElement | null;
                          if (block) e.dataTransfer.setDragImage(block, 20, 20);
                          // Deferred — a sync re-render during dragstart cancels the drag.
                          setTimeout(() => setDragging(st.id), 0);
                        }}
                        onDragEnd={endDrag}
                        className="shrink-0 cursor-grab active:cursor-grabbing text-nb-cyan-700/60 dark:text-nb-cyan-200/60"
                        aria-label={t(
                          "Drag Questions Set",
                          "اسحب مجموعة الأسئلة",
                        )}
                      >
                        <GripVertical className="size-4" />
                      </span>
                      <Layers className="size-4 text-nb-cyan-700 dark:text-nb-cyan-200 shrink-0" />
                      <b className="text-sm truncate">{st.title}</b>
                      <span className="rounded-sm bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200 px-1.5 py-0.5 text-xs font-medium shrink-0">
                        {t("Questions Set", "مجموعة أسئلة")}
                      </span>
                      <span className="flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t("shows", "يعرض")}{" "}
                        {Math.min(st.count, st.questions.length || st.count)}{" "}
                        {t("of", "من")} {st.questions.length} ·{" "}
                        {st.selMode === "low"
                          ? t("prioritize low-response", "أولوية للأقل استجابة")
                          : t("random", "عشوائي")}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => addQToSet(st.id)}
                          aria-label={t(
                            "Add question to set",
                            "إضافة سؤال للمجموعة",
                          )}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Plus className="size-4" />
                        </button>
                        <button
                          onClick={() =>
                            setSetSettingsFor({ secId: sec.id, setId: st.id })
                          }
                          aria-label={t("Set settings", "إعدادات المجموعة")}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Settings2 className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteSet(st.id)}
                          aria-label={t("Delete set", "حذف المجموعة")}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    {st.desc && (
                      <p className="text-xs text-muted-foreground -mt-1 ps-6">
                        {st.desc}
                      </p>
                    )}
                    <div
                      className={cn(
                        "space-y-2 min-h-10 rounded-md transition-colors",
                        dropTarget === `set-${st.id}` &&
                          "ring-2 ring-primary/40 bg-primary/5",
                      )}
                      onDragOver={(e) => {
                        const k = dragRef.current?.kind;
                        if (k === "q" || k === "new") {
                          e.preventDefault();
                          e.stopPropagation();
                          setDropTarget(`set-${st.id}`);
                        }
                      }}
                      onDragLeave={() =>
                        setDropTarget((t) => (t === `set-${st.id}` ? null : t))
                      }
                      onDrop={(e) =>
                        onQuestionDrop(e, { secId: sec.id, setId: st.id })
                      }
                    >
                      {st.questions.length ? (
                        st.questions.map((qq) => (
                          <QCard
                            key={qq.id}
                            q={qq}
                            secId={sec.id}
                            setId={st.id}
                          />
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                          {t(
                            "Empty set — add or drag questions into this pool.",
                            "مجموعة فارغة — أضف أو اسحب أسئلة إلى هذا التجمع.",
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!sec.questions.length && !sec.sets.length && (
                <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  {t(
                    "Empty section. Add a type from the palette on the left, or use the section menu.",
                    "قسم فارغ. أضف نوعاً من اللوحة على اليسار، أو استخدم قائمة القسم.",
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => addSection()}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="size-4" />
          {t("Add section", "إضافة قسم")}
        </button>
      </div>

      {/* ── Config panel ────────────────────────────────── */}
      <div className="w-72 xl:w-80 shrink-0 rounded-lg border border-border bg-card shadow-sm dark:shadow-none overflow-y-auto">
        {!q ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Settings2 className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground max-w-48">
              {t(
                "Select a question to configure it, or add one from the palette.",
                "اختر سؤالاً لتهيئته، أو أضف واحداً من اللوحة.",
              )}
            </p>
          </div>
        ) : q.type === "Paragraph" ? (
          <div className="p-4 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Paragraph", "فقرة")}
            </p>
            <div className="space-y-1.5">
              <Label>{t("Text", "النص")}</Label>
              <Textarea
                value={q.text}
                onChange={(e) => updateQ(q.id, { text: e.target.value })}
                className="min-h-32"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Static text shown to respondents — not a question.",
                  "نص ثابت يُعرض للمشاركين — ليس سؤالاً.",
                )}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => deleteQuestion(q.id)}
            >
              <Trash2 className="size-4" />
              {t("Delete paragraph", "حذف الفقرة")}
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Question settings", "إعدادات السؤال")}
            </p>

            <div className="space-y-1.5">
              <Label>{t("Question text", "نص السؤال")}</Label>
              <Input
                value={q.text}
                onChange={(e) => updateQ(q.id, { text: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              {/* `block` overrides Label's flex base so label + hint flow as one sentence. */}
              <Label className="block leading-snug">
                {t("Description", "الوصف")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t(
                    "— optional, shown under the question",
                    "— اختياري، يظهر تحت السؤال",
                  )}
                </span>
              </Label>
              <Textarea
                value={q.desc ?? ""}
                onChange={(e) => updateQ(q.id, { desc: e.target.value })}
                placeholder={t(
                  "Helper text for respondents.",
                  "نص مساعد للمشاركين.",
                )}
                className="min-h-16"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("Question type", "نوع السؤال")}</Label>
              <Select
                value={q.type}
                onValueChange={(v) =>
                  v && v !== q.type && changeType(q.id, v as QType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {q.type === "KPI"
                      ? "KPI"
                      : (PALETTE_TYPES.find((p) => p.type === q.type)?.label ??
                        q.type)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KPI">KPI</SelectItem>
                  {PALETTE_TYPES.map((pt) => (
                    <SelectItem key={pt.type} value={pt.type}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Question sub-type (options depend on the type) ── */}
            {subType && (
              <div className="space-y-1.5">
                <Label className="block leading-snug">
                  <span className="whitespace-nowrap">
                    {t("Question sub-type", "النوع الفرعي")}
                  </span>{" "}
                  <span className="text-muted-foreground font-normal">
                    {t(
                      "— options depend on the question type",
                      "— تعتمد الخيارات على نوع السؤال",
                    )}
                  </span>
                </Label>
                <Select
                  value={subType.value}
                  onValueChange={(v) => v && subType.set(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {subType.options.find(
                        (o) => o[0] === subType.value,
                      )?.[1] ?? subType.value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subType.options.map((o) => (
                      <SelectItem key={o[0]} value={o[0]}>
                        {o[1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Comments + Required (before type-specific sections) ── */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Label>{t("Show comments field", "إظهار حقل التعليق")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Show an optional free-text comment box under the question after it is answered. The comment travels with the response for M-05 text analytics.",
                    "أظهِر حقل تعليق نصي حر اختياري تحت السؤال بعد الإجابة عليه. يُرفَق التعليق مع الرد لتحليل النصوص في M-05.",
                  )}
                </p>
              </div>
              <Switch
                className="mt-0.5 shrink-0"
                checked={q.comments ?? false}
                onCheckedChange={(v) => updateQ(q.id, { comments: v })}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Label>{t("Required question", "سؤال مطلوب")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Respondents must answer before submitting.",
                    "يجب على المشاركين الإجابة قبل الإرسال.",
                  )}
                </p>
              </div>
              <Switch
                className="mt-0.5 shrink-0"
                checked={q.required}
                onCheckedChange={(v) => updateQ(q.id, { required: v })}
              />
            </div>

            {/* ── KPI connection ─────────────────────────── */}
            {q.type === "KPI" && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-3">
                  {t("KPI connection", "ربط المؤشر")}
                </p>
                <div className="space-y-1.5">
                  <Label>{t("KPI", "المؤشر")}</Label>
                  <Select
                    value={q.kpi ?? "csat"}
                    onValueChange={(v) =>
                      v && updateQ(q.id, { kpi: v, perspective: "overall" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {MOCK_ACTIVE_KPIS.find((k) => k.id === q.kpi)
                          ?.shortName ?? "CSAT"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_ACTIVE_KPIS.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.shortName} — {k.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      `Scale follows the KPI's settings (${kpiScale ?? "—"}).`,
                      `المقياس يتبع إعدادات المؤشر (${kpiScale ?? "—"}).`,
                    )}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="block leading-snug">
                    {t("Perspective", "المنظور")}{" "}
                    <span className="text-muted-foreground font-normal">
                      {t("— optional", "— اختياري")}
                    </span>
                  </Label>
                  {namedPerspectives.length ? (
                    <>
                      <Select
                        value={q.perspective ?? "overall"}
                        onValueChange={(v) =>
                          v && updateQ(q.id, { perspective: v })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(isAr
                              ? namedPerspectives.find(
                                  (p) => p.value === q.perspective,
                                )?.labelAr
                              : namedPerspectives.find(
                                  (p) => p.value === q.perspective,
                                )?.labelEn) ??
                              t("— Overall (no perspective)", "— عام (بدون منظور)")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">
                            {t("— Overall (no perspective)", "— عام (بدون منظور)")}
                          </SelectItem>
                          {namedPerspectives.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {isAr ? p.labelAr : p.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Perspectives change with the selected KPI.",
                          "تتغير المناظير حسب المؤشر المختار.",
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        `No perspectives defined for ${MOCK_ACTIVE_KPIS.find((k) => k.id === q.kpi)?.shortName ?? "this KPI"}.`,
                        "لا توجد مناظير معرّفة لهذا المؤشر.",
                      )}
                    </p>
                  )}
                </div>
                {/* Bound journey — reflects onto the SURVEY's bound journey (Survey details); ON by default. */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label>{t("Bound journey", "ربط برحلة")}</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isAr ? (
                        <>اعكس هذا المؤشر على رحلة الاستبيان المرتبطة (<b className="text-foreground">{boundJourneyLabel ?? "غير محددة — اختياري، اخترها في إعدادات الاستبيان"}</b>). أوقفه لترك المؤشر مستقلاً عن الرحلة.</>
                      ) : (
                        <>Reflect this KPI on the survey's bound journey (<b className="text-foreground">{boundJourneyLabel ?? "not set — optional, choose in Survey Settings"}</b>). Turn off to leave this KPI journey-independent.</>
                      )}
                    </p>
                  </div>
                  <Switch
                    className="mt-0.5 shrink-0"
                    checked={q.boundJourney !== false}
                    onCheckedChange={(v) =>
                      updateQ(
                        q.id,
                        v
                          ? { boundJourney: true }
                          : {
                              boundJourney: false,
                              stageId: undefined,
                              touchpointId: undefined,
                              touchpoint: undefined,
                            },
                      )
                    }
                  />
                </div>
                {/* Stage + Touchpoint stay visible; they disable when the toggle is off. */}
                <div className="space-y-1.5">
                  <Label>{t("Stage", "المرحلة")}</Label>
                  <Select
                    value={q.stageId ?? "none"}
                    disabled={q.boundJourney === false}
                    onValueChange={(v) =>
                      updateQ(q.id, {
                        stageId: v && v !== "none" ? v : undefined,
                        touchpointId: undefined,
                        touchpoint: undefined,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {q.stageId
                          ? (isAr
                              ? stages.find((s) => s.id === q.stageId)?.nameAr
                              : stages.find((s) => s.id === q.stageId)?.nameEn) ??
                            t("— None —", "— بدون —")
                          : t("— None —", "— بدون —")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("— None —", "— بدون —")}</SelectItem>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {isAr ? s.nameAr : s.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Stages come from the bound journey. None by default.",
                      "تأتي المراحل من الرحلة المرتبطة. بدون افتراضياً.",
                    )}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="block leading-snug">
                    {t("Touchpoint", "نقطة التماس")}{" "}
                    <span className="text-muted-foreground font-normal">
                      {t("— within the selected stage", "— ضمن المرحلة المختارة")}
                    </span>
                  </Label>
                  <Select
                    value={q.touchpointId ?? "none"}
                    disabled={q.boundJourney === false || !q.stageId}
                    onValueChange={(v) => {
                      if (v && v !== "none") bindTouchpoint(q, v);
                      else
                        updateQ(q.id, {
                          touchpointId: undefined,
                          touchpoint: undefined,
                        });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {q.touchpointId
                          ? (isAr
                              ? touchpoints.find((x) => x.id === q.touchpointId)
                                  ?.nameAr
                              : touchpoints.find((x) => x.id === q.touchpointId)
                                  ?.nameEn) ?? t("— None —", "— بدون —")
                          : t("— None —", "— بدون —")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("— None —", "— بدون —")}</SelectItem>
                      {touchpoints.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {isAr ? x.nameAr : x.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Allow "N/A"', "السماح بـ N/A")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'Add a "not applicable" choice to the scale.',
                        "أضف خيار «لا ينطبق» إلى المقياس.",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={q.allowNA ?? false}
                    onCheckedChange={(v) => updateQ(q.id, { allowNA: v })}
                  />
                </div>
                <div className="flex items-start gap-2 rounded-md bg-accent border border-border p-3 text-xs text-muted-foreground leading-relaxed">
                  <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>
                    {isAr ? (
                      <>يرتبط سؤال المؤشر بـ<b className="text-foreground">نقطة تماس واحدة</b>.</>
                    ) : (
                      <>A KPI question binds to a <b className="text-foreground">single touchpoint</b>.</>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* ── Scale options ──────────────────────────── */}
            {q.type === "Scale" && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-3">
                  {t("Scale options", "خيارات المقياس")}
                </p>
                {q.scaleView !== "slider" && (
                  <div className="flex items-center justify-between">
                    <Label>{t("Points", "النقاط")}</Label>
                    <Stepper
                      value={q.scalePoints ?? 5}
                      min={2}
                      max={10}
                      onChange={(v) => updateQ(q.id, { scalePoints: v })}
                    />
                  </div>
                )}
                {q.scaleView === "labels" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t(
                        "Point labels — leave blank to use the number",
                        "تسميات النقاط — اتركها فارغة لاستخدام الرقم",
                      )}
                    </Label>
                    {Array.from({ length: q.scalePoints ?? 5 }).map((_, i) => (
                      <Input
                        key={i}
                        value={q.pointLabels?.[i] ?? ""}
                        placeholder={`${i + 1}`}
                        className="h-8 text-sm"
                        onChange={(e) => {
                          const n = [...(q.pointLabels ?? [])];
                          n[i] = e.target.value;
                          updateQ(q.id, { pointLabels: n });
                        }}
                      />
                    ))}
                  </div>
                )}
                {q.scaleView === "slider" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("Lower limit", "الحد الأدنى")}
                      </Label>
                      <Input
                        type="number"
                        className="tabular-nums"
                        value={q.sliderMin ?? 0}
                        onChange={(e) =>
                          updateQ(q.id, { sliderMin: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("Higher limit", "الحد الأعلى")}
                      </Label>
                      <Input
                        type="number"
                        className="tabular-nums"
                        value={q.sliderMax ?? 100}
                        onChange={(e) =>
                          updateQ(q.id, { sliderMax: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        {t("Number of steps", "عدد الخطوات")}
                      </Label>
                      <Stepper
                        value={q.sliderSteps ?? 5}
                        min={1}
                        max={20}
                        onChange={(v) => updateQ(q.id, { sliderSteps: v })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t(
                          `Intermediate values are calculated automatically: ${sliderTicks(q).join(", ")}.`,
                          `تُحسب القيم الوسطية تلقائياً: ${sliderTicks(q).join("، ")}.`,
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Choice options (single / multi / ranking) ── */}
            {(q.type === "Single select" ||
              q.type === "Multi-select dropdown" ||
              q.type === "Ranking") && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-3">
                  {t("Options", "الخيارات")}
                </p>
                <ListEditor
                  items={q.options ?? []}
                  onChange={(v) => updateQ(q.id, { options: v })}
                  addLabel={
                    q.type === "Ranking"
                      ? t("Add item…", "إضافة عنصر…")
                      : t("Add option…", "إضافة خيار…")
                  }
                />
              </div>
            )}

            {/* ── Yes/No labels ──────────────────────────── */}
            {q.type === "Yes/No (Boolean)" && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-3">
                  {t("Answer labels", "تسميات الإجابة")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('"True" label', "تسمية «نعم»")}
                    </Label>
                    <Input
                      value={q.trueLabel ?? "Yes"}
                      onChange={(e) =>
                        updateQ(q.id, { trueLabel: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('"False" label', "تسمية «لا»")}
                    </Label>
                    <Input
                      value={q.falseLabel ?? "No"}
                      onChange={(e) =>
                        updateQ(q.id, { falseLabel: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Matrix ─────────────────────────────────── */}
            {q.type === "Single-select matrix" && (
              <div className="space-y-3 pt-1 border-t border-border">
                {/* KPI-mode rows note — always shown for a matrix (matches the reference). */}
                <div className="flex items-start gap-2 rounded-md bg-accent border border-border p-3 text-xs text-muted-foreground leading-relaxed mt-3">
                  <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>
                    {t(
                      "KPI mode rows: a newly added row counts toward the KPI's overall score like any other question, but it is not a new perspective — perspectives are defined in KPI Management (M-06) and only they receive per-perspective calculations.",
                      "صفوف وضع KPI: أي صف مُضاف يُحتسب ضمن الدرجة الإجمالية للمؤشر كأي سؤال آخر، لكنه ليس منظوراً جديداً — تُعرَّف المناظير في إدارة المؤشرات (M-06) وهي وحدها التي تحصل على حسابات لكل منظور.",
                    )}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("Rating scale", "مقياس التقييم")}
                </p>
                {q.matrixMode === "kpi" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("KPI", "المؤشر")}
                      </Label>
                      <Select
                        value={q.matrixKpi ?? "csat"}
                        onValueChange={(v) =>
                          v &&
                          updateQ(q.id, {
                            matrixKpi: v,
                            matrixRows: perspectiveRows(v, isAr),
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {MOCK_ACTIVE_KPIS.find((k) => k.id === q.matrixKpi)
                              ?.shortName ?? "CSAT"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_ACTIVE_KPIS.map((k) => (
                            <SelectItem key={k.id} value={k.id}>
                              {k.shortName} — {k.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          `Columns follow the ${MOCK_ACTIVE_KPIS.find((k) => k.id === q.matrixKpi)?.shortName ?? "CSAT"} scale configured in KPI settings, shown as faces.`,
                          "تتبع الأعمدة مقياس المؤشر المُهيّأ في إعداداته، وتُعرض كوجوه.",
                        )}
                      </p>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {q.matrixMode === "kpi"
                      ? t("Perspectives", "المناظير")
                      : t("Items / rows", "العناصر / الصفوف")}
                  </Label>
                  {q.matrixMode === "kpi" && (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Rows are the KPI's perspectives. Rename the display name or remove any you don't need.",
                        "الصفوف هي مناظير المؤشر. أعد تسمية اسم العرض أو احذف ما لا تحتاجه.",
                      )}
                    </p>
                  )}
                  <ListEditor
                    items={q.matrixRows ?? []}
                    onChange={(v) => updateQ(q.id, { matrixRows: v })}
                    addLabel={
                      q.matrixMode === "kpi"
                        ? t("Add perspective…", "إضافة منظور…")
                        : t("Add row…", "إضافة صف…")
                    }
                  />
                </div>
                {q.matrixMode === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("Column labels", "تسميات الأعمدة")}
                    </Label>
                    <ListEditor
                      items={q.matrixCols ?? []}
                      onChange={(v) => updateQ(q.id, { matrixCols: v })}
                      addLabel={t("Add column…", "إضافة عمود…")}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Allow "N/A"', "السماح بـ N/A")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'Add a "not applicable" column.',
                        "أضف عمود «لا ينطبق».",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={q.allowNA ?? false}
                    onCheckedChange={(v) => updateQ(q.id, { allowNA: v })}
                  />
                </div>
              </div>
            )}

            {/* ── Input Field ────────────────────────────── */}
            {q.type === "Input Field" && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-3">
                  {t("Field type", "نوع الحقل")}
                </p>
                <div className="space-y-1.5">
                  <Select
                    value={q.inputType ?? "Text"}
                    onValueChange={(v) => v && updateQ(q.id, { inputType: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{q.inputType ?? "Text"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'Choose "Paragraph" for a long, multi-line answer.',
                      "اختر «فقرة» للإجابات الطويلة متعددة الأسطر.",
                    )}
                  </p>
                </div>
                {(q.inputType === "Text" ||
                  q.inputType === "Paragraph" ||
                  !q.inputType) && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Label>
                        {t("Apply sentiment analysis", "تطبيق تحليل المشاعر")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Send this free-text answer to M-05 for sentiment scoring, in addition to word/theme analysis.",
                          "أرسل هذه الإجابة النصية إلى M-05 لتقييم المشاعر، إضافةً إلى تحليل الكلمات والمواضيع.",
                        )}
                      </p>
                    </div>
                    <Switch
                      className="mt-0.5 shrink-0"
                      checked={q.sentiment ?? false}
                      onCheckedChange={(v) => updateQ(q.id, { sentiment: v })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Score-based reason follow-up (KPI only) ── */}
            {q.type === "KPI" && (
              <div className="space-y-3 pt-1 border-t border-border">
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    <Label>
                      {t(
                        "Show reason based on score",
                        "إظهار السبب بناءً على الدرجة",
                      )}
                    </Label>
                  </div>
                  <Switch
                    checked={q.reason?.on ?? false}
                    onCheckedChange={(v) =>
                      updateReason(q.id, { on: v }, q.reason)
                    }
                  />
                </div>
                {q.reason?.on && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("Prompt text", "نص السؤال")}
                      </Label>
                      <Input
                        value={q.reason.prompt ?? ""}
                        onChange={(e) =>
                          updateReason(
                            q.id,
                            { prompt: e.target.value },
                            q.reason,
                          )
                        }
                        placeholder={t(
                          "What was the main reason for your score?",
                          "ما السبب الرئيسي لدرجتك؟",
                        )}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("Selection", "الاختيار")}
                      </Label>
                      <div className="inline-flex rounded-md border border-input p-0.5 w-full">
                        {(
                          [
                            ["single", t("Single", "أحادي")],
                            ["multi", t("Multi", "متعدد")],
                          ] as const
                        ).map(([k, lbl]) => (
                          <button
                            key={k}
                            onClick={() =>
                              updateReason(
                                q.id,
                                { multi: k === "multi" },
                                q.reason,
                              )
                            }
                            className={cn(
                              "flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                              (q.reason?.multi ? "multi" : "single") === k
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t("Reasons", "الأسباب")}
                      </Label>
                      <ListEditor
                        items={q.reason.reasons ?? []}
                        onChange={(v) =>
                          updateReason(q.id, { reasons: v }, q.reason)
                        }
                        addLabel={t("Add a reason…", "إضافة سبب…")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>
                        {t('Include "Other" option', "تضمين خيار «أخرى»")}
                      </Label>
                      <Switch
                        checked={q.reason.hasOther ?? false}
                        onCheckedChange={(v) =>
                          updateReason(q.id, { hasOther: v }, q.reason)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Questions Set settings dialog ─────────────────── */}
      {(() => {
        const dsec = setSettingsFor
          ? sections.find((s) => s.id === setSettingsFor.secId)
          : null;
        const dst = dsec?.sets.find((x) => x.id === setSettingsFor?.setId);
        return (
          <Dialog
            open={!!setSettingsFor}
            onOpenChange={(o) => !o && setSetSettingsFor(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {t("Questions Set settings", "إعدادات مجموعة الأسئلة")}
                </DialogTitle>
                {dsec && dst && (
                  <DialogDescription className="text-xs">
                    {dsec.name} › {dst.title}
                  </DialogDescription>
                )}
              </DialogHeader>
              {dst && (
                <div className="space-y-4 py-1">
                  <div className="space-y-2">
                    <Label>{t("Set title", "عنوان المجموعة")}</Label>
                    <Input
                      value={dst.title}
                      onChange={(e) =>
                        updateSet(dst.id, { title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="block leading-snug">
                      {t("Description", "الوصف")}{" "}
                      <span className="text-muted-foreground font-normal">
                        {t(
                          "— optional, shown under the set title",
                          "— اختياري، يظهر تحت العنوان",
                        )}
                      </span>
                    </Label>
                    <Textarea
                      value={dst.desc ?? ""}
                      onChange={(e) =>
                        updateSet(dst.id, { desc: e.target.value })
                      }
                      className="min-h-14"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("Selection mode", "وضع الاختيار")}</Label>
                      <Select
                        value={dst.selMode}
                        onValueChange={(v) =>
                          v &&
                          updateSet(dst.id, { selMode: v as "random" | "low" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {dst.selMode === "low"
                              ? t(
                                  "Prioritize low-response",
                                  "أولوية للأقل استجابة",
                                )
                              : t("Random", "عشوائي")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">
                            {t("Random", "عشوائي")}
                          </SelectItem>
                          <SelectItem value="low">
                            {t(
                              "Prioritize low-response questions",
                              "أولوية للأسئلة قليلة الاستجابة",
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        {t("Questions per sending", "أسئلة لكل إرسال")}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={Math.max(1, dst.questions.length)}
                        value={dst.count}
                        className="tabular-nums"
                        onChange={(e) =>
                          updateSet(dst.id, {
                            count: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {t(
                          `How many of the set's ${dst.questions.length} questions each respondent receives.`,
                          `كم سؤالاً من أصل ${dst.questions.length} يتلقى كل مشارك.`,
                        )}
                      </p>
                    </div>
                  </div>
                  {dst.selMode === "low" && (
                    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                      <Info className="size-3.5 mt-0.5 shrink-0" />
                      <span>
                        {t(
                          "Prioritize low-response ordering: the engine first finds the least-answered question inside each Questions Set, then compares it against the standalone questions in the same section to get that section's lowest-response question. It then compares every section's lowest question across the whole survey — the section holding the survey-wide lowest is presented first, the next-lowest section second, and so on, so every question steadily accumulates responses.",
                          "ترتيب الأولوية للأقل استجابة: يختار المحرك أقل الأسئلة استجابةً داخل كل مجموعة أولاً، ثم يُعرض القسم الذي يحوي أقل سؤال استجابةً على مستوى الاستبيان أولاً — لتتراكم الردود على كل سؤال تدريجياً.",
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button
                  className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
                  onClick={() => setSetSettingsFor(null)}
                >
                  {t("Done", "تم")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Answer routing dialog ─────────────────────────── */}
      {(() => {
        const all = sections.flatMap((s) => [
          ...s.questions,
          ...s.sets.flatMap((st) => st.questions),
        ]);
        const rq = all.find((x) => x.id === routingFor);
        const answers = rq
          ? rq.type === "Single select"
            ? (rq.options ?? [])
            : rq.type === "Yes/No (Boolean)"
              ? [rq.trueLabel || "Yes", rq.falseLabel || "No"]
              : rq.type === "KPI"
                ? (kpiScalePoints(rq.kpi) ?? [1, 2, 3, 4, 5]).map(String)
                : Array.from(
                    { length: rq.scalePoints ?? 5 },
                    (_, i) => rq.pointLabels?.[i] || String(i + 1),
                  )
          : [];
        const targets = rq
          ? all.filter((x) => x.id !== rq.id && x.type !== "Paragraph")
          : [];
        return (
          <Dialog
            open={!!routingFor}
            onOpenChange={(o) => !o && setRoutingFor(null)}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {t("Answer routing", "توجيه الإجابات")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {rq?.text}
                </DialogDescription>
              </DialogHeader>
              {rq && (
                <div className="space-y-2 py-1 max-h-[50vh] overflow-y-auto">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Choose where each answer sends the respondent next.",
                      "اختر إلى أين تنقل كل إجابة المشارك بعد ذلك.",
                    )}
                  </p>
                  {answers.map((a, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_auto_1.4fr] items-center gap-2"
                    >
                      <span className="text-sm truncate">{a || `—`}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <Select
                        value={rq.routes?.[a] ?? "next"}
                        onValueChange={(v) =>
                          v &&
                          updateQ(rq.id, { routes: { ...rq.routes, [a]: v } })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>
                            {rq.routes?.[a] === "end"
                              ? t("End survey", "إنهاء الاستبيان")
                              : rq.routes?.[a] && rq.routes[a] !== "next"
                                ? (targets.find((x) => x.id === rq.routes?.[a])
                                    ?.text ??
                                  t("Next question", "السؤال التالي"))
                                : t("Next question", "السؤال التالي")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="next">
                            {t("Next question", "السؤال التالي")}
                          </SelectItem>
                          <SelectItem value="end">
                            {t("End survey", "إنهاء الاستبيان")}
                          </SelectItem>
                          {targets.map((x) => (
                            <SelectItem key={x.id} value={x.id}>
                              {x.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                {rq?.routes && Object.keys(rq.routes).length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => rq && updateQ(rq.id, { routes: {} })}
                  >
                    {t("Clear routing", "مسح التوجيه")}
                  </Button>
                )}
                <Button
                  className="bg-primary hover:bg-nb-cyan-700 text-primary-foreground"
                  onClick={() => setRoutingFor(null)}
                >
                  {t("Done", "تم")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

export type { Section as BuilderSection, BQuestion as BuilderQuestion };
// The respondent-facing question sequence of a section: its interleaved order,
// with each Questions Set expanded to its pooled questions.
export function flattenSectionQuestions(sec: Section): BQuestion[] {
  return orderedOf(sec).flatMap((o) =>
    o.t === "q"
      ? (sec.questions.find((q) => q.id === o.id) ?? [])
      : (sec.sets.find((st) => st.id === o.id)?.questions ?? []),
  );
}
