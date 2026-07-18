# Nabadat Theme API (test)

Minimal ASP.NET Core (net9) + EF Core + **SQLite** API that serves per-tenant brand
seeds for the frontend theming engine (`src/lib/theme/`). SQLite = zero setup on Mac:
the DB is a single `themes.db` file created automatically on first run.

## Run

**Rider:** open the solution and press Run (profile `http`).

**CLI:** `dotnet` lives at `~/.dotnet/dotnet` (not on PATH by default), so either:

```sh
~/.dotnet/dotnet run --project api/ThemeApi.csproj
# or add it to PATH once (zsh):
echo 'export PATH="$HOME/.dotnet:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

- API: <http://localhost:5050>
- Swagger UI (test all endpoints): <http://localhost:5050/swagger>
- DB file: `api/themes.db` (git-ignored). Delete it to reset + reseed.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/tenants` | list all tenants (summary) |
| GET | `/api/tenants/{slug}/theme` | **the 6-color seed** — what the frontend calls |
| POST | `/api/tenants` | create a tenant theme |
| PUT | `/api/tenants/{slug}/theme` | update a tenant's colors |
| DELETE | `/api/tenants/{slug}` | remove a tenant |

Seeded tenants: `nabadat` (default brand), `acme` (purple), `globex` (orange).

The GET response matches the frontend `TenantThemeSeed` exactly:

```json
{ "primary":"#0D8BBC", "secondary":"#13DB9B", "neutral":"#1E2235",
  "sidebar":"#1E2235", "accent":"#EEF1F7", "background":"#F7F9FC" }
```

## Wire it into the SPA

```ts
import { applyTheme } from "@/lib/theme/derive-theme"
import type { TenantThemeSeed } from "@/lib/theme/tenant-theme"

const API = "http://localhost:5050"
export async function loadTenantTheme(slug: string) {
  const res = await fetch(`${API}/api/tenants/${slug}/theme`)
  if (!res.ok) return            // keep default index.css theme
  applyTheme((await res.json()) as TenantThemeSeed)
}
// call e.g. loadTenantTheme("acme") on app bootstrap
```

CORS already allows `http://localhost:5173` (Vite).
