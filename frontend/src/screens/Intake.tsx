import {
  ClipboardList,
  Cloud,
  Eraser,
  FileSearch,
  FileUp,
  Info,
  Layers,
  Pencil,
  Stethoscope,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getSample } from '../api'
import { Hero } from '../components/brand/Hero'
import { SectionHeader } from '../components/brand/SectionHeader'
import { StepStrip } from '../components/brand/StepStrip'
import { TrustBand } from '../components/brand/TrustBand'
import { CloudPicker } from '../components/intake/CloudPicker'
import { ProfileForm } from '../components/intake/ProfileForm'
import { SampleCards } from '../components/intake/SampleCards'
import { EMPTY_UPLOAD, UploadPanel } from '../components/intake/UploadPanel'
import type { UploadState } from '../components/intake/UploadPanel'
import { ZipDropZone } from '../components/intake/ZipDropZone'
import type { ScanState } from '../components/intake/ZipDropZone'
import { Button, Card, cx, SectionTitle } from '../components/ui'
import type { HealthState } from '../hooks/useHealth'
import { isLive } from '../hooks/useHealth'
import { MOCK_REPORT_SAMPLE_ID, MOCK_SAMPLE_DETAILS } from '../mock'
import type { AppProfile, CloudProvider, SampleSummary } from '../types'
import { EMPTY_PROFILE } from '../types'

const PROCESS_STEPS = [
  { title: 'Brief', body: 'Pick a sample or upload a current-state assessment PDF.' },
  { title: 'Extract', body: 'Profile, components and tech inventory are parsed from the document.' },
  { title: 'Diagnose', body: 'Seven readiness dimensions, risk register and opportunities are scored.' },
  { title: 'Prescribe', body: 'Target architecture with a 7R strategy per component.' },
  { title: 'Roadmap', body: 'Phased migration plan with IQ/OQ/PQ validation gates.' },
]

export type IntakeMode = 'describe' | 'upload'

export interface IntakeState {
  mode: IntakeMode
  profile: AppProfile
  sampleId: string | null
  scan: ScanState | null
  cloud: CloudProvider
  upload: UploadState
}

export const INITIAL_INTAKE: IntakeState = {
  mode: 'describe',
  profile: EMPTY_PROFILE,
  sampleId: null,
  scan: null,
  cloud: 'azure',
  upload: EMPTY_UPLOAD,
}

