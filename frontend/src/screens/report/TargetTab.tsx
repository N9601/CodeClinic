import { ArrowRight, Cloud, Network, Puzzle, Shapes } from 'lucide-react'
import { DiagramLegend } from '../../components/DiagramLegend'
import { Mermaid } from '../../components/Mermaid'
import { Badge, Card, SectionTitle } from '../../components/ui'
import { CLOUD_LONG_LABEL, STRATEGY_ORDER, strategyStyle } from '../../lib/format'
import type { AssessmentReport } from '../../types'

export function TargetTab({ report }: { report: AssessmentReport }) {
  const plan = report.plan
  const components = new Map(report.architecture.components.map((c) => [c.id, c]))
  const used = new Set(plan.component_strategies.map((s) => s.strategy))

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          icon={Puzzle}
          title="Architecture patterns"
          subtitle={`Overall strategy: ${strategyStyle(plan.overall_strategy).label}`}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plan.patterns.map((p, i) => (
            <div key={i} className="avoid-break rounded-xl bg-linear-to-br from-teal-50/70 to-white p-4 ring-1 ring-inset ring-teal-100">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-teal-600 text-xs font-bold text-white">{i + 1}</span>
                <span className="font-semibold leading-snug text-slate-900">{p.name}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{p.why}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={Network}
          title="Target-state architecture"
          subtitle={`On ${CLOUD_LONG_LABEL[report.target_cloud] ?? report.target_cloud}`}
        />
        <Mermaid code={report.diagrams.target} label="Target-state architecture diagram" />
        <DiagramLegend types={plan.target_components.map((c) => c.type)} />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <SectionTitle
            icon={Shapes}
            title="7R strategy per component"
            subtitle="Retire · Retain · Rehost · Relocate · Replatform · Repurchase · Refactor"
            right={
              <div className="flex flex-wrap gap-1.5">
                {STRATEGY_ORDER.filter((s) => used.has(s)).map((s) => (
                  <Badge key={s} className={strategyStyle(s).badge} title={strategyStyle(s).hint}>
                    {strategyStyle(s).label}
                  </Badge>
                ))}
              </div>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Component</th>
                <th className="px-3 py-3">Strategy</th>
                <th className="px-3 py-3">Target service</th>
                <th className="px-5 py-3 sm:px-6">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.component_strategies.map((s) => {
                const comp = components.get(s.component_id)
                const style = strategyStyle(s.strategy)
                return (
                  <tr key={s.component_id} className="avoid-break align-top hover:bg-slate-50/60">
                    <td className="w-[24%] px-5 py-3.5 sm:px-6">
                      <div className="font-semibold text-slate-900">{comp?.name ?? s.component_id}</div>
                      {comp && <div className="mt-0.5 text-xs text-slate-500">{comp.technology}</div>}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge className={style.badge} title={style.hint}>
                        {style.label}
                      </Badge>
                    </td>
                    <td className="w-[24%] px-3 py-3.5">
                      <span className="inline-flex items-start gap-1.5 font-medium text-slate-800">
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                        {s.target_service}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 leading-relaxed text-slate-600 sm:px-6">{s.rationale}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="avoid-break rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-800">
          <Cloud className="size-4" aria-hidden /> Target summary
        </div>
        <p className="text-sm leading-relaxed text-slate-800 sm:text-base">{plan.target_summary}</p>
      </div>
    </div>
  )
}
