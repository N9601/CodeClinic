import { Boxes, FileSearch, Layers, Network, ScrollText, ShieldCheck, Wrench } from 'lucide-react'
import { Mermaid } from '../../components/Mermaid'
import { SignalChips, SignalSummary } from '../../components/SignalChips'
import { Badge, BulletList, Card, SectionTitle } from '../../components/ui'
import { SUPPORT_STYLE, titleCase } from '../../lib/format'
import type { AssessmentReport, ComponentType } from '../../types'

/** Mirrors the classDefs the backend emits in its flowcharts (render.py). */
const NODE_LEGEND: Array<{ type: ComponentType; fill: string; stroke: string; dashed?: boolean }> = [
  { type: 'frontend', fill: '#e0f2fe', stroke: '#0284c7' },
  { type: 'backend', fill: '#ede9fe', stroke: '#7c3aed' },
  { type: 'database', fill: '#fef3c7', stroke: '#d97706' },
  { type: 'integration', fill: '#dcfce7', stroke: '#16a34a' },
  { type: 'batch', fill: '#fce7f3', stroke: '#db2777' },
  { type: 'reporting', fill: '#f1f5f9', stroke: '#475569' },
  { type: 'identity', fill: '#ffedd5', stroke: '#ea580c' },
  { type: 'external', fill: '#f8fafc', stroke: '#94a3b8', dashed: true },
]

export function DiagramLegend({ types }: { types: ComponentType[] }) {
  const present = new Set<ComponentType>(types.map((t) => (t === 'storage' ? 'database' : t)))
  const items = NODE_LEGEND.filter((l) => present.has(l.type))
  if (!items.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
      {items.map((l) => (
        <span key={l.type} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm border"
            style={{ background: l.fill, borderColor: l.stroke, borderStyle: l.dashed ? 'dashed' : 'solid' }}
          />
          {l.type === 'database' ? 'Database / storage' : titleCase(l.type)}
        </span>
      ))}
    </div>
  )
}

export function ArchitectureTab({ report }: { report: AssessmentReport }) {
  const a = report.architecture

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle icon={Layers} title="Architecture style" />
        <div className="mb-3">
          <Badge className="bg-teal-50 px-3 py-1 text-sm text-teal-800 ring-teal-200">{a.architecture_style}</Badge>
        </div>
        <p className="max-w-4xl text-sm leading-relaxed text-slate-700 sm:text-base">{a.summary}</p>
      </Card>

      <Card>
        <SectionTitle icon={Network} title="Current-state architecture" subtitle="Components and data flows as they run today" />
        <Mermaid code={report.diagrams.current} label="Current-state architecture diagram" />
        <DiagramLegend types={a.components.map((c) => c.type)} />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <SectionTitle icon={Boxes} title="Components" subtitle={`${a.components.length} components identified`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Component</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Technology</th>
                <th className="px-5 py-3 sm:px-6">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {a.components.map((c) => (
                <tr key={c.id} className="avoid-break align-top hover:bg-slate-50/60">
                  <td className="w-[26%] px-5 py-3.5 sm:px-6">
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{c.description}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge>{titleCase(c.type)}</Badge>
                  </td>
                  <td className="w-[24%] px-3 py-3.5 text-slate-700">{c.technology}</td>
                  <td className="px-5 py-3.5 sm:px-6">
                    {c.issues.length ? (
                      <BulletList items={c.issues} marker="bg-amber-500" />
                    ) : (
                      <span className="text-sm text-slate-400">No issues noted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card padded={false} className="overflow-hidden">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <SectionTitle icon={ScrollText} title="Technology inventory" subtitle="Versions and vendor support status" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Technology</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 sm:px-6">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {a.tech_inventory.map((t, i) => {
                  const s = SUPPORT_STYLE[t.support_status] ?? SUPPORT_STYLE.unknown
                  return (
                    <tr key={`${t.name}-${i}`} className="avoid-break align-top">
                      <td className="px-5 py-3 sm:px-6">
                        <div className="font-semibold text-slate-900">
                          {t.name} <span className="font-normal text-slate-500">{t.version}</span>
                        </div>
                        <div className="text-xs text-slate-400">{titleCase(t.category)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={s.badge}>{s.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600 sm:px-6">{t.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="avoid-break rounded-2xl border border-violet-200 bg-violet-50/70 p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-800">
              <ShieldCheck className="size-4" aria-hidden /> Regulated data
            </div>
            <p className="text-sm leading-relaxed text-violet-950">{a.regulated_data}</p>
          </div>
          <Card>
            <SectionTitle icon={Wrench} title="Technical debt" />
            <BulletList items={a.tech_debt} marker="bg-rose-500" />
          </Card>
        </div>
      </div>

      {report.signals.length > 0 && (
        <Card>
          <SectionTitle
            icon={FileSearch}
            title="Scanner evidence"
            subtitle="Deterministic findings from the uploaded code - hover a chip for the file"
            right={<SignalSummary signals={report.signals} />}
          />
          <SignalChips signals={report.signals} />
        </Card>
      )}
    </div>
  )
}
