import { CalendarRange, ClipboardCheck, Flag, ListTodo, PackageCheck, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Mermaid } from '../../components/Mermaid'
import { BulletList, Card, SectionTitle } from '../../components/ui'
import type { AssessmentReport, Phase } from '../../types'

function Column({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Icon className="size-3.5" aria-hidden /> {title}
      </div>
      <BulletList items={items} />
    </div>
  )
}

function PhaseCard({ phase, index, totalWeeks }: { phase: Phase; index: number; totalWeeks: number }) {
  const start = phase.start_week
  const end = phase.start_week + phase.duration_weeks
  const left = totalWeeks ? (start / totalWeeks) * 100 : 0
  const width = totalWeeks ? Math.max(2, (phase.duration_weeks / totalWeeks) * 100) : 100

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-sm shadow-teal-600/30">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold leading-snug text-slate-900">{phase.name}</h4>
            <div className="text-sm text-slate-500">
              Weeks {start + 1}–{end} · {phase.duration_weeks} week{phase.duration_weeks === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        {/* mini timeline position */}
        <div className="hidden w-48 sm:block" aria-hidden>
          <div className="relative h-2 rounded-full bg-slate-100">
            <div className="absolute inset-y-0 rounded-full bg-teal-500" style={{ left: `${left}%`, width: `${width}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>wk 0</span>
            <span>wk {totalWeeks}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:px-6 md:grid-cols-3">
        <Column icon={Flag} title="Objectives" items={phase.objectives} />
        <Column icon={ListTodo} title="Activities" items={phase.activities} />
        <Column icon={PackageCheck} title="Deliverables" items={phase.deliverables} />
      </div>

      {phase.validation_gates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-violet-100 bg-violet-50/70 px-5 py-3 sm:px-6">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-800">
            <ShieldCheck className="size-4" aria-hidden /> Validation gate{phase.validation_gates.length > 1 ? 's' : ''}
          </span>
          {phase.validation_gates.map((g, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-800 shadow-sm ring-1 ring-violet-200"
            >
              <ShieldCheck className="size-3.5 text-violet-600" aria-hidden />
              {g}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export function RoadmapTab({ report }: { report: AssessmentReport }) {
  const phases = [...report.plan.roadmap].sort((a, b) => a.start_week - b.start_week)
  const lastWeek = phases.reduce((m, p) => Math.max(m, p.start_week + p.duration_weeks), 0)
  const totalWeeks = Math.max(report.summary.total_weeks || 0, lastWeek)
  const gates = phases.reduce((n, p) => n + p.validation_gates.length, 0)

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          icon={CalendarRange}
          title="Migration roadmap"
          subtitle={`${phases.length} phases over ~${totalWeeks} weeks · ${gates} validation gate${gates === 1 ? '' : 's'} (milestones)`}
        />
        <Mermaid code={report.diagrams.roadmap} label="Migration roadmap Gantt chart" />
      </Card>

      <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-800">
        <ClipboardCheck className="size-4 text-teal-600" aria-hidden /> Phase plan
      </div>
      <div className="space-y-4">
        {phases.map((p, i) => (
          <PhaseCard key={`${p.name}-${i}`} phase={p} index={i} totalWeeks={totalWeeks} />
        ))}
      </div>
    </div>
  )
}
