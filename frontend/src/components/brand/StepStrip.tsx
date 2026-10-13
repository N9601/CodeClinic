// 5-panel horizontal process strip, Medscribe-style. CSS-only (no SVG).
import { cx } from '../ui'

export interface Step {
  title: string
  body: string
}

export function StepStrip({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <div
      className={cx(
        'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:flex-row',
        className,
      )}
    >
      {steps.map((s, i) => (
        <div
          key={s.title + i}
          className={cx(
            'relative flex min-w-0 flex-1 flex-col gap-2 p-5 sm:p-6',
            // dashed divider between panels: bottom on mobile, right on md+
            i < steps.length - 1 && 'border-b border-dashed border-slate-200 md:border-b-0 md:border-r',
          )}
        >
          <span className="annotation">Step {String(i + 1).padStart(2, '0')}</span>
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">
            {s.title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-500">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
