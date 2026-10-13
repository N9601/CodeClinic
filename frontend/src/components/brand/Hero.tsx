// Modern SaaS hero: generous whitespace, confident sentence-case headline,
// two CTAs, and a clean browser-chrome preview of the Report screen.
import { ArrowRight, CheckCircle2, FileText, Upload } from 'lucide-react'
import { Button } from '../ui'

export function Hero({
  onTrySample,
  onUpload,
}: {
  onTrySample: () => void
  onUpload: () => void
}) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/60">
      {/* subtle emerald wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.08), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
        {/* Eyebrow pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          AI-powered modernization advisor for regulated pharma IT
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[4.25rem]">
          Diagnose legacy pharma apps.
          <br />
          <span className="text-slate-500">Prescribe a compliant migration plan.</span>
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Turn a current-state architecture assessment into a modernization roadmap in about a minute — with GxP,
          21 CFR Part 11, and IQ/OQ/PQ validation awareness baked in.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            variant="primary"
            icon={Upload}
            onClick={onUpload}
            className="bg-emerald-600 px-5 py-2.5 text-sm hover:bg-emerald-700 focus-visible:outline-emerald-600"
          >
            Upload assessment
          </Button>
          <button
            type="button"
            onClick={onTrySample}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
          >
            Try the LabTrack sample
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>

        {/* Capability chips */}
        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          {[
            'Seven readiness dimensions',
            '7R strategy per component',
            'IQ/OQ/PQ validation gates',
            'Regulatory gap analysis',
          ].map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />
              {c}
            </li>
          ))}
        </ul>

        {/* Report preview */}
        <div className="mx-auto mt-14 max-w-4xl">
          <ReportPreview />
        </div>
      </div>
    </section>
  )
}

// Browser-chrome mockup previewing the Report screen — dog-fooded, not stock.
function ReportPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-[0_20px_60px_-20px_rgba(16,24,40,0.18)]">
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
          <FileText className="size-3" aria-hidden />
          codeclinic.app / report / labtrack-lims
        </div>
      </div>

      {/* content */}
      <div className="grid gap-5 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Modernization report
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            LabTrack LIMS
          </h3>
          <p className="mt-1 text-sm text-slate-500">Laboratory information management system</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Strategy: Replatform
            </span>
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              18 weeks
            </span>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
              GxP-critical
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
              Azure
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Readiness', value: '72' },
              { label: 'Risks', value: '14' },
              { label: 'Opportunities', value: '9' },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {k.label}
                </div>
                <div className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-4 md:px-7">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Cloud readiness
          </div>
          <div className="relative grid size-24 place-items-center">
            <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#10b981"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(72 / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
              />
            </svg>
            <span className="absolute text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              72
            </span>
          </div>
          <div className="text-xs text-slate-500">Band · Fit</div>
        </div>
      </div>
    </div>
  )
}
