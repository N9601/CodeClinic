// Recent Assessments panel on the Intake screen.
// Lists reports saved to the backend's data/reports/ directory, newest first.
// Click a row to open its report; click the trash icon to delete it.
// Hidden entirely when the list is empty, so a cold intake doesn't look broken.

import { useCallback, useEffect, useState } from 'react'
import { Clock, FileText, Trash2 } from 'lucide-react'
import { deleteReport, listRecentReports, type RecentReport } from '../../api'

const strategyLabel: Record<string, string> = {
  retire: 'Retire', retain: 'Retain', rehost: 'Rehost', relocate: 'Relocate',
  replatform: 'Replatform', repurchase: 'Repurchase', refactor: 'Refactor',
}

function bandColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 ring-emerald-200 bg-emerald-50'
  if (score >= 40) return 'text-amber-700 ring-amber-200 bg-amber-50'
  return 'text-rose-700 ring-rose-200 bg-rose-50'
}

function relativeTime(iso: string): string {
  // The backend emits "YYYY-MM-DD HH:MM UTC" strings - parse manually to avoid
  // locale timezone surprises.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) UTC$/)
  if (!m) return iso
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days < 7) return `${days}d ago`
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props {
  onOpen: (reportId: string) => void
}

export function RecentAssessments({ onOpen }: Props) {
  const [reports, setReports] = useState<RecentReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    listRecentReports(10)
      .then(setReports)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const onDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteReport(id)
      setReports((r) => (r ?? []).filter((row) => row.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // Loading state - render nothing (keeps the intake clean on first load)
  if (reports === null && !error) return null
  // Error - small muted inline note; don't break the intake
  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-3 text-xs text-slate-500">
        Couldn't load recent assessments ({error}).
      </div>
    )
  }
  // Empty state - render nothing, so a first-time user doesn't see "no items yet"
  if (!reports || reports.length === 0) return null

  return (
    <section className="mb-8 rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-slate-500" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Recent assessments</h2>
          <span className="text-xs text-slate-500">{reports.length}</span>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          Refresh
        </button>
      </header>
      <ul className="divide-y divide-slate-100">
        {reports.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50"
            >
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ring-1 ${bandColor(r.readiness)}`}
                title={`${r.readiness}/100 — ${r.readiness_band}`}
              >
                {r.readiness}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900 group-hover:text-slate-950">
                    {r.name}
                  </span>
                  {r.gxp_critical && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                      GxP
                    </span>
                  )}
                  {r.mode === 'cached' && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Cached
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{strategyLabel[r.strategy] ?? r.strategy}</span>
                  <span className="text-slate-300">·</span>
                  <span>{r.weeks}w</span>
                  <span className="text-slate-300">·</span>
                  <span className="uppercase">{r.target_cloud}</span>
                  <span className="text-slate-300">·</span>
                  <span>{relativeTime(r.generated_at)}</span>
                  {r.source_document && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <FileText className="size-3 text-slate-400" aria-hidden />
                        <span className="truncate">{r.source_document}</span>
                      </span>
                    </>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => onDelete(r.id, e)}
                disabled={deletingId === r.id}
                aria-label={`Delete ${r.name} assessment`}
                className="shrink-0 rounded-full p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:cursor-wait disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
