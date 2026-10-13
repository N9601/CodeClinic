import { ArrowLeft, Check, CircleX, Cloud, FileSearch, FileText, Network, Package, Route, ShieldAlert, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, cx, Spinner } from '../components/ui'
import { CLOUD_LABEL } from '../lib/format'
import type { CloudProvider, StageName } from '../types'

export type StageStatusUI = 'pending' | 'started' | 'done'
export type StageMap = Record<StageName, StageStatusUI>

export const INITIAL_STAGES: StageMap = {
  scan: 'pending',
  analyze: 'pending',
  extract: 'pending',
  assess: 'pending',
  recommend: 'pending',
  assemble: 'pending',
}

const STAGES: Array<{ key: StageName; title: string; detail: string; icon: LucideIcon }> = [
  { key: 'scan', title: 'Scanning artifacts', detail: 'Intake profile and code evidence', icon: FileSearch },
  { key: 'analyze', title: 'Analyzing architecture', detail: 'Components, integrations, tech inventory, debt', icon: Network },
  {
    key: 'extract',
    title: 'Extracting from document',
    detail: 'Profile and architecture read from the uploaded report',
    icon: FileText,
  },
  {
    key: 'assess',
    title: 'Assessing readiness & risks',
    detail: 'Seven readiness dimensions, risk register, opportunities',
    icon: ShieldAlert,
  },
  {
    key: 'recommend',
    title: 'Designing target architecture & roadmap',
    detail: '7R strategy per component, target services, phases with validation gates',
    icon: Route,
  },
  { key: 'assemble', title: 'Compiling report', detail: 'Scores, diagrams and compliance summary', icon: Package },
]

function useElapsed(startedAt: number, running: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [running])
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

export function Running({
  appName,
  cloud,
  stages,
  labels,
  startedAt,
  error,
  notice,
  onBack,
  hasExtraction = false,
}: {
  appName: string
  cloud: CloudProvider
  stages: StageMap
  labels: Partial<Record<StageName, string>>
  startedAt: number
  error: string | null
  notice: string | null
  onBack: () => void
  hasExtraction?: boolean
}) {
  const elapsed = useElapsed(startedAt, !error)
  const visibleStages = STAGES.filter((s) => (hasExtraction ? s.key !== 'analyze' : s.key !== 'extract'))
  const doneCount = visibleStages.filter((s) => stages[s.key] === 'done').length
  const parallel = stages.assess === 'started' && stages.recommend === 'started'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14 cc-fade-in">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/25">
          {error ? <CircleX className="size-7" aria-hidden /> : <Spinner className="size-7 text-white" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {error ? 'Diagnosis interrupted' : `Diagnosing ${appName}`}
        </h1>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Cloud className="size-4" aria-hidden /> Target: {CLOUD_LABEL[cloud]}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Timer className="size-4" aria-hidden /> {formatElapsed(elapsed)} elapsed
          </span>
        </p>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="h-1.5 bg-slate-100">
          <div
            className={cx('h-full transition-all duration-500', error ? 'bg-red-400' : 'bg-linear-to-r from-teal-500 to-emerald-500')}
            style={{ width: `${Math.max(4, (doneCount / visibleStages.length) * 100)}%` }}
          />
        </div>
        <ol className="divide-y divide-slate-100">
          {visibleStages.map((s, i) => {
            const status = stages[s.key]
            const Icon = s.icon
            const label = labels[s.key]
            return (
              <li
                key={s.key}
                className={cx(
                  'flex items-center gap-4 px-5 py-4 transition-colors sm:px-6',
                  status === 'started' && 'bg-teal-50/50',
                )}
              >
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-full ring-1 transition-all',
                    status === 'done' && 'bg-emerald-500 text-white ring-emerald-500',
                    status === 'started' && 'bg-white ring-teal-300',
                    status === 'pending' && 'bg-slate-50 text-slate-400 ring-slate-200',
                  )}
                >
                  {status === 'done' ? (
                    <Check className="size-5" strokeWidth={3} aria-hidden />
                  ) : status === 'started' ? (
                    <Spinner className="size-5 text-teal-600" />
                  ) : (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={cx(
                      'flex flex-wrap items-center gap-2 font-semibold',
                      status === 'pending' ? 'text-slate-400' : 'text-slate-900',
                    )}
                  >
                    {s.title}
                    {parallel && (s.key === 'assess' || s.key === 'recommend') && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                        in parallel
                      </span>
                    )}
                  </div>
                  <div className={cx('text-sm', status === 'pending' ? 'text-slate-400' : 'text-slate-500')}>
                    {label && label !== s.title ? label : s.detail}
                  </div>
                </div>
                <Icon
                  className={cx('size-5 shrink-0', status === 'pending' ? 'text-slate-300' : 'text-teal-600')}
                  aria-hidden
                />
              </li>
            )
          })}
        </ol>
      </Card>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
          <div className="mb-1 font-semibold text-red-800">Something went wrong</div>
          <p className="text-sm leading-relaxed text-red-700">{error}</p>
          <Button className="mt-4" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        </div>
      ) : (
        <div className="mt-6 text-center">
          {notice ? (
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm text-amber-800 ring-1 ring-amber-200">
              <Spinner className="size-3.5 text-amber-600" />
              {notice}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Live analysis usually takes about a minute - Claude is reading the profile like a senior migration architect.
            </p>
          )}
          <Button variant="ghost" className="mt-3" icon={ArrowLeft} onClick={onBack}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
