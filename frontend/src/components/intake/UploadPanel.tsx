// "Upload assessment" intake panel: PDF drop zone -> ingest -> preview card
// -> optional edit via the normal ProfileForm. Carries the extraction result
// up to the Intake screen so Run Diagnosis can pass it to /api/assess.
import { FileUp, Info, Sparkles, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { ApiError, ingestDocument } from '../../api'
import { MOCK_REPORT } from '../../mock'
import type { AppProfile, ExtractionResult, IngestResponse } from '../../types'
import { Button } from '../ui'
import { ExtractionPreview } from './ExtractionPreview'
import { PdfDropZone } from './PdfDropZone'
import { ProfileForm } from './ProfileForm'

const SAMPLE_PDF_URL = '/samples/labtrack-lims-assessment.pdf'
const SAMPLE_PDF_NAME = 'labtrack-lims-assessment.pdf'

export interface UploadState {
  extraction: ExtractionResult | null
  source: 'live' | 'cached' | null
  fileName: string | null
  sampleId: string | null // echoed from the ingest response so demo-mode assess can resolve cached reports
  profileOverride: AppProfile | null // user edits applied on top of extraction.profile
}

export const EMPTY_UPLOAD: UploadState = {
  extraction: null,
  source: null,
  fileName: null,
  sampleId: null,
  profileOverride: null,
}

/** Synthesize an ExtractionResult from the bundled mock when /api/ingest is unreachable
 *  AND the file name matches the sample. Keeps the demo alive. */
function synthesizeOfflineExtraction(fileName: string): ExtractionResult | null {
  if (!fileName.toLowerCase().endsWith(SAMPLE_PDF_NAME.toLowerCase())) return null
  const p = MOCK_REPORT.profile
  const citations: Record<string, string> = {
    name: 'p.1',
    business_function: 'p.1 §1',
    description: 'p.2 §1.1',
    tech_stack: 'p.3 §2.1',
    database: 'p.3 §2.2',
    hosting: 'p.4 §2.3',
    integrations: 'p.5 §3',
    users: 'p.1',
    data_classification: 'p.6 §4.1',
    gxp_relevant: 'p.6 §4',
    pain_points: 'p.8 §5',
    constraints: 'p.9 §6',
  }
  return {
    document_title: 'LabTrack LIMS — Current-State Architecture Assessment',
    document_summary:
      'A current-state architecture assessment of the LabTrack LIMS application, covering business function, tech stack, hosting, integrations, data classification and known pain points. Synthesized from the bundled mock while the backend is unreachable.',
    pages_estimated: 12,
    profile: {
      ...p,
      source_pages: citations,
      confidence: 'medium',
      confidence_notes: 'Offline fallback — citations and confidence are synthesised from the bundled sample.',
    },
    analysis: MOCK_REPORT.architecture,
  }
}

export function UploadPanel({
  value,
  onChange,
}: {
  value: UploadState
  onChange: (next: UploadState) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const didOfflineWarn = useRef(false)

  async function runIngest(file: File) {
    setBusy(true)
    setError(null)
    try {
      const resp: IngestResponse = await ingestDocument(file)
      onChange({
        extraction: resp.extraction,
        source: resp.source,
        fileName: file.name,
        sampleId: resp.sample_id,
        profileOverride: null,
      })
      setEditing(false)
    } catch (err) {
      // Offline fallback: synthesize for the bundled sample.
      if (err instanceof ApiError && err.kind === 'network') {
        const synthesized = synthesizeOfflineExtraction(file.name)
        if (synthesized) {
          if (!didOfflineWarn.current) {
            console.warn('[CodeClinic] /api/ingest unreachable - using bundled offline extraction for', file.name)
            didOfflineWarn.current = true
          }
          onChange({
            extraction: synthesized,
            source: 'cached',
            fileName: file.name,
            sampleId: 'labtrack-lims',
            profileOverride: null,
          })
          setEditing(false)
          return
        }
      }
      let msg = err instanceof Error ? err.message : 'Could not read the document.'
      if (err instanceof ApiError && err.status === 422) {
        msg =
          "Demo mode only has cached extractions for the bundled sample PDFs. Click 'Use bundled sample' above, or configure an API key for live extraction."
      }
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function tryBundledSample() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(SAMPLE_PDF_URL)
      if (!res.ok) throw new Error(`Could not load the bundled sample (HTTP ${res.status}).`)
      const blob = await res.blob()
      const file = new File([blob], SAMPLE_PDF_NAME, { type: 'application/pdf' })
      await runIngest(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the bundled sample.')
      setBusy(false)
    }
  }

  function reset() {
    setEditing(false)
    setError(null)
    onChange(EMPTY_UPLOAD)
  }

  const extraction = value.extraction
  const currentProfile: AppProfile | null = value.profileOverride ?? extraction?.profile ?? null

  return (
    <div className="space-y-4">
      {!extraction && (
        <>
          <PdfDropZone busy={busy} onFile={runIngest} />
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={tryBundledSample}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 underline-offset-2 hover:underline disabled:text-slate-400"
            >
              <Sparkles className="size-4" aria-hidden />
              Use bundled sample: LabTrack LIMS assessment PDF
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1 leading-relaxed">{error}</span>
              <Button variant="ghost" className="px-2 py-1 text-xs text-red-700" onClick={() => setError(null)}>
                Try another file
              </Button>
            </div>
          )}
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            On success we'll preview the extracted application profile - you can edit it before running the diagnosis.
          </p>
        </>
      )}

      {extraction && !editing && (
        <ExtractionPreview
          extraction={extraction}
          source={value.source ?? 'live'}
          onEdit={() => {
            onChange({ ...value, profileOverride: value.profileOverride ?? extraction.profile })
            setEditing(true)
          }}
          onDiscard={reset}
        />
      )}

      {extraction && editing && currentProfile && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900 ring-1 ring-teal-100">
            <span className="inline-flex items-start gap-2">
              <FileUp className="mt-0.5 size-4 shrink-0" aria-hidden />
              Editing the extracted profile. The uploaded document is still attached to the run.
            </span>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditing(false)}>
              Back to preview
            </Button>
          </div>
          <ProfileForm
            profile={currentProfile}
            onChange={(profile) => onChange({ ...value, profileOverride: profile })}
          />
        </div>
      )}
    </div>
  )
}
