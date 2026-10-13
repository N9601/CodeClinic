// Objective 6 - regulatory gap analysis.
import { AlertTriangle, ClipboardCheck, ListChecks, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BlueprintFrame } from '../../components/brand/BlueprintFrame'
import { SectionHeader } from '../../components/brand/SectionHeader'
import { Badge, Card, cx, Kpi } from '../../components/ui'
import type { AssessmentReport, ComplianceGap, CompliancePosture, ComplianceSeverity } from '../../types'

const POSTURE_STYLE: Record<CompliancePosture, { label: string; className: string }> = {
  low_risk: { label: 'Low risk', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  manageable: { label: 'Manageable', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  elevated_risk: { label: 'Elevated risk', className: 'bg-red-50 text-red-700 ring-red-200' },
}

const SEVERITY_STYLE: Record<ComplianceSeverity, { label: string; className: string; rank: number; accent: string; dot: string }> = {
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700 ring-red-200', rank: 0, accent: 'bg-rose-500', dot: 'bg-rose-500' },
  major: { label: 'Major', className: 'bg-amber-50 text-amber-800 ring-amber-200', rank: 1, accent: 'bg-amber-500', dot: 'bg-amber-500' },
  minor: { label: 'Minor', className: 'bg-slate-100 text-slate-800 ring-slate-200', rank: 2, accent: 'bg-slate-400', dot: 'bg-slate-400' },
}

const POSTURE_DOT: Record<CompliancePosture, string> = {
  low_risk: 'bg-emerald-500',
  manageable: 'bg-amber-500',
  elevated_risk: 'bg-rose-500',
}

const CHIP_CLASS =
  'inline-flex items-center rounded-md border border-emerald-200 bg-white px-2 py-0.5 font-display tracking-wide text-xs text-emerald-700 transition-colors hover:bg-emerald-50'

const EYEBROW_CLASS = 'text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500'

function sortedGaps(gaps: ComplianceGap[]): ComplianceGap[] {
  return [...gaps].sort((a, b) => SEVERITY_STYLE[a.severity].rank - SEVERITY_STYLE[b.severity].rank)
}

export function ComplianceTab({ report }: { report: AssessmentReport }) {
  const compliance = report.compliance
  const [framework, setFramework] = useState<string>('All')

  const frameworks = useMemo(() => {
    if (!compliance) return []
    const set = new Set<string>()
    for (const g of compliance.gaps) g.frameworks.forEach((f) => set.add(f))
    for (const c of compliance.required_controls) c.frameworks.forEach((f) => set.add(f))
    return Array.from(set).sort()
  }, [compliance])

  if (!compliance) return null

  const filterByFramework = <T extends { frameworks: string[] }>(items: T[]): T[] =>
    framework === 'All' ? items : items.filter((it) => it.frameworks.includes(framework))

  const visibleGaps = sortedGaps(filterByFramework(compliance.gaps))
  const visibleControls = filterByFramework(compliance.required_controls)

  const totalCritical = compliance.gaps.filter((g) => g.severity === 'critical').length
  const totalGxp = compliance.gaps.filter((g) => g.gxp_related).length
  const posture = POSTURE_STYLE[compliance.overall_posture]

  const riskLookup = new Map(report.risks.map((r) => [r.id, r]))
  const componentLookup = new Map(report.architecture.components.map((c) => [c.id, c]))

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="[ COMPLIANCE EVIDENCE ]"
        title="REGULATORY GAP ANALYSIS"
        subtitle={compliance.headline}
      />

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cx(
            'inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-base uppercase tracking-[0.14em] ring-1 ring-inset',
            posture.className,
          )}
        >
          <span className={cx('inline-block size-2 rounded-full', POSTURE_DOT[compliance.overall_posture])} aria-hidden />
          <ShieldCheck className="size-4" aria-hidden />
          Posture · {posture.label}
        </span>
        <span className="text-xs text-slate-500">Based on {compliance.gaps.length} gap(s) across {frameworks.length} framework(s)</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Gaps" value={compliance.gaps.length} icon={ListChecks} />
        <Kpi label="Critical" value={totalCritical} icon={AlertTriangle} accent="text-red-700" />
        <Kpi label="GxP-related" value={totalGxp} icon={ShieldCheck} accent="text-violet-700" />
        <Kpi label="Frameworks cited" value={frameworks.length} icon={ClipboardCheck} />
      </div>

      {frameworks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="annotation">[ FILTER BY FRAMEWORK ]</span>
          <FrameworkChip label="All" active={framework === 'All'} onClick={() => setFramework('All')} />
          {frameworks.map((f) => (
            <FrameworkChip key={f} label={f} active={framework === f} onClick={() => setFramework(f)} />
          ))}
        </div>
      )}

      {visibleGaps.length === 0 && visibleControls.length === 0 ? (
        <Card>
          <p className="text-sm italic text-slate-500">No gaps cited for {framework}.</p>
        </Card>
      ) : (
        <>
          <section>
            <SectionHeader size="sm" eyebrow="[ GAPS ]" title="OPEN GAPS" />
            {visibleGaps.length === 0 ? (
              <Card className="mt-4">
                <p className="text-sm italic text-slate-500">No gaps cited for {framework}.</p>
              </Card>
            ) : (
              <div className="mt-4 grid gap-4">
                {visibleGaps.map((gap) => {
                  const sev = SEVERITY_STYLE[gap.severity]
                  const linkedRisks = gap.linked_risk_ids
                    .map((id) => ({ id, risk: riskLookup.get(id) }))
                    .filter((r) => r.risk)
                  const linkedComponents = gap.linked_component_ids
                    .map((id) => ({ id, comp: componentLookup.get(id) }))
                    .filter((c) => c.comp)
                  return (
                    <Card key={gap.id} className="relative overflow-hidden pl-5">
                      <span
                        aria-hidden
                        className={cx('absolute inset-y-0 left-0 w-[3px] rounded-l-md', sev.accent)}
                      />
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <h3 className="min-w-0 text-base font-semibold leading-tight text-slate-900">{gap.title}</h3>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Badge className={cx('px-2.5 py-0.5 text-xs', sev.className)}>{sev.label}</Badge>
                          {gap.gxp_related && (
                            <Badge className="bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700 ring-violet-200" icon={ShieldCheck}>
                              GxP
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-800">{gap.description}</p>

                      {gap.clauses.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {gap.clauses.map((c, i) => (
                            <span key={i} className={CHIP_CLASS}>{c}</span>
                          ))}
                        </div>
                      )}

                      {(linkedRisks.length > 0 || linkedComponents.length > 0) && (
                        <div className="mt-3 space-y-2">
                          {linkedRisks.length > 0 && (
                            <div>
                              <div className={EYEBROW_CLASS}>Linked risks</div>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                                {linkedRisks.map(({ id, risk }) => (
                                  <Badge key={id} className="bg-red-50 text-red-700 ring-red-200">
                                    {id} · {risk?.title}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {linkedComponents.length > 0 && (
                            <div>
                              <div className={EYEBROW_CLASS}>Linked components</div>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                                {linkedComponents.map(({ id, comp }) => (
                                  <Badge key={id} className="bg-sky-50 text-sky-700 ring-sky-200">
                                    {comp?.name ?? id}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_minmax(0,0.9fr)]">
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Mitigation
                          </div>
                          <p className="text-sm leading-relaxed text-slate-800">{gap.mitigation}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-inset ring-emerald-200/70">
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                            <ShieldCheck className="size-3.5" aria-hidden />
                            Validation activity
                          </div>
                          <p className="text-sm leading-relaxed text-slate-800">{gap.validation_activity}</p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader size="sm" eyebrow="[ CONTROLS ]" title="REQUIRED CONTROLS" />
            {visibleControls.length === 0 ? (
              <Card className="mt-4">
                <p className="text-sm italic text-slate-500">No controls cited for {framework}.</p>
              </Card>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visibleControls.map((ctl, i) => (
                  <Card key={i} className="flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-900">{ctl.name}</h4>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-800">{ctl.description}</p>
                    {ctl.clauses.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                        {ctl.clauses.map((c, j) => (
                          <span key={j} className={CHIP_CLASS}>{c}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section>
        <SectionHeader size="sm" eyebrow="[ STRATEGY ]" title="VALIDATION STRATEGY" />
        <div className="mt-4">
          <BlueprintFrame>
            <div className="relative pl-6">
              <span className="absolute left-0 top-0 font-display text-5xl leading-none text-emerald-500/50" aria-hidden>
                &ldquo;
              </span>
              <p className="text-sm leading-relaxed text-slate-800 sm:text-base">{compliance.validation_strategy}</p>
            </div>
          </BlueprintFrame>
        </div>
      </section>
    </div>
  )
}

function FrameworkChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
        active
          ? 'bg-emerald-600 text-white ring-emerald-600'
          : 'bg-white text-slate-800 ring-slate-300 hover:bg-emerald-50 hover:ring-emerald-300',
      )}
    >
      {label}
    </button>
  )
}
