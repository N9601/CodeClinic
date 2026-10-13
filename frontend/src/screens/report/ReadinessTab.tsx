import { Gauge } from 'lucide-react'
import { ReadinessGauge } from '../../components/ReadinessGauge'
import { ReadinessRadar } from '../../components/ReadinessRadar'
import { BulletList, Card, cx, SectionTitle } from '../../components/ui'
import { bandFor, dimensionBarClass, pct } from '../../lib/format'
import type { AssessmentReport } from '../../types'

const BANDS = [
  { range: '0-39', label: 'Not ready', cls: 'bg-red-500' },
  { range: '40-69', label: 'Needs remediation', cls: 'bg-amber-500' },
  { range: '70-100', label: 'Cloud-ready', cls: 'bg-emerald-500' },
]

export function ReadinessTab({ report, animate = true }: { report: AssessmentReport; animate?: boolean }) {
  const r = report.readiness
  const band = bandFor(r.overall)

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <SectionTitle
              icon={Gauge}
              title="Cloud-readiness score"
              subtitle="Weighted average of seven dimensions, scaled to 100"
              className="mb-0"
            />
            <ReadinessGauge score={r.overall} />
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              <span className={cx('font-semibold', band.text)}>{band.band}.</span>{' '}
              {r.overall < 40
                ? 'Significant remediation is needed before or during migration - plan for platform upgrades and validation effort.'
                : r.overall < 70
                  ? 'Migratable with targeted remediation of the weakest dimensions.'
                  : 'Well positioned for migration with modest change.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500 lg:justify-start">
              {BANDS.map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1.5">
                  <span className={cx('size-2.5 rounded-full', b.cls)} /> {b.label} <span className="text-slate-400">{b.range}</span>
                </span>
              ))}
            </div>
          </div>
          <ReadinessRadar dimensions={r.dimensions} animate={animate} height={360} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {r.dimensions.map((d) => (
          <Card key={d.key} className="flex flex-col">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 className="font-semibold leading-snug text-slate-900">{d.label}</h4>
              <span className="shrink-0 text-right">
                <span className="text-2xl font-bold tabular-nums text-slate-900">{d.score}</span>
                <span className="text-sm font-semibold text-slate-400">/10</span>
              </span>
            </div>
            <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={d.score} aria-label={d.label}>
              <div className={cx('h-full rounded-full', dimensionBarClass(d.score))} style={{ width: `${(d.score / 10) * 100}%` }} />
            </div>
            <div className="mb-3 text-xs font-medium text-slate-500">Weight {pct(d.weight)}</div>
            <p className="mb-3 text-sm leading-relaxed text-slate-800">{d.rationale}</p>
            {d.evidence.length > 0 && (
              <div className="mt-auto rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Evidence</div>
                <BulletList items={d.evidence} marker="bg-slate-400" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
