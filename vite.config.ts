import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Pin the port so the origin (and therefore the per-origin theme cache) never
    // drifts to 5174 — drifting splits localStorage and "loses" the tenant theme
    // on reload. strictPort fails loudly instead of silently moving.
    port: 5173,
    strictPort: true,
    // Local-dev only: permit the dev server to answer for *.localhost subdomains
    // (vodafone.localhost, gac.localhost, …) so we can test subdomain-driven
    // theming. This is HOST PERMISSION ONLY — the tenant resolution itself lives
    // in the backend (it reads the Host header). No business logic here.
    allowedHosts: [".localhost"],
  },
})
