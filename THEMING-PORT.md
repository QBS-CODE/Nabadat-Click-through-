# Multi-Tenant Theming — Port Guide

How to replicate the tenant-theming system (built in the **click-through** repo) into the
**real** project: a CSS token foundation, a hex→token refactor, a small derivation engine,
the runtime wiring that applies a tenant's colors with no flash, and the backend that serves
those colors per subdomain.

## How to use this
1. Copy this file into the real repo.
2. Open **both** workspaces (click-through + real) and this file, and ask Claude to execute it.
   The portable engine files are copied verbatim from the click-through repo; the rest is
   project-specific edits described step-by-step below.

## Assumptions (verify first)
- Real frontend = **Vite + Tailwind CSS v4 + CSS-variable tokens** (shadcn-style), TypeScript/React.
- Real backend = **ASP.NET Core** (you have it).
- If the frontend differs (Tailwind v3 / CSS-modules / styled-components), the *mechanism*
  (CSS variables overridden at runtime) still holds, but token syntax must be adapted.

## Source files in the click-through repo (to copy / reference)
| File | Action |
|---|---|
| `src/lib/theme/oklch.ts` | **copy verbatim** |
| `src/lib/theme/tenant-theme.ts` | copy, then change the default seed to the real brand |
| `src/lib/theme/derive-theme.ts` | copy, then **recalibrate ramp anchors** (see Phase 3) |
| `src/lib/theme/tenant-runtime.ts` | copy, then set `API_BASE`/endpoint |
| `src/components/dev/TenantSwitcher.tsx` | copy (optional dev tool) |
| `index.html` (inline script) | apply the snippet in Phase 4 |
| `src/main.tsx` (boot wiring) | apply the snippet in Phase 4 |
| `vite.config.ts` (server block) | apply the snippet in Phase 4 |
| `api/*` (.NET) | reference for Phase 5 endpoints/model |

---

## Phase 1 — CSS token foundation (`index.css`)

Three tiers, by whether they re-theme per tenant:

**a. Semantic tokens — var-indirection (shadcn v4 default; verify present):**
```css
@theme inline {
  --color-primary: var(--primary);
  --color-card: var(--card);            /* …all semantic tokens */
}
:root { --primary: #...; --card: #ffffff; /* light values */ }
.dark { --primary: #...; /* dark values */ }
```

**b. Brand ramps — convert literals → var-indirection** (this is what makes brand utilities
like `bg-nb-cyan-700` tenant-themeable):
```css
@theme inline {
  --color-nb-cyan:     var(--nb-cyan);
  --color-nb-cyan-700: var(--nb-cyan-700);   /* …every shade, for cyan/mint/navy + neutrals */
}
:root {                       /* raw, tenant-overridable values (the real brand defaults) */
  --nb-cyan: #0D8BBC; --nb-cyan-700: #0087A8; /* … */
}
```

**c. Fixed/global — keep as literals, never indirect:** the **D1–D5 KPI scale**, **`destructive`**
(it *is* D5), and the **logo gradient**. Identical for every tenant. (Add `d2-hover` etc. if the
app uses hover tints on D-scale surfaces.)

> Rule: anything that should follow the tenant brand → indirected token. Anything that means
> *status* (KPI colors) or fixed identity (logo) → literal, never themed.

---

## Phase 2 — Hex → token refactor

Goal: no raw `[#hex]` arbitrary values in `className` (they bypass tokens and never re-theme).

```sh
# (a) exact token→hex map from the real CSS
grep -oE '\-\-color-[a-z0-9-]+: #[0-9A-Fa-f]{6}' src/index.css

# (b) inventory bracketed hex in app code (exclude vendored ui/)
grep -rhoE '\[#[0-9A-Fa-f]{6}\]' src --include='*.tsx' | grep -v components/ui | sort | uniq -c | sort -rn

# (c) replace each hex that EXACTLY equals a token (prefix-agnostic). One s/// per hex from the map:
grep -rlE '\[#[0-9A-Fa-f]{6}\]' src --include='*.tsx' | grep -v components/ui | xargs perl -i -pe '
  s/\Q[#C8F5DB]\E/d2-light/g;
  s/\Q[#156632]\E/d2-dark/g;
  # … one line per (hex → token) pair
'

# (d) verify ZERO remain
grep -rnoE '\-\[#[0-9a-fA-F]{3,8}\]' src --include='*.tsx' | grep -v components/ui
```

