/**
 * Tenant theming engine.
 *
 *   6 seed colors ──deriveThemeVars──▶ full {light, dark, brand} var maps
 *                  ──buildThemeCss───▶ ":root{…} .dark{…}" CSS string
 *                  ──applyTheme─────▶ injects <style id="tenant-theme"> (client)
 *
 * Pure functions (no DOM) so the same code runs client-side OR server/edge-side.
 * The DEFAULT Nabadat theme is NOT produced here — it stays pinned in index.css.
 * This derivation is for *new* tenants and is calibrated to land close to the
 * hand-tuned Nabadat ramps; small (<~RGB few) deltas on a tenant's own brand are
 * expected and acceptable. D1–D5 are never emitted; `destructive` is pinned.
 */

import {
  buildRamp,
  readableForeground,
  withLightness,
  type RampKey,
  type RampStop,
} from "./oklch";
import {
  FIXED_TOKENS,
  resolveSeed,
  type TenantThemeSeed,
} from "./tenant-theme";

type Vars = Record<string, string>;

/** A theme expanded to the CSS custom properties for both color schemes. */
export interface DerivedTheme {
  /** Mode-independent brand ramp overrides (`--color-nb-*`, gradient). Emitted in `:root`. */
  brand: Vars;
  /** Semantic tokens for light mode. Emitted in `:root`. */
  light: Vars;
  /** Semantic tokens for dark mode. Emitted in `.dark`. */
  dark: Vars;
}

type Stops = Record<Exclude<RampKey, "DEFAULT">, RampStop>;

/* Ramp lightness/chroma anchors, calibrated to the existing nb-cyan/nb-navy ramps. */
const BRAND_STOPS: Stops = {
  "100": { l: 0.93, chromaScale: 0.45 },
  "200": { l: 0.86, chromaScale: 0.65 },
  "300": { l: 0.78, chromaScale: 0.85 },
  "700": { l: 0.55, chromaScale: 1.0 },
  "800": { l: 0.42, chromaScale: 0.9 },
  "900": { l: 0.29, chromaScale: 0.75 },
};
const NEUTRAL_STOPS: Stops = {
  "100": { l: 0.93, chromaScale: 0.6 },
  "200": { l: 0.83, chromaScale: 0.7 },
  "300": { l: 0.62, chromaScale: 0.8 },
  "700": { l: 0.225, chromaScale: 1.0 },
  "800": { l: 0.165, chromaScale: 1.0 },
  "900": { l: 0.115, chromaScale: 1.0 },
};

/* Dark-mode surface lightness anchors — a stepped ladder mirroring index.css's `.dark`
   block (sidebar #070B10 < bg #171923 < card #22252F < accent #292C37 < muted #30333E <
   border #383C54 < input #434864). The sidebar sits at 0.147; going DEEPER is a trap —
   below ~0.14 the sRGB gamut collapses every hue to a near-neutral near-black, so a
   "deeper" sidebar reads muddier, not richer. Instead the canvas is lifted to 0.215 — a
   WIDE ~0.07 step above the sidebar — so nav and content read as distinct regions, and
   muted is the RAISED surface ABOVE card (hovers/tracks/pills must be visible). */
const DARK = {
  sidebar: 0.147,
  background: 0.215,
  card: 0.265,
  accent: 0.295,
  muted: 0.32,
  border: 0.363,
  input: 0.409,
  sidebarBorder: 0.4,
  foreground: 0.94,
} as const;

/* Chroma multipliers for near-black dark surfaces. At <0.25 lightness a seed's full
   chroma reads as a murky, over-saturated wash — so the big canvas surfaces (bg/card/
   muted/accent) stay LOW-chroma (DARK_CHROMA) and render as a clean near-neutral dark.
   The sidebar takes a higher multiplier so it carries a touch more brand tint. */
const DARK_CHROMA = 0.28;
const SIDEBAR_DARK_CHROMA = 0.9;

