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
      {/* paper-grain texture: tiny ink dots scattered across the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), radial-gradient(rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '7px 7px, 11px 11px',
          backgroundPosition: '0 0, 3px 4px',
          opacity: 0.5,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-14 lg:px-8">
        {/* Pill tag */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 ring-1 ring-emerald-200">
          <span className="text-emerald-600">+</span>
          <span>AI-Powered Modernization Advisor</span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-5xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-[-0.03em] text-slate-900 md:text-7xl lg:text-8xl">
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
          <Button variant="primary" icon={FlaskConical} onClick={onTrySample} className="px-6 py-3 text-base shadow-md shadow-emerald-600/20 transition-transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30">
            Try with LabTrack sample
          </Button>
          <Button variant="secondary" icon={Upload} onClick={onUpload} className="px-6 py-3 text-base transition-transform hover:scale-[1.02] hover:shadow-md">
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

// Hand-drawn connector between pipeline nodes — wobbly stroke + rough arrowhead.
function SketchArrow() {
  return (
    <>
      {/* vertical (mobile) */}
      <svg
        aria-hidden
        viewBox="0 0 12 28"
        className="mx-auto block h-7 w-3 text-emerald-500 md:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 C 5.4 7, 6.6 13, 5.8 22" />
        <path d="M2.6 19 L 5.9 24.6 L 9.2 19.4" />
      </svg>
      {/* horizontal (desktop) */}
      <svg
        aria-hidden
        viewBox="0 0 48 14"
        className="mx-2 hidden h-3.5 w-12 text-emerald-500 md:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 7.2 C 10 6.3, 22 7.9, 42 6.6" />
        <path d="M37.2 2.8 L 43.4 6.7 L 37.6 10.9" />
      </svg>
    </>
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
          {i < nodes.length - 1 && <SketchArrow />}
        </Fragment>
      ))}
    </div>
  )
}
