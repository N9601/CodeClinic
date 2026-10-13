// Blueprint-style annotation: renders [ CHILDREN ] in condensed caps.
import type { ReactNode } from 'react'
import { cx } from '../ui'

export function Annotation({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('annotation', className)}>{children}</span>
}
