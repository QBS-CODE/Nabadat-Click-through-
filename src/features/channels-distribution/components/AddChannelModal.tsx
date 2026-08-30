// Add-channel modal — pick a channel type (deferred types are shown but disabled),
// then a display name + provider. Creates a disabled channel and opens its setup.

import { useState } from "react"
import { useNavigate } from "react-router"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CHAN_TYPES, isSoon } from "../data/reference"
import { useChannels } from "../store"
import { Bdg, ChanIcon } from "./ui-bits"
import type { ChannelIcon } from "../data/types"

export function AddChannelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { createChannel } = useChannels()
  const [type, setType] = useState("sms")
  const [name, setName] = useState("")
  const [prov, setProv] = useState("")

  const create = () => {
    if (isSoon(type, type)) {
      toast(`${CHAN_TYPES[type].name} is coming soon — a channel of this type cannot be created yet.`)
      return
    }
    if (!name.trim()) {
      toast("Give the channel a display name.")
      return
    }
    const key = createChannel(type, name.trim(), prov)
    setName("")
    setProv("")
    onClose()
    navigate(`/distribution/channels/${key}`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
          <DialogTitle className="font-heading">Add a sending channel</DialogTitle>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Pick the channel type — it decides which configuration fields and which capture mechanics apply. The channel is
            created disabled so it can be configured and tested before any rule can select it.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(CHAN_TYPES).map(([k, t]) => {
              const soon = isSoon(k, k)
              const on = type === k
              return (
                <label
                  key={k}
                  className={cn(
                    "relative block rounded-md border-[1.5px] p-3.5 transition-colors",
                    soon
                      ? "cursor-not-allowed opacity-50 border-border"
                      : "cursor-pointer border-border hover:border-input",
                    on && !soon && "border-primary ring-[3px] ring-primary/15",
                  )}
                >
                  <input
                    type="radio"
                    name="addt"
                    className="sr-only"
                    checked={on}
                    disabled={soon}
                    onChange={() => setType(k)}
                  />
                  <span
                    className={cn(
                      "absolute end-3 top-3 grid size-[17px] place-items-center rounded-full border-[1.5px] transition-colors",
                      on && !soon ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                  <span
                    className={cn(
                      "mb-2.5 grid size-[34px] place-items-center rounded-md",
                      on && !soon
                        ? "bg-nb-cyan-100 text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <ChanIcon icon={t.icon as ChannelIcon} className="size-[17px]" />
                  </span>
                  <div className="mb-1 flex items-center gap-2 text-[12.5px] font-bold">
                    {t.name}
                    {soon && <Bdg tone="soon">Coming soon</Bdg>}
                  </div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">{t.d}</div>
                </label>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="addch-name">
                Display name<span className="ms-0.5 text-destructive">*</span>
              </Label>
              <Input id="addch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WhatsApp — Citizen services" />
              <p className="text-xs text-muted-foreground">Shown in rules and on the request record.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addch-prov">Provider / account</Label>
              <Input id="addch-prov" value={prov} onChange={(e) => setProv(e.target.value)} placeholder="e.g. Meta Cloud API · WABA +962 …" />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create}>Create channel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
