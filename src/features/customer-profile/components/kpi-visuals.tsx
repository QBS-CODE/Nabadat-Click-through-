// Shared KPI visual primitives for the M-03 Customer Profile screens.
// Custom SVG sparkline + trend chart (per CLAUDE.md data-viz rules: theme-aware
// neutral chrome; D-scale via Tailwind d{n} utility classes so the tokens emit).

import { cn } from "@/lib/utils"
import {
  type DLevel,
  type Kpi,
  type Lang,
  bandOf,
  series,
} from "../data"

// ── D-scale class maps (static literals so Tailwind detects every utility) ──
/** Base colour as text (for sparkline currentColor + KPI values). */
export const D_TEXT: Record<DLevel, string> = {
  d1: "text-d1",
  d2: "text-d2",
  d3: "text-d3",
  d4: "text-d4",
  d5: "text-d5",
}
/** Light tint background + soft dark-mode tint (status-tinted containers). */
export const D_TINT_BG: Record<DLevel, string> = {
  d1: "bg-d1-light dark:bg-d1-dark/25",
  d2: "bg-d2-light dark:bg-d2-dark/25",
  d3: "bg-d3-light dark:bg-d3-dark/25",
  d4: "bg-d4-light dark:bg-d4-dark/25",
  d5: "bg-d5-light dark:bg-d5-dark/25",
}
/** Deep text tone on a light tint. */
export const D_TINT_TEXT: Record<DLevel, string> = {
  d1: "text-d1-dark dark:text-d1-light",
  d2: "text-d2-dark dark:text-d2-light",
  d3: "text-d3-dark dark:text-d3-light",
  d4: "text-d4-dark dark:text-d4-light",
  d5: "text-d5-dark dark:text-d5-light",
}
/** Band badge (light fill + dark text). */
export const D_BADGE: Record<DLevel, string> = {
  d1: "bg-d1-light text-d1-dark dark:bg-d1-dark/30 dark:text-d1-light",
  d2: "bg-d2-light text-d2-dark dark:bg-d2-dark/30 dark:text-d2-light",
  d3: "bg-d3-light text-d3-dark dark:bg-d3-dark/30 dark:text-d3-light",
  d4: "bg-d4-light text-d4-dark dark:bg-d4-dark/30 dark:text-d4-light",
  d5: "bg-d5-light text-d5-dark dark:bg-d5-dark/30 dark:text-d5-light",
}
/** Solid base colour as background (mix segments, legend dots). */
export const D_DOT_BG: Record<DLevel, string> = {
  d1: "bg-d1",
  d2: "bg-d2",
  d3: "bg-d3",
  d4: "bg-d4",
  d5: "bg-d5",
}
/** SVG fill of the base colour. */
export const D_FILL: Record<DLevel, string> = {
  d1: "fill-d1",
  d2: "fill-d2",
  d3: "fill-d3",
  d4: "fill-d4",
  d5: "fill-d5",
}
/** SVG fill of the deep tone (zone labels). */
export const D_FILL_DARK: Record<DLevel, string> = {
  d1: "fill-d1-dark",
  d2: "fill-d2-dark",
  d3: "fill-d3-dark",
  d4: "fill-d4-dark",
  d5: "fill-d5-dark",
}

// ── numeric helpers (mirror the prototype) ──
export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
export const fmt = (v: number, dec: number) =>
  dec ? Number(v).toFixed(dec) : String(v)
export const bLabel = (b: { ar: string; en: string }, lang: Lang) =>
  lang === "ar" ? b.ar : b.en

// ── Sparkline ──
// Colour comes from `currentColor`; set it on the element via `className`.
export function Sparkline({
  vals,
  k,
  className,
}: {
  vals: number[]
  k: Kpi
  className?: string
}) {
  const w = 66
  const h = 22
  const pad = 2
  const s0 = k.min
  const s1 = k.max
  const pts = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (vals.length - 1)
    const y = h - pad - ((v - s0) / (s1 - s0)) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const [lx, ly] = pts[pts.length - 1].split(",")
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-[22px] w-[66px] shrink-0", className)}
      aria-hidden="true"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle cx={lx} cy={ly} r="2.4" fill="currentColor" />
    </svg>
  )
}

