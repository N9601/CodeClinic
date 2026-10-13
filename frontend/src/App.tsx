// CodeClinic single-page state machine: intake -> running -> report.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSamples } from './api'
import { Header } from './components/Header'
import { useHealth } from './hooks/useHealth'
import { runAssessment, STAGE_ORDER, STAGE_RANK } from './lib/runAssessment'
import type { RunResult } from './lib/runAssessment'
import { MOCK_REPORT, MOCK_SAMPLES } from './mock'
import { INITIAL_INTAKE, Intake } from './screens/Intake'
import type { IntakeState } from './screens/Intake'
import { Report } from './screens/Report'
import { INITIAL_STAGES, Running } from './screens/Running'
import type { StageMap } from './screens/Running'
import type { AssessRequest, SampleSummary, StageEvent, StageName } from './types'

type Screen = 'intake' | 'running' | 'report'

interface RunState {
  stages: StageMap
  labels: Partial<Record<StageName, string>>
  startedAt: number
  error: string | null
  notice: string | null
}

const NEW_RUN = (): RunState => ({ stages: { ...INITIAL_STAGES }, labels: {}, startedAt: Date.now(), error: null, notice: null })

function applyStage(prev: StageMap, ev: StageEvent): StageMap {
  if (!(ev.stage in prev)) return prev
  const next = { ...prev }
  if (ev.status === 'done') next[ev.stage] = 'done'
  else if (next[ev.stage] !== 'done') next[ev.stage] = 'started'
  // A later stage starting implies earlier ones finished (e.g. no 'scan' events without a zip).
  if (ev.status === 'started') {
    for (const s of STAGE_ORDER) if (STAGE_RANK[s] < STAGE_RANK[ev.stage] && next[s] !== 'done') next[s] = 'done'
  }
  return next
}

const allDone = (): StageMap => ({
  scan: 'done',
  analyze: 'done',
  extract: 'done',
  assess: 'done',
  recommend: 'done',
  assemble: 'done',
})

/** `?demo` in the URL opens the bundled LabTrack report directly (presenter safety net). */
function initialResult(): RunResult | null {
  const params = new URLSearchParams(window.location.search)
  return params.has('demo') ? { report: MOCK_REPORT, source: 'mock' } : null
}

export default function App() {
  const health = useHealth()
  const [result, setResult] = useState<RunResult | null>(initialResult)
  const [screen, setScreen] = useState<Screen>(() => (result ? 'report' : 'intake'))
  const [samples, setSamples] = useState<SampleSummary[] | null>(null)
  const [intake, setIntake] = useState<IntakeState>(INITIAL_INTAKE)
  const [run, setRun] = useState<RunState>(NEW_RUN)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    getSamples()
      .then((s) => !cancelled && setSamples(Array.isArray(s) && s.length ? s : MOCK_SAMPLES))
      .catch(() => !cancelled && setSamples(MOCK_SAMPLES))
    return () => {
      cancelled = true
    }
  }, [])

  // Retry the sample list once the backend shows up (e.g. started after the page loaded).
  const online = health.status === 'online'
  useEffect(() => {
    if (!online || samples !== MOCK_SAMPLES) return
    getSamples()
      .then((s) => Array.isArray(s) && s.length && setSamples(s))
      .catch(() => {})
  }, [online, samples])

  const goIntake = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setScreen('intake')
    window.scrollTo({ top: 0 })
  }, [])

  async function startRun() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRun(NEW_RUN())
    setScreen('running')
    window.scrollTo({ top: 0 })

    const upload = intake.upload
    const isUpload = intake.mode === 'upload' && upload.extraction
    const req: AssessRequest = isUpload
      ? {
          profile: upload.profileOverride ?? upload.extraction!.profile,
          sample_id: upload.sampleId,
          signals: [],
          target_cloud: intake.cloud,
          mode: 'auto',
          extraction: upload.extraction,
        }
      : {
          profile: intake.profile,
          sample_id: intake.sampleId,
          signals: intake.scan?.result.signals ?? [],
          target_cloud: intake.cloud,
          mode: 'auto',
        }

    try {
      const res = await runAssessment(req, {
        signal: ctrl.signal,
        onStage: (ev) =>
          setRun((r) => ({
            ...r,
            stages: applyStage(r.stages, ev),
            labels: ev.label ? { ...r.labels, [ev.stage]: ev.label } : r.labels,
          })),
        onNotice: (notice) => setRun((r) => ({ ...r, notice })),
      })
      if (ctrl.signal.aborted) return
      setRun((r) => ({ ...r, stages: allDone(), notice: null }))
      await new Promise((resolve) => window.setTimeout(resolve, 450))
      if (ctrl.signal.aborted) return
      setResult(res)
      setScreen('report')
      window.scrollTo({ top: 0 })
    } catch (err) {
      if (ctrl.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
      setRun((r) => ({ ...r, notice: null, error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-teal-50)_0%,_transparent_55%)]">
      <Header health={health} onHome={screen === 'running' ? undefined : goIntake} />
      <main>
        {screen === 'intake' && (
          <Intake state={intake} onChange={setIntake} samples={samples} health={health} onRun={startRun} />
        )}
        {screen === 'running' && (
          <Running
            appName={
              intake.mode === 'upload'
                ? intake.upload.profileOverride?.name ||
                  intake.upload.extraction?.profile.name ||
                  intake.upload.extraction?.document_title ||
                  'application'
                : intake.profile.name || 'application'
            }
            cloud={intake.cloud}
            stages={run.stages}
            labels={run.labels}
            startedAt={run.startedAt}
            error={run.error}
            notice={run.notice}
            onBack={goIntake}
            hasExtraction={intake.mode === 'upload' && !!intake.upload.extraction}
          />
        )}
        {screen === 'report' && result && <Report report={result.report} source={result.source} onNew={goIntake} />}
      </main>
      <footer className="no-print border-t border-slate-200/70 py-6 text-center text-xs text-slate-400">
        CodeClinic · AI-assisted modernization advice for regulated pharma IT. Recommendations require review by qualified
        architects and QA before use in a validated environment.
      </footer>
    </div>
  )
}
