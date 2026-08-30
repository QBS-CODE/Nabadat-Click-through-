// Test-send modal — deliver one real message using the live channel config + a
// chosen template. Prototype: toasts only.

import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LANGS, SURVEYS, chanBase } from "../data/reference"
import { sendName, srvObj, tplOptions } from "../data/helpers"
import { useChannels } from "../store"

export function TestSendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { channels, templates } = useChannels()
  const enabledChannels = useMemo(
    () => Object.values(channels).filter((c) => c.st && !["device", "inapp"].includes(chanBase(c.key))),
    [channels],
  )
  const [ch, setCh] = useState(enabledChannels[0]?.key || "sms")
  const [srv, setSrv] = useState(SURVEYS[0].id)
  const survey = srvObj(srv)!
  const [lang, setLang] = useState(survey.langs[0])
  const [to, setTo] = useState("")

  const tpls = tplOptions(templates, ch, "Invitation", lang)
  const [tpl, setTpl] = useState<string>(tpls[0] ? String(tpls[0].i) : "")

  const onSurvey = (v: string) => {
    setSrv(v)
    const s = srvObj(v)!
    if (!s.langs.includes(lang)) setLang(s.langs[0])
  }

  const send = () => {
    if (!to.trim()) {
      toast("Enter a recipient for the test send.")
      return
    }
    if (!tpls.length) {
      toast("No template exists for that channel and language — create one first.")
      return
    }
    onClose()
    toast(`Test ${sendName(ch)} message queued to ${to.trim()}. Excluded from analytics and fatigue counting.`)
  }

  const survLangs = srvObj(srv)!.langs

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Send a test</DialogTitle>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Delivers a real message to one recipient using the live channel configuration and template. Test sends bypass
            fatigue caps and are excluded from response analytics.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Channel">
            <Select value={ch} onValueChange={(v) => v && setCh(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{sendName(ch)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {enabledChannels.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Survey">
            <Select value={srv} onValueChange={(v) => v && onSurvey(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{srvObj(srv)!.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SURVEYS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Language">
            <Select value={lang} onValueChange={(v) => v && setLang(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{LANGS[lang]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {survLangs.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LANGS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Template"
            hint="Channel configuration no longer carries a default, so a test send picks the template explicitly — the same choice a rule makes."
          >
            <Select value={tpl} onValueChange={(v) => v && setTpl(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tpls.find((x) => String(x.i) === tpl)
                    ? `${tpls.find((x) => String(x.i) === tpl)!.t.n} — ${LANGS[lang]}`
                    : "No template for this channel and language"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tpls.length ? (
                  tpls.map(({ t, i }) => (
                    <SelectItem key={i} value={String(i)}>
                      {t.n} — {LANGS[t.lang]}
                      {t.ap === "pending" ? " · pending approval" : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No invitation template for this channel and language
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-1.5">
            <Label htmlFor="tst-to">Recipient</Label>
            <Input id="tst-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+962 7X XXX XXXX or name@example.com" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send}>Send test</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
