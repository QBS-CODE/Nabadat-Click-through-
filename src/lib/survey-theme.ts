// ── Survey appearance theme ───────────────────────────────────────────────────
// Drives the "Design" screen: the survey inherits the tenant Design Guidelines by
// default, and can optionally be customized per-survey. These are the customer-
// facing survey's own theme values (rendered into the live preview) — NOT Nabadat
// app chrome, so they are stored as raw values a tenant picks, not design tokens.

export type RadiusKey = "sharp" | "small" | "medium" | "large"
export type BgType = "solid" | "gradient" | "image" | "pattern"
export type ProgressStyle = "bar" | "steps" | "none"
export type HeaderAlign = "start" | "center"

export interface SurveyTheme {
  primary: string
  textColor: string
  buttonColor: string
  buttonText: string
  btnBorder: string
  success: string
  warning: string
  error: string
  background: string
  card: string
  border: string
  headingFont: string
  bodyFont: string
  bodySize: string
  headingSize: string
  lineHeight: string
  radius: RadiusKey
  btnRadius: RadiusKey
  progress: ProgressStyle
  showLogo: boolean
  showTitle: boolean
  headerAlign: HeaderAlign
  footerText: string
  logo: string | null
  bgType: BgType
  gradFrom: string
  gradTo: string
  gradAngle: string
  bgImage: string
  bgOpacity: number
}

/** Fonts a survey author can pick — on-brand, Arabic-capable set. */
export const SURVEY_FONTS = ["Sora", "Poppins", "IBM Plex Sans Arabic", "System"]

export const RADII: Record<RadiusKey, string> = {
  sharp: "0",
  small: "6px",
  medium: "12px",
  large: "20px",
}

export function radiusPx(v: RadiusKey): string {
  return RADII[v] ?? "12px"
}

/** The organization's default guidelines — copied into a survey at create time. */
export const TENANT_THEME: SurveyTheme = {
  primary: "#0D8BBC",
  textColor: "#1E2235",
  buttonColor: "#0D8BBC",
  buttonText: "#FFFFFF",
  btnBorder: "#0D8BBC",
  success: "#1FAE78",
  warning: "#E0A106",
  error: "#E5484D",
  background: "#F4F7FA",
  card: "#FFFFFF",
  border: "#C9D4DC",
  headingFont: "Sora",
  bodyFont: "Poppins",
  bodySize: "14",
  headingSize: "15",
  lineHeight: "1.5",
  radius: "medium",
  btnRadius: "medium",
  progress: "bar",
  showLogo: true,
  showTitle: true,
  headerAlign: "start",
  footerText: "© 2026 Nabadat Bank. All rights reserved.",
  logo: null,
  bgType: "solid",
  gradFrom: "#0D8BBC",
  gradTo: "#13DB9B",
  gradAngle: "135",
  bgImage: "",
  bgOpacity: 100,
}

export function fontFamily(name: string): string {
  if (name === "System")
    return "system-ui, -apple-system, sans-serif"
  return `"${name}", system-ui, sans-serif`
}

/** CSS `background` value for the survey stage, honoring the chosen bg type. */
export function surveyBackground(theme: SurveyTheme): string {
  switch (theme.bgType) {
    case "gradient":
      return `linear-gradient(${theme.gradAngle}deg, ${theme.gradFrom}, ${theme.gradTo})`
    case "image":
      return theme.bgImage
        ? `${theme.card} center / cover no-repeat`
        : theme.background
    case "pattern":
      return theme.bgImage ? `${theme.card}` : theme.background
    case "solid":
    default:
      return theme.background
  }
}
