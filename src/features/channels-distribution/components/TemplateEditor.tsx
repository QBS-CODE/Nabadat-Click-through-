// Template editor drawer — name/channel/type/language, an HTML mini-toolbar over
// the body, [Parameter] palettes (transaction + system), and a resolved preview.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet"
import { LANGS, SYS_PARAMS, TXN_PARAMS, chanBase, liveChannels } from "../data/reference"
import { resolveMsg, sendName, smsMetrics } from "../data/helpers"
import { useChannels } from "../store"
import { SectionT } from "./ui-bits"
import type { Template, TplKind } from "../data/types"

const DEFAULT: Template = {
  n: "",
  ch: "sms",
  k: "Invitation",
  lang: "en",
  ap: "n/a",
  u: "—",
  body: "Thank you [Customer Name] for using [Service]. Please rate it here: [Survey URL]",
}

/** Visible text of an HTML body — tags stripped, entities decoded — for length counts. */
function stripHtml(html: string): string {
  const d = document.createElement("div")
  d.innerHTML = html || ""
  return d.textContent || ""
}

export function TemplateEditor({
  idx,
  open,
  onClose,
}: {
  idx: number
  open: boolean
  onClose: () => void
}) {
  const { templates, saveTemplate } = useChannels()
  const editorRef = useRef<HTMLDivElement>(null)
  // Last caret/range known to be INSIDE the editor (see the selectionchange effect below).
  const savedRange = useRef<Range | null>(null)
  const [t, setT] = useState<Template>(DEFAULT)
  // The contentEditable is FULLY UNCONTROLLED — React never renders children into it, so it
  // can never wipe the user's live formatting on a re-render (a `dangerouslySetInnerHTML`
  // here re-asserts the seed on every keystroke and erased every Bold/Italic). Instead a
  // remount `key` (bumped per open/switch) gives a fresh node, and a STABLE callback ref
  // seeds that node's DOM once at mount from `seedRef`. Typing flows OUT via onInput → sync.
  const seedRef = useRef("")
  const [editorKey, setEditorKey] = useState(0)
  const setEditorNode = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node
    if (node) node.innerHTML = seedRef.current
  }, [])

  useEffect(() => {
    if (!open) return
    const base = idx >= 0 ? { ...templates[idx] } : { ...DEFAULT }
    setT(base)
    seedRef.current = base.body
    setEditorKey((k) => k + 1)
    savedRange.current = null
  }, [open, idx, templates])

  // Pressing a toolbar/palette button moves focus off the editor and can collapse its
  // selection before our handler runs. So we continuously remember the last caret/range
  // that was INSIDE the editor, and restore it right before every command — this is what
  // makes "select a word, click Bold" reliable regardless of focus behaviour.
  const saveSel = () => {
    const s = window.getSelection()
    if (s && s.rangeCount && editorRef.current?.contains(s.anchorNode)) {
      savedRange.current = s.getRangeAt(0).cloneRange()
    }
  }
  useEffect(() => {
    if (!open) return
    document.addEventListener("selectionchange", saveSel)
    return () => document.removeEventListener("selectionchange", saveSel)
  }, [open])

  const patch = (p: Partial<Template>) => setT((prev) => ({ ...prev, ...p }))
  const base = chanBase(t.ch)
  const isSms = base === "sms"
  const m = isSms ? smsMetrics(stripHtml(t.body)) : null

  // Counts are measured on the VISIBLE (tags-stripped) text. SMS shows GSM/segment metrics;
  // every other channel shows a length meter toward the provider limit — WhatsApp 1024 (a
  // HARD cap the send can exceed → "over"), everything else 600 recommended (a SOFT target
  // that only warns near the limit). Mirrors the reference's `countMsg` / `LIMITS`.
  const typedLen = stripHtml(t.body).length
  const resolvedPlain = stripHtml(resolveMsg(t.body))
  const resolvedLen = resolvedPlain.length
  const meter = (() => {
    if (isSms) return null
    const wa = base === "whatsapp"
    const limit = wa ? 1024 : 600
    const pct = Math.min(100, Math.round((resolvedLen / limit) * 100))
    const over = wa && resolvedLen > limit
    const warn = !over && pct >= 80
    const words = resolvedPlain.trim() ? resolvedPlain.trim().split(/\s+/).length : 0
    return { limit, pct, over, warn, label: wa ? "max" : "recommended", email: !wa, words }
  })()

  const sync = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      patch({ body: html === "<br>" ? "" : html })
    }
  }
  const restoreSel = () => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const s = window.getSelection()
    if (s && savedRange.current) {
      s.removeAllRanges()
      s.addRange(savedRange.current)
    }
  }
  // Run a formatting command against the restored editor selection. Emit tags
  // (`styleWithCSS=false`) rather than inline styles so the saved body stays clean HTML.
  const exec = (cmd: string, val?: string) => {
    if (!editorRef.current) return
    restoreSel()
    try {
      document.execCommand("styleWithCSS", false, "false")
    } catch {
      /* not supported — commands still emit tags */
    }
    document.execCommand(cmd, false, val)
    sync()
    saveSel()
  }
  const insertLink = () => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) exec("createLink", "[Survey URL]")
    else exec("insertHTML", '<a href="[Survey URL]">[Survey URL]</a>')
  }
  const insertParam = (name: string) => {
    if (!editorRef.current) return
    restoreSel()
    document.execCommand("insertText", false, `[${name}]`)
    sync()
    saveSel()
  }

  const save = () => {
    if (!t.n.trim()) {
      toast("Template name is required.")
      return
    }
    saveTemplate(idx, { ...t, u: "just now · Sara A." })
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[560px] max-w-[94vw] flex-col gap-0 p-0 data-[side=left]:sm:max-w-[560px] data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="font-heading text-base font-bold">{idx >= 0 ? t.n || "Template" : "New template"}</div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {idx >= 0
              ? `${sendName(t.ch)} · ${t.k} · ${LANGS[t.lang]} · updated ${t.u}`
              : "Pick a channel and language, then write the message."}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Template name</Label>
              <Input value={t.n} onChange={(e) => patch({ n: e.target.value })} placeholder="e.g. Visa NPS invitation" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Channel</Label>
              <Select value={t.ch} onValueChange={(v) => v && patch({ ch: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{sendName(t.ch)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {liveChannels().map((k) => (
                    <SelectItem key={k} value={k}>
                      {sendName(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={t.k} onValueChange={(v) => v && patch({ k: v as TplKind })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{t.k}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invitation">Invitation</SelectItem>
                  <SelectItem value="Reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Language</Label>
              <Select value={t.lang} onValueChange={(v) => v && patch({ lang: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{LANGS[t.lang]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Message body</Label>
            <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-muted p-1.5">
              {(
                [
                  [<b key="b">B</b>, () => exec("bold"), "font-bold", "Bold"],
                  [<i key="i">I</i>, () => exec("italic"), "italic", "Italic"],
                  [<u key="u">U</u>, () => exec("underline"), "underline", "Underline"],
                  ["Link", insertLink, "", "Link"],
                  ["List", () => exec("insertUnorderedList"), "", "List"],
                  ["↵", () => exec("insertHTML", "<br>"), "", "Line break"],
                ] as [ReactNode, () => void, string, string][]
              ).map(([lbl, fn, cls, title]) => (
                <button
                  key={title}
                  type="button"
                  title={title}
                  aria-label={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={fn}
                  className={cn(
                    "h-[26px] min-w-[28px] rounded-sm border border-transparent px-2 text-xs text-foreground hover:border-border hover:bg-card",
                    cls,
                  )}
                >
                  {lbl}
                </button>
              ))}
              <span className="ms-auto text-[10.5px] text-muted-foreground">Rich text</span>
            </div>
            <div
              key={editorKey}
              ref={setEditorNode}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Message body"
              dir={t.lang === "ar" ? "rtl" : "ltr"}
              onInput={sync}
              className={cn(
                "min-h-[150px] w-full rounded-b-md border border-t-0 border-input bg-card px-2.5 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring",
                "[&_a]:text-primary [&_a]:underline [&_ul]:my-1 [&_ul]:list-disc [&_ul]:ps-5",
                t.lang === "ar" ? "text-end" : "text-start",
              )}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Typed <b className="text-foreground tabular-nums">{typedLen}</b>
              </span>
              <span className={cn(meter?.over && "font-bold text-d5", meter?.warn && "font-bold text-d3-dark dark:text-d3-light")}>
                Resolved <b className="tabular-nums">{resolvedLen}</b>
                {meter && (
                  <>
                    {" "}
                    / {meter.limit} {meter.label}
                  </>
                )}
              </span>
              {m && (
                <>
                  <span>
                    Encoding <b className="text-foreground">{m.uni ? "Unicode — Arabic" : "GSM-7 — English"}</b>
                  </span>
                  <span className={cn(m.seg > 2 && "font-bold text-d5", m.seg === 2 && "font-bold text-d3-dark dark:text-d3-light")}>
                    Parts <b className="tabular-nums">{m.seg}</b> · {m.per} characters each
                  </span>
                </>
              )}
              {meter?.email && (
                <span>
                  Words <b className="text-foreground tabular-nums">{meter.words}</b>
                </span>
              )}
              {meter && (
                <span className="h-1 min-w-20 max-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-150",
                      meter.over ? "bg-d5" : meter.warn ? "bg-d3" : "bg-primary",
                    )}
                    style={{ width: `${meter.pct}%` }}
                  />
                </span>
              )}
              {meter?.over && <span className="font-bold text-d5">Over the limit — the send would be rejected</span>}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              <b>Message length and cost are estimates.</b> The message a customer receives is longer or shorter than what
              you write here, because every parameter is replaced by a real value at send time — a long customer name or
              service title can push an SMS into an extra part and change what it costs.
            </p>
          </div>

          <div>
            <SectionT>Transaction parameters</SectionT>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              Received with the transaction from the source system. A parameter with no value at send time leaves the
              message incomplete, so the send is held rather than sent with a gap.
            </p>
            <Palette params={TXN_PARAMS} onInsert={insertParam} />
          </div>
          <div>
            <SectionT>System values</SectionT>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              Generated by Nabadat for this recipient rather than received from the source system. They always resolve.
            </p>
            <Palette params={SYS_PARAMS} onInsert={insertParam} />
          </div>

          <div>
            <SectionT>Preview — parameters resolved</SectionT>
            <div
              className="rounded-md border border-border bg-muted px-3.5 py-3 text-xs leading-[1.7] whitespace-pre-wrap"
              dir={t.lang === "ar" ? "rtl" : "ltr"}
              dangerouslySetInnerHTML={{
                __html: resolveMsg(t.body).replace(/\n/g, "<br>") || '<span class="text-muted-foreground">Nothing to preview yet.</span>',
              }}
            />
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save template</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Palette({ params, onInsert }: { params: string[]; onInsert: (name: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {params.map((p) => (
        <button
          key={p}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(p)}
          className="h-[26px] rounded-sm border border-dashed border-border bg-card px-2 font-mono text-[11px] font-semibold text-primary transition-colors hover:border-primary hover:bg-nb-cyan-100 dark:hover:bg-nb-cyan-900/40"
        >
          [{p}]
        </button>
      ))}
    </div>
  )
}
