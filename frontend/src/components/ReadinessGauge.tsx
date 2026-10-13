import { bandFor } from '../lib/format'
import { cx } from './ui'

/** Semicircular score gauge (0-100). Color + text label carry the band together. */
export function ReadinessGauge({ score, size = 'lg' }: { score: number; size?: 'md' | 'lg' }) {
  const value = Math.max(0, Math.min(100, Math.round(score)))
  const band = bandFor(value)
  const dims = size === 'lg' ? 'w-44 sm:w-52' : 'w-36'

  return (
    <div className={cx('flex flex-col items-center', dims)} role="img" aria-label={`Cloud readiness ${value} out of 100: ${band.band}`}>
      <svg viewBox="0 0 140 80" className="w-full overflow-visible">
        <path
          d="M 12 72 A 58 58 0 0 1 128 72"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 12 72 A 58 58 0 0 1 128 72"
          fill="none"
          stroke={band.hex}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(value, 0.5)} 100`}
          style={{ transition: 'stroke-dasharray 900ms ease-out' }}
        />
        {/* threshold ticks at 40 and 70 */}
        {[40, 70].map((t) => {
          const a = Math.PI * (1 - t / 100)
          const x1 = 70 + Math.cos(a) * 48
          const y1 = 72 - Math.sin(a) * 48
          const x2 = 70 + Math.cos(a) * 43
          const y2 = 72 - Math.sin(a) * 43
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        })}
        <text x="70" y="62" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 30, fontWeight: 800 }}>
          {value}
        </text>
        <text x="70" y="76" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9, fontWeight: 600 }}>
          / 100
        </text>
      </svg>
      <span className={cx('mt-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ring-inset', band.bg, band.text, band.ring)}>
        {band.band}
      </span>
    </div>
  )
}
