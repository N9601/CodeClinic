// Thin client for the CodeClinic backend (proxied at /api by Vite).
import type {
  AssessmentReport,
  AssessRequest,
  HealthResponse,
  SampleDetail,
  SampleSummary,
  ScanResult,
  StageEvent,
} from './types'

/**
 * kind:
 *  - "network": backend unreachable (fetch threw, or the dev proxy answered 5xx with no JSON body)
 *  - "http":    backend answered with an error status (message comes from `detail`)
 *  - "server":  the assessment stream sent an `event: error`
 *  - "stream":  the stream ended or broke before a report arrived
 */
export type ApiErrorKind = 'network' | 'http' | 'server' | 'stream'

export class ApiError extends Error {
  kind: ApiErrorKind
  status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let text = ''
  try {
    text = await res.text()
  } catch {
    /* ignore */
  }
  let detail: unknown
  try {
    detail = text ? (JSON.parse(text) as { detail?: unknown }).detail : undefined
  } catch {
    detail = undefined
  }
  // The Vite proxy answers 500/502/503/504 with an empty / non-JSON body when the backend is down.
  if (detail === undefined && res.status >= 500) {
    return new ApiError('network', `Backend unreachable (HTTP ${res.status})`, res.status)
  }
  let message: string
  if (typeof detail === 'string') message = detail
  else if (Array.isArray(detail))
    message = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
      .join('; ')
  else if (detail !== undefined) message = JSON.stringify(detail)
  else message = text.trim() || `HTTP ${res.status} ${res.statusText}`
  return new ApiError('http', message, res.status)
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('network', 'Backend unreachable')
  }
  if (!res.ok) throw await errorFromResponse(res)
  return res
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, init)
  try {
    return (await res.json()) as T
  } catch {
    // e.g. the dev server's index.html fallback - treat as "backend not there"
    throw new ApiError('network', `Unexpected non-JSON response from ${path}`)
  }
}

function withTimeout(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(ms) : undefined
}

// ------------------------------------------------------------------ endpoints

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health', { signal: withTimeout(4000) })
}

export function getSamples(): Promise<SampleSummary[]> {
  return requestJson<SampleSummary[]>('/api/samples', { signal: withTimeout(6000) })
}

export function getSample(id: string): Promise<SampleDetail> {
  return requestJson<SampleDetail>(`/api/samples/${encodeURIComponent(id)}`, { signal: withTimeout(6000) })
}

export function scanZip(file: File): Promise<ScanResult> {
  const form = new FormData()
  form.append('file', file)
  return requestJson<ScanResult>('/api/scan', { method: 'POST', body: form })
}

export function assess(req: AssessRequest, signal?: AbortSignal): Promise<AssessmentReport> {
  return requestJson<AssessmentReport>('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
}

export function getReport(id: string): Promise<AssessmentReport> {
  return requestJson<AssessmentReport>(`/api/reports/${encodeURIComponent(id)}`)
}

export function markdownUrl(reportId: string): string {
  return `/api/reports/${encodeURIComponent(reportId)}/markdown`
}

export async function fetchMarkdown(reportId: string): Promise<string> {
  const res = await request(markdownUrl(reportId), { signal: withTimeout(8000) })
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/html')) throw new ApiError('network', 'Markdown endpoint unavailable')
  return res.text()
}

// ------------------------------------------------------------------ SSE over POST

interface SseMessage {
  event: string
  data: string
}

/** Incremental parser for `text/event-stream` bodies. */
function createSseParser(onMessage: (msg: SseMessage) => void) {
  let buffer = ''

  function dispatchBlock(block: string) {
    let event = 'message'
    const data: string[] = []
    for (const rawLine of block.split('\n')) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
      if (!line || line.startsWith(':')) continue
      const colon = line.indexOf(':')
      const field = colon === -1 ? line : line.slice(0, colon)
      let value = colon === -1 ? '' : line.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    if (data.length) onMessage({ event, data: data.join('\n') })
  }

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n')
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        dispatchBlock(block)
      }
    },
    flush() {
      if (buffer.trim()) dispatchBlock(buffer)
      buffer = ''
    },
  }
}

export interface StreamHandlers {
  onStage?: (ev: StageEvent) => void
  signal?: AbortSignal
}

/**
 * POST /api/assess/stream and consume the SSE response.
 * Resolves with the final report; rejects with ApiError
 * ("server" for an `event: error`, "network"/"http"/"stream" otherwise).
 */
export async function assessStream(req: AssessRequest, { onStage, signal }: StreamHandlers = {}): Promise<AssessmentReport> {
  const res = await request('/api/assess/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(req),
    signal,
  })
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('text/event-stream')) {
    throw new ApiError('stream', `Unexpected content type from stream endpoint: ${type || 'none'}`)
  }
  if (!res.body) throw new ApiError('stream', 'Streaming not supported by this browser')

  // Mutated from the parser callback; a holder object keeps TS from over-narrowing.
  const out: { report: AssessmentReport | null; error: string | null } = { report: null, error: null }

  const parser = createSseParser(({ event, data }) => {
    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      return // ignore malformed frames (e.g. keep-alives)
    }
    if (event === 'stage') onStage?.(payload as StageEvent)
    else if (event === 'report') out.report = payload as AssessmentReport
    else if (event === 'error') {
      const msg = (payload as { message?: unknown })?.message
      out.error = typeof msg === 'string' && msg ? msg : 'The assessment failed.'
    }
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
      if (out.report || out.error) break
    }
    parser.push(decoder.decode())
    parser.flush()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (!out.report && !out.error) throw new ApiError('stream', 'Connection lost while streaming the assessment')
  } finally {
    reader.cancel().catch(() => {})
  }

  if (out.error) throw new ApiError('server', out.error)
  if (!out.report) throw new ApiError('stream', 'Stream ended before the report arrived')
  return out.report
}
