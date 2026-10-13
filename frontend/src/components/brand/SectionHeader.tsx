// Medscribe-style section header: eyebrow pill, condensed ALL CAPS title, grey subtitle.
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
    size === 'sm' ? 'text-2xl sm:text-3xl' :
    size === 'lg' ? 'text-4xl sm:text-5xl md:text-6xl' :
    'text-3xl sm:text-4xl md:text-5xl'
  const titleColor = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const subColor = tone === 'dark' ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={cx(align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <div className={cx('mb-3', align === 'center' && 'flex justify-center')}>
          {typeof eyebrow === 'string' ? <span className="annotation">{eyebrow}</span> : eyebrow}
        </div>
      )}
      <h2 className={cx('font-display font-bold uppercase leading-[0.95] tracking-tight', titleSize, titleColor)}>
        {title}
      </h2>
      {subtitle && (
        <p className={cx('mt-3 max-w-2xl text-sm sm:text-base leading-relaxed', subColor, align === 'center' && 'mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
