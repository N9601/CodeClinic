import { Grid3x3, Lightbulb, ListChecks, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { RiskHeatmap } from '../../components/RiskHeatmap'
import { Badge, Card, cx, SectionTitle } from '../../components/ui'
import { EFFORT_STYLE, RISK_CATEGORY_LABEL, RISK_LEVEL_STYLE, riskLevelStyle, titleCase } from '../../lib/format'
import type { AssessmentReport, RiskLevel } from '../../types'

const LEVEL_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']

export function RisksTab({ report }: { report: AssessmentReport }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const risks = [...report.risks].sort((a, b) => b.score - a.score)
  const counts = LEVEL_ORDER.map((l) => ({ level: l, n: risks.filter((r) => r.level === l).length }))
  const gxp = risks.filter((r) => r.gxp_related).length
  const maxCount = Math.max(1, ...counts.map((c) => c.n))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle
            icon={Grid3x3}
            title="Risk heat map"
            subtitle="Likelihood × impact (1-5). Hover a chip to find it in the register."
          />
          <RiskHeatmap risks={risks} highlight={hovered} onHover={setHovered} />
        </Card>

        <Card>
          <SectionTitle icon={ShieldAlert} title="Risk profile" subtitle={`${risks.length} risks in the register`} />
          <div className="space-y-3">
            {counts.map(({ level, n }) => (
              <div key={level} className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.5rem] items-center gap-3">
                <Badge className={RISK_LEVEL_STYLE[level].badge}>{RISK_LEVEL_STYLE[level].label}</Badge>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cx('h-full rounded-full', RISK_LEVEL_STYLE[level].bar)}
                    style={{ width: `${(n / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-semibold tabular-nums text-slate-800">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-violet-50 p-4 ring-1 ring-inset ring-violet-200">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-violet-600" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-violet-900">
                {gxp} of {risks.length} risks are GxP-related
              </div>
              <p className="mt-0.5 text-sm text-violet-800/90">
                These affect validated state, data integrity (ALCOA+) or Part 11 controls and need QA-approved mitigations.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <SectionTitle icon={ListChecks} title="Risk register" subtitle="Sorted by score (likelihood × impact)" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">ID</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Level</th>
                <th className="px-3 py-3">GxP</th>
                <th className="px-5 py-3 sm:px-6">Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map((r) => {
                const lvl = riskLevelStyle(r.level)
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cx('avoid-break align-top transition-colors', hovered === r.id ? 'bg-teal-50/60' : 'hover:bg-slate-50/60')}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-500 sm:px-6">{r.id}</td>
                    <td className="w-[30%] px-3 py-3.5">
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{r.description}</div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">
                      {RISK_CATEGORY_LABEL[r.category] ?? titleCase(r.category)}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge className={lvl.badge}>{lvl.label}</Badge>
                      <div className="mt-1 text-xs tabular-nums text-slate-400">
                        {r.likelihood} × {r.impact} = {r.score}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {r.gxp_related ? (
                        <Badge className="bg-violet-50 text-violet-700 ring-violet-200" icon={ShieldCheck}>
                          GxP
                        </Badge>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="w-[34%] px-5 py-3.5 leading-relaxed text-slate-700 sm:px-6">{r.mitigation}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={TrendingUp} title="Opportunities" subtitle="Value unlocked by the migration" />
        {report.opportunities.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {report.opportunities.map((o, i) => {
              const e = EFFORT_STYLE[o.effort] ?? EFFORT_STYLE.medium
              return (
                <div key={i} className="avoid-break flex flex-col gap-2 rounded-xl bg-emerald-50/40 p-4 ring-1 ring-inset ring-emerald-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                      <span className="font-semibold text-slate-900">{o.title}</span>
                    </div>
                    <Badge className={e.badge}>{e.label}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{o.benefit}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">None identified.</p>
        )}
      </Card>
    </div>
  )
}
