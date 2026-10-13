// 5x5 likelihood x impact matrix. Cell tint = level of that cell's score;
// risk IDs sit in their cell as chips (color + ID text, never color alone).
import type { RiskLevel, ScoredRisk } from '../types'
import { levelForScore, RISK_LEVEL_STYLE, riskLevelStyle } from '../lib/format'
import { cx } from './ui'

const LEVELS: RiskLevel[] = ['critical', 'high', 'medium', 'low']
const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)))

export function RiskHeatmap({
  risks,
  highlight,
  onHover,
}: {
  risks: ScoredRisk[]
  highlight?: string | null
  onHover?: (id: string | null) => void
}) {
  const byCell = new Map<string, ScoredRisk[]>()
  for (const r of risks) {
    const key = `${clamp(r.likelihood)}-${clamp(r.impact)}`
    byCell.set(key, [...(byCell.get(key) ?? []), r])
  }

  const impacts = [5, 4, 3, 2, 1]
  const likelihoods = [1, 2, 3, 4, 5]

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex w-5 shrink-0 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">
            Impact →
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[1.25rem_repeat(5,minmax(0,1fr))] gap-1.5">
            {impacts.map((impact) => (
              <div key={impact} className="contents">
                <div className="flex items-center justify-center text-xs font-semibold text-slate-500">{impact}</div>
                {likelihoods.map((likelihood) => {
                  const score = likelihood * impact
                  const level = levelForScore(score)
                  const cellRisks = byCell.get(`${likelihood}-${impact}`) ?? []
                  return (
                    <div
                      key={likelihood}
                      className={cx(
                        'relative flex min-h-14 flex-wrap content-center items-center justify-center gap-1 rounded-lg p-1.5 ring-1 ring-inset ring-white/60 sm:min-h-16',
                        RISK_LEVEL_STYLE[level].cell,
                      )}
                      title={`Likelihood ${likelihood} × Impact ${impact} = ${score} (${RISK_LEVEL_STYLE[level].label})`}
                    >
                      {cellRisks.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseEnter={() => onHover?.(r.id)}
                          onMouseLeave={() => onHover?.(null)}
                          onFocus={() => onHover?.(r.id)}
                          onBlur={() => onHover?.(null)}
                          title={`${r.id}: ${r.title} (score ${r.score})`}
                          className={cx(
                            'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-sm ring-2 ring-white transition sm:text-xs',
                            riskLevelStyle(r.level).chip,
                            highlight === r.id && 'scale-110 ring-slate-900',
                          )}
                        >
                          {r.id}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* X axis numbers */}
            <div />
            {likelihoods.map((l) => (
              <div key={l} className="pt-1 text-center text-xs font-semibold text-slate-500">
                {l}
              </div>
            ))}
          </div>
          <div className="mt-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Likelihood →</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
        {LEVELS.map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1.5">
            <span className={cx('size-3 rounded-sm ring-1 ring-inset ring-slate-300/50', RISK_LEVEL_STYLE[lvl].cell)} />
            {RISK_LEVEL_STYLE[lvl].label}
            <span className="text-slate-400">
              {lvl === 'critical' ? '≥15' : lvl === 'high' ? '10–14' : lvl === 'medium' ? '5–9' : '<5'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
