// Hand-drawn CodeClinic mark: a stethoscope whose tubing curls down into a
// 3-tier server rack silhouette — "clinical diagnosis of software architecture."
// Strokes are deliberately wobbly (slightly jittered control points, round caps,
// mixed widths) and limited to currentColor + one mint accent so the mark
// inherits header/footer tone and stays legible from 16px favicon up to hero.
import { cx } from '../ui'

export function Logo({
  size = 40,
  tone = 'light',
  className,
  title = 'CodeClinic',
}: {
  size?: number
  tone?: 'light' | 'dark'
  className?: string
  title?: string
}) {
  const ink = tone === 'dark' ? '#f8fafc' : '#0f172a'
  const accent = '#10b981'

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cx('shrink-0', className)}
      style={{ color: ink }}
    >
      <title>{title}</title>
      {/* Left earpiece hook — wobbly biro curve */}
      <path
        d="M15.4 8.6 C 12.1 9.3, 10.2 12.8, 10.6 16.4 C 10.9 20.1, 11.3 23.6, 11.8 27.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right earpiece hook */}
      <path
        d="M27.9 8.2 C 31.3 9.1, 32.9 12.4, 32.6 16.1 C 32.3 19.9, 31.6 23.5, 31.1 27.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Earpieces (tiny filled nubs) */}
      <circle cx="15.3" cy="8.4" r="1.6" fill="currentColor" />
      <circle cx="27.9" cy="8.1" r="1.6" fill="currentColor" />
      {/* Tubing that curls from both earpieces down toward the chestpiece / rack */}
      <path
        d="M11.9 27.6 C 11.4 31.9, 13.2 34.8, 17.4 35.2 C 20.9 35.5, 22.6 33.4, 22.5 30.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31.0 27.5 C 31.6 31.6, 29.9 34.7, 25.9 35.1 C 23.4 35.4, 22.5 33.5, 22.5 30.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diaphragm / chestpiece — mint accent, imperfect circle */}
      <path
        d="M22.6 30.6 C 25.9 30.5, 28.4 32.9, 28.3 36.1 C 28.1 39.1, 25.7 41.3, 22.6 41.2 C 19.7 41.1, 17.4 38.7, 17.5 35.8 C 17.6 32.9, 19.9 30.7, 22.6 30.6 Z"
        fill="none"
        stroke={accent}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* chestpiece inner highlight */}
      <path
        d="M20.6 34.1 C 22.1 33.3, 24.5 33.6, 25.6 35.0"
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Connecting squiggle from chestpiece down to the server rack */}
      <path
        d="M28.1 37.2 C 32.4 36.6, 36.6 37.9, 38.8 40.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3-tier server rack — wobbly rectangles, not pixel-perfect */}
      <path
        d="M38.6 40.4 L 57.9 40.1 L 58.2 44.9 L 38.9 45.3 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39.0 46.4 L 58.1 46.1 L 58.3 50.9 L 39.2 51.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39.3 52.3 L 58.3 52.0 L 58.4 56.8 L 39.5 57.1 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Rack LEDs — one mint, two ink */}
      <circle cx="42.4" cy="42.7" r="0.95" fill={accent} />
      <circle cx="45.6" cy="42.7" r="0.75" fill="currentColor" />
      <circle cx="42.5" cy="48.7" r="0.75" fill="currentColor" />
      <circle cx="42.6" cy="54.7" r="0.95" fill={accent} />
      {/* Ink-dot decorations for the hand-drawn feel */}
      <circle cx="8.1" cy="22.8" r="0.6" fill="currentColor" opacity="0.65" />
      <circle cx="34.4" cy="20.1" r="0.5" fill={accent} opacity="0.75" />
    </svg>
  )
}
