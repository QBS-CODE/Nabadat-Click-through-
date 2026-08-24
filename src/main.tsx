import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { KpiProvider } from './contexts/kpi-context'
import { loadCurrentTheme } from './lib/theme/tenant-runtime'

// Apply the tenant theme BEFORE first paint (no flash). The inline script in
// index.html already applied the cached theme synchronously; this asks the
// backend which tenant this host is and revalidates. Default tenant → index.css.
// Race the fetch against a 1.5s cap so a hung theme host (accepts the TCP
// connect but never responds) can't block first paint — the cached theme from
// index.html stays applied and revalidation lands whenever it resolves.
function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <KpiProvider>
        <App />
      </KpiProvider>
    </StrictMode>,
  )
}
let mounted = false
const mountOnce = () => { if (!mounted) { mounted = true; mount() } }
Promise.race([
  loadCurrentTheme().catch(() => {}),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]).finally(mountOnce)
  