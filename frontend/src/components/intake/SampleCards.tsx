import { BriefcaseMedical, Check, ClipboardList, FlaskConical, ShieldCheck, ShieldOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SampleSummary } from '../../types'
import { Badge, cx, Spinner } from '../ui'

const ICONS: Record<string, LucideIcon> = {
  'labtrack-lims': FlaskConical,
  'trialhub-ctms': ClipboardList,
  repconnect: BriefcaseMedical,
}

export function SampleCards({
  samples,
  selectedId,
  loadingId,
  onSelect,
}: {
  samples: SampleSummary[] | null
  selectedId: string | null
  loadingId: string | null
  onSelect: (id: string) => void
}) {
  if (!samples) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {samples.map((s) => {
        const Icon = ICONS[s.id] ?? FlaskConical
        const selected = selectedId === s.id
        const loading = loadingId === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            disabled={loadingId !== null}
            aria-pressed={selected}
            className={cx(
              'group relative flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait',
              selected
                ? 'border-teal-500 ring-2 ring-teal-500/30 shadow-teal-600/10'
                : 'border-slate-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cx(
                  'grid size-10 place-items-center rounded-xl ring-1 transition-colors',
                  selected ? 'bg-teal-600 text-white ring-teal-600' : 'bg-teal-50 text-teal-700 ring-teal-100 group-hover:bg-teal-100',
                )}
              >
                {loading ? <Spinner className="size-5 text-current" /> : <Icon className="size-5" aria-hidden />}
              </span>
              {s.gxp_relevant ? (
                <Badge className="bg-violet-50 text-violet-700 ring-violet-200" icon={ShieldCheck} title="GxP-regulated system">
                  GxP
                </Badge>
              ) : (
                <Badge className="bg-slate-50 text-slate-500 ring-slate-200" icon={ShieldOff} title="Not GxP-regulated">
                  Non-GxP
                </Badge>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                {s.name}
                {selected && <Check className="size-4 text-teal-600" aria-hidden />}
              </div>
              <p className="mt-0.5 text-sm leading-snug text-slate-500">{s.tagline}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
