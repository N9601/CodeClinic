import { FileCode } from 'lucide-react'
import type { Severity, Signal } from '../types'
import { severityStyle, titleCase } from '../lib/format'
import { cx } from './ui'

const RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

export function sortSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3) || a.name.localeCompare(b.name))
}

export function SignalSummary({ signals }: { signals: Signal[] }) {
  const counts = { critical: 0, warning: 0, info: 0 } as Record<Severity, number>
  for (const s of signals) counts[s.severity] = (counts[s.severity] ?? 0) + 1
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      {(['critical', 'warning', 'info'] as Severity[]).map((sev) => (
        <span key={sev} className="inline-flex items-center gap-1.5">
          <span className={cx('size-2 rounded-full', severityStyle(sev).dot)} />
          <span className="font-semibold text-slate-800">{counts[sev]}</span> {severityStyle(sev).label.toLowerCase()}
        </span>
      ))}
    </div>
  )
}

/** Severity-colored chips; hover/focus shows the detail and the file the evidence came from. */
export function SignalChips({ signals, max }: { signals: Signal[]; max?: number }) {
  const sorted = sortSignals(signals)
  const shown = max ? sorted.slice(0, max) : sorted
  const hidden = sorted.length - shown.length

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s, i) => {
        const style = severityStyle(s.severity)
        return (
          <span key={`${s.name}-${s.file}-${i}`} className="group relative">
            <span
              tabIndex={0}
              className={cx(
                'inline-flex cursor-default items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
                style.chip,
              )}
            >
              <span className={cx('size-1.5 rounded-full', style.dot)} aria-hidden />
              {s.name}
            </span>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[80vw] rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-100 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              <span className="mb-0.5 block font-semibold text-white">
                {s.name} <span className="font-normal text-slate-400">· {titleCase(s.kind)} · {style.label}</span>
              </span>
              {s.detail && <span className="block text-slate-300">{s.detail}</span>}
              {s.file && (
                <span className="mt-1 flex items-center gap-1 break-all font-mono text-[11px] text-teal-300">
                  <FileCode className="size-3 shrink-0" aria-hidden />
                  {s.file}
                </span>
              )}
            </span>
          </span>
        )
      })}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          +{hidden} more
        </span>
      )}
    </div>
  )
}
