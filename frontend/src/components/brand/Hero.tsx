// Medscribe-inspired hero: dark pill tag, huge condensed caps headline, CTAs,
// then a blueprint-framed pipeline diagram built from styled divs.
import { Fragment } from 'react'
import { ArrowRight, FileText, FlaskConical, Stethoscope, Upload } from 'lucide-react'
import { Button } from '../ui'
import { BlueprintFrame } from './BlueprintFrame'

export function Hero({
  onTrySample,
  onUpload,
}: {
  onTrySample: () => void
  onUpload: () => void
}) {
  return (
    <section className="relative overflow-hidden">
      {/* subtle blueprint grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-14 lg:px-8">
        {/* Pill tag */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 ring-1 ring-emerald-200">
          <span className="text-emerald-600">+</span>
          <span>AI-Powered Modernization Advisor</span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-5xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-slate-900 md:text-7xl lg:text-8xl">
          Diagnose Legacy Pharma Apps.
          <span className="block text-emerald-600">Prescribe a Compliant Migration Plan.</span>
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          CodeClinic turns a current-state architecture assessment into a modernization roadmap in about a minute — with
          GxP, Part 11, and IQ/OQ/PQ awareness baked in.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="primary" icon={FlaskConical} onClick={onTrySample} className="px-6 py-3 text-base">
            Try with LabTrack sample
          </Button>
          <Button variant="secondary" icon={Upload} onClick={onUpload} className="px-6 py-3 text-base">
            Upload assessment
          </Button>
        </div>

        {/* Blueprint pipeline */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <BlueprintFrame className="bg-white/80" padded>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="annotation">Pipeline</span>
              <span className="annotation">~60s end-to-end</span>
            </div>
            <PipelineDiagram />
          </BlueprintFrame>
        </div>
      </div>
    </section>
  )
}

function PipelineDiagram() {
  const nodes = [
    { label: 'Assessment PDF', icon: FileText },
    { label: 'Extraction', icon: FlaskConical },
    { label: 'Analysis', icon: Stethoscope },
    { label: 'Migration Plan', icon: ArrowRight },
  ]
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-0">
      {nodes.map((n, i) => (
        <Fragment key={n.label}>
          <div
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left shadow-sm md:flex-col md:items-center md:gap-2 md:text-center"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <n.icon className="size-5" aria-hidden />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-wider text-slate-900 sm:text-base">
              {n.label}
            </span>
          </div>
          {i < nodes.length - 1 && (
            <span
              aria-hidden
              className="mx-auto h-5 w-px border-l border-dashed border-emerald-400/70 md:mx-3 md:h-px md:w-10 md:border-l-0 md:border-t"
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
