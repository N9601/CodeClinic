// Orchestrates one diagnosis run with graceful degradation:
//   1. POST /api/assess/stream (SSE stage events + final report)
//   2. on a network-level failure -> POST /api/assess (no stage events)
//   3. if that fails too and the sample is LabTrack -> bundled mock report (offline demo)
import { ApiError, assess, assessStream } from '../api'
import { MOCK_REPORT, MOCK_REPORT_SAMPLE_ID } from '../mock'
import type { AssessmentReport, AssessRequest, StageEvent, StageName } from '../types'

export type ReportSource = 'stream' | 'post' | 'mock'

export interface RunResult {
  report: AssessmentReport
  source: ReportSource
}

export interface RunCallbacks {
  onStage: (ev: StageEvent) => void
  onNotice: (msg: string | null) => void
  signal: AbortSignal
}

export const STAGE_ORDER: StageName[] = ['scan', 'analyze', 'extract', 'assess', 'recommend', 'assemble']

/** assess and recommend run in parallel, so they share a rank.
 *  analyze and extract are mutually exclusive, so they share a rank too. */
export const STAGE_RANK: Record<StageName, number> = {
  scan: 0,
  analyze: 1,
  extract: 1,
  assess: 2,
  recommend: 2,
  assemble: 3,
}

function isAbort(err: unknown) {
  return err instanceof DOMException && err.name === 'AbortError'
}

/** Stream failures that justify retrying with the plain JSON endpoint. */
function shouldFallBack(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true
  if (err.kind === 'server') return false // the pipeline itself reported an error - surface it
  if (err.kind === 'http') return err.status === 404 || err.status === 405 || err.status === 501 || (err.status ?? 0) >= 500
  return true // network / stream
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })

/** Replays the stage checklist quickly so the offline demo still tells the story. */
async function replayStages(cb: RunCallbacks, hasExtraction = false) {
  const step = 380
  const ev = (stage: StageName, status: 'started' | 'done') => cb.onStage({ stage, status, label: '' })
  const first: StageName[] = hasExtraction ? ['scan', 'extract'] : ['scan', 'analyze']
  for (const s of first) {
    ev(s, 'started')
    await sleep(step, cb.signal)
    ev(s, 'done')
  }
  ev('assess', 'started')
  ev('recommend', 'started')
  await sleep(step * 1.4, cb.signal)
  ev('assess', 'done')
  await sleep(step * 0.6, cb.signal)
  ev('recommend', 'done')
  ev('assemble', 'started')
  await sleep(step, cb.signal)
  ev('assemble', 'done')
  await sleep(200, cb.signal)
}

function friendly(err: unknown): Error {
  if (err instanceof ApiError && err.kind === 'network') {
    return new Error(
      'The CodeClinic backend is unreachable. Start the API on port 8000, or pick the LabTrack LIMS sample to see the offline demo report.',
    )
  }
  return err instanceof Error ? err : new Error(String(err))
}

export async function runAssessment(req: AssessRequest, cb: RunCallbacks): Promise<RunResult> {
  // 1. streaming endpoint
  try {
    const report = await assessStream(req, { onStage: cb.onStage, signal: cb.signal })
    return { report, source: 'stream' }
  } catch (err) {
    if (isAbort(err)) throw err
    if (!shouldFallBack(err)) throw friendly(err)
  }

  // 2. plain JSON endpoint
  cb.onNotice('Live progress unavailable - waiting for the complete report...')
  try {
    const report = await assess(req, cb.signal)
    for (const s of STAGE_ORDER) {
      // Only one of analyze/extract applies per run.
      if (s === 'analyze' && req.extraction) continue
      if (s === 'extract' && !req.extraction) continue
      cb.onStage({ stage: s, status: 'done', label: '' })
    }
    cb.onNotice(null)
    return { report, source: 'post' }
  } catch (err) {
    if (isAbort(err)) throw err
    // 3. bundled report for the LabTrack sample (either as a sample card, or an upload with extraction)
    if (req.sample_id === MOCK_REPORT_SAMPLE_ID || req.extraction) {
      cb.onNotice('Backend unreachable - replaying the bundled LabTrack LIMS report (offline demo).')
      await replayStages(cb, Boolean(req.extraction))
      const report = req.extraction
        ? {
            ...MOCK_REPORT,
            source_document: 'labtrack-lims-assessment.pdf',
            extraction_confidence: req.extraction.profile.confidence,
          }
        : MOCK_REPORT
      return { report, source: 'mock' }
    }
    throw friendly(err)
  }
}
