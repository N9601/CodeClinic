// Renders Mermaid source (flowcharts, gantt) supplied by the backend.
// Never throws: on failure it shows a small error box and the raw source.
import mermaid from 'mermaid'
import { Maximize2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx, Spinner } from './ui'

let initialized = false
let counter = 0
/** Rendered SVG per source string, so revisiting a tab (or printing) is instant. */
const svgCache = new Map<string, string>()

function ensureInitialized() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'default',
    flowchart: { htmlLabels: true, curve: 'basis', padding: 12, nodeSpacing: 40, rankSpacing: 56 },
    gantt: {
      leftPadding: 240, // room for section titles
      rightPadding: 40,
      barHeight: 24,
      barGap: 6,
      topPadding: 56,
      fontSize: 13,
      sectionFontSize: 13,
      numberSectionStyles: 4,
    },
  })
  initialized = true
}

/** Remove the temporary nodes mermaid leaves in <body> when a render fails. */
function cleanupLeftovers(id: string) {
  for (const sel of [`#d${id}`, `#${id}`, `#i${id}`]) {
    const el = document.querySelector(sel)
    if (el && !el.closest('.mermaid-host')) el.remove()
  }
}

type State = { status: 'loading' } | { status: 'ok'; svg: string } | { status: 'error'; message: string }

export function Mermaid({
  code,
  className,
  label = 'Diagram',
  expandable = true,
}: {
  code: string
  className?: string
  label?: string
  expandable?: boolean
}) {
  const [state, setState] = useState<State>(() => {
    const cached = svgCache.get(code)
    return cached ? { status: 'ok', svg: cached } : { status: 'loading' }
  })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = svgCache.get(code)
    if (cached) {
      setState({ status: 'ok', svg: cached })
      return
    }
    const id = `cc-mermaid-${++counter}`
    setState({ status: 'loading' })

    if (!code || !code.trim()) {
      setState({ status: 'error', message: 'No diagram source provided.' })
      return
    }

    ;(async () => {
      try {
        ensureInitialized()
        const { svg } = await mermaid.render(id, code.trim())
        svgCache.set(code, svg)
        if (!cancelled) setState({ status: 'ok', svg })
      } catch (err) {
        cleanupLeftovers(id)
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setState({ status: 'error', message })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  if (state.status === 'error') {
    return (
      <div className={cx('rounded-xl border border-amber-200 bg-amber-50/60 p-4', className)}>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
          <TriangleAlert className="size-4" aria-hidden />
          Could not render {label.toLowerCase()} - showing the source instead.
        </div>
        <p className="mb-2 line-clamp-2 text-xs text-amber-700/80">{state.message}</p>
        <pre className="max-h-72 overflow-auto rounded-lg bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 ring-1 ring-amber-100">
          {code}
        </pre>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div
        data-mermaid-loading
        className={cx('grid min-h-48 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500', className)}
      >
        <div className="flex items-center gap-2">
          <Spinner className="size-4 text-teal-600" /> Rendering {label.toLowerCase()}...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cx('group relative', className)}>
        <div
          className="mermaid-host overflow-x-auto rounded-xl border border-slate-200 bg-white p-4"
          role="img"
          aria-label={label}
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
        {expandable && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="no-print absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-600 opacity-70 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-900 hover:opacity-100 group-hover:opacity-100"
            title="Open full size"
          >
            <Maximize2 className="size-3.5" aria-hidden /> Expand
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="no-print fixed inset-0 z-50 flex flex-col bg-slate-900/60 p-3 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setExpanded(false)}
        >
          <div
            className="mx-auto flex max-h-full w-full max-w-[min(100%,2400px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <span className="text-sm font-semibold text-slate-800">{label}</span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div
              className="mermaid-host mermaid-expanded overflow-auto p-6"
              dangerouslySetInnerHTML={{ __html: state.svg }}
            />
          </div>
        </div>
      )}
    </>
  )
}
