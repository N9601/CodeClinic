// Portfolio screen - wave planning across every cached report.
import { Cloud, FileText, Flag, Gauge, Layers, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { fetchPortfolioFromSamples } from '../api'
import { BlueprintFrame } from '../components/brand/BlueprintFrame'
import { SectionHeader } from '../components/brand/SectionHeader'
import { TrustBand } from '../components/brand/TrustBand'
import { Mermaid } from '../components/Mermaid'
import { Badge, Card, cx, Kpi } from '../components/ui'
import { CLOUD_LABEL, strategyStyle } from '../lib/format'
import type { PortfolioAppSummary, PortfolioView } from '../types'

// Hand-drawn arrow (mirrors Hero's sketch arrow) placed between wave columns.
function WaveArrow() {
  return (
    <>
      {/* vertical for stacked (mobile) */}
      <svg
        aria-hidden
        viewBox="0 0 12 32"
        className="mx-auto block h-8 w-3 text-emerald-500 lg:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 C 5.4 8, 6.7 15, 5.8 26" />
        <path d="M2.6 22 L 5.9 28.6 L 9.2 22.4" />
      </svg>
      {/* horizontal for desktop between columns */}
      <svg
        aria-hidden
        viewBox="0 0 48 14"
        className="hidden h-3.5 w-10 shrink-0 self-center text-emerald-500 lg:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 7.2 C 10 6.3, 22 7.9, 42 6.6" />
        <path d="M37.2 2.8 L 43.4 6.7 L 37.6 10.9" />
      </svg>
    </>
  )
}

// Small circular readiness indicator (32px) replacing the horizontal bar.
function ReadinessRing({ score, band }: { score: number; band: string }) {
  const size = 32
  const stroke = 3.5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const dash = (pct / 100) * circ
  const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'
  return (
    <div className="relative shrink-0" title={`Readiness ${score}/100 · ${band}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={color} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-[10px] font-bold tabular-nums text-slate-700">
        {score}
      </span>
    </div>
  )
}

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
          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-stretch">
            {WAVE_ORDER.map((wave, i) => {
              const ids = view.waves[wave] ?? []
              const apps = ids
                .map((id) => view.apps.find((a) => a.report_id === id))
                .filter((a): a is PortfolioAppSummary => !!a)
              const label = apps[0]?.wave_label ?? WAVE_FALLBACK[wave]
              return (
                <Fragment key={wave}>
                  <div className="min-w-0 flex-1">
                    <WaveColumn wave={wave} label={label} apps={apps} onOpenReport={onOpenReport} />
                  </div>
                  {i < WAVE_ORDER.length - 1 && <WaveArrow />}
                </Fragment>
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
    <div className={cx('h-full rounded-2xl border p-4', WAVE_TONE[wave])}>
      <div className="mb-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex size-2.5 shrink-0" aria-hidden>
            <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', WAVE_DOT[wave])} />
            <span className={cx('relative inline-block size-2.5 rounded-full', WAVE_DOT[wave])} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">Wave</span>
        </div>
        <div className="flex items-center gap-2">
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
  return (
    <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" padded={false}>
      <div className="mb-2 flex items-start gap-3">
        <ReadinessRing score={app.readiness} band={app.readiness_band} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-slate-900">{app.name}</h4>
          <p className="truncate text-xs text-slate-500">{app.tagline}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Readiness · {app.readiness_band}
          </p>
        </div>
        <Badge className={cx(strat.badge, 'shrink-0 px-2 py-0.5 text-[11px]')} title={strat.hint}>
          {strat.label}
        </Badge>
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