// ── Trend chart (custom SVG) ──
// Axes read left-to-right in BOTH languages (BR-M03-064) — never mirrored.
export function TrendChart({ k, lang }: { k: Kpi; lang: Lang }) {
  const W = 640
  const H = 240
  const pS = 42
  const pE = 14
  const pT = 14
  const pB = 36
  const pw = W - pS - pE
  const ph = H - pT - pB
  const n = k.points.length
  const s0 = k.min
  const s1 = k.max
  const X = (i: number) => pS + (n === 1 ? 0.5 : i / (n - 1)) * pw
  const Y = (v: number) => pT + (1 - (v - s0) / (s1 - s0)) * ph

  // ~6 gridlines on a 1/2/2.5/5/10 magnitude ladder
  const span = s1 - s0
  const raw = span / 6
  const mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10))
  const step =
    [1, 2, 2.5, 5, 10].map((f) => f * mag).filter((x) => x >= raw)[0] ||
    mag * 10
  const gridVals: number[] = []
  for (let g = s0; g <= s1 + 1e-9; g += step) gridVals.push(g)

  const avg = mean(series(k))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      // LTR so the time axis never mirrors in RTL (BR-M03-064). `dir` isn't in React's SVG
      // prop types, so express it via style.direction rather than the attribute.
      style={{ direction: "ltr" }}
      aria-label={lang === "ar" ? k.label[0] : k.label[1]}
    >
      {/* band zones */}
      {k.zones.map((z, i) => {
        const y1 = Y(z.to)
        const y2 = Y(z.from)
        return (
          <g key={`zone-${i}`}>
            <rect
              x={pS}
              y={y1}
              width={pw}
              height={y2 - y1}
              className={cn(D_FILL[z.d], "opacity-[0.09]")}
            />
            <text
              x={pS + pw - 6}
              y={y1 + 12}
              textAnchor="end"
              fontSize="9"
              fontWeight="600"
              className={cn(D_FILL_DARK[z.d], "opacity-75")}
            >
              {lang === "ar" ? z.ar : z.en}
            </text>
          </g>
        )
      })}

      {/* gridlines + value-axis labels (start-left) */}
      {gridVals.map((g, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={pS}
            y1={Y(g)}
            x2={pS + pw}
            y2={Y(g)}
            className="stroke-border"
            strokeWidth="1"
            opacity="0.55"
          />
          <text
            x={pS - 8}
            y={Y(g) + 3.5}
            textAnchor="end"
            fontSize="10"
            className="fill-muted-foreground"
          >
            {Math.round(g * 100) / 100}
          </text>
        </g>
      ))}

      {/* period-average reference line */}
      <line
        x1={pS}
        y1={Y(avg)}
        x2={pS + pw}
        y2={Y(avg)}
        className="stroke-muted-foreground"
        strokeWidth="1.4"
        strokeDasharray="5 4"
        opacity="0.8"
      />

      {/* series line */}
      <polyline
        points={k.points.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")}
        fill="none"
        className="stroke-nb-cyan"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* points, coloured by band */}
      {k.points.map((p, i) => {
        const b = bandOf(k, p.v)
        return (
          <circle
            key={`pt-${i}`}
            cx={X(i)}
            cy={Y(p.v)}
            r="4.5"
            className={cn(D_FILL[b.d], "stroke-card")}
            strokeWidth="2"
          >
            <title>{`${p.d} · ${fmt(p.v, k.dec)} · ${bLabel(b, lang)}`}</title>
          </circle>
        )
      })}

      {/* time-axis labels (thinned to every other when > 6) */}
      {k.points.map((p, i) => {
        if (n > 6 && i % 2 === 1 && i !== n - 1) return null
        return (
          <text
            key={`xl-${i}`}
            x={X(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize="9.5"
            className="fill-muted-foreground"
          >
            {p.d.slice(2, 7)}
          </text>
        )
      })}
    </svg>
  )
}
