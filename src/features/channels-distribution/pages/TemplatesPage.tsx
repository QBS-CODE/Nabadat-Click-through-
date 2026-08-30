// Screen 3 — Message templates. The invitation and reminder wording per channel
// and language, with a coverage matrix that flags gaps before a rule is built.

import { useState, type ReactNode } from "react"
import { Check, Info, Pencil, Plus, Search, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LANGS, SEND, chanBase, liveChannels } from "../data/reference"
import { resolveMsg, sendName, smsMetrics } from "../data/helpers"
import { useChannels } from "../store"
import { TemplateEditor } from "../components/TemplateEditor"
import { Bdg } from "../components/ui-bits"
import type { Template } from "../data/types"

const TH = "text-xs font-medium uppercase tracking-widest text-muted-foreground"
const LANG_KEYS = Object.keys(LANGS)

export default function TemplatesPage() {
  const { templates } = useChannels()
  const [q, setQ] = useState("")
  const [fch, setFch] = useState("")
  const [fl, setFl] = useState("")
  const [fk, setFk] = useState("")
  const [editIdx, setEditIdx] = useState<number | null>(null)

  const rows = templates
    .map((t, i) => ({ t, i }))
    .filter(
      ({ t }) =>
        (t.n.toLowerCase().includes(q.toLowerCase()) || resolveMsg(t.body).toLowerCase().includes(q.toLowerCase())) &&
        (!fch || chanBase(t.ch) === chanBase(fch)) &&
        (!fl || t.lang === fl) &&
        (!fk || t.k === fk),
    )

  const matches = (ch: string, kind: string, lang: string) =>
    templates.filter((t) => chanBase(t.ch) === chanBase(ch) && t.k === kind && t.lang === lang)
  const gaps: string[] = []
  liveChannels().forEach((ch) =>
    LANG_KEYS.forEach((l) =>
      (["Invitation", "Reminder"] as const).forEach((kind) => {
        if (!matches(ch, kind, l).length) gaps.push(`${SEND[ch].name} · ${LANGS[l]} · ${kind.toLowerCase()}`)
      }),
    ),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">Message templates</h1>
          <p className="mt-1 max-w-[680px] text-sm text-muted-foreground">
            The invitation and reminder wording per channel and language. A rule never carries copy — it names a survey;
            the channel resolves the template for the survey language it is sending in.
          </p>
        </div>
        <Button onClick={() => setEditIdx(-1)}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="t-q">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="t-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="ps-9" />
          </div>
        </div>
        <FilterSelect label="Channel" value={fch} onChange={setFch} placeholder="All channels" options={liveChannels().map((k) => [k, sendName(k)])} />
        <FilterSelect label="Language" value={fl} onChange={setFl} placeholder="All languages" options={Object.entries(LANGS)} />
        <FilterSelect label="Type" value={fk} onChange={setFk} placeholder="Invitation & reminder" options={[["Invitation", "Invitation"], ["Reminder", "Reminder"]]} />
      </div>

      {/* Coverage matrix */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm dark:shadow-none">
        <h2 className="text-base font-bold">Template coverage</h2>
        <p className="mt-0.5 mb-4 text-xs leading-relaxed text-muted-foreground">
          A rule that resolves to a gap is held at dispatch rather than sent in the wrong language. Channels of the same
          type share wording, so SMS-JO, SMS-KSA and SMS-VIP resolve against the SMS templates.
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TH}>Channel</TableHead>
                {LANG_KEYS.map((l) => (
                  <TableHead key={l} className={cn(TH, "text-end")}>
                    {LANGS[l]}
                    <div className="text-[9px] font-normal tracking-normal normal-case text-muted-foreground">invite · remind</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveChannels().map((ch) => (
                <TableRow key={ch}>
                  <TableCell>
                    <div className="text-[12.5px] font-semibold">{SEND[ch].name}</div>
                  </TableCell>
                  {LANG_KEYS.map((l) => (
                    <TableCell key={l} className="text-end whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <CoverageCell list={matches(ch, "Invitation", l)} />
                        <CoverageCell list={matches(ch, "Reminder", l)} />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {gaps.length ? (
          <Alert tone="warn">
            <b>{gaps.length} gap{gaps.length === 1 ? "" : "s"}:</b> {gaps.slice(0, 6).join(" · ")}
            {gaps.length > 6 ? ` and ${gaps.length - 6} more` : ""}.
          </Alert>
        ) : (
          <Alert tone="ok">Every live channel has an invitation and a reminder template in every language.</Alert>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH}>Template</TableHead>
              <TableHead className={TH}>Channel</TableHead>
              <TableHead className={TH}>Type</TableHead>
              <TableHead className={TH}>Language</TableHead>
              <TableHead className={TH}>Length</TableHead>
              <TableHead className={TH}>Updated</TableHead>
              <TableHead className={cn(TH, "w-16 text-center")}>
                <span className="sr-only">Edit</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No templates match the current filters.{" "}
                  <button className="ms-2 font-semibold text-primary hover:underline" onClick={() => setEditIdx(-1)}>
                    + New template
                  </button>
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ t, i }) => (
              <TemplateRow key={i} t={t} onEdit={() => setEditIdx(i)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="border-t border-border pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
        WhatsApp utility templates must be approved by Meta before first use; a rule that resolves to an unapproved
        template is held and reported on the survey request log rather than failing silently. Variables are filled from
        M-13 transaction parameters and the M-03 contact record at dispatch.
      </p>

      <TemplateEditor idx={editIdx ?? -1} open={editIdx !== null} onClose={() => setEditIdx(null)} />
    </div>
  )
}

function CoverageCell({ list }: { list: Template[] }) {
  if (!list.length) return <Bdg tone="d3" title="No template">Missing</Bdg>
  const pending = list.some((t) => t.ap === "pending")
  return (
    <Bdg tone={pending ? "d3" : "d2"} title={list.map((t) => t.n).join(" · ")}>
      {list.length}
      {pending ? " · pending" : ""}
    </Bdg>
  )
}

function TemplateRow({ t, onEdit }: { t: Template; onEdit: () => void }) {
  const m = chanBase(t.ch) === "sms" ? smsMetrics(t.body) : null
  const plain = resolveMsg(t.body).replace(/<[^>]+>/g, "")
  // First line of the RESOLVED text (params replaced with real values) — matches the
  // reference, which previews the message as the customer would see it, not the raw tokens.
  const firstLine = plain.split("\n")[0].slice(0, 56)
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) onEdit() }}>
      <TableCell>
        <div className="text-[12.5px] font-semibold">{t.n}</div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{firstLine}…</div>
      </TableCell>
      <TableCell>{SEND[t.ch]?.name ?? sendName(t.ch)}</TableCell>
      <TableCell>
        <Bdg tone={t.k === "Reminder" ? "navy" : "cyan"}>{t.k}</Bdg>
      </TableCell>
      <TableCell>{LANGS[t.lang]}</TableCell>
      <TableCell>
        {m ? (
          <Bdg tone={m.seg > 2 ? "d5" : m.seg === 2 ? "d3" : "d2"}>
            {m.seg} part{m.seg === 1 ? "" : "s"} · {m.len} ch
          </Bdg>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">{plain.length} ch</span>
        )}
      </TableCell>
      <TableCell className="text-[11.5px] text-muted-foreground">{t.u}</TableCell>
      <TableCell className="w-16 text-center">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Edit" title="Edit" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function Alert({ tone, children }: { tone: "warn" | "ok" | "info"; children: ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-d3-light text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light"
      : tone === "ok"
        ? "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light"
        : "bg-nb-cyan-100 text-nb-cyan-900 dark:bg-nb-cyan-900/25 dark:text-nb-cyan-100"
  const Icon = tone === "warn" ? TriangleAlert : tone === "ok" ? Check : Info
  return (
    <div className={cn("mt-3.5 flex items-start gap-2.5 rounded-md px-3.5 py-3 text-xs leading-relaxed", cls)}>
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: [string, string][]
}) {
  const ALL = "__all__"
  return (
    <div className="flex flex-col gap-1.5 sm:w-48">
      <Label>{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(!v || v === ALL ? "" : v)}>
        <SelectTrigger className="w-full">
          <SelectValue>{value ? options.find((o) => o[0] === value)?.[1] : placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map(([k, l]) => (
            <SelectItem key={k} value={k}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
