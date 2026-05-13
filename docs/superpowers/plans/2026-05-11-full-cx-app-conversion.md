# Full CX App Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the complete 3080-line Nabadat prototype into the Nabdat workspace — every screen, interaction, and feature — using the Nabdat design system (shadcn/ui, Tailwind v4, Recharts, Lucide, bilingual, RTL-first, dark mode).

**Architecture:** The app uses a context-based architecture: `AuthContext` handles login state, `PersonaContext` manages role switching, and `BrandContext` controls theming. The `AppLayout` wraps all authenticated routes with sidebar + topbar. Each dashboard variant (CX Manager, Executive, Frontline) is a section within `CxDashboard.tsx` controlled by the active persona. Modals and panels (KPI detail, AI chat) are rendered via portal-based shadcn components.

**Tech Stack:** React 19 + TypeScript + Vite, shadcn/ui (54 components), Recharts v3, Lucide React, i18next, Tailwind CSS v4 with Zain tokens.

**Reference:** `/Users/marwan/Downloads/Click-Through 3/nabadat-prototype/src/NabadatShell.jsx`

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/contexts/auth-context.tsx` | Auth state (logged in/out), login handler, user info |
| `src/contexts/persona-context.tsx` | Active persona/role, persona list, switcher |
| `src/pages/LoginPage.tsx` | Login screen (credentials + MFA) |
| `src/components/cx/kpi-flip-card.tsx` | KPI card with 3D flip (front: gauge, back: donut) |
| `src/components/cx/kpi-detail-modal.tsx` | Full KPI drill-down modal |
| `src/components/cx/ai-chat-panel.tsx` | Floating AI chat window |
| `src/components/cx/topic-bubbles.tsx` | SVG bubble sentiment chart |
| `src/components/cx/mobile-nav.tsx` | Bottom nav + FAB for mobile |
| `src/components/cx/persona-switcher.tsx` | Dev tool persona bar |
| `src/pages/PlaceholderPage.tsx` | Generic "Coming Soon" placeholder |

### Files to modify:
| File | Changes |
|------|---------|
| `src/App.tsx` | Add auth context, login route, persona context, placeholder routes |
| `src/components/layout/app-sidebar.tsx` | Role-based filtering, phase 2 badges, collapse animation |
| `src/components/layout/app-topbar.tsx` | Notifications dropdown, user menu dropdown, brand mode toggle |
| `src/components/layout/app-layout.tsx` | Add persona switcher, mobile nav, brand context |
| `src/pages/CxDashboard.tsx` | Add flip cards, role-based views, topic bubbles, trend annotations, AI chat |
| `src/i18n/locales/ar.json` | Add login, persona, modal, chat translations |
| `src/i18n/locales/en.json` | Add login, persona, modal, chat translations |

---

## Task 1: Auth & Persona Contexts

**Files:**
- Create: `src/contexts/auth-context.tsx`
- Create: `src/contexts/persona-context.tsx`

- [ ] **Step 1: Create auth context**

```tsx
// src/contexts/auth-context.tsx
import { createContext, useContext, useState, type ReactNode } from "react"

