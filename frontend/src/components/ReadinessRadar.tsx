// Radar of the seven readiness dimensions (0-10). Single series -> one brand hue, no legend.
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ScoredDimension } from '../types'
import { pct } from '../lib/format'

const STROKE = '#0d9488' // teal-600
const FILL = '#14b8a6' // teal-500

interface TickProps {
  x?: number | string
  y?: number | string
  cx?: number
  cy?: number
  payload?: { value?: string }
}

/** Wrap long axis labels onto two lines and anchor them away from the center. */
function AngleTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: TickProps) {
  const nx = Number(x)
  const ny = Number(y)
  const label = String(payload?.value ?? '')
  const words = label.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 15 && line) {
      lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)

  const dx = nx - cx
  const anchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end'
  const above = ny < cy - 4
  const startDy = above ? -(lines.length - 1) * 14 : 4

  return (
    <text x={nx} y={ny} textAnchor={anchor} fill="#334155" fontSize={12} fontWeight={500}>
      {lines.map((l, i) => (
        <tspan key={i} x={nx} dy={i === 0 ? startDy : 14}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

interface DimTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: ScoredDimension }>
}

function DimTooltip({ active, payload }: DimTooltipProps) {
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="max-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{d.label}</div>
      <div className="mt-0.5 text-slate-600">
        <span className="font-semibold text-slate-900">{d.score}</span>/10 · weight {pct(d.weight)}
      </div>
    </div>
  )
}

export function ReadinessRadar({
  dimensions,
  height = 340,
  animate = true,
}: {
  dimensions: ScoredDimension[]
  height?: number
  animate?: boolean
}) {
  if (!dimensions.length) return <p className="text-sm text-slate-400">No dimension scores.</p>
  return (
    <div style={{ width: '100%', height }} role="img" aria-label="Readiness radar chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={dimensions} outerRadius="72%" margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="label" tick={(props: TickProps) => <AngleTick {...props} />} />
          <PolarRadiusAxis
            domain={[0, 10]}
            tickCount={6}
            angle={90}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
          />
          <Radar
            dataKey="score"
            name="Score"
            stroke={STROKE}
            strokeWidth={2}
            fill={FILL}
            fillOpacity={0.22}
            dot={{ r: 4, fill: STROKE, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={animate}
          />
          <Tooltip content={<DimTooltip />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
