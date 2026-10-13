// Small hand-rolled UI primitives (no component library).
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({
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
        'avoid-break rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

type IconType = LucideIcon

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  right,
  className,
}: {
  icon?: IconType
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function Badge({
  children,
  className,
  title,
  icon: Icon,
}: {
  children: ReactNode
  className?: string
  title?: string
  icon?: IconType
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        className ?? 'bg-slate-100 text-slate-800 ring-slate-200',
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  )
}

export function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'text-slate-900',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: IconType
  accent?: string
}) {
  return (
    <Card className="flex flex-col gap-2 p-4 sm:p-5" padded={false}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {Icon && <Icon className="size-4 text-emerald-600" aria-hidden />}
        {label}
      </div>
      <div className={cx('text-2xl font-bold leading-tight sm:text-3xl', accent)}>{value}</div>
      {sub && <div className="text-sm text-slate-500">{sub}</div>}
    </Card>
  )
}

export function BulletList({ items, className, marker = 'bg-teal-500' }: { items: string[]; className?: string; marker?: string }) {
  if (!items.length) return <p className="text-sm italic text-slate-400">None</p>
  return (
    <ul className={cx('space-y-1.5', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-800">
          <span className={cx('mt-2 size-1.5 shrink-0 rounded-full', marker)} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className ?? 'size-5 text-teal-600')} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  icon: Icon,
  disabled,
  type = 'button',
  className,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: IconType
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  title?: string
}) {
  const styles = {
    primary:
      'bg-teal-600 text-white shadow-sm shadow-teal-600/30 hover:bg-teal-700 focus-visible:outline-teal-600 disabled:bg-slate-300 disabled:shadow-none',
    secondary:
      'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-teal-600 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-teal-600',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        styles,
        className,
      )}
    >
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  )
}
