// Clean content frame used for Mermaid diagrams. Was previously a dashed blueprint;
// kept the component so callers don't change, but visuals are now modern SaaS.
import type { ReactNode } from 'react'
import { cx } from '../ui'

export function BlueprintFrame({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
