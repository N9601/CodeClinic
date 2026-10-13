import { CloudUpload, FileArchive, TriangleAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ApiError, scanZip } from '../../api'
import type { ScanResult } from '../../types'
import { SignalChips, SignalSummary } from '../SignalChips'
import { cx, Spinner } from '../ui'

export interface ScanState {
  fileName: string
  result: ScanResult
}

const MAX_MB = 50

export function ZipDropZone({ scan, onScan }: { scan: ScanState | null; onScan: (s: ScanState | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please choose a .zip archive of the source code.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That archive is over ${MAX_MB} MB - try zipping just the source folders.`)
      return
    }
    setBusyName(file.name)
    try {
      const result = await scanZip(file)
      onScan({ fileName: file.name, result })
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'network') {
        setError('Code scanning needs the backend, which is unreachable right now. You can still run the diagnosis without it.')
      } else {
        setError(err instanceof Error ? err.message : 'Scan failed.')
      }
    } finally {
      setBusyName(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  if (scan) {
    const { result, fileName } = scan
    const langs = Object.entries(result.languages).sort((a, b) => b[1] - a[1])
    return (
      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-600 text-white">
              <FileArchive className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900" title={fileName}>
                {fileName}
              </div>
              <div className="text-xs text-slate-500">
                {result.files_scanned.toLocaleString()} files scanned · {result.signals.length} signals
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onScan(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-800"
            title="Remove scan"
            aria-label="Remove scan"
          >
            <X className="size-4" />
          </button>
        </div>
        {langs.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {langs.slice(0, 6).map(([lang, n]) => (
              <span key={lang} className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                {lang} <span className="text-slate-400">{n}</span>
              </span>
            ))}
          </div>
        )}
        {result.signals.length > 0 ? (
          <>
            <div className="mb-2">
              <SignalSummary signals={result.signals} />
            </div>
            <SignalChips signals={result.signals} max={18} />
          </>
        ) : (
          <p className="text-sm text-slate-500">No notable signals detected.</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busyName && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busyName && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
          dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40',
          busyName && 'cursor-wait',
        )}
      >
        {busyName ? (
          <>
            <Spinner className="size-6 text-teal-600" />
            <div className="text-sm font-medium text-slate-800">Scanning {busyName}...</div>
            <div className="text-xs text-slate-500">Detecting languages, frameworks, versions and risky patterns</div>
          </>
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-full bg-white text-teal-600 shadow-sm ring-1 ring-slate-200">
              <CloudUpload className="size-5" aria-hidden />
            </span>
            <div className="text-sm font-medium text-slate-800">
              Drop a <span className="font-semibold">.zip</span> of the code, or <span className="text-teal-700 underline">browse</span>
            </div>
            <div className="text-xs text-slate-500">Optional - adds file-level evidence to the scores</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-amber-700 hover:text-amber-900" aria-label="Dismiss">
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
