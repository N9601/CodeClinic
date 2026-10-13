// Compact CodeClinic wordmark with stethoscope glyph (used in header/footer).
import { Stethoscope } from 'lucide-react'
import { cx } from '../ui'

export function BrandMark({
  size = 'md',
  tone = 'light',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
  className?: string
}) {
  const dims =
    size === 'sm' ? { box: 'size-7', icon: 'size-3.5', text: 'text-base' } :
    size === 'lg' ? { box: 'size-12', icon: 'size-6', text: 'text-2xl' } :
    { box: 'size-10', icon: 'size-5', text: 'text-lg' }

  const wordmark = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const accent = 'text-emerald-500'

  return (
    <span className={cx('inline-flex items-center gap-3', className)}>
      <span className={cx('grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/25', dims.box)}>
        <Stethoscope className={dims.icon} aria-hidden />
      </span>
      <span className={cx('font-display font-bold uppercase tracking-wide leading-none', dims.text, wordmark)}>
        Code<span className={accent}>Clinic</span>
      </span>
    </span>
  )
}
