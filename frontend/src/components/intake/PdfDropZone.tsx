// PDF drop zone for the "Upload assessment" intake path.
// Visually mirrors ZipDropZone; the busy copy is "Reading document..." per spec.
import { CloudUpload, FileText, TriangleAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { cx, Spinner } from '../ui'

const MAX_MB = 32

export function PdfDropZone({
  busy,
  onFile,
}: {
  busy: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a .pdf assessment document.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_MB} MB.`)
      return
    }
    onFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
          dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40',
          busy && 'cursor-wait',
        )}
      >
        {busy ? (
          <>
            <Spinner className="size-6 text-teal-600" />
            <div className="text-sm font-medium text-slate-800">Reading document...</div>
            <div className="text-xs text-slate-500">Extracting the application profile and architecture signals</div>
          </>
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-full bg-white text-teal-600 shadow-sm ring-1 ring-slate-200">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="text-sm font-medium text-slate-800">
              Drop a <span className="font-semibold">.pdf</span> assessment, or{' '}
              <span className="text-teal-700 underline">browse</span>
            </div>
            <div className="max-w-md text-xs text-slate-500">
              Drop a current-state architecture assessment (PDF, up to {MAX_MB} MB). We'll extract the application profile
              and run the modernization analysis.
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <CloudUpload className="size-3.5" aria-hidden />
              PDF only
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
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