Rules (learned the hard way):
- **Exact match only** — verify the token's hex equals the literal (pixel-identical). Flag any
  hex with no exact token (add a token, or leave it).
- **Do NOT touch:** `fill="#…"` / `url(#id)` (SVG), `perfColor`-style **JS hex constants**
  (must stay JS values for SVG/canvas), and **third-party brand mockups** (e.g. WhatsApp/device chrome).
- **Verify visually:** build passes + before/after screenshots of heavy pages.
- (Optional) review inline-`style` hex: `style=\{\{[^}]*#[0-9a-fA-F]{6}` — tokenize only the
  brand colors that should re-theme; leave fixed/mockup ones.

---

## Phase 3 — Theming engine (`src/lib/theme/`)

Copy the 4 files. Adjust:

- **`oklch.ts`** — copy verbatim (perceptual color math; no changes).
- **`tenant-theme.ts`** — set the default seed (`NABADAT_SEED` equivalent) to the real brand's
  `primary` / `secondary` / `neutral` (+ optional `sidebar` / `accent` / `background`).
- **`derive-theme.ts`** — `deriveThemeVars` / `buildThemeCss` / `applyTheme`. **Recalibrate the
  ramp anchors** (`BRAND_STOPS`, `NEUTRAL_STOPS`, `DARK`) to the real app's shade lightnesses,
  OR validate parity: run the real default seed through `deriveThemeVars` and diff the output
  against the real `index.css` (close = good). The **default tenant must render from `index.css`
  verbatim** — derivation only runs for non-default tenants.
- **`tenant-runtime.ts`** — set `API_BASE` (it derives from `window.location.hostname` so the
  subdomain reaches the backend) and the endpoint path.

### The 6 seed colors (what each controls)
| Seed | Required | Drives |
|---|---|---|
| `primary` | ✅ | CTAs, active nav, links, ring, chart-1, brand ramp |
| `secondary` | ✅ | secondary accents, chart-2, 2nd brand ramp |
| `neutral` | ✅ | text (`foreground`), sidebar, borders, muted, **all dark-mode surfaces** |
| `sidebar` | optional | sidebar bg (defaults to `neutral`) |
| `accent` | optional | feature-highlight surface (derived) |
| `background` | optional | page canvas tint (derived) |

---

## Phase 4 — Runtime wiring ("theming change in the document")

Three pieces. **The cascade rule (c) is the one that caused "data arrives but nothing changes."**

**(a) `index.html` — inline anti-FOUC script in `<head>` (before the bundle):**
```html
<script>
  /* No-flash: apply the cached tenant CSS synchronously before the app bundle loads. */
  (function () {
    try {
      var css = localStorage.getItem("tenant-theme-css");
      if (css) {
        var s = document.createElement("style");
        s.id = "tenant-theme";
        s.textContent = css;
        document.head.appendChild(s);
      }
    } catch (e) {}
  })();
</script>
```

**(b) Entry (`main.tsx`) — apply on boot:**
```ts
import { loadCurrentTheme } from "@/lib/theme/tenant-runtime"

loadCurrentTheme().finally(() => {
  createRoot(document.getElementById("root")!).render(/* <App/> */)
})
```
Tradeoff: gating avoids a *color* flash but shows a brief blank on a cold first load. Smoother:
`Promise.race([loadCurrentTheme(), new Promise(r => setTimeout(r, 200))])` so it never blanks long.
Also add `<link rel="preconnect">` to the font host to cut the font flash.

**(c) ⚠️ CRITICAL — `injectCss` must append `<style id="tenant-theme">` to the END of `<head>`:**
```ts
function injectCss(css: string | null): void {
  const existing = document.getElementById("tenant-theme") as HTMLStyleElement | null
  if (css === null) { existing?.remove(); return }
  const tag = existing ?? document.createElement("style")
  tag.id = "tenant-theme"
  tag.textContent = css
  document.head.appendChild(tag) // ALWAYS move to end → overrides index.css in the cascade
}
```
If you only update `textContent` in place, the tag stays *before* `index.css` and the default
theme keeps overriding it (same specificity → last-in-DOM wins).

**(d) `vite.config.ts` — local subdomain testing (dev only):**
```ts
server: {
  port: 5173,
  strictPort: true,          // pin the port: localStorage cache is per-origin; drifting splits it
  allowedHosts: [".localhost"], // host permission so vodafone.localhost etc. load — NO logic here
},
```

