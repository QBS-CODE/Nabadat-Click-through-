import { useEffect, useState } from "react"
import { API_BASE, DEFAULT_SLUG, switchTenant } from "@/lib/theme/tenant-runtime"

interface TenantSummary {
  slug: string
  name: string
}

/**
 * Dev-only floating control to switch the active tenant theme live (no reload).
 * Reads the tenant list from the theme API; renders nothing if the API is down.
 * Gate with `import.meta.env.DEV` at the call site so it never ships to prod.
 */
export function TenantSwitcher() {
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [slug, setSlug] = useState(DEFAULT_SLUG)

  useEffect(() => {
    fetch(`${API_BASE}/api/tenants`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TenantSummary[]) => setTenants(data))
      .catch(() => setTenants([]))
  }, [])

  if (tenants.length === 0) return null

  async function onChange(next: string) {
    setSlug(next)
    await switchTenant(next) // live — CSS variables cascade instantly
  }

  return (
    <div className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shadow-md">
      <span className="text-xs font-medium text-muted-foreground">Tenant theme</span>
      <select
        value={slug}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-card px-2 py-1 text-sm text-foreground"
        aria-label="Switch tenant theme"
      >
        {tenants.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
