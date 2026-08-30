// The AND/OR condition tree builder (WHEN step). Cyan rail = ALL (AND) group,
// mint rail = ANY (OR) group. Ported from the mockup's renderTree/nodeHTML + the
// node-addressing + value-widget logic.

import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  OPS,
  PD,
  TYPE_LBL,
  VALS,
  opMulti,
  opNoVal,
} from "../data/reference"
import { vLabel } from "../data/helpers"
import type { CondGroup, CondLeaf, CondNode } from "../data/types"

function defaultVal(p: string, o: string): unknown[] {
  const t = PD[p].type
  if (opNoVal(o)) return []
  if (t === "boolean") return [true]
  if (VALS[p]) return opMulti(o) ? [] : [VALS[p][0][0]]
  return []
}

const clone = (t: CondGroup): CondGroup => JSON.parse(JSON.stringify(t))
function nodeAt(tree: CondGroup, path: string): CondNode {
  if (path === "") return tree
  return path.split("-").reduce<CondNode>((n, i) => (n as CondGroup).ch[+i], tree)
}
function parentAt(tree: CondGroup, path: string) {
  const parts = path.split("-")
  const last = +parts.pop()!
  return { parent: (parts.length ? nodeAt(tree, parts.join("-")) : tree) as CondGroup, idx: last }
}

export function ConditionBuilder({
  tree,
  params,
  onChange,
}: {
  tree: CondGroup
  params: string[]
  onChange: (t: CondGroup) => void
}) {
  const mutate = (fn: (t: CondGroup) => void) => {
    const t = clone(tree)
    fn(t)
    onChange(t)
  }
  const ops = {
    addCond: (path: string) =>
      mutate((t) => {
        const n = nodeAt(t, path) as CondGroup
        const p = params[0]
        const o = OPS[PD[p].type][0]
        n.ch.push({ p, o, v: defaultVal(p, o) })
      }),
    addGroup: (path: string) => mutate((t) => (nodeAt(t, path) as CondGroup).ch.push({ g: 1, op: "ANY", ch: [] })),
    rmNode: (path: string) =>
      mutate((t) => {
        const { parent, idx } = parentAt(t, path)
        parent.ch.splice(idx, 1)
      }),
    setGroupOp: (path: string, op: "ALL" | "ANY") => mutate((t) => ((nodeAt(t, path) as CondGroup).op = op)),
    setParam: (path: string, p: string) =>
      mutate((t) => {
        const c = nodeAt(t, path) as CondLeaf
        c.p = p
        c.o = OPS[PD[p].type][0]
        c.v = defaultVal(p, c.o)
      }),
    setOp: (path: string, o: string) =>
      mutate((t) => {
        const c = nodeAt(t, path) as CondLeaf
        const keep = opMulti(c.o) === opMulti(o)
        c.o = o
        if (!keep) c.v = defaultVal(c.p, o)
      }),
    setVal: (path: string, v: unknown) => mutate((t) => ((nodeAt(t, path) as CondLeaf).v = [v])),
    setValList: (path: string, raw: string) =>
      mutate((t) => ((nodeAt(t, path) as CondLeaf).v = raw.split(",").map((s) => s.trim()).filter(Boolean))),
    addChip: (path: string, v: string) =>
      mutate((t) => {
        const c = nodeAt(t, path) as CondLeaf
        if (v && !c.v.includes(v)) c.v.push(v)
      }),
    rmChip: (path: string, i: number) => mutate((t) => (nodeAt(t, path) as CondLeaf).v.splice(i, 1)),
  }

  return <div>{renderNode(tree, "", true, params, ops)}</div>
}

interface Ops {
  addCond: (p: string) => void
  addGroup: (p: string) => void
  rmNode: (p: string) => void
  setGroupOp: (p: string, op: "ALL" | "ANY") => void
  setParam: (p: string, v: string) => void
  setOp: (p: string, v: string) => void
  setVal: (p: string, v: unknown) => void
  setValList: (p: string, raw: string) => void
  addChip: (p: string, v: string) => void
  rmChip: (p: string, i: number) => void
}

