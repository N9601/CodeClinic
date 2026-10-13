import { titleCase } from '../lib/format'
import type { ComponentType } from '../types'

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
