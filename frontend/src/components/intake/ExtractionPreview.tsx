// Preview card for an ExtractionResult: title, confidence, cached/live badge,
// collapsible summary, and the extracted AppProfile fields with page citations.
import { ChevronDown, ChevronRight, FileText, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { AppProfile, ConfidenceLevel, ExtractionResult } from '../../types'
import { Badge, Button, cx } from '../ui'

const CONFIDENCE_CLASS: Record<ConfidenceLevel, string> = {
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-red-50 text-red-700 ring-red-200',
}

const FIELD_LABELS: Array<[Exclude<keyof AppProfile, 'gxp_relevant'>, string]> = [
  ['name', 'Application name'],
  ['business_function', 'Business function'],
  ['description', 'Description'],
  ['tech_stack', 'Tech stack'],
  ['database', 'Database'],
  ['hosting', 'Hosting'],
  ['integrations', 'Integrations'],
  ['users', 'Users'],
  ['data_classification', 'Data classification'],
  ['pain_points', 'Pain points'],
  ['constraints', 'Constraints'],
]

export function ExtractionPreview({
  extraction,
  source,
  onEdit,
  onDiscard,
}: {
  extraction: ExtractionResult
  source: 'live' | 'cached'
  onEdit: () => void
  onDiscard: () => void
}) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const { profile } = extraction
  const confidence = profile.confidence

  return (
    <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-600 text-white">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-lg font-bold text-slate-900" title={extraction.document_title}>
              {extraction.document_title}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{extraction.pages_estimated} page{extraction.pages_estimated === 1 ? '' : 's'}</span>
              <Badge
                className={cx(CONFIDENCE_CLASS[confidence], 'px-2 py-0.5 text-xs capitalize')}
                title={profile.confidence_notes || `${confidence} extraction confidence`}
              >
                {confidence} confidence
              </Badge>
              {source === 'cached' && (
                <Badge className="bg-slate-100 px-2 py-0.5 text-xs text-slate-600 ring-slate-200">Replayed sample</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" icon={Pencil} className="px-2.5 py-1.5 text-xs" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" icon={Trash2} className="px-2.5 py-1.5 text-xs" onClick={onDiscard} title="Discard extraction">
            Discard
          </Button>
        </div>
      </div>

      {extraction.document_summary && (
        <div className="mb-4 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            aria-expanded={summaryOpen}
          >
            <span className="inline-flex items-center gap-1.5">
              {summaryOpen ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
              Document summary
            </span>
          </button>
          {summaryOpen && (
            <div className="border-t border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
              {extraction.document_summary}
            </div>
          )}
        </div>
      )}

      <dl className="grid gap-x-4 gap-y-2 md:grid-cols-2">
        {FIELD_LABELS.map(([key, label]) => {
          const value = profile[key]
          if (!value) return null
          const citation = profile.source_pages?.[key]
          return (
            <div key={key} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
              <dt className="flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>{label}</span>
                {citation && <span className="font-normal normal-case tracking-normal text-slate-400">{citation}</span>}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{value}</dd>
            </div>
          )
        })}
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 md:col-span-2">
          <dt className="flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>GxP relevance</span>
            {profile.source_pages?.gxp_relevant && (
              <span className="font-normal normal-case tracking-normal text-slate-400">{profile.source_pages.gxp_relevant}</span>
            )}
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <Badge
              className={profile.gxp_relevant ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}
              icon={ShieldCheck}
            >
              {profile.gxp_relevant ? 'Yes' : 'No'}
            </Badge>
            {profile.confidence_notes && (
              <span className="text-xs text-slate-500">{profile.confidence_notes}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
