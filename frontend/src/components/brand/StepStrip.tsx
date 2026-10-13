// Modern SaaS process strip: numbered steps, clean dividers.
import { cx } from '../ui'

export interface Step {
  title: string
  body: string
}

export function StepStrip({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <div
      className={cx(
        'flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:flex-row',
        className,
      )}
    >
      {steps.map((s, i) => (
        <div
          key={s.title + i}
          className={cx(
            'relative flex min-w-0 flex-1 flex-col gap-2 p-5 sm:p-6',
            i < steps.length - 1 && 'border-b border-slate-200/70 md:border-b-0 md:border-r',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Step {String(i + 1).padStart(2, '0')}
            </span>
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-slate-900">
            {s.title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-500">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
