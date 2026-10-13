// Dark full-width band with regulatory frameworks (replaces logo wall).
import { cx } from '../ui'

const FRAMEWORKS = [
  'GxP',
  '21 CFR Part 11',
  'EU GMP Annex 11',
  'GAMP 5',
  'ALCOA+',
  'FDA CSA',
]

export function TrustBand({ className }: { className?: string }) {
  return (
    <section className={cx('no-print bg-slate-950 py-10 text-slate-200', className)}>
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        <span className="annotation" style={{ color: 'var(--color-emerald-400)' }}>Compliance-aware</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {FRAMEWORKS.map((f, i) => (
            <li key={f} className="flex items-center gap-6">
              <span className="font-display text-sm uppercase tracking-[0.25em] text-slate-300 transition hover:text-emerald-400 hover:underline hover:decoration-emerald-400 hover:underline-offset-4 sm:text-base">
                {f}
              </span>
              {i < FRAMEWORKS.length - 1 && <span className="text-slate-700" aria-hidden>·</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
