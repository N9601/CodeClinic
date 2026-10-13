import { Cloud, Eraser, FileSearch, FileUp, Info, Layers, Pencil, Stethoscope, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getSample } from '../api'
import { Hero } from '../components/brand/Hero'
import { SectionHeader } from '../components/brand/SectionHeader'
import { StepStrip } from '../components/brand/StepStrip'
import { TrustBand } from '../components/brand/TrustBand'
import { CloudPicker } from '../components/intake/CloudPicker'
import { ProfileForm } from '../components/intake/ProfileForm'
import { RecentAssessments } from '../components/intake/RecentAssessments'
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
  { title: 'Brief', body: 'Upload a current-state assessment PDF or describe the application.' },
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

// Upload is the primary path — judges will drag in a real PDF.
export const INITIAL_INTAKE: IntakeState = {
  mode: 'upload',
  profile: EMPTY_PROFILE,
  sampleId: null,
  scan: null,
  cloud: 'azure',
  upload: EMPTY_UPLOAD,
}

export function Intake({
  state,
  onChange,
  samples: _samples,
  health,
  onRun,
  onOpenReport,
}: {
  state: IntakeState
  onChange: (next: IntakeState) => void
  samples: SampleSummary[] | null
  onOpenReport?: (reportId: string) => void
  health: HealthState
  onRun: () => void
}) {
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const intakeRef = useRef<HTMLDivElement>(null)

  const update = (patch: Partial<IntakeState>) => onChange({ ...state, ...patch })

  function scrollToIntake() {
    const el = intakeRef.current
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  function heroTrySample() {
    // Load the LabTrack sample profile into Describe mode so a judge can show the describe flow too.
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
  const live = isLive(health)
  const uploadReady = state.mode === 'upload' && Boolean(state.upload.extraction)
  const canRun = state.mode === 'upload' ? uploadReady : true
  const _loadingSample = loadingSample // keeps the setter linked to the actual UI below if we want it later

  void _loadingSample

  return (
    <form onSubmit={submit} className="cc-fade-in" noValidate>
      <Hero onTrySample={heroTrySample} onUpload={heroUpload} />

      {/* Process strip */}
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <SectionHeader
            eyebrow="How it works"
            title="From assessment PDF to migration plan in about a minute"
            align="center"
            size="sm"
          />
        </div>
        <StepStrip steps={PROCESS_STEPS} />
      </div>

      {/* Intake content */}
      <div ref={intakeRef} className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {onOpenReport && <RecentAssessments onOpen={onOpenReport} />}

        <div className="mb-6">
          <SectionHeader
            eyebrow="Start here"
            title="Brief the advisor"
            subtitle="Upload a current-state assessment PDF, or describe the application manually."
            size="md"
          />
        </div>

        {/* Intake mode tabs */}
        <div className="mb-6">
          <div
            role="tablist"
            aria-label="Intake method"
            className="inline-flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={state.mode === 'upload'}
              onClick={() => update({ mode: 'upload' })}
              className={cx(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                state.mode === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <FileUp className="size-4" aria-hidden /> Upload assessment
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={state.mode === 'describe'}
              onClick={() => update({ mode: 'describe' })}
              className={cx(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                state.mode === 'describe'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Pencil className="size-4" aria-hidden /> Describe app
            </button>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Left column */}
          <div className="min-w-0 space-y-6">
            {state.mode === 'upload' ? (
              <Card>
                <SectionTitle
                  icon={FileUp}
                  title="Upload a current-state assessment"
                  subtitle="Drag in a PDF — we'll extract the application profile and run the modernization analysis on top of it."
                />
                <UploadPanel value={state.upload} onChange={(upload) => update({ upload })} />
              </Card>
            ) : (
              <Card>
                <SectionTitle
                  icon={Layers}
                  title="Application profile"
                  subtitle="Describe the legacy application. Only the name is required — more detail means a sharper diagnosis."
                  right={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        icon={Eraser}
                        className="px-2.5 py-1 text-xs"
                        onClick={() => {
                          setNameError(false)
                          update({ profile: EMPTY_PROFILE, sampleId: null, scan: null })
                        }}
                      >
                        Clear
                      </Button>
                      {state.sampleId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                          Prefilled from sample
                          <button
                            type="button"
                            onClick={() => update({ sampleId: null })}
                            className="rounded-full p-0.5 hover:bg-emerald-100"
                            title="Treat as a custom application"
                            aria-label="Detach sample"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
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
            )}
          </div>

          {/* Right column */}
          <aside className="min-w-0">
            <div className="space-y-5 lg:sticky lg:top-24">
              {state.mode === 'describe' && (
                <Card>
                  <SectionTitle
                    icon={FileSearch}
                    title="Code evidence"
                    subtitle="Optional source upload for the scanner."
                  />
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
                  className="w-full bg-emerald-600 py-3 text-sm hover:bg-emerald-700 focus-visible:outline-emerald-600"
                  disabled={!canRun}
                  title={!canRun ? 'Upload a PDF (or use the bundled sample) first.' : undefined}
                >
                  Run diagnosis
                </Button>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {state.mode === 'upload'
                    ? uploadReady
                      ? 'Running on the extracted profile. The analyze stage is skipped — the document stands in for it.'
                      : 'Drop a PDF to extract an application profile before running the diagnosis.'
                    : offline
                      ? 'Backend is offline — the bundled LabTrack LIMS report will be shown.'
                      : live
                        ? 'Live analysis with Claude usually takes about a minute.'
                        : 'Demo mode — cached reports are returned for the sample applications.'}
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