function ValueWidget({ c, path, ops }: { c: CondLeaf; path: string; ops: Ops }) {
  const t = PD[c.p].type
  if (opNoVal(c.o)) return <div className="px-0.5 py-2.5 text-[11.5px] text-muted-foreground">No value needed</div>
  if (t === "boolean")
    return (
      <NativeSelect
        size="sm"
        className="w-full [&_select]:!h-9"
        value={String(c.v[0] === true)}
        onChange={(e) => ops.setVal(path, e.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </NativeSelect>
    )
  if (VALS[c.p]) {
    if (opMulti(c.o)) {
      const left = VALS[c.p].filter((x) => !c.v.includes(x[0]))
      return (
        <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[10px] border border-input bg-card p-1">
          {c.v.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-sm bg-nb-cyan-100 px-1.5 py-0.5 text-[11px] font-semibold text-nb-cyan-800 dark:bg-nb-cyan-900/40 dark:text-nb-cyan-200">
              {vLabel(c.p, v)}
              <button type="button" onClick={() => ops.rmChip(path, i)} aria-label="Remove" className="text-inherit">
                ✕
              </button>
            </span>
          ))}
          <select
            className="min-w-[90px] flex-1 cursor-pointer bg-transparent text-[11px] text-muted-foreground outline-none"
            value=""
            onChange={(e) => {
              if (e.target.value) ops.addChip(path, e.target.value)
            }}
          >
            <option value="">{c.v.length ? "+ add value" : "Select values…"}</option>
            {left.map((x) => (
              <option key={x[0]} value={x[0]}>
                {x[1]}
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (c.o === "contains")
      return (
        <Input
          className="h-9 rounded-[10px] text-xs"
          value={String(c.v[0] ?? "")}
          placeholder="Text to look for"
          onChange={(e) => ops.setVal(path, e.target.value)}
        />
      )
    return (
      <NativeSelect size="sm" className="w-full [&_select]:!h-9" value={String(c.v[0] ?? "")} onChange={(e) => ops.setVal(path, e.target.value)}>
        {VALS[c.p].map((x) => (
          <option key={x[0]} value={x[0]}>
            {x[1]}
          </option>
        ))}
      </NativeSelect>
    )
  }
  if (t === "number" || t === "decimal")
    return (
      <Input
        type="number"
        step={t === "decimal" ? "0.01" : undefined}
        className="h-9 rounded-[10px] text-xs"
        value={String(c.v[0] ?? "")}
        onChange={(e) => ops.setVal(path, e.target.value)}
      />
    )
  if (t === "date")
    return <Input type="date" className="h-9 rounded-[10px] text-xs" value={String(c.v[0] ?? "")} onChange={(e) => ops.setVal(path, e.target.value)} />
  if (t === "datetime")
    return (
      <Input
        type="datetime-local"
        className="h-9 rounded-[10px] text-xs"
        value={String(c.v[0] ?? "")}
        onChange={(e) => ops.setVal(path, e.target.value)}
      />
    )
  if (opMulti(c.o))
    return (
      <Input
        className="h-9 rounded-[10px] text-xs"
        value={c.v.join(", ")}
        placeholder="value, value, value"
        onChange={(e) => ops.setValList(path, e.target.value)}
      />
    )
  const ph = ({ email: "name@example.com", phone: "+9627…", url: "https://…" } as Record<string, string>)[t] || "Value"
  return (
    <Input
      className="h-9 rounded-[10px] text-xs"
      value={String(c.v[0] ?? "")}
      placeholder={ph}
      onChange={(e) => ops.setVal(path, e.target.value)}
    />
  )
}

function renderNode(n: CondNode, path: string, root: boolean, params: string[], ops: Ops): React.ReactNode {
  if (!("g" in n)) {
    const bad = !params.includes(n.p)
    const t = PD[n.p].type
    return (
      <div key={path} className={cn("mt-2 grid grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(170px,1.3fr)_30px] items-start gap-2", bad && "")}>
        <div>
          <NativeSelect
            size="sm"
            className={cn("w-full [&_select]:!h-9", bad && "border-d3 ring-3 ring-d3/20")}
            value={n.p}
            onChange={(e) => ops.setParam(path, e.target.value)}
          >
            {bad && (
              <option value={n.p}>
                {PD[n.p].label} — not on this channel
              </option>
            )}
            {params.map((p) => (
              <option key={p} value={p}>
                {PD[p].label}
              </option>
            ))}
          </NativeSelect>
          <span className="mt-1 block text-[9.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">{TYPE_LBL[t]}</span>
        </div>
        <div>
          <NativeSelect size="sm" className="w-full [&_select]:!h-9" value={n.o} onChange={(e) => ops.setOp(path, e.target.value)}>
            {OPS[t].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <ValueWidget c={n} path={path} ops={ops} />
        </div>
        <button
          type="button"
          className="grid h-9 w-[30px] place-items-center rounded-[9px] text-muted-foreground hover:bg-nb-cyan-100 hover:text-nb-cyan-800 dark:hover:bg-nb-cyan-900/40 dark:hover:text-nb-cyan-200"
          title="Remove condition"
          onClick={() => ops.rmNode(path)}
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }
  const kids = n.ch.map((c, i) => renderNode(c, path === "" ? String(i) : path + "-" + i, false, params, ops))
  return (
    <div
      key={path}
      className={cn(
        "mt-2.5 rounded-e-[12px] rounded-s-[4px] border-s-[3px] bg-muted/55 py-2.5 pe-2.5 ps-3",
        n.op === "ANY" ? "border-s-nb-mint" : "border-s-nb-cyan",
        root && "mt-0",
      )}
    >
      <div className="mb-0.5 flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{root ? "Match" : "Nested match"}</span>
        <div className="inline-flex gap-0.5 rounded-[9px] border border-border bg-card p-0.5">
          <button
            type="button"
            className={cn("h-6 rounded-[7px] px-2.5 text-[10.5px] font-bold tracking-[0.04em]", n.op === "ALL" ? "bg-nb-cyan text-white" : "text-muted-foreground")}
            onClick={() => ops.setGroupOp(path, "ALL")}
          >
            ALL · AND
          </button>
          <button
            type="button"
            className={cn("h-6 rounded-[7px] px-2.5 text-[10.5px] font-bold tracking-[0.04em]", n.op === "ANY" ? "bg-nb-mint text-nb-mint-900" : "text-muted-foreground")}
            onClick={() => ops.setGroupOp(path, "ANY")}
          >
            ANY · OR
          </button>
        </div>
        <div className="ms-auto flex gap-1.5">
          <button type="button" className="h-[26px] rounded-md border border-dashed border-border bg-card px-2.5 text-[11px] font-semibold text-primary hover:border-primary" onClick={() => ops.addCond(path)}>
            + Condition
          </button>
          <button type="button" className="h-[26px] rounded-md border border-dashed border-border bg-card px-2.5 text-[11px] font-semibold text-primary hover:border-primary" onClick={() => ops.addGroup(path)}>
            + Group
          </button>
          {!root && (
            <button type="button" className="grid size-[29px] place-items-center rounded-[9px] text-muted-foreground hover:bg-nb-cyan-100 hover:text-nb-cyan-800" title="Remove group" onClick={() => ops.rmNode(path)}>
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {kids.length ? (
        kids
      ) : (
        <div className="px-0.5 py-2 text-[11.5px] text-muted-foreground">
          No conditions — this {root ? "rule matches every transaction on the service channel" : "group is ignored"}.
        </div>
      )}
    </div>
  )
}
