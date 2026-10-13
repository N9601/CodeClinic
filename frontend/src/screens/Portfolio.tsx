// Portfolio screen - wave planning across every cached report.
import { Cloud, FileText, Flag, Gauge, Layers, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPortfolioFromSamples } from '../api'
import { BlueprintFrame } from '../components/brand/BlueprintFrame'
import { SectionHeader } from '../components/brand/SectionHeader'
import { TrustBand } from '../components/brand/TrustBand'
import { Mermaid } from '../components/Mermaid'
import { Badge, Card, cx, Kpi } from '../components/ui'
import { CLOUD_LABEL, strategyStyle } from '../lib/format'
import type { PortfolioAppSummary, PortfolioView } from '../types'

const WAVE_ORDER: Array<'now' | 'next' | 'later'> = ['now', 'next', 'later']
const WAVE_FALLBACK: Record<'now' | 'next' | 'later', string> = {
  now: 'Wave 1 – Now',
  next: 'Wave 2 – Next',
  later: 'Wave 3 – Later',
}

export function Portfolio({ onOpenReport }: { onOpenReport?: (reportId: string) => void }) {
  const [view, setView] = useState<PortfolioView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPortfolioFromSamples()
      .then((v) => !cancelled && setView(v))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 cc-fade-in">
      <SectionHeader
        eyebrow="[ WAVE PLANNING ]"
        title="MIGRATION PORTFOLIO"
        subtitle={view?.headline ?? 'Prioritizing cached assessments across waves.'}
      />

      {error && (
        <Card className="mt-6">
          <p className="text-sm text-red-700">Could not load portfolio: {error}</p>
        </Card>
      )}

      {!view && !error && <PortfolioSkeleton />}

      {view && view.apps.length === 0 && (
        <Card className="mt-6">
          <p className="text-sm italic text-slate-500">No reports yet — run an assessment first.</p>
        </Card>
      )}

      {view && view.apps.length > 0 && (
        <>
          {/* Stats row */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Apps" value={view.stats.apps} icon={Layers} />
            <Kpi label="GxP-critical" value={view.stats.gxp_apps} icon={ShieldCheck} accent="text-violet-700" />
            <Kpi label="Avg readiness" value={view.stats.avg_readiness} icon={Gauge} />
            <Kpi label="Critical risks" value={view.stats.total_critical_risks} icon={ShieldAlert} accent="text-red-700" />
            <Kpi label="Total weeks" value={view.stats.total_weeks} icon={Flag} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="annotation">[ STRATEGY MIX ]</span>
            <MixPills mix={view.stats.strategy_mix} styleFn={(k) => strategyStyle(k).badge} labelFn={(k) => strategyStyle(k).label} />
            <span className="mx-2 h-4 w-px bg-slate-200" />
            <span className="annotation">[ CLOUD MIX ]</span>
            <MixPills
              mix={view.stats.cloud_mix}
              styleFn={() => 'bg-sky-50 text-sky-700 ring-sky-200'}
              labelFn={(k) => CLOUD_LABEL[k as 'aws' | 'azure' | 'gcp'] ?? k}
            />
          </div>

          {/* Waves */}
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {WAVE_ORDER.map((wave) => {
              const ids = view.waves[wave] ?? []
              const apps = ids
                .map((id) => view.apps.find((a) => a.report_id === id))
                .filter((a): a is PortfolioAppSummary => !!a)
              const label = apps[0]?.wave_label ?? WAVE_FALLBACK[wave]
              return (
                <WaveColumn key={wave} wave={wave} label={label} apps={apps} onOpenReport={onOpenReport} />
              )
            })}
          </div>

          {/* Gantt */}
          <section className="mt-10">
            <SectionHeader size="sm" eyebrow="[ TIMELINE ]" title="PORTFOLIO GANTT" />
            <div className="mt-4">
              <BlueprintFrame>
                <Mermaid code={view.gantt} label="Portfolio migration Gantt chart" />
              </BlueprintFrame>
            </div>
          </section>
        </>
      )}

      <div className="mx-[-1rem] mt-12 sm:mx-[-1.5rem] lg:mx-[-2rem]">
        <TrustBand />
      </div>
    </div>
  )
}

