// Screen 6 — Rule configuration wizard. Six steps: Details · Conditions (WHEN) ·
// Outcome (THEN) · Reminder · Schedule & overrides · Review. Uses the shared
// evaluation engine for the inline condition test and step validation.

import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Check, ChevronLeft, ChevronRight, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { CH, LANGS, NULL_CH, PD, SURVEYS, VALS, chanBase, isNullCh, liveChannels } from "../data/reference"
import { G } from "../data/records"
import {
  defaultTplIdx,
  dmy,
  humanMin,
  linkFor,
  paramRuns,
  remOffset,
  sendName,
  slugify,
  smsMetrics,
  srvActiveMin,
  srvLabel,
  srvObj,
  summary,
  tplOptions,
  outcomeText,
} from "../data/helpers"
import { anonClass, evalNode, explain, stepErrors } from "../data/engine"
import { OWN_LABEL } from "../data/own"
import { useChannels } from "../store"
import { Bdg, CodeChip, SectionT } from "../components/ui-bits"
import { MsgPrev } from "../components/RuleDrawer"
import { ConditionBuilder } from "../components/ConditionBuilder"
import { DateField } from "../components/DateField"
import { LinkBox, Sel } from "../components/channel-setup/bits"
import type { CondGroup, Reminder, Rule, Template } from "../data/types"

const WSTEPS: [string, string][] = [
  ["Rule Details", "Name it, place it, prioritise it"],
  ["Conditions — WHEN", "Decide which transactions match"],
  ["Outcome — THEN", "Survey, language, channel, template"],
  ["Reminder", "Optional single follow-up"],
  ["Schedule & overrides", "When it runs, what it may bypass"],
  ["Review", "Check every message before saving"],
]

function samplePayload(ch: string) {
  const pl: Record<string, unknown> = {}
  CH[ch].params.slice(0, 6).forEach((p) => {
    const t = PD[p].type
    pl[p] = VALS[p]
      ? VALS[p][0][0]
      : t === "boolean"
        ? true
        : ["number", "decimal"].includes(t)
          ? 250
          : t === "date"
            ? "2026-07-27"
            : t === "datetime"
              ? "2026-07-27T10:20"
              : "sample"
  })
  return JSON.stringify(pl, null, 1)
}

/** Remount the wizard whenever the route target changes (new vs edit, or a
 *  different rule id) so the draft re-initialises from the right source. */
export default function RuleBuilderPage() {
  const { id } = useParams()
  return <RuleBuilder key={id ?? "new"} />
}

function RuleBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { rules, templates, settings, saveRule } = useChannels()

  const editRule = id != null ? rules.find((r) => String(r.id) === id) : null

  const [draft, setDraft] = useState<Rule>(() => {
    if (editRule) return JSON.parse(JSON.stringify(editRule))
    const ch = Object.keys(CH)[0]
    const send = liveChannels()[0]
    const survey = SURVEYS[0]
    return {
      id: 0,
      p: rules.filter((r) => r.ch === ch).length + 1,
      name: "",
      ch,
      st: "enabled",
      cond: G("ALL", []),
      survey: survey.id,
      lang: survey.langs[0],
      langOvr: false,
      send,
      fb: "",
      delay: [0, "minutes"],
      exp: [survey.active, "days"],
      rem: { on: false, v: 36, u: "hours", ch: send, tpl: defaultTplIdx(templates, send, "Reminder", survey.langs[0]) },
      ovr: { q: false, f: false, g: false },
      from: "2026-08-01",
      to: "",
      trig: 0,
      sent: 0,
      upd: "",
      tpl: defaultTplIdx(templates, send, "Invitation", survey.langs[0]),
      emq: false,
    }
  })
  const [step, setStep] = useState(1)
  const [visited, setVisited] = useState<Record<number, boolean>>(editRule ? { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true } : { 1: true })
  const [payload, setPayload] = useState(() => samplePayload(draft.ch))
  const [testRes, setTestRes] = useState<{ ok: boolean; msg: string } | null>(null)

  const svc = CH[draft.ch]
  const inS = svc.inS
  const nul = isNullCh(draft.send)
  const survey = srvObj(draft.survey)!
  const invTpls = tplOptions(templates, draft.send, "Invitation", draft.lang)
  const remTpls = tplOptions(templates, draft.rem.ch, "Reminder", draft.lang)

  const patch = (p: Partial<Rule>) => setDraft((d) => ({ ...d, ...p }))
  const patchRem = (p: Partial<Reminder>) => setDraft((d) => ({ ...d, rem: { ...d.rem, ...p } }))

  const changeChannel = (ch: string) => {
    setDraft((d) => {
      const params = CH[ch].params
      const prune = (n: CondGroup): CondGroup => ({
        ...n,
        ch: n.ch.filter((x) => ("g" in x ? true : params.includes(x.p))).map((x) => ("g" in x ? prune(x) : x)),
      })
      const send = CH[ch].inS ? d.send : liveChannels().includes(d.send) || isNullCh(d.send) ? d.send : liveChannels()[0]
      return { ...d, ch, cond: prune(d.cond), send }
    })
    setPayload(samplePayload(ch))
    setTestRes(null)
  }
  const changeSurvey = (sid: string) => {
    const s = srvObj(sid)!
    setDraft((d) => {
      const lang = s.langs.includes(d.lang) ? d.lang : s.langs[0]
      return {
        ...d,
        survey: sid,
        lang,
        exp: [s.active, "days"],
        tpl: defaultTplIdx(templates, d.send, "Invitation", lang),
        rem: { ...d.rem, tpl: defaultTplIdx(templates, d.rem.ch, "Reminder", lang) },
      }
    })
  }
  const changeLang = (lang: string) =>
    setDraft((d) => ({
      ...d,
      lang,
      tpl: defaultTplIdx(templates, d.send, "Invitation", lang),
      rem: { ...d.rem, tpl: defaultTplIdx(templates, d.rem.ch, "Reminder", lang) },
    }))
  const changeSend = (send: string) =>
    setDraft((d) => {
      const fb = d.fb && (d.fb === send || (!isNullCh(send) && anonClass(d.fb) !== anonClass(send))) ? "" : d.fb
      return { ...d, send, fb, tpl: isNullCh(send) ? "" : defaultTplIdx(templates, send, "Invitation", d.lang) }
    })
  const changeRemCh = (ch: string) =>
    setDraft((d) => ({ ...d, rem: { ...d.rem, ch, tpl: defaultTplIdx(templates, ch, "Reminder", d.lang) } }))

  const runTest = () => {
    let pl: Record<string, unknown>
    try {
      pl = JSON.parse(payload)
    } catch (e) {
      setTestRes({ ok: false, msg: `Invalid JSON. ${(e as Error).message}` })
      return
    }
    if (evalNode(draft.cond, pl))
      setTestRes({ ok: true, msg: `MATCH. This rule would fire: ${outcomeText(draft, templates)}.` })
    else setTestRes({ ok: false, msg: `NO MATCH. First failing condition: ${explain(draft.cond, pl) || "—"}.` })
  }

  const gotoStep = (n: number) => {
    if (n < 1 || n > 6) return
    setVisited((v) => ({ ...v, [n]: true }))
    setStep(n)
    window.scrollTo({ top: 0 })
  }
  const next = () => {
    const errs = stepErrors(step, draft, templates)
    if (errs.length) return
    if (step === 6) {
      const errs6 = stepErrors(6, draft, templates)
      if (errs6.length) return
      saveRule({ ...draft, upd: "just now · Sara A." })
      navigate("/sending-rules")
      return
    }
    gotoStep(step + 1)
  }

  const curErrs = stepErrors(step, draft, templates)

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/sending-rules")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
        <ChevronLeft className="size-3.5" />
        Back to rules
      </button>

      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold">{editRule ? editRule.name : "New rule"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {editRule
            ? `Priority ${editRule.p} on ${CH[editRule.ch].name} · updated ${editRule.upd}`
            : "Six steps: what the rule is, when it matches, what it sends, whether it reminds, when it is active — then a full preview before it goes live."}
        </p>
      </div>

      {/* Stepper — segmented pill (matches the survey builder wizard) */}
      <div className="flex overflow-hidden rounded-lg border border-border bg-card">
        {WSTEPS.map(([label], i) => {
          const n = i + 1
          const errs = visited[n] ? stepErrors(n, draft, templates) : []
          const state = n === step ? "active" : errs.length ? "err" : visited[n] ? "done" : "todo"
          return (
            <button
              key={n}
              type="button"
              onClick={() => gotoStep(n)}
              className={cn(
                "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-4 py-3 text-start transition-colors hover:bg-accent",
                i > 0 && "border-s border-border",
                (state === "done" || state === "active") && "bg-gradient-to-r from-nb-mint/15 to-nb-cyan/15",
                state === "err" && "bg-d5-light/40 dark:bg-d5-dark/20",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  state === "done"
                    ? "bg-nb-mint text-white"
                    : state === "active"
                      ? "bg-primary text-primary-foreground"
                      : state === "err"
                        ? "bg-d5 text-white"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : state === "err" ? "!" : n}
              </span>
              <span className={cn("truncate text-sm font-medium", state === "active" ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Step panes */}
      {step === 1 && <StepDetails draft={draft} patch={patch} changeChannel={changeChannel} rules={rules} />}
      {step === 2 && (
        <StepConditions
          draft={draft}
          templates={templates}
          onTree={(cond) => patch({ cond })}
          payload={payload}
          setPayload={setPayload}
          runTest={runTest}
          testRes={testRes}
        />
      )}
      {step === 3 && (
        <StepOutcome
          draft={draft}
          inS={inS}
          nul={nul}
          survey={survey}
          invTpls={invTpls}
          patch={patch}
          changeSurvey={changeSurvey}
          changeLang={changeLang}
          changeSend={changeSend}
        />
      )}
      {step === 4 && <StepReminder draft={draft} inS={inS} nul={nul} remTpls={remTpls} patchRem={patchRem} changeRemCh={changeRemCh} />}
      {step === 5 && <StepSchedule draft={draft} patch={patch} />}
      {step === 6 && <StepReview draft={draft} inS={inS} nul={nul} templates={templates} settings={settings} />}

      {/* Nav */}
      <div className="mt-5 flex items-center gap-2.5 border-t border-border pt-4">
        <Button variant="outline" onClick={() => gotoStep(step - 1)} className={cn(step === 1 && "invisible")}>
          <ChevronLeft className="size-3.5" />
          Back
        </Button>
        <span className="text-[11.5px] text-muted-foreground">
          {curErrs.length ? (
            <span className="font-semibold text-d5">{curErrs[0]}</span>
          ) : (
            `Step ${step} of ${WSTEPS.length} · ${WSTEPS[step - 1][1]}`
          )}
        </span>
        <span className="flex-1" />
        <Button onClick={next}>
          {step === WSTEPS.length ? "Save rule" : "Next"}
          {step !== WSTEPS.length && <ChevronRight className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ---- shared bits ----
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card shadow-sm dark:shadow-none">{children}</div>
)
const CardH = ({ title, desc }: { title: React.ReactNode; desc?: React.ReactNode }) => (
  <div className="px-5 pt-4">
    <div className="font-heading text-[14.5px] font-bold">{title}</div>
    {desc && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
  </div>
)
const CardB = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("px-5 pt-4 pb-5", className)}>{children}</div>
)
const Field = ({ label, hint, children, req }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; req?: boolean }) => (
  <div className="mb-4">
    <label className="mb-1.5 block text-xs font-semibold">
      {label}
      {req && <span className="ms-0.5 text-destructive">*</span>}
    </label>
    {children}
    {hint && <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</div>}
  </div>
)
const langName = (l: string) => LANGS[l] || "—"

function CkRow({ checked, onChange, title, desc }: { checked: boolean; onChange: (v: boolean) => void; title: React.ReactNode; desc: React.ReactNode }) {
  return (
    <label className="mt-2 flex cursor-pointer items-start gap-2">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>
        <span className="block text-xs font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{desc}</span>
      </span>
    </label>
  )
}

// ---- Step 1 ----
function StepDetails({ draft, patch, changeChannel, rules }: { draft: Rule; patch: (p: Partial<Rule>) => void; changeChannel: (ch: string) => void; rules: Rule[] }) {
  return (
    <Card>
      <CardH title="Rule Details" desc="What the rule is called, where it applies, and when it is evaluated relative to its peers." />
      <CardB>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Rule name" req hint={<>Short URL of this rule: <CodeChip>nbdt.jo/app/rules/{draft.name.trim() ? slugify(draft.name) : "new"}</CodeChip></>}>
            <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. VIP fast-track — Visa services" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Service channel" req hint="From M-13 (read-only contract). Decides the parameters and sending channels available later.">
              <Sel value={draft.ch} onChange={(e) => changeChannel(e.target.value)}>
                {Object.entries(CH).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.name}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label="Priority" hint="Lower = evaluated first.">
              <Input type="number" min={1} value={draft.p} onChange={(e) => patch({ p: +e.target.value || 1 })} />
            </Field>
          </div>
        </div>
        <Field label={<>Description <span className="font-normal text-muted-foreground">(optional)</span></>}>
          <Input value={draft.desc || ""} onChange={(e) => patch({ desc: e.target.value })} placeholder="What this rule is for." />
        </Field>
        <p className="text-[11px] text-muted-foreground">This rule is priority #{draft.p} of {rules.filter((r) => r.ch === draft.ch).length + (draft.id ? 0 : 1)} on {CH[draft.ch].name}.</p>
      </CardB>
    </Card>
  )
}

// ---- Step 2 ----
function StepConditions({
  draft,
  templates,
  onTree,
  payload,
  setPayload,
  runTest,
  testRes,
}: {
  draft: Rule
  templates: Template[]
  onTree: (t: CondGroup) => void
  payload: string
  setPayload: (v: string) => void
  runTest: () => void
  testRes: { ok: boolean; msg: string } | null
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
      <Card>
        <CardH
          title="Conditions — WHEN"
          desc="Only parameters supported on the selected service channel are offered. The operator list is driven by the parameter's data type; list values show their mapped display values from M-13. Cyan rail = ALL (AND) group · mint rail = ANY (OR) group."
        />
        <CardB>
          <ConditionBuilder tree={draft.cond} params={CH[draft.ch].params} onChange={onTree} />
          <div className="mt-3.5 rounded-md border border-border bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed">
            <b className="text-nb-cyan-800 dark:text-nb-cyan-200">WHEN</b> a transaction arrives on <b>{CH[draft.ch].name}</b> and {summary(draft.cond)} → <b>THEN</b> {outcomeText(draft, templates)}.
          </div>
        </CardB>
      </Card>
      <Card>
        <CardH title="Test these conditions" desc="Paste a sample transaction and check whether this rule would match." />
        <CardB>
          <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} spellCheck={false} className="min-h-[150px] font-mono text-[11.5px]" dir="ltr" />
          <div className="mt-2.5">
            <Button variant="secondary" size="sm" onClick={runTest}>
              <Play className="size-3.5" />
              Run test
            </Button>
          </div>
          {testRes && (
            <div className={cn("mt-3 rounded-md px-3.5 py-3 text-[12.5px] leading-relaxed", testRes.ok ? "bg-d2-light text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light" : "bg-d5-light text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light")}>
              {testRes.msg}
            </div>
          )}
        </CardB>
      </Card>
    </div>
  )
}

// ---- Step 3 ----
function StepOutcome({
  draft,
  inS,
  nul,
  survey,
  invTpls,
  patch,
  changeSurvey,
  changeLang,
  changeSend,
}: {
  draft: Rule
  inS: boolean
  nul: boolean
  survey: ReturnType<typeof srvObj>
  invTpls: { t: import("../data/types").Template; i: number }[]
  patch: (p: Partial<Rule>) => void
  changeSurvey: (v: string) => void
  changeLang: (v: string) => void
  changeSend: (v: string) => void
}) {
  const tpl = invTpls.find((x) => String(x.i) === String(draft.tpl))?.t
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardH title="Outcome — THEN" desc="Which survey goes out, in which language, over which channel." />
        <CardB>
          <Field label="Survey" req hint="Survey definitions are owned by M-01 — referenced by ID.">
            <Sel value={draft.survey} onChange={(e) => changeSurvey(e.target.value)}>
              {SURVEYS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.id}
                </option>
              ))}
            </Sel>
          </Field>
          <Field label="Survey language" hint={<><b>{survey!.name}</b> is translated into {survey!.langs.map(langName).join(", ")}. Only translated languages are offered — a rule can never request a language the survey does not have.</>}>
            <Sel value={draft.lang} onChange={(e) => changeLang(e.target.value)}>
              {survey!.langs.map((l) => (
                <option key={l} value={l}>
                  {langName(l)}
                </option>
              ))}
            </Sel>
            <CkRow
              checked={draft.langOvr}
              onChange={(v) => patch({ langOvr: v })}
              title={<>Preferred language overriding <span className="font-normal text-muted-foreground">— from parameters —</span></>}
              desc="When the transaction carries a language parameter, send in that language instead — but only if the survey is translated into it. Otherwise the language selected above is used."
            />
          </Field>

          {inS ? (
            <div className="rounded-md bg-nb-cyan-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-nb-cyan-900 dark:bg-nb-cyan-900/25 dark:text-nb-cyan-100">
              <b>In-session / on-device.</b> This service channel collects in the same session. The survey is presented on the device immediately: <b>no sending channel, no template, no link, no reminder.</b>
            </div>
          ) : (
            <>
              <Field label="Sending channel" req hint="The rule's channel is authoritative. If the contact detail for it is missing or the send fails, the fallback channel below is used — there is no other substitution.">
                <Sel value={draft.send} onChange={(e) => changeSend(e.target.value)}>
                  <option value={NULL_CH}>Backend — no message; the link is returned to the requesting system</option>
                  {liveChannels().map((k) => (
                    <option key={k} value={k}>
                      {sendName(k)}
                    </option>
                  ))}
                </Sel>
              </Field>
              {nul ? (
                <div className="rounded-md bg-nb-cyan-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-nb-cyan-900 dark:bg-nb-cyan-900/25 dark:text-nb-cyan-100">
                  <b>Backend outcome.</b> M-02 resolves the survey, the language and a unique link, and returns them to the system that asked — it sends no message. There is no template, no fallback and no reminder.
                </div>
              ) : (
                <>
                  <Field label="Fallback sending channel" hint="Used when the primary channel fails or its contact field is missing. The primary channel is excluded from this list.">
                    <Sel value={draft.fb} onChange={(e) => patch({ fb: e.target.value })}>
                      <option value="">None — fail and report</option>
                      {liveChannels()
                        .filter((k) => k !== draft.send && anonClass(k) === anonClass(draft.send))
                        .map((k) => (
                          <option key={k} value={k}>
                            {sendName(k)}
                          </option>
                        ))}
                    </Sel>
                  </Field>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Fallback options are limited to <b>identifying</b> channels, matching the primary.{" "}
                    <span className="font-mono">is_anonymous</span> is fixed when the invitation is created, so every
                    attempt on it must identify the respondent the same way.
                  </p>
                  {chanBase(draft.send) === "email" && (
                    <CkRow
                      checked={!!draft.emq}
                      onChange={(v) => patch({ emq: v })}
                      title="Make the first question answerable in the email body"
                      desc="The first question renders in the email and one tap records the answer, opening the survey at question two. The survey link is included either way."
                    />
                  )}
                  <Field label={<span className="inline-flex items-center gap-2">Message template <Bdg tone="mute">{sendName(draft.send)}</Bdg></span>} hint={`Templates for ${sendName(draft.send)} in ${langName(draft.lang)}. Channels of the same type share wording.`}>
                    <Sel value={String(draft.tpl ?? "")} onChange={(e) => patch({ tpl: e.target.value })}>
                      {invTpls.length ? (
                        invTpls.map(({ t, i }) => (
                          <option key={i} value={i}>
                            {t.n} — {langName(t.lang)}
                            {t.ap === "pending" ? " · pending approval" : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">No template for {sendName(draft.send)} in {langName(draft.lang)} — create one</option>
                      )}
                    </Sel>
                  </Field>
                </>
              )}
            </>
          )}
        </CardB>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardH title="Message preview" desc="The selected template with parameters resolved against a sample transaction." />
          <CardB>
            {inS ? (
              <p className="text-[11px] text-muted-foreground">In-session surveys carry no message — the survey itself is presented on the device.</p>
            ) : nul ? (
              <p className="text-[11px] text-muted-foreground">No message is sent — the link is returned to the requesting system.</p>
            ) : tpl ? (
              <>
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <Bdg tone="cyan">{sendName(draft.send)}</Bdg>
                  <Bdg tone="mute">{langName(tpl.lang)}</Bdg>
                  {chanBase(draft.send) === "sms" &&
                    (() => {
                      const m = smsMetrics(tpl.body)
                      return (
                        <Bdg tone="d2">
                          {m.seg} segment{m.seg === 1 ? "" : "s"} · {m.len} ch
                        </Bdg>
                      )
                    })()}
                  {tpl.ap === "pending" && <Bdg tone="d3">Pending approval</Bdg>}
                </div>
                <MsgPrev body={tpl.body} />
              </>
            ) : (
              <div className="rounded-md bg-d3-light px-3.5 py-3 text-[12.5px] text-d3-dark dark:bg-d3-dark/25 dark:text-d3-light">No template selected — the send would be held.</div>
            )}
          </CardB>
        </Card>
        {!inS && (
          <Card>
            <CardH title="Survey link" desc="Built from the tenant link format in Settings, with this survey's slug and a unique attribute per recipient." />
            <CardB>
              <LinkBox surveyId={draft.survey} />
              <div className="mt-3.5 grid grid-cols-[150px_1fr] gap-y-2 text-xs">
                <span className="text-muted-foreground">Readable part</span>
                <span className="font-mono">{linkFor(draft.survey).slug}</span>
                <span className="text-muted-foreground">Unique attribute</span>
                <span>
                  <span className="font-mono">{linkFor(draft.survey).uid}</span> · one per <b>send attempt</b>
                </span>
                <span className="text-muted-foreground">Active period</span>
                <span>{humanMin(srvActiveMin(draft.survey))} from sent_at</span>
                <span className="text-muted-foreground">Delivered by</span>
                <span>{nul ? "Backend — returned to the requesting system" : sendName(draft.send)}</span>
              </div>
              <p className="mt-3.5 text-[11px] leading-relaxed text-muted-foreground">
                The survey's active period is set with the survey in M-01. Once it passes the survey is <b>closed</b>: the
                link redirects to the general feedback form with an opaque reference, and no reminder follows.
              </p>
              <SectionT>Invitation created at dispatch</SectionT>
              <div className="grid grid-cols-[150px_1fr] gap-y-2 text-xs">
                <span className="text-muted-foreground">Survey active period</span>
                <span>{humanMin(srvActiveMin(draft.survey))} from sent_at · M-01 BR-3.1</span>
                <span className="text-muted-foreground">Rule link expiry</span>
                <span>{humanMin(srvActiveMin(draft.survey))}</span>
                <span className="text-muted-foreground">Effective expiry</span>
                <span>
                  <b>{humanMin(srvActiveMin(draft.survey))}</b> after sending
                </span>
              </div>
              <p className="mt-3.5 text-[11px] leading-relaxed text-muted-foreground">
                After it the link stops serving the survey and <b>redirects to the general feedback form</b> with an
                opaque reference. No reminder follows.
              </p>
            </CardB>
          </Card>
        )}
      </div>
    </div>
  )
}

// ---- Step 4 ----
function StepReminder({
  draft,
  inS,
  nul,
  remTpls,
  patchRem,
  changeRemCh,
}: {
  draft: Rule
  inS: boolean
  nul: boolean
  remTpls: { t: import("../data/types").Template; i: number }[]
  patchRem: (p: Partial<Reminder>) => void
  changeRemCh: (ch: string) => void
}) {
  const remTpl = remTpls.find((x) => String(x.i) === String(draft.rem.tpl))?.t
  if (inS || nul) {
    return (
      <Card>
        <CardH title="Survey reminder" />
        <CardB>
          <p className="text-[11px] text-muted-foreground">
            {inS ? "In-session surveys are answered immediately, so there is no reminder." : "A backend outcome sends no message, so there is nothing to remind about."}
          </p>
        </CardB>
      </Card>
    )
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardH title="Survey reminder" desc={<>Sent once if the customer has not responded. The offset is counted from <span className="font-mono">sent_at</span> — the moment the survey was actually dispatched.</>} />
        <CardB>
          <div className="mb-4 flex items-center gap-3">
            <Switch checked={draft.rem.on} onCheckedChange={(v) => patchRem({ on: v })} aria-label="Send a reminder" />
            <div>
              <div className="text-[12.5px] font-semibold">Send a reminder</div>
              <div className="text-[11px] text-muted-foreground">Off by default. One reminder maximum.</div>
            </div>
          </div>
          {/* Fields stay visible (disabled) when the reminder is off — matches the reference. */}
          <div className={cn("space-y-4 transition-opacity", !draft.rem.on && "pointer-events-none opacity-50")} aria-disabled={!draft.rem.on}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Send the reminder after" hint="Counted from the moment the survey was sent, not from the transaction.">
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={1} disabled={!draft.rem.on} value={draft.rem.v} onChange={(e) => patchRem({ v: +e.target.value || 0 })} className="flex-1" />
                  <Sel value={draft.rem.u} disabled={!draft.rem.on} onChange={(e) => patchRem({ u: e.target.value as Reminder["u"] })} className="w-28">
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </Sel>
                </div>
              </Field>
              <Field label="Reminder channel">
                <Sel value={draft.rem.ch} disabled={!draft.rem.on} onChange={(e) => changeRemCh(e.target.value)}>
                  {liveChannels().map((k) => (
                    <option key={k} value={k}>
                      {sendName(k)}
                    </option>
                  ))}
                </Sel>
              </Field>
            </div>
            <Field label="Reminder template" hint="Approved templates for the reminder channel and the survey language.">
              <Sel value={String(draft.rem.tpl ?? "")} disabled={!draft.rem.on} onChange={(e) => patchRem({ tpl: e.target.value })}>
                {remTpls.length ? (
                  remTpls.map(({ t, i }) => (
                    <option key={i} value={i}>
                      {t.n} — {langName(t.lang)}
                    </option>
                  ))
                ) : (
                  <option value="">No reminder template — create one</option>
                )}
              </Sel>
            </Field>
          </div>
          <div className="mt-4 rounded-md bg-nb-cyan-100 px-3.5 py-3 text-[12px] leading-relaxed text-nb-cyan-900 dark:bg-nb-cyan-900/25 dark:text-nb-cyan-100">
            The reminder is suppressed if the customer has responded, opted out, or the link has already expired — and it obeys quiet hours and the grace period exactly like the invitation.
          </div>
        </CardB>
      </Card>
      <Card>
        <CardH title="Reminder preview" desc="Resolved against the same sample transaction." />
        <CardB>
          {!draft.rem.on ? (
            <p className="text-[11px] text-muted-foreground">No reminder is configured for this rule.</p>
          ) : (
            <>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <Bdg tone="navy">Reminder</Bdg>
                <Bdg tone="cyan">{sendName(draft.rem.ch)}</Bdg>
                <Bdg tone="mute">{remOffset(draft.rem)} after sending</Bdg>
              </div>
              {remTpl ? <MsgPrev body={remTpl.body} /> : <p className="text-[11px] text-muted-foreground">No reminder template selected.</p>}
            </>
          )}
        </CardB>
      </Card>
    </div>
  )
}

// ---- Step 5 ----
function StepSchedule({ draft, patch }: { draft: Rule; patch: (p: Partial<Rule>) => void }) {
  const ovr = draft.ovr
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardH title="Schedule & status" />
        <CardB>
          <div className="mb-4 flex items-center gap-3">
            <Switch checked={draft.st === "enabled"} onCheckedChange={(v) => patch({ st: v ? "enabled" : "disabled" })} aria-label="Enabled" />
            <div>
              <div className="text-[12.5px] font-semibold">Enabled</div>
              <div className="text-[11px] text-muted-foreground">Disabled rules are skipped during evaluation.</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Effective from">
              <DateField value={draft.from} onChange={(v) => patch({ from: v })} placeholder="Start date" />
            </Field>
            <Field label="Effective to" hint="Empty = no end date.">
              <DateField value={draft.to} onChange={(v) => patch({ to: v })} placeholder="No end date" />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">Dates and reminder offsets use the <b>tenant timezone (Asia/Amman)</b> set in Settings.</p>
        </CardB>
      </Card>
      <Card>
        <CardH title="Policy overrides" desc="Bypass a tenant guardrail for this rule only. Every override is audited and tagged on the request record." />
        <CardB className="pt-2">
          <CkRow checked={ovr.q} onChange={(v) => patch({ ovr: { ...ovr, q: v } })} title={<>Ignore quiet hours <Bdg tone="cyan">{OWN_LABEL.m02}</Bdg></>} desc="Send inside the quiet window instead of holding until it opens. Enforced by M-02's channel policy at send time, so this flag travels with the dispatch, not with the decision." />
          <CkRow checked={ovr.f} onChange={(v) => patch({ ovr: { ...ovr, f: v } })} title={<>Request a fatigue-cap exemption <Bdg tone="d2">{OWN_LABEL.m03}</Bdg></>} desc="M-02 cannot bypass a cap it does not own. This flag is passed to M-03 at dispatch as an exemption request, and M-03 decides." />
          <CkRow checked={ovr.g} onChange={(v) => patch({ ovr: { ...ovr, g: v } })} title={<>Request a grace-period exemption <Bdg tone="d2">{OWN_LABEL.m03}</Bdg></>} desc="Same delegation: the grace window is measured against the customer's history, which lives in M-03." />
          <div className="mt-3.5 rounded-md bg-d5-light px-3.5 py-3 text-[12px] leading-relaxed text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light">
            <b>Opt-out is never overridable, and no flag exists for it.</b> Consent withdrawal is a legal obligation under PDPL and GDPR, not a preference. It is checked by M-03 at dispatch so that no rule — including a forgotten one — can bypass it.
          </div>
        </CardB>
      </Card>
    </div>
  )
}

// ---- Step 6 ----
function StepReview({
  draft,
  inS,
  nul,
  templates,
  settings,
}: {
  draft: Rule
  inS: boolean
  nul: boolean
  templates: import("../data/types").Template[]
  settings: import("../data/types").Settings
}) {
  const errs = stepErrors(6, draft, templates)
  const tpl = templates[Number(draft.tpl)]
  const remTpl = templates[Number(draft.rem.tpl)]
  const hh = (h: number) => String(h).padStart(2, "0") + ":00"
  const KV = ({ rows }: { rows: [string, React.ReactNode][] }) => (
    <div className="grid grid-cols-[170px_1fr] gap-y-2 text-xs">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <span className="text-muted-foreground">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardH title="Review" desc="The whole rule in one place. Anything incomplete is flagged here and on the step bar." />
          <CardB>
            {errs.length ? (
              <div className="rounded-md bg-d5-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d5-dark dark:bg-d5-dark/25 dark:text-d5-light">
                <b>{errs.length} item{errs.length === 1 ? "" : "s"} to fix before this rule can be saved as active:</b>
                <br />
                {errs.map((e, i) => (
                  <span key={i}>
                    · {e}
                    <br />
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-md bg-d2-light px-3.5 py-3 text-[12.5px] leading-relaxed text-d2-dark dark:bg-d2-dark/25 dark:text-d2-light">
                <Check className="mt-0.5 size-3.5 shrink-0" />
                <span>Complete. Saving will {draft.st === "enabled" ? "enable this rule from the next transaction" : "store it disabled"}.</span>
              </div>
            )}
            <div className="mt-3 rounded-md border border-border bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed">
              <b className="text-nb-cyan-800 dark:text-nb-cyan-200">WHEN</b> a transaction arrives on <b>{CH[draft.ch].name}</b> and {summary(draft.cond)} → <b>THEN</b> {outcomeText(draft, templates)}.
            </div>
            <SectionT>Rule</SectionT>
            <KV
              rows={[
                ["Name", draft.name || <span className="text-d5">Not set</span>],
                ["Service channel", <span className="inline-flex items-center gap-2" key="c">{CH[draft.ch].name} <CodeChip>{draft.ch}</CodeChip></span>],
                ["Priority", `#${draft.p}`],
                ["Conditions", summary(draft.cond)],
              ]}
            />
            <SectionT>Outcome</SectionT>
            <KV
              rows={[
                ["Survey", srvLabel(draft.survey)],
                ["Language", <span key="l">{langName(draft.lang)}{draft.langOvr && <> <Bdg tone="cyan">Preferred language overriding</Bdg></>}</span>],
                inS ? ["Delivery", "Presented on the device in session"] : nul ? ["Outcome", "Backend — link returned to the requesting system"] : ["Sending channel", `${sendName(draft.send)}${draft.fb ? ` · fallback ${sendName(draft.fb)}` : " · no fallback"}`],
                ...(inS || nul ? [] : ([["Template", tpl ? `${tpl.n} — ${langName(tpl.lang)}` : (<span className="text-d5">Not selected</span> as React.ReactNode)]] as [string, React.ReactNode][])),
                ["Active period", `${humanMin(srvActiveMin(draft.survey))} from sending`],
                ...(inS || nul ? [] : ([["Reminder", draft.rem.on ? `${remOffset(draft.rem)} after sending via ${sendName(draft.rem.ch)}` : (<Bdg tone="mute">None</Bdg> as React.ReactNode)]] as [string, React.ReactNode][])),
              ]}
            />
            <SectionT>Guardrails</SectionT>
            <KV
              rows={[
                ["Quiet hours", draft.ovr.q ? <Bdg tone="d3">Overridden by this rule</Bdg> : `${hh(settings.qFrom)} – ${hh(settings.qTo)} · respected`],
                ["Grace period", draft.ovr.g ? <Bdg tone="d3">Exemption requested from M-03</Bdg> : "Set in M-03"],
                ["Fatigue caps", draft.ovr.f ? <Bdg tone="d3">Exemption requested from M-03</Bdg> : "Respected"],
                ["Opt-out", "Always respected — not overridable"],
                ["Effective", draft.to ? `${dmy(draft.from)} – ${dmy(draft.to)}` : `From ${dmy(draft.from)}`],
                ["Status", draft.st === "enabled" ? <Bdg tone="d2">Will be enabled</Bdg> : <Bdg tone="mute">Disabled</Bdg>],
              ]}
            />
          </CardB>
        </Card>
      </div>
      <Card>
        <CardH title="All messages" desc="Invitation and reminder with parameters resolved against a sample transaction." />
        <CardB>
          {inS || nul ? (
            <p className="text-[11px] text-muted-foreground">{nul ? "This rule sends no message — the link is returned to the backend." : "This rule sends no message — the survey is presented in session on the device."}</p>
          ) : (
            <>
              {tpl && (
                <div className="mb-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Bdg tone="cyan">Invitation</Bdg>
                    <Bdg tone="mute">{sendName(draft.send)}</Bdg>
                    <Bdg tone="mute">{langName(tpl.lang)}</Bdg>
                    {chanBase(draft.send) === "sms" &&
                      (() => {
                        const m = smsMetrics(tpl.body)
                        return (
                          <Bdg tone="d2">
                            {m.seg} part{m.seg === 1 ? "" : "s"} · {m.len} ch
                          </Bdg>
                        )
                      })()}
                  </div>
                  <MsgPrev body={tpl.body} />
                  <WrittenAs body={tpl.body} />
                </div>
              )}
              <div className="mb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Bdg tone="navy">Reminder</Bdg>
                  <Bdg tone="mute">{sendName(draft.rem.ch)}</Bdg>
                  <Bdg tone="mute">{langName((draft.rem.on && remTpl ? remTpl.lang : draft.lang) as string)}</Bdg>
                  {chanBase(draft.rem.ch) === "sms" &&
                    (() => {
                      const m = smsMetrics(draft.rem.on && remTpl ? remTpl.body : "")
                      return (
                        <Bdg tone="d2">
                          {m.seg} part{m.seg === 1 ? "" : "s"} · {m.len} ch
                        </Bdg>
                      )
                    })()}
                </div>
                <MsgPrev body={draft.rem.on && remTpl ? remTpl.body : ""} />
                <WrittenAs body={draft.rem.on && remTpl ? remTpl.body : ""} />
              </div>
              <SectionT>Survey link</SectionT>
              <LinkBox surveyId={draft.survey} />
            </>
          )}
        </CardB>
      </Card>

      {/* Evaluation & dispatch order — the full end-to-end path for a matching transaction. */}
      <div className="lg:col-span-2">
        <Card>
          <CardH title="Evaluation & dispatch order" desc="What will happen to a matching transaction, end to end." />
          <CardB className="pt-1">
            <EvalTimeline draft={draft} tpl={tpl} inS={inS} nul={nul} settings={settings} />
          </CardB>
        </Card>
      </div>
    </div>
  )
}

/** The raw template body with its [Parameters] highlighted — the "Written as:" line. */
function WrittenAs({ body }: { body: string }) {
  return (
    <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
      Written as:{" "}
      {body
        ? paramRuns(body).map((run, i) =>
            run.param ? (
              <span key={i} className="rounded-sm bg-nb-cyan-100 px-1 font-mono text-[10.5px] text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
                {run.t}
              </span>
            ) : (
              <span key={i}>{run.t}</span>
            ),
          )
        : "…"}
    </div>
  )
}

function EvalTimeline({
  draft,
  tpl,
  inS,
  nul,
  settings,
}: {
  draft: Rule
  tpl?: Template
  inS: boolean
  nul: boolean
  settings: import("../data/types").Settings
}) {
  const hh = (h: number) => String(h).padStart(2, "0") + ":00"
  const steps: { t: React.ReactNode; d: React.ReactNode }[] = [
    { t: "M-13 receives the transaction", d: "Validated, parameters mapped, forwarded to M-02 with a correlation ID" },
    { t: `This rule is evaluated at priority ${draft.p}`, d: summary(draft.cond) },
  ]
  if (inS) {
    steps.push({ t: "Presented in session", d: "The survey renders on the device immediately — no dispatch, no reminder, no M-03 checks." })
  } else if (nul) {
    steps.push({ t: "Link returned to the backend", d: "M-02 resolves the survey, language and a unique link and returns them to the requesting system — no message is sent." })
  } else {
    steps.push(
      { t: "Contact and preferences resolved", d: <>M-03 supplies the contact detail for {sendName(draft.send)} and its opt-out state</> },
      { t: "Dispatch scheduled", d: <>The decision is now fixed. Everything below runs at <b>send time</b>, because the customer's state can change inside this delay.</> },
      {
        t: <>Quiet hours <Bdg tone="cyan">{OWN_LABEL.m02}</Bdg></>,
        d: draft.ovr.q ? (
          "Waived by this rule."
        ) : (
          <>Enforced ({hh(settings.qFrom)}–{hh(settings.qTo)}). A dispatch landing inside the window is <b>held</b> and released at the next allowed window, not dropped.</>
        ),
      },
      { t: <>Opt-out <Bdg tone="d2">{OWN_LABEL.m03}</Bdg></>, d: <>Always checked, never overridable. An opted-out customer's survey is <b>dropped</b> whatever this rule decided.</> },
      { t: <>Fatigue cap and grace period <Bdg tone="d2">{OWN_LABEL.m03}</Bdg></>, d: "Enforced against the customer's history across every rule, survey and channel" },
      { t: "Dispatched", d: <>{sendName(draft.send)} · template {tpl ? tpl.n : "—"}</> },
    )
    if (draft.rem.on) steps.push({ t: `Reminder ${remOffset(draft.rem)} later`, d: <>{sendName(draft.rem.ch)} · only if unanswered</> })
    steps.push({ t: "Response collected by M-04", d: "M-04 validates, deduplicates and stores it, then reports it back against this request in the survey request log" })
  }
  return (
    <div className="space-y-3.5">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">{s.t}</div>
            <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{s.d}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