export function Intake({
  state,
  onChange,
  samples,
  health,
  onRun,
}: {
  state: IntakeState
  onChange: (next: IntakeState) => void
  samples: SampleSummary[] | null
  health: HealthState
  onRun: () => void
}) {
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const intakeRef = useRef<HTMLDivElement>(null)

  const update = (patch: Partial<IntakeState>) => onChange({ ...state, ...patch })
  const sampleName = samples?.find((s) => s.id === state.sampleId)?.name ?? state.sampleId

  function scrollToIntake() {
    const el = intakeRef.current
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  function heroTrySample() {
    update({ mode: 'describe' })
    void selectSample(MOCK_REPORT_SAMPLE_ID)
    scrollToIntake()
  }

  function heroUpload() {
    update({ mode: 'upload' })
    scrollToIntake()
  }

  async function selectSample(id: string) {
    setLoadingSample(id)
    try {
      let detail
      try {
        detail = await getSample(id)
      } catch {
        detail = MOCK_SAMPLE_DETAILS.find((s) => s.id === id)
      }
      if (detail) {
        setNameError(false)
        onChange({ ...state, profile: { ...EMPTY_PROFILE, ...detail.profile }, sampleId: id })
      }
    } finally {
      setLoadingSample(null)
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (state.mode === 'upload') {
      if (!state.upload.extraction) return
      onRun()
      return
    }
    if (!state.profile.name.trim()) {
      setNameError(true)
      document.getElementById('field-name')?.focus()
      return
    }
    onRun()
  }

  const offline = health.status === 'offline'
  const offlineUnsupported = offline && state.sampleId !== MOCK_REPORT_SAMPLE_ID
  const live = isLive(health)
  const uploadReady = state.mode === 'upload' && Boolean(state.upload.extraction)
  const canRun = state.mode === 'upload' ? uploadReady : true

  return (
    <form onSubmit={submit} className="cc-fade-in" noValidate>
      {/* Medscribe-style hero */}
      <Hero onTrySample={heroTrySample} onUpload={heroUpload} />

      {/* Process strip */}
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5 text-center">
          <SectionHeader
            eyebrow="How it works"
            title="Simple steps to a compliant modernization plan"
            align="center"
            size="sm"
          />
        </div>
        <StepStrip steps={PROCESS_STEPS} />
      </div>

      {/* Intake content */}
      <div ref={intakeRef} className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <SectionHeader
          eyebrow="[ Start here ]"
          title="Brief the advisor"
          subtitle="Pick a sample, describe your app, or upload an assessment PDF."
          size="md"
        />
      </div>

      {/* Intake mode tabs */}
      <div className="mb-5">
        <div role="tablist" aria-label="Intake method" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
          <button
            type="button"
            role="tab"
            aria-selected={state.mode === 'describe'}
            onClick={() => update({ mode: 'describe' })}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
              state.mode === 'describe' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <Pencil className="size-4" aria-hidden /> Describe app
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={state.mode === 'upload'}
            onClick={() => update({ mode: 'upload' })}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
              state.mode === 'upload' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <FileUp className="size-4" aria-hidden /> Upload assessment
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Left column */}
        <div className="min-w-0 space-y-6">
          {state.mode === 'describe' ? (
            <>
              <Card>
                <SectionTitle
                  icon={ClipboardList}
                  title="Start from a sample"
                  subtitle="Three realistic pharma applications - click one to load its profile."
                />
                <SampleCards
                  samples={samples}
                  selectedId={state.sampleId}
                  loadingId={loadingSample}
                  onSelect={selectSample}
                />
              </Card>

              <Card>
                <SectionTitle
                  icon={Layers}
                  title="Application profile"
                  subtitle="Describe the legacy application. Only the name is required - more detail means a sharper diagnosis."
                  right={
                    <div className="flex flex-wrap items-center gap-2">
                      {state.sampleId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
                          Sample: {sampleName}
                          <button
                            type="button"
                            onClick={() => update({ sampleId: null })}
                            className="rounded-full p-0.5 hover:bg-teal-100"
                            title="Treat as a custom application"
                            aria-label="Detach sample"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        icon={Eraser}
                        className="px-2.5 py-1.5 text-xs"
                        onClick={() => {
                          setNameError(false)
                          update({ profile: EMPTY_PROFILE, sampleId: null, scan: null })
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  }
                />
                <ProfileForm
                  profile={state.profile}
                  nameError={nameError}
                  onChange={(profile) => {
                    if (nameError && profile.name.trim()) setNameError(false)
                    update({ profile })
                  }}
                />
              </Card>
            </>
          ) : (
            <Card>
              <SectionTitle
                icon={FileUp}
                title="Upload a current-state assessment"
                subtitle="We'll extract the application profile from the PDF and run the modernization analysis on top."
              />
              <UploadPanel value={state.upload} onChange={(upload) => update({ upload })} />
            </Card>
          )}
        </div>

        {/* Right column */}
        <aside className="min-w-0">
          <div className="space-y-6 lg:sticky lg:top-24">
            {state.mode === 'describe' && (
              <Card>
                <SectionTitle icon={FileSearch} title="Code evidence" subtitle="Optional source upload for the scanner." />
                <ZipDropZone scan={state.scan} onScan={(scan) => update({ scan })} />
              </Card>
            )}

            <Card>
              <SectionTitle icon={Cloud} title="Target cloud" subtitle="Services are mapped to this provider." />
              <CloudPicker value={state.cloud} onChange={(cloud) => update({ cloud })} />
            </Card>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                icon={Stethoscope}
                className="w-full rounded-2xl py-3.5 text-base"
                disabled={!canRun}
                title={!canRun ? 'Upload a PDF (or use the bundled sample) first.' : undefined}
              >
                Run diagnosis
              </Button>
              <p
                className={cx(
                  'flex items-start gap-2 text-xs leading-relaxed',
                  offlineUnsupported && state.mode === 'describe' ? 'text-amber-700' : 'text-slate-500',
                )}
              >
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {state.mode === 'upload'
                  ? uploadReady
                    ? 'Running on the extracted profile. The analyze stage is skipped - the document stands in for it.'
                    : "Drop a PDF or click 'Use bundled sample' to extract an application profile before running the diagnosis."
                  : offlineUnsupported
                    ? 'Backend is offline - only the LabTrack LIMS sample has a bundled report in offline demo mode.'
                    : offline
                      ? 'Backend is offline - the bundled LabTrack LIMS report will be shown.'
                      : live
                        ? 'Live analysis with Claude usually takes about a minute.'
                        : 'Demo mode - cached reports are returned for the sample applications.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
      </div>

      <TrustBand />
    </form>
  )
}
