import { Stethoscope } from 'lucide-react'
import type { HealthState } from '../hooks/useHealth'
import { isLive } from '../hooks/useHealth'
import { cx } from './ui'

export const TAGLINE = 'Diagnose legacy pharma apps. Prescribe a compliant cloud migration plan.'

function StatusPill({ health }: { health: HealthState }) {
  let label: string
  let title: string
  let tone: string
  let dot: string
  let pulse = false

  if (health.status === 'checking') {
    label = 'Connecting...'
    title = 'Checking the CodeClinic API'
    tone = 'bg-slate-50 text-slate-600 ring-slate-200'
    dot = 'bg-slate-400'
  } else if (health.status === 'offline') {
    label = 'Demo mode · offline'
    title = 'Backend unreachable - using the bundled LabTrack LIMS sample report'
    tone = 'bg-amber-50 text-amber-800 ring-amber-200'
    dot = 'bg-amber-500'
  } else if (isLive(health)) {
    label = 'Live · Claude'
    title = `Live analysis with ${health.health.model}`
    tone = 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    dot = 'bg-emerald-500'
    pulse = true
  } else {
    label = 'Demo mode'
    title = 'No API key configured - reports are served from the cache'
    tone = 'bg-amber-50 text-amber-800 ring-amber-200'
    dot = 'bg-amber-500'
  }

  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', tone)}
    >
      <span className="relative flex size-2">
        {pulse && <span className={cx('absolute inline-flex size-full animate-ping rounded-full opacity-60', dot)} />}
        <span className={cx('relative inline-flex size-2 rounded-full', dot)} />
      </span>
      {label}
    </span>
  )
}

export function Header({ health, onHome }: { health: HealthState; onHome?: () => void }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onHome}
          disabled={!onHome}
          className="flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
          title={onHome ? 'Start a new diagnosis' : undefined}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/25">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight tracking-tight text-slate-900">
              Code<span className="text-teal-600">Clinic</span>
            </span>
            <span className="hidden truncate text-xs text-slate-500 md:block">{TAGLINE}</span>
          </span>
        </button>
        <StatusPill health={health} />
      </div>
    </header>
  )
}