/** Expand a 6-color seed into the complete light + dark + brand variable maps. */
export function deriveThemeVars(seed: TenantThemeSeed): DerivedTheme {
  const s = resolveSeed(seed);

  const cyan = buildRamp(s.primary, BRAND_STOPS);
  const mint = buildRamp(s.secondary, BRAND_STOPS);
  const navy = buildRamp(s.neutral, NEUTRAL_STOPS);

  // Optional fields fall back to derived neutral surfaces.
  const accentLight = s.accent || withLightness(s.neutral, 0.945, 0.18);
  const backgroundLight = s.background || withLightness(s.neutral, 0.975, 0.15);

  // Brightened brand for dark backgrounds — matches Nabadat's `--primary` going to nb-cyan-300.
  const primaryDark = cyan["300"];
  const secondaryDark = mint["300"];

  /*
   * Brand ramp overrides. Keys are the RAW `--nb-*` custom properties (NOT the
   * `--color-nb-*` Tailwind tokens, which reference these via `var()` in
   * index.css). Overriding the raw vars re-skins every nb-* utility.
   * `--nb-gradient-*` is intentionally omitted — the logo gradient stays fixed.
   */
  const brand: Vars = {
    "--nb-cyan": cyan.DEFAULT,
    "--nb-cyan-100": cyan["100"],
    "--nb-cyan-200": cyan["200"],
    "--nb-cyan-300": cyan["300"],
    "--nb-cyan-700": cyan["700"],
    "--nb-cyan-800": cyan["800"],
    "--nb-cyan-900": cyan["900"],

    "--nb-mint": mint.DEFAULT,
    "--nb-mint-100": mint["100"],
    "--nb-mint-200": mint["200"],
    "--nb-mint-300": mint["300"],
    "--nb-mint-700": mint["700"],
    "--nb-mint-800": mint["800"],
    "--nb-mint-900": mint["900"],

    "--nb-navy": navy.DEFAULT,
    "--nb-navy-100": navy["100"],
    "--nb-navy-200": navy["200"],
    "--nb-navy-300": navy["300"],
    "--nb-navy-700": navy["700"],
    "--nb-navy-800": navy["800"],
    "--nb-navy-900": navy["900"],

    "--nb-dark": withLightness(s.neutral, DARK.background, 0.9),
    "--nb-dark-2": withLightness(s.neutral, DARK.card, 0.8),
    "--nb-dark-3": navy["700"],
    "--nb-stone": withLightness(s.neutral, 0.55, 0.25),
    "--nb-stone-lt": withLightness(s.neutral, 0.8, 0.25),
    "--nb-cloud": withLightness(s.neutral, 0.945, 0.18),
  };

  /* ---------------- light semantic tokens ---------------- */
  const light: Vars = {
    "--background": backgroundLight,
    "--foreground": s.neutral,
    "--card": "#ffffff",
    "--card-foreground": s.neutral,
    "--popover": "#ffffff",
    "--popover-foreground": s.neutral,

    "--primary": s.primary,
    "--primary-foreground": readableForeground(s.primary),
    "--secondary": s.secondary,
    "--secondary-foreground": readableForeground(s.secondary),

    "--muted": withLightness(s.neutral, 0.945, 0.18),
    "--muted-foreground": withLightness(s.neutral, 0.55, 0.25),
    "--accent": accentLight,
    "--accent-foreground": s.neutral,

    "--destructive": FIXED_TOKENS.destructive.light,
    "--border": navy["200"],
    "--input": navy["200"],
    "--ring": s.primary,

    "--chart-1": s.primary,
    "--chart-2": s.secondary,
    "--chart-3": navy["300"],
    "--chart-4": cyan["700"],
    "--chart-5": mint["700"],

    "--sidebar": s.sidebar,
    "--sidebar-foreground": readableForeground(s.sidebar),
    "--sidebar-primary": s.primary,
    "--sidebar-primary-foreground": readableForeground(s.primary),
    "--sidebar-accent": navy["700"],
    "--sidebar-accent-foreground": cyan["100"],
    "--sidebar-border": "rgba(255, 255, 255, 0.1)",
    "--sidebar-ring": s.primary,
  };

  /* ---------------- dark semantic tokens ---------------- */
  const dark: Vars = {
    "--background": withLightness(s.neutral, DARK.background, DARK_CHROMA),
    "--foreground": withLightness(s.neutral, DARK.foreground, 0.05),
    "--card": withLightness(s.neutral, DARK.card, DARK_CHROMA),
    "--card-foreground": withLightness(s.neutral, DARK.foreground, 0.05),
    "--popover": withLightness(s.neutral, DARK.card, DARK_CHROMA),
    "--popover-foreground": withLightness(s.neutral, DARK.foreground, 0.05),

    "--primary": primaryDark,
    "--primary-foreground": readableForeground(primaryDark),
    "--secondary": secondaryDark,
    "--secondary-foreground": readableForeground(secondaryDark),

    "--muted": withLightness(s.neutral, DARK.muted, DARK_CHROMA),
    "--muted-foreground": withLightness(s.neutral, 0.8, 0.25),
    "--accent": withLightness(s.neutral, DARK.accent, DARK_CHROMA),
    "--accent-foreground": withLightness(s.neutral, 0.945, 0.12),

    "--destructive": FIXED_TOKENS.destructive.dark,
    "--border": withLightness(s.neutral, DARK.border, DARK_CHROMA),
    "--input": withLightness(s.neutral, DARK.input, DARK_CHROMA),
    "--ring": primaryDark,

    "--chart-1": primaryDark,
    "--chart-2": secondaryDark,
    "--chart-3": withLightness(s.neutral, 0.8, 0.25),
    "--chart-4": cyan["200"],
    "--chart-5": mint["200"],

    "--sidebar": withLightness(s.sidebar, DARK.sidebar, SIDEBAR_DARK_CHROMA),
    "--sidebar-foreground": withLightness(s.neutral, DARK.foreground, 0.05),
    "--sidebar-primary": primaryDark,
    "--sidebar-primary-foreground": readableForeground(primaryDark),
    "--sidebar-accent": withLightness(s.neutral, DARK.accent, DARK_CHROMA),
    "--sidebar-accent-foreground": cyan["100"],
    "--sidebar-border": withLightness(s.neutral, DARK.sidebarBorder, 0.4),
    "--sidebar-ring": primaryDark,
  };

  return { brand, light, dark };
}

