// Muted dark trust band with regulatory frameworks, separated by thin dots.
import { Fragment } from 'react'
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
    <section className={cx('no-print bg-slate-950 py-8 text-slate-300', className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
          Compliance-aware
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-400">
          {FRAMEWORKS.map((f, i) => (
            <Fragment key={f.name}>
              <li>
                <span
                  className="tb-framework relative font-medium tracking-wide text-slate-200 transition hover:text-emerald-300"
                  data-hint={f.hint}
                  tabIndex={0}
                >
                  {f.name}
                </span>
              </li>
              {i < FRAMEWORKS.length - 1 && <li aria-hidden className="size-1 rounded-full bg-slate-700" />}
            </Fragment>
          ))}
        </ul>
      </div>
    </section>
  )
}
