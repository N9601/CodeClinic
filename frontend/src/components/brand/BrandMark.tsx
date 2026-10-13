// Compact CodeClinic wordmark pairing the hand-drawn Logo with the condensed caps wordmark.
import { cx } from '../ui'
import { Logo } from './Logo'

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
    size === 'sm' ? { logo: 28, text: 'text-base' } :
    size === 'lg' ? { logo: 52, text: 'text-2xl' } :
    { logo: 40, text: 'text-lg' }

  const wordmark = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const accent = 'text-emerald-500'

  return (
    <span className={cx('inline-flex items-center gap-3', className)}>
      <Logo size={dims.logo} tone={tone} />
      <span className={cx('font-display font-bold uppercase tracking-wide leading-none', dims.text, wordmark)}>
        Code<span className={accent}>Clinic</span>
      </span>
    </span>
  )
}
