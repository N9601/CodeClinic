// Decorative dashed frame with crosshair corner markers. Pure CSS.
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
        'relative rounded-2xl border border-dashed border-emerald-400/50 bg-white/60',
        padded && 'p-6 sm:p-10',
        className,
      )}
    >
      {/* crosshair markers */}
      <span className="bp-corner" style={{ top: -7, left: -7 }} aria-hidden />
      <span className="bp-corner" style={{ top: -7, right: -7 }} aria-hidden />
      <span className="bp-corner" style={{ bottom: -7, left: -7 }} aria-hidden />
      <span className="bp-corner" style={{ bottom: -7, right: -7 }} aria-hidden />
      {children}
    </div>
  )
}
