import { CalendarClock, Gauge, Lightbulb, Pill, Shapes, ShieldAlert, ShieldCheck, Stethoscope, Zap } from 'lucide-react'
import { ReadinessRadar } from '../../components/ReadinessRadar'
import { Badge, Card, Kpi, SectionTitle } from '../../components/ui'
import { bandFor, riskLevelStyle, STRATEGY_ORDER, strategyStyle } from '../../lib/format'
import type { AssessmentReport, ScoredRisk } from '../../types'

function topRisks(report: AssessmentReport): ScoredRisk[] {
  const byTitle = new Map(report.risks.map((r) => [r.title.trim().toLowerCase(), r]))
  const picked: ScoredRisk[] = []
  for (const t of report.summary.top_risks) {
    const r = byTitle.get(t.trim().toLowerCase())
    if (r && !picked.includes(r)) picked.push(r)
  }
  const rest = [...report.risks].sort((a, b) => b.score - a.score).filter((r) => !picked.includes(r))
  return [...picked, ...rest].slice(0, 3)
}

function StrategyMix({ report }: { report: AssessmentReport }) {
  const mix = report.summary.strategy_mix
  const entries = Object.entries(mix)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || (STRATEGY_ORDER as string[]).indexOf(a[0]) - (STRATEGY_ORDER as string[]).indexOf(b[0]))
  const max = Math.max(1, ...entries.map(([, n]) => n))
  const total = entries.reduce((s, [, n]) => s + n, 0)
  const names = new Map(report.architecture.components.map((c) => [c.id, c.name]))

  if (!entries.length) return <p className="text-sm text-slate-400">No component strategies.</p>

  return (
    <div className="space-y-3">
      {entries.map(([strategy, count]) => {
        const style = strategyStyle(strategy)
        const comps = report.plan.component_strategies
          .filter((c) => c.strategy === strategy)
          .map((c) => names.get(c.component_id) ?? c.component_id)
        return (
          <div key={strategy} className="grid grid-cols-[7rem_minmax(0,1fr)_2rem] items-center gap-3" title={comps.join(', ')}>
            <Badge className={style.badge}>{style.label}</Badge>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-right text-sm font-semibold tabular-nums text-slate-800">{count}</span>
          </div>
        )
      })}
      <p className="pt-1 text-xs text-slate-500">
        {total} components classified with the 7R framework. Hover a row to see which.
      </p>
    </div>
  )
}

export function OverviewTab({ report, animate = true }: { report: AssessmentReport; animate?: boolean }) {
  const { summary } = report
  const band = bandFor(summary.readiness_score)
  const strat = strategyStyle(summary.overall_strategy)
  const levels = report.risks.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.level]: (acc[r.level] ?? 0) + 1 }), {})
  const gates = report.plan.roadmap.reduce((n, p) => n + p.validation_gates.length, 0)

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-teal-200/70 bg-linear-to-br from-teal-50/80 via-white to-white">
        <div className="flex items-start gap-4">
          <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/25 sm:grid">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700">Prescription</div>
            <p className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{summary.headline}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi
          icon={Gauge}
          label="Readiness"
          value={
            <>
              {summary.readiness_score}
              <span className="text-base font-semibold text-slate-400">/100</span>
            </>
          }
          sub={<span className={band.text}>{band.band}</span>}
          accent={band.text}
        />
        <Kpi icon={Shapes} label="Overall strategy" value={strat.label} sub={strat.hint} />
        <Kpi
          icon={CalendarClock}
          label="Timeline"
          value={
            <>
              {summary.total_weeks}
              <span className="text-base font-semibold text-slate-400"> weeks</span>
            </>
          }
          sub={`${report.plan.roadmap.length} phases`}
        />
        <Kpi
          icon={ShieldAlert}
          label="Risks"
          value={report.risks.length}
          sub={
            <span>
              <span className="font-semibold text-red-600">{levels.critical ?? 0} critical</span> ·{' '}
              <span className="font-semibold text-orange-600">{levels.high ?? 0} high</span>
            </span>
          }
        />
        <Kpi
          icon={ShieldCheck}
          label="Validation gates"
          value={gates}
          sub={summary.gxp_critical ? 'GxP-critical: IQ/OQ/PQ' : 'Not GxP-critical'}
          accent={summary.gxp_critical ? 'text-violet-700' : 'text-slate-900'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Gauge} title="Readiness profile" subtitle="Seven weighted dimensions, 0-10 (10 = most cloud-ready)" />
          <ReadinessRadar dimensions={report.readiness.dimensions} animate={animate} height={330} />
        </Card>

        <Card>
          <SectionTitle icon={ShieldAlert} title="Top risks" subtitle="Highest likelihood × impact" />
          <ol className="space-y-3">
            {topRisks(report).map((r) => {
              const lvl = riskLevelStyle(r.level)
              return (
                <li key={r.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{r.id}</span>
                    <span className="font-semibold text-slate-900">{r.title}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge className={lvl.badge}>
                      {lvl.label} · {r.score}
                    </Badge>
                    {r.gxp_related && (
                      <Badge className="bg-violet-50 text-violet-700 ring-violet-200" icon={ShieldCheck}>
                        GxP
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <span className="font-medium text-slate-800">Mitigation: </span>
                    {r.mitigation}
                  </p>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Pill} title="Strategy mix" subtitle="Components per 7R migration strategy" />
          <StrategyMix report={report} />
        </Card>
        <Card>
          <SectionTitle icon={Zap} title="Quick wins" subtitle="Start these now, before the migration begins" />
          {report.plan.quick_wins.length ? (
            <ul className="space-y-2.5">
              {report.plan.quick_wins.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-800">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">None identified.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
