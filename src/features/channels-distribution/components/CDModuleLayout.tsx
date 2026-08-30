// The M-02 module shell. The store is provided app-wide (see App.tsx) and each
// screen is now a top-level sidebar entry, so this only supplies the standard page
// gutter around the module's routed screens.

import { Outlet } from "react-router"

export function CDModuleLayout() {
  return (
    <div className="px-8 py-5">
      <Outlet />
    </div>
  )
}