**Flow:** page loads → inline script applies cached CSS (no flash) → boot calls
`/api/theme/current` on the **same hostname** → `buildThemeCss(seed)` → `injectCss` (appended
last) → applied + cached for next load.

---

## Phase 5 — Backend (real .NET API)

- **Table** `TenantTheme`: `slug` (unique) + 6 colors (`primary`,`secondary`,`neutral` required;
  `sidebar`,`accent`,`background` nullable) + `derived_css` (prod) + `updated_at`.
- **Host-driven endpoint** (the one the frontend calls — backend resolves the tenant):
```csharp
static string? TenantFromHost(HttpRequest req)
{
    var host = req.Host.Host;
    if (System.Net.IPAddress.TryParse(host, out _)) return null;
    var labels = host.Split('.');
    if (labels.Length < 2) return null;                 // bare host → no subdomain
    var first = labels[0].ToLowerInvariant();
    return first is "www" or "app" or "<defaultslug>" ? null : first;
}

app.MapGet("/api/theme/current", async (HttpRequest req, ThemeDbContext db) =>
{
    var slug = TenantFromHost(req) ?? "<defaultslug>";
    var t = await db.Tenants.FirstOrDefaultAsync(x => x.Slug == slug)
            ?? await db.Tenants.FirstOrDefaultAsync(x => x.Slug == "<defaultslug>");
    return t is null ? Results.NotFound()
        : Results.Ok(new { slug = t.Slug, primary = t.Primary, secondary = t.Secondary,
            neutral = t.Neutral, sidebar = t.Sidebar, accent = t.Accent, background = t.Background });
});
```
- Plus optional slug-based `GET /api/tenants/{slug}/theme`, `POST`, `PUT` (with hex validation).
- **CORS:** allow the SPA origins (`localhost` + `*.localhost` in dev; real domains in prod).
- **Production no-flash (the proper path):** the backend serves the SPA, so **precompute
  `derived_css` on save** (run the derivation once when colors are saved) and **inject
  `<style id="tenant-theme">` into the served `index.html`** before it reaches the browser.
  Zero flash, no client gate needed — the Phase-4 client wiring becomes the fallback.

---

## Verification checklist
- [ ] `grep -rE '\-\[#' src --include='*.tsx' | grep -v components/ui` → **0**
- [ ] `tsc -b && vite build` clean
- [ ] Default tenant renders **pixel-identical** to before (uses `index.css`)
- [ ] A non-default tenant re-skins brand/chrome (buttons, nav, charts, sidebar) on hard refresh
- [ ] D1–D5 KPI colors and `destructive` **unchanged** across tenants
- [ ] Reload holds the theme (cache + append-to-end working)
- [ ] `GET /api/theme/current` returns the right colors per `Host` (verify with `curl -H "Host: <sub>.<domain>"`)

## Gotchas (the ones that cost time)
1. **`@theme inline` indirection** = themeable; raw literals/hex don't re-theme.
2. **`injectCss` → append to END of `<head>`** (cascade win). The #1 bug.
3. **localStorage cache is per-origin** → pin the dev port (`strictPort`).
4. **D1–D5 + `destructive` stay global** — never tenant-themed.
5. **Don't tokenize** SVG `fill`/`url(#)`, `perfColor` JS hex, or third-party mockup colors.
6. **Recalibrate `deriveThemeVars` anchors** to the real ramps; keep the default on `index.css`.
7. Local subdomain testing: API must bind both IPv4 + IPv6; Vite `allowedHosts`.
8. **DB Browser for SQLite:** edits need **Write Changes** (Cmd+S) to persist.
9. Run the right backend project/port — don't confuse it with another solution.

## Appendix — CLAUDE.md rule (you'll add this yourself)
Add to the Color System section: a **Multi-Tenant Theming** subsection documenting the three
token tiers (themeable semantic → themeable brand `nb-*` → fixed D1–D5/gradient), that new
pages must build on tokens (never raw hex in `className`), and a **self-review** with the two
greps:
- hard rule (must be 0): `-\[#[0-9a-fA-F]{3,8}\]`
- judgment check: `style=\{\{[^}]*#[0-9a-fA-F]{6}`
Allowed hex (not violations): SVG attrs/`url(#)`, `perfColor` JS constants, third-party mockups.