interface AuthState {
  isLoggedIn: boolean
  user: { name: string; nameAr: string; email: string; initials: string } | null
  login: (tenant?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<AuthState["user"]>(null)

  const login = () => {
    setUser({
      name: "Sarah Al-Omar",
      nameAr: "سارة الخيّر",
      email: "sarah@asfour.com",
      initials: "SO",
    })
    setIsLoggedIn(true)
  }

  const logout = () => {
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Create persona context**

```tsx
// src/contexts/persona-context.tsx
import { createContext, useContext, useState, type ReactNode } from "react"

export interface Persona {
  id: string
  label: string
  labelAr: string
  icon: string // Lucide icon name
}

const PERSONAS: Persona[] = [
  { id: "cx_manager", label: "CX Program Manager", labelAr: "مدير تجربة العملاء", icon: "LayoutDashboard" },
  { id: "analyst", label: "Analyst", labelAr: "محلل", icon: "BarChart3" },
  { id: "executive", label: "Executive", labelAr: "تنفيذي", icon: "Briefcase" },
  { id: "frontline", label: "Frontline Agent", labelAr: "وكيل خط المواجهة", icon: "Headphones" },
  { id: "tenant_admin", label: "Tenant Admin", labelAr: "مدير النظام", icon: "Settings" },
]

interface PersonaState {
  persona: Persona
  personas: Persona[]
  setPersona: (p: Persona) => void
}

const PersonaContext = createContext<PersonaState | null>(null)

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error("usePersona must be used within PersonaProvider")
  return ctx
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState(PERSONAS[0])
  return (
    <PersonaContext.Provider value={{ persona, personas: PERSONAS, setPersona }}>
      {children}
    </PersonaContext.Provider>
  )
}
```

- [ ] **Step 3: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in` with no errors

- [ ] **Step 4: Commit**

```bash
git add src/contexts/
git commit -m "feat: add auth and persona contexts for role-based app"
```

---

## Task 2: Login Page

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Modify: `src/i18n/locales/ar.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add login translations to both locale files**

Add under `"cx"` in both files:

**ar.json additions:**
```json
"loginTitle": "تسجيل الدخول",
"loginWelcome": "مرحباً بك في نبضات",
"loginEmail": "البريد الإلكتروني",
"loginPassword": "كلمة المرور",
"loginForgot": "نسيت كلمة المرور؟",
"loginSignIn": "تسجيل الدخول",
"loginSigningIn": "جارٍ تسجيل الدخول...",
"loginEmailError": "يرجى إدخال بريد إلكتروني صحيح",
"loginMfaTitle": "التحقق بخطوتين",
"loginMfaDesc": "أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني",
"loginVerify": "تحقق",
"loginVerifying": "جارٍ التحقق...",
"loginSkipMfa": "تخطي الآن",
"loginTagline": "منصة صوت العميل المتكاملة"
```

**en.json additions:**
```json
"loginTitle": "Sign In",
"loginWelcome": "Welcome back to Nabdat",
"loginEmail": "Email",
"loginPassword": "Password",
"loginForgot": "Forgot password?",
"loginSignIn": "Sign In",
"loginSigningIn": "Signing in...",
"loginEmailError": "Please enter a valid email address",
"loginMfaTitle": "Two-Factor Authentication",
"loginMfaDesc": "Enter the 6-digit code sent to your email",
"loginVerify": "Verify",
"loginVerifying": "Verifying...",
"loginSkipMfa": "Skip for now",
"loginTagline": "The Complete Voice of Customer Platform"
```

- [ ] **Step 2: Create LoginPage component**

Create `src/pages/LoginPage.tsx` with:
- Two-column layout: brand panel (gradient from-zain-green via-zain-teal to-zain-blue) + form panel
- Step 1: Email + password form using shadcn `Input`, `Label`, `Button`
- Step 2: 6-digit OTP using `InputOTP` from shadcn (already installed as `input-otp`)
- Email validation on blur
- Password visibility toggle using `Eye`/`EyeOff` Lucide icons
- Loading spinner using `Loader2` icon with `animate-spin`
- Language toggle button in top corner
- Decorative floating circles on brand panel (same pattern as VocDashboard banner)
- Dark mode support
- RTL support with logical properties
- All text via `t("cx.loginXxx")`
- On successful login: call `auth.login()` from `useAuth()`
- Mobile: brand panel becomes a compact header strip

Key interactions:
- `handleSignIn`: validates email/password, shows loading for 1.2s, then transitions to MFA step
- `handleMfaVerify`: shows loading for 1s, then calls `auth.login()`
- Skip MFA button: immediately calls `auth.login()`

- [ ] **Step 3: Wire login into App.tsx**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { AuthProvider, useAuth } from "./contexts/auth-context"
import { PersonaProvider } from "./contexts/persona-context"
import { AppLayout } from "./components/layout/app-layout"
import LoginPage from "./pages/LoginPage"
import CxDashboard from "./pages/CxDashboard"
import ComponentGuide from "./pages/ComponentGuide"
import VocDashboard from "./pages/VocDashboard"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isLoggedIn } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><CxDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><CxDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/voc" element={<ProtectedRoute><AppLayout><VocDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/guide" element={<ComponentGuide />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PersonaProvider>
          <AppRoutes />
        </PersonaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Build and verify**

Run: `npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.tsx src/App.tsx src/i18n/locales/
git commit -m "feat: add login page with credentials + MFA flow"
```

---

## Task 3: Enhanced Sidebar

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add role-based nav filtering and phase 2 badges**

Update `app-sidebar.tsx`:
- Import `usePersona` from contexts
- Add `ROLE_NAV_KEYS` mapping: which nav items each role can see
  - `cx_manager`/`analyst`/`tenant_admin`: all items
  - `executive`: dashboard, analytics, journey, actions
  - `frontline`: dashboard, cases
- Add `phase2: true` flag to nav items that should show "Coming Soon" badge (e.g., AI Insights, Customer Profiling)
- Filter `NAV_ITEMS` based on `persona.id`
- For phase 2 items: render with `SidebarMenuBadge` showing translated "Coming Soon" text, dimmed opacity, `cursor-default`
- Sidebar already uses `collapsible="icon"` which handles collapse/expand. Add `SidebarRail` (already present) for drag-to-resize.

Key changes to nav items array:
```tsx
const NAV_ITEMS = [
  {
    groupKey: "cx.navOverview",
    items: [
      { key: "dashboard", labelKey: "cx.navDashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    groupKey: "cx.navListening",
    items: [
      { key: "surveys", labelKey: "cx.navSurveys", icon: ClipboardList, href: "/surveys" },
      { key: "distribution", labelKey: "cx.navDistribution", icon: Send, href: "/distribution" },
      { key: "sending_rules", labelKey: "cx.navSendingRules", icon: Zap, href: "/sending-rules" },
    ],
  },
  // ... analytics, action, customers groups
  {
    groupKey: "cx.navMore",
    items: [
      { key: "ai_insights", labelKey: "cx.navAiInsights", icon: Sparkles, href: "#", phase2: true },
      { key: "profiles", labelKey: "cx.navProfiles", icon: Users, href: "#", phase2: true },
    ],
  },
]
```

- [ ] **Step 2: Build and verify**
- [ ] **Step 3: Commit**

---

## Task 4: Enhanced Topbar (Notifications + User Menu + Brand Mode)

**Files:**
- Modify: `src/components/layout/app-topbar.tsx`

- [ ] **Step 1: Add notifications dropdown**

Use shadcn `Popover` (or `DropdownMenu`) for the notifications dropdown:
- Replace the static bell button with a popover trigger
- Show 4 mock notifications with:
  - Type-colored dot (green for survey, blue for case, gold for action, coral for alert)
  - Text content (translated)
  - Time stamp
- Header: translated "Notifications" title
- Each item: hover state with `bg-muted/50`

- [ ] **Step 2: Add user menu dropdown**

Use shadcn `DropdownMenu`:
- Trigger: existing user avatar + name
- Items: Profile, Settings, separator, Sign Out (red text)
- Sign Out calls `auth.logout()` from `useAuth()`

- [ ] **Step 3: Add brand mode toggle (optional — desktop only)**

Add a button between language toggle and notifications:
- Shows "Nabadat" or "Asfour" with toggle behavior
- Stores brand mode in a context or localStorage
- For now: visual toggle only (brand theming is Tier 2)
- Hidden on mobile (`hidden lg:flex`)

- [ ] **Step 4: Build, verify, commit**

---

## Task 5: KPI Flip Cards

**Files:**
- Create: `src/components/cx/kpi-flip-card.tsx`
- Modify: `src/pages/CxDashboard.tsx` (replace `KpiMetricCard` with `KpiFlipCard`)

- [ ] **Step 1: Create flip card component**

`src/components/cx/kpi-flip-card.tsx`:
- CSS 3D perspective transform: `perspective: 1000px`
- Front face: existing `ScoreGauge` + value + target + trend + segments (3-tile grid)
- Back face: donut chart (Recharts `PieChart` with `innerRadius`) + reasons legend
- Flip trigger: small button in top-end corner (Lucide `PieChart` icon)
- Close button on back face
- `backfaceVisibility: hidden` on both faces
- Transition: `transform 0.55s ease`
- Front face `onClick` → calls `onDetail(kpiKey)` to open detail modal
- Card uses Nabdat design system: `Card` component, Zain colors, dark mode, logical properties
- Each KPI has `reasons` data: array of `{ label, labelAr, value, color }`

- [ ] **Step 2: Update CxDashboard to use flip cards**

Replace the `KpiMetricCard` usage in the grid with `KpiFlipCard`. Pass the `reasons` data and `onDetail` callback.

- [ ] **Step 3: Build, verify, commit**

---

## Task 6: KPI Detail Modal

**Files:**
- Create: `src/components/cx/kpi-detail-modal.tsx`
- Modify: `src/pages/CxDashboard.tsx` (add modal state + trigger)

- [ ] **Step 1: Create KPI detail data structure**

Define `KPI_DETAIL_DATA` with 6 entries (nps, csat, ces, agent, vfm, fcr), each containing:
- `title` / `titleAr`, `value`, `color`
- `insight` / `insightAr` (AI-generated text)
- `distribution`: array of `{ label, labelAr, value, color }` (e.g., Promoters 51%, Passives 40%, Detractors 9%)
- `trend`: 12 data points
- `segments`: array of `{ label, labelAr, value, color }` (e.g., by branch/channel)
- `topDriver`: `{ pos, posAr, neg, negAr }`

- [ ] **Step 2: Create modal component**

Use shadcn `Dialog` (fullscreen variant or `Sheet` side="bottom" for mobile):
- **Hero header**: gradient background using KPI color, large value display, subtitle
- **Breadcrumb**: Back button using `ChevronRight` (RTL-aware)
- **AI Insight card**: Robot icon + insight text in a highlighted card
- **Trend chart**: Recharts `LineChart` with 12 weeks, KPI color
- **Distribution bars**: Horizontal bars with percentages (Promoters/Passives/Detractors style)
- **Segment breakdown**: Table or list with mini progress bars per segment
- **Top driver cards**: Positive driver (green card) + Negative driver (coral card)
- All text bilingual via `t()`

- [ ] **Step 3: Wire into CxDashboard**

Add state: `const [detailKpi, setDetailKpi] = useState<string | null>(null)`
Render: `{detailKpi && <KpiDetailModal kpiKey={detailKpi} onClose={() => setDetailKpi(null)} />}`
Pass `onDetail={setDetailKpi}` to each KPI flip card.

- [ ] **Step 4: Build, verify, commit**

---

## Task 7: AI Chat Panel

**Files:**
- Create: `src/components/cx/ai-chat-panel.tsx`
- Modify: `src/pages/CxDashboard.tsx` (add chat toggle to AI assistant card)

- [ ] **Step 1: Create chat panel component**

`src/components/cx/ai-chat-panel.tsx`:
- Fixed position: `fixed bottom-6 end-6 z-50` (uses logical `end-6`)
- Size: `w-80 h-[420px]`
- Rounded card with shadow: `rounded-2xl shadow-xl border border-border`
- **Header**: secondary color background, title "AI CX Assistant", close button
- **Messages area**: scrollable, flex column with gap
  - User messages: `bg-secondary text-secondary-foreground` aligned to end
  - AI messages: `bg-muted` aligned to start
  - Rounded bubble styling with different corner radii
- **Input row**: shadcn `Input` with rounded-full + send `Button` (icon-only, circular)
- **Canned responses**: 9 keyword-matched responses (NPS, CSAT, CES, agent, FCR, VFM, branch, CXI, action)
- Default AI message on open: "Hello! I'm your AI CX Assistant..."
- On send: match keywords → push user message + AI response
- Auto-scroll to bottom on new message via `useRef` + `scrollIntoView`
- Initial message translated via `t()`

- [ ] **Step 2: Add chat toggle to AI assistant card**

In CxDashboard's AI CX Assistant section:
- Add a circular button next to the title: `MessageSquare` icon
- On click: toggle `chatOpen` state
- Active state: filled secondary color
- Render `<AiChatPanel>` when `chatOpen` is true

- [ ] **Step 3: Build, verify, commit**

---

## Task 8: Topic Sentiment Bubbles

**Files:**
- Create: `src/components/cx/topic-bubbles.tsx`
- Modify: `src/pages/CxDashboard.tsx` (replace bars with bubbles in the Topics card)

- [ ] **Step 1: Create SVG bubble component**

`src/components/cx/topic-bubbles.tsx`:
- SVG viewBox with 5 bubbles positioned in a natural cluster
- Each bubble:
  - Circle sized proportional to mention count (radius = sqrt(mentions) * scale)
  - Stroke ring split into 3 arcs (positive green, neutral grey, negative coral)
  - Topic label centered inside
  - Mention count below label
- "Emerging" badge (Lucide `Zap` icon) on the Fees bubble
- Hover state: show tooltip with sentiment breakdown percentages
- Use shadcn `Tooltip` for the hover tooltip
- Colors: `var(--color-zain-green)`, `var(--color-zain-grey-lite)`, `var(--color-zain-coral)`
- Dark mode: use `-lite` variants

- [ ] **Step 2: Replace bars in CxDashboard**

In the `FunnelAndTopics` component, replace the stacked bar approach with `<TopicBubbles>`. Keep the stacked bars as a fallback for mobile (bubbles on desktop, bars on mobile).

- [ ] **Step 3: Build, verify, commit**

---

## Task 9: Trend Chart Action Annotations

**Files:**
- Modify: `src/pages/CxDashboard.tsx` (trend chart section)

- [ ] **Step 1: Add annotation dots to trend chart**

In the trend chart's `<LineChart>`:
- Use Recharts `ReferenceDot` component for two action annotations:
  1. Week 4 (IVR Redesign): x="W4", y=37, gold color dot
  2. Week 9 (Agent Coaching): x="W9", y=40, blue color dot
- Use Recharts `ReferenceLine` with `strokeDasharray` for vertical dotted lines at those weeks
- Custom dot render: larger circle (r=6) with white border
- Wrap dots in shadcn `Tooltip`:
  - IVR Redesign: "Targeting CES −0.4, FCR +5%, CSAT +3%"
  - Agent Coaching: "Targeting Agent +4%, CSAT +2%, NPS +3 pts"
- Translate annotation labels via `t()`

- [ ] **Step 2: Build, verify, commit**

---

## Task 10: Role-Based Dashboard Views

**Files:**
- Modify: `src/pages/CxDashboard.tsx`

- [ ] **Step 1: Add frontline view**

At the top of the `CxDashboard` render function:
```tsx
const { persona } = usePersona()

if (persona.id === "frontline") {
  return <FrontlineView />
}
if (persona.id === "executive") {
  return <ExecutiveView />
}
// ... existing CX Manager dashboard
```

**FrontlineView** (inline component or separate):
- Simple greeting header
- 2×2 grid with 4 stat cards: NPS (+52), CSAT (82%), Open Cases (3), Today's Responses (47)
- Open Cases list: 3 mock cases with customer name, issue, priority badge (Critical=coral, High=gold)
- All using shadcn `Card`, `Badge`
- Bilingual via `t()`

- [ ] **Step 2: Add executive view**

**ExecutiveView**:
- Greeting header with date badge
- 4 KPI cards in a row: NPS (+42, +4 vs prev), CSAT (78%, +2%), CES (3.2, -0.3), Open Cases (3, -2)
- 2-column layout below: Trend chart (left, larger) + Branch performance list (right)
- Simpler than CX Manager view — no radar, no AI assistant, no flip cards
- Bilingual via `t()`

- [ ] **Step 3: Build, verify, commit**

---

## Task 11: Persona Switcher

**Files:**
- Create: `src/components/cx/persona-switcher.tsx`
- Modify: `src/components/layout/app-layout.tsx`

- [ ] **Step 1: Create persona switcher bar**

Fixed bottom bar (`fixed bottom-0 inset-x-0 z-50`):
- Collapsed state: single bar showing "PROTO | Viewing as: [persona icon + name]" + "switch role" toggle
- Expanded state: row of persona buttons, each showing icon + label
- Active persona: `bg-zain-gold text-white`
- Inactive: `bg-muted/20 text-muted-foreground`
- Background: `bg-zain-charcoal-dark` with gold accent text
- Clicking a persona: calls `setPersona()` from `usePersona()`
- Bilingual labels

- [ ] **Step 2: Add to layout**

In `app-layout.tsx`, render `<PersonaSwitcher />` after `</SidebarInset>` (outside the main content flow, fixed positioned).

- [ ] **Step 3: Build, verify, commit**

---

## Task 12: Mobile Bottom Nav + FAB

**Files:**
- Create: `src/components/cx/mobile-nav.tsx`
- Modify: `src/components/layout/app-layout.tsx`

- [ ] **Step 1: Create mobile bottom nav**

`src/components/cx/mobile-nav.tsx`:
- Only visible on mobile (`useIsMobile()`)
- Fixed bottom bar with 3-4 tabs depending on persona:
  - Frontline: Home, Cases
  - Executive: Home, Analytics, Journey, Actions
  - Default: Home, Surveys, Analytics, Cases
- Each tab: Lucide icon + label
- Active tab: `text-secondary` with animated dot indicator below
- Background: `bg-background border-t border-border`

**MobileFAB**:
- Floating action button above bottom nav
- `fixed bottom-20 end-5` (logical property)
- Gradient `bg-gradient-to-r from-secondary to-zain-teal-dark`
- Icon: `Plus` + label (New Survey or New Case based on persona)
- Shadow: `shadow-lg`

- [ ] **Step 2: Add to layout (mobile only)**

In `app-layout.tsx`, conditionally render mobile nav when `isMobile`:
```tsx
const isMobile = useIsMobile()
// ... inside return:
{isMobile && <MobileBottomNav />}
{isMobile && <MobileFAB />}
```

- [ ] **Step 3: Build, verify, commit**

---

## Task 13: Placeholder Pages

**Files:**
- Create: `src/pages/PlaceholderPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create placeholder component**

```tsx
// src/pages/PlaceholderPage.tsx
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"

export default function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <Lock className="size-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-bold mb-2">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground">{t("cx.comingSoonDesc")}</p>
    </div>
  )
}
```

- [ ] **Step 2: Add routes for all nav items**

In `App.tsx`, add protected routes for:
- `/surveys` → `<PlaceholderPage titleKey="cx.navSurveys" />`
- `/distribution` → `<PlaceholderPage titleKey="cx.navDistribution" />`
- `/sending-rules` → `<PlaceholderPage titleKey="cx.navSendingRules" />`
- `/analytics` → `<PlaceholderPage titleKey="cx.navAnalyticsReports" />`
- `/closed-loop` → `<PlaceholderPage titleKey="cx.navClosedLoop" />`
- `/actions` → `<PlaceholderPage titleKey="cx.navActions" />`
- `/journey` → `<PlaceholderPage titleKey="cx.navJourney" />`

All wrapped in `<ProtectedRoute><AppLayout>...</AppLayout></ProtectedRoute>`

- [ ] **Step 3: Add translations**

ar.json: `"comingSoonDesc": "هذه الصفحة قيد التطوير — ستكون متاحة قريباً"`
en.json: `"comingSoonDesc": "This page is under development — coming soon"`
ar.json: `"comingSoon": "قريباً"`
en.json: `"comingSoon": "Coming Soon"`

- [ ] **Step 4: Build, verify, commit**

---

## Task 14: Final Integration & Polish

**Files:**
- All modified files

- [ ] **Step 1: Wire sidebar nav items to actual React Router navigation**

Update `app-sidebar.tsx` to use `useNavigate()` from react-router:
- Each `SidebarMenuButton` onClick → `navigate(item.href)`
- Active state: compare `item.href` with current `useLocation().pathname`

- [ ] **Step 2: Ensure dark mode works across all new components**

Check: Login page, modals, chat panel, persona switcher, mobile nav — all must have proper `dark:` variants.

- [ ] **Step 3: Ensure RTL works across all new components**

Check: All use logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, `text-end`, `start-*`, `end-*`). No physical `left`, `right`, `pl-`, `pr-`, `ml-`, `mr-`.

- [ ] **Step 4: Final build**

Run: `npx vite build 2>&1 | tail -10`
Expected: Clean build with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete full CX app conversion with all prototype features"
```

---

## Execution Order & Dependencies

```
Task 1 (Contexts) ──┬── Task 2 (Login)
                     ├── Task 3 (Sidebar) ──── Task 14 (Navigation wiring)
                     ├── Task 4 (Topbar)
                     ├── Task 10 (Role views) ── Task 11 (Persona switcher)
                     └── Task 13 (Placeholders)

Independent (no deps):
  Task 5 (Flip cards)
  Task 6 (KPI modal)
  Task 7 (AI chat)
  Task 8 (Topic bubbles)
  Task 9 (Trend annotations)
  Task 12 (Mobile nav)
```

Tasks 5-9 and 12 are independent and can be parallelized.
