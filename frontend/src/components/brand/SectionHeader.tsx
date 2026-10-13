// Modern SaaS section header: subtle eyebrow, confident sentence-case title.
import type { ReactNode } from 'react'
import { cx } from '../ui'

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  tone = 'light',
  className,
  size = 'md',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const titleSize =
    size === 'sm' ? 'text-xl sm:text-2xl' :
    size === 'lg' ? 'text-4xl sm:text-5xl md:text-6xl' :
    'text-2xl sm:text-3xl md:text-4xl'
  const titleColor = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const subColor = tone === 'dark' ? 'text-slate-400' : 'text-slate-500'

  // Allow callers to pass legacy "[ EYEBROW ]" strings and render them cleanly.
  const cleanEyebrow = typeof eyebrow === 'string' ? eyebrow.replace(/^\[\s*|\s*\]$/g, '') : eyebrow

  return (
    <div className={cx(align === 'center' ? 'text-center' : 'text-left', className)}>
      {cleanEyebrow && (
        <div className={cx('mb-2', align === 'center' && 'flex justify-center')}>
          {typeof cleanEyebrow === 'string' ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {cleanEyebrow}
            </span>
          ) : (
            cleanEyebrow
          )}
        </div>
      )}
      <h2 className={cx('font-display font-semibold leading-[1.1] tracking-tight', titleSize, titleColor)}>
        {title}
      </h2>
      {subtitle && (
        <p className={cx('mt-2 max-w-2xl text-sm sm:text-base leading-relaxed', subColor, align === 'center' && 'mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
