// Labels and color mappings shared across screens.
// Tailwind v4 scans source for class names, so every class here is a full literal string.
import type {
  CloudProvider,
  Effort,
  ReadinessBand,
  RiskCategory,
  RiskLevel,
  RStrategy,
  Severity,
  SupportStatus,
} from '../types'

export const CLOUD_LABEL: Record<CloudProvider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
}

export const CLOUD_LONG_LABEL: Record<CloudProvider, string> = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud',
}

// ------------------------------------------------------------------ readiness band

export interface BandStyle {
  band: ReadinessBand
  hex: string
  text: string
  bg: string
  ring: string
}

export function bandFor(score: number): BandStyle {
  if (score >= 70)
    return { band: 'Cloud-ready', hex: '#059669', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' }
  if (score >= 40)
    return { band: 'Needs remediation', hex: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' }
  return { band: 'Not ready', hex: '#dc2626', text: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' }
}

/** Color for a 0-10 dimension score bar. */
export function dimensionBarClass(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 4) return 'bg-amber-500'
  return 'bg-red-500'
}

// ------------------------------------------------------------------ 7R strategies

export const STRATEGY_ORDER: RStrategy[] = ['retire', 'retain', 'rehost', 'relocate', 'replatform', 'repurchase', 'refactor']

export const STRATEGY_STYLE: Record<RStrategy, { label: string; hex: string; badge: string; hint: string }> = {
  retire: {
    label: 'Retire',
    hex: '#e11d48',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    hint: 'Decommission - no longer needed',
  },
  retain: {
    label: 'Retain',
    hex: '#64748b',
    badge: 'bg-slate-100 text-slate-700 ring-slate-300',
    hint: 'Keep as-is for now',
  },
  rehost: {
    label: 'Rehost',
    hex: '#0284c7',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    hint: 'Lift and shift to IaaS',
  },
  relocate: {
    label: 'Relocate',
    hex: '#0891b2',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    hint: 'Move the hypervisor / platform as-is',
  },
  replatform: {
    label: 'Replatform',
    hex: '#0d9488',
    badge: 'bg-teal-50 text-teal-700 ring-teal-200',
    hint: 'Lift, tinker and shift to managed services',
  },
  repurchase: {
    label: 'Repurchase',
    hex: '#7c3aed',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    hint: 'Replace with SaaS / commercial product',
  },
  refactor: {
    label: 'Refactor',
    hex: '#4f46e5',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    hint: 'Re-architect for cloud-native',
  },
}

export function strategyStyle(s: string) {
  return STRATEGY_STYLE[s as RStrategy] ?? {
    label: titleCase(s),
    hex: '#64748b',
    badge: 'bg-slate-100 text-slate-700 ring-slate-300',
    hint: '',
  }
}

// ------------------------------------------------------------------ risks

export const RISK_LEVEL_STYLE: Record<RiskLevel, { label: string; badge: string; cell: string; chip: string }> = {
  critical: {
    label: 'Critical',
    badge: 'bg-red-600 text-white ring-red-600',
    cell: 'bg-red-200/80',
    chip: 'bg-red-600 text-white',
  },
  high: {
    label: 'High',
    badge: 'bg-orange-100 text-orange-800 ring-orange-300',
    cell: 'bg-orange-100',
    chip: 'bg-orange-500 text-white',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    cell: 'bg-amber-50',
    chip: 'bg-amber-400 text-amber-950',
  },
  low: {
    label: 'Low',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cell: 'bg-emerald-50/70',
    chip: 'bg-emerald-500 text-white',
  },
}

/** Same thresholds as backend scoring: >=15 critical, >=10 high, >=5 medium, else low. */
export function levelForScore(score: number): RiskLevel {
  if (score >= 15) return 'critical'
  if (score >= 10) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}

export function riskLevelStyle(level: string) {
  return RISK_LEVEL_STYLE[level as RiskLevel] ?? RISK_LEVEL_STYLE.low
}

export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  technical: 'Technical',
  data: 'Data',
  compliance: 'Compliance',
  security: 'Security',
  operational: 'Operational',
  organizational: 'Organizational',
  vendor: 'Vendor',
}

// ------------------------------------------------------------------ misc badges

export const SUPPORT_STYLE: Record<SupportStatus, { label: string; badge: string }> = {
  end_of_life: { label: 'End of life', badge: 'bg-red-50 text-red-700 ring-red-200' },
  nearing_eol: { label: 'Nearing EOL', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  supported: { label: 'Supported', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  unknown: { label: 'Unknown', badge: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const SEVERITY_STYLE: Record<Severity, { label: string; chip: string; dot: string }> = {
  critical: { label: 'Critical', chip: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  warning: { label: 'Warning', chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  info: { label: 'Info', chip: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
}

export function severityStyle(s: string) {
  return SEVERITY_STYLE[s as Severity] ?? SEVERITY_STYLE.info
}

export const EFFORT_STYLE: Record<Effort, { label: string; badge: string }> = {
  low: { label: 'Low effort', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  medium: { label: 'Medium effort', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  high: { label: 'High effort', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function pct(weight: number): string {
  return `${Math.round(weight * 100)}%`
}
