// Dark full-width band with regulatory frameworks (replaces logo wall).
import { cx } from '../ui'

const FRAMEWORKS: Array<{ name: string; hint: string }> = [
  { name: 'GxP', hint: 'Umbrella term for Good x Practice regulations (GMP, GLP, GCP, GDP)' },
  { name: '21 CFR Part 11', hint: 'US FDA rule for electronic records & signatures' },
  { name: 'EU GMP Annex 11', hint: 'EU rules for computerised systems in regulated manufacturing' },
  { name: 'GAMP 5', hint: 'ISPE risk-based validation guide for GxP computer systems' },
  { name: 'ALCOA+', hint: 'Data-integrity principles: Attributable, Legible, Contemporaneous, Original, Accurate (+)' },
  { name: 'FDA CSA', hint: 'Computer Software Assurance — FDA’s risk-based successor to CSV' },
]

export function TrustBand({ className }: { className?: string }) {
  return (
    <section className={cx('relative no-print bg-slate-950 py-10 text-slate-200', className)}>
      {/* crosshair corner marks (match BlueprintFrame) */}
      <span className="bp-corner" style={{ top: -7, left: -7 }} aria-hidden />
      <span className="bp-corner" style={{ top: -7, right: -7 }} aria-hidden />
      <span className="bp-corner" style={{ bottom: -7, left: -7 }} aria-hidden />
      <span className="bp-corner" style={{ bottom: -7, right: -7 }} aria-hidden />
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        <span className="annotation" style={{ color: 'var(--color-emerald-400)' }}>Compliance-aware</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {FRAMEWORKS.map((f, i) => (
            <li key={f.name} className="flex items-center gap-6">
              <span
                className="tb-framework relative font-display text-sm uppercase tracking-[0.25em] text-slate-300 transition hover:text-emerald-400 hover:underline hover:decoration-emerald-400 hover:underline-offset-4 sm:text-base"
                data-hint={f.hint}
                tabIndex={0}
              >
                {f.name}
              </span>
              {i < FRAMEWORKS.length - 1 && <span className="text-slate-800" aria-hidden>·</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