/* ---------------- serialization ---------------- */

function varsToBlock(selector: string, vars: Vars): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/**
 * Build the injectable stylesheet for a tenant. `:root` carries the brand ramps
 * plus light tokens; `.dark` carries the dark tokens — so the app's existing
 * `.dark` toggle keeps working under any tenant theme.
 *
 * Use this both on the client (via `applyTheme`) and server/edge-side (inject the
 * returned string into a `<style id="tenant-theme">` in the served HTML).
 */
export function buildThemeCss(seed: TenantThemeSeed): string {
  const { brand, light, dark } = deriveThemeVars(seed);
  return [
    varsToBlock(":root", { ...brand, ...light }),
    varsToBlock(".dark", dark),
  ].join("\n");
}

const STYLE_TAG_ID = "tenant-theme";

/**
 * Apply a tenant theme on the client by injecting/updating a single
 * `<style id="tenant-theme">`. Idempotent. No-op outside the browser (SSR-safe).
 * Pass `null` to clear the override and fall back to the default index.css theme.
 */
export function applyTheme(seed: TenantThemeSeed | null): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(STYLE_TAG_ID);
  if (!seed) {
    existing?.remove();
    return;
  }

  const css = buildThemeCss(seed);
  const tag =
    (existing as HTMLStyleElement | null) ?? document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = css;
  if (!existing) document.head.appendChild(tag);
}