function MixPills({
  mix,
  styleFn,
  labelFn,
}: {
  mix: Record<string, number>
  styleFn: (key: string) => string
  labelFn: (key: string) => string
}) {
  const entries = Object.entries(mix).filter(([, n]) => n > 0)
  if (!entries.length) return <span className="text-xs text-slate-400">—</span>
  return (
    <>
      {entries.map(([k, n]) => (
        <Badge key={k} className={cx(styleFn(k), 'px-2.5 py-0.5 text-xs')}>
          {labelFn(k)} ×{n}
        </Badge>
      ))}
    </>
  )
}

const WAVE_TONE: Record<'now' | 'next' | 'later', string> = {
  now: 'border-emerald-400 bg-emerald-50/60',
  next: 'border-amber-300 bg-amber-50/60',
  later: 'border-slate-300 bg-slate-50/60',
}

const WAVE_DOT: Record<'now' | 'next' | 'later', string> = {
  now: 'bg-emerald-500',
  next: 'bg-amber-500',
  later: 'bg-slate-400',
}

function WaveColumn({
  wave,
  label,
  apps,
  onOpenReport,
}: {
  wave: 'now' | 'next' | 'later'
  label: string
  apps: PortfolioAppSummary[]
  onOpenReport?: (reportId: string) => void
}) {
  return (
    <div className={cx('rounded-2xl border p-4', WAVE_TONE[wave])}>
      <div className="mb-3 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">Wave</span>
        <div className="flex items-center gap-2">
          <span className={cx('inline-block size-2 rounded-full', WAVE_DOT[wave])} aria-hidden />
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-slate-900">{label}</h3>
          <span className="ml-auto text-xs text-slate-500">{apps.length} app{apps.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      {apps.length === 0 ? (
        <p className="text-xs italic text-slate-500">No apps in this wave.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <AppCard key={app.report_id} app={app} onOpenReport={onOpenReport} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppCard({ app, onOpenReport }: { app: PortfolioAppSummary; onOpenReport?: (reportId: string) => void }) {
  const strat = strategyStyle(app.strategy)
  const readinessBarColor =
    app.readiness >= 70 ? 'bg-emerald-500' : app.readiness >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" padded={false}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-900">{app.name}</h4>
          <p className="truncate text-xs text-slate-500">{app.tagline}</p>
        </div>
        <Badge className={cx(strat.badge, 'px-2 py-0.5 text-[11px]')} title={strat.hint}>
          {strat.label}
        </Badge>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Readiness · {app.readiness_band}</span>
          <span className="font-semibold tabular-nums text-slate-800">{app.readiness}/100</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={cx('h-full rounded-full', readinessBarColor)} style={{ width: `${Math.max(2, app.readiness)}%` }} />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {app.critical_risks > 0 && (
          <Badge className="bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-red-200" icon={ShieldAlert}>
            {app.critical_risks} critical
          </Badge>
        )}
        {app.high_risks > 0 && (
          <Badge className="bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 ring-amber-200">
            {app.high_risks} high
          </Badge>
        )}
        <Badge className="bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800 ring-slate-200">{app.weeks}w</Badge>
        {app.gxp_critical && (
          <Badge className="bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700 ring-violet-200" icon={ShieldCheck}>
            GxP
          </Badge>
        )}
        <Badge className="bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700 ring-sky-200" icon={Cloud}>
          {CLOUD_LABEL[app.target_cloud]}
        </Badge>
      </div>

      <p className="text-xs leading-snug text-slate-600">{app.rationale}</p>

      {onOpenReport && (
        <button
          type="button"
          onClick={() => onOpenReport(app.report_id)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
        >
          <FileText className="size-3.5" aria-hidden />
          Open report
        </button>
      )}
    </Card>
  )
}

function PortfolioSkeleton() {
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-20 rounded bg-slate-200/80" />
            <div className="h-20 rounded bg-slate-200/80" />
          </div>
        </div>
      ))}
    </div>
  )
}
