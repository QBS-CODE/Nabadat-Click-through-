// SCR-M03-02 — Customer Profile. A faithful port of the ratified prototype's
// layout, rebuilt with this app's design system and driven by shared mock data.
// Always renders the demo customer (Ahmad Al-Masri); the :id route param is read
// but the profile IS the demo customer (prototype behaviour). No backend.
//
// The whole profile body lives in <CustomerProfileView> so the SCR-M03-06 preview
// dialog can reuse it verbatim. This page adds only the page chrome: the back link.

import { useNavigate, useParams } from "react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useDirection } from "@/hooks/use-direction"
import { pick, type Lang } from "../data"
import { CustomerProfileView } from "../components/CustomerProfileView"

export default function CustomerProfilePage() {
  useParams() // route :id is read; the profile is always the demo customer
  const navigate = useNavigate()
  const { lang: rawLang } = useDirection()
  const lang = rawLang as Lang

  return (
    <div className="space-y-5 py-5">
      {/* back link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/customers")}
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {pick(lang, "العملاء", "Customers")}
        </Button>
      </div>

      <CustomerProfileView />
    </div>
  )
}
