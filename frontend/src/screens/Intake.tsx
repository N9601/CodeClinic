import {
  ClipboardList,
  Cloud,
  Eraser,
  FileSearch,
  Info,
  Layers,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getSample } from '../api'
import { CloudPicker } from '../components/intake/CloudPicker'
import { ProfileForm } from '../components/intake/ProfileForm'
import { SampleCards } from '../components/intake/SampleCards'
import { ZipDropZone } from '../components/intake/ZipDropZone'
import type { ScanState } from '../components/intake/ZipDropZone'
import { TAGLINE } from '../components/Header'
import { Button, Card, cx, SectionTitle } from '../components/ui'
import type { HealthState } from '../hooks/useHealth'
import { isLive } from '../hooks/useHealth'
import { MOCK_REPORT_SAMPLE_ID, MOCK_SAMPLE_DETAILS } from '../mock'
import type { AppProfile, CloudProvider, SampleSummary } from '../types'
import { EMPTY_PROFILE } from '../types'

const OBJECTIVES = [
  'Current architecture',
  'Cloud-readiness score',
  'Risks & opportunities',
  'Target architecture + 7R',
  'Migration roadmap',
]

export interface IntakeState {
  profile: AppProfile
  sampleId: string | null
  scan: ScanState | null
  cloud: CloudProvider
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

  const update = (patch: Partial<IntakeState>) => onChange({ ...state, ...patch })
  const sampleName = samples?.find((s) => s.id === state.sampleId)?.name ?? state.sampleId

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

  return (
    <form onSubmit={submit} className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 cc-fade-in" noValidate>
      {/* Hero */}
      <section className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-100">
          <ShieldCheck className="size-3.5" aria-hidden />
          Compliance-aware: GxP · 21 CFR Part 11 · IQ/OQ/PQ gates
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Modernize legacy pharma apps <span className="text-teal-600">without losing validated state.</span>
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 sm:text-lg">{TAGLINE}</p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {OBJECTIVES.map((o, i) => (
            <li
              key={o}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200"
            >
              <span className="grid size-5 place-items-center rounded-full bg-teal-600 text-[10px] font-bold text-white">{i + 1}</span>
              {o}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Left column */}
        <div className="min-w-0 space-y-6">
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
        </div>

        {/* Right column */}
        <aside className="min-w-0">
          <div className="space-y-6 lg:sticky lg:top-24">
            <Card>
              <SectionTitle icon={FileSearch} title="Code evidence" subtitle="Optional source upload for the scanner." />
              <ZipDropZone scan={state.scan} onScan={(scan) => update({ scan })} />
            </Card>

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
              >
                Run diagnosis
              </Button>
              <p
                className={cx(
                  'flex items-start gap-2 text-xs leading-relaxed',
                  offlineUnsupported ? 'text-amber-700' : 'text-slate-500',
                )}
              >
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {offlineUnsupported
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
    </form>
  )
}
