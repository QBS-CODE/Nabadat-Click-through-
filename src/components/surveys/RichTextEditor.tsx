import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Underline, Heading, List, Link2, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  ariaLabel: string
  dir?: "rtl" | "ltr"
  className?: string
}

/**
 * Lightweight rich-text editor: a shadcn-styled toolbar over a `contentEditable`
 * surface, with a "</> HTML" source toggle. Used for the survey Welcome and
 * Thank-you messages (Create/Settings screen). Styling stays on design tokens
 * (border-input, bg-card) so it reads as a real form field in both themes/RTL.
 */
export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  dir,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [htmlMode, setHtmlMode] = useState(false)

  // Reflect `value` into the editable surface on mount, on return from HTML
  // mode, and whenever the prop changes externally (e.g. a template pre-fill /
  // reset). The `innerHTML !== value` guard means typing — which fires onChange
  // so the prop already equals innerHTML on the next render — never re-seeds,
  // so the caret is preserved.
  useEffect(() => {
    if (!htmlMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [htmlMode, value])

  function exec(command: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function insertLink() {
    const url = window.prompt(
      dir === "rtl" ? "أدخل الرابط:" : "Enter the link URL:",
      "https://",
    )
    if (url) exec("createLink", url)
  }

  const TOOLS = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Underline, label: "Underline", run: () => exec("underline") },
    { icon: Heading, label: "Heading", run: () => exec("formatBlock", "<h3>") },
    { icon: List, label: "Bulleted list", run: () => exec("insertUnorderedList") },
    { icon: Link2, label: "Insert link", run: insertLink },
  ]

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-card overflow-hidden",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              disabled={htmlMode}
              onMouseDown={(e) => e.preventDefault()}
              onClick={tool.run}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          )
        })}
        <span className="flex-1" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setHtmlMode((m) => !m)}
          aria-pressed={htmlMode}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
            htmlMode
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Code className="size-3.5" />
          HTML
        </button>
      </div>

      {/* Body */}
      {htmlMode ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          aria-label={`${ariaLabel} — HTML`}
          className="min-h-[120px] rounded-none border-0 font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      ) : (
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          dir={dir}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          className={cn(
            "min-h-[120px] px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none",
            "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-1",
            "[&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1 [&_p]:mb-1",
            "[&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline",
            "[&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_a]:text-primary [&_a]:underline",
          )}
        />
      )}
    </div>
  )
}
