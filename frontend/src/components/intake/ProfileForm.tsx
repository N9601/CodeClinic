import { ShieldCheck } from 'lucide-react'
import type { AppProfile } from '../../types'
import { cx } from '../ui'

type TextKey = Exclude<keyof AppProfile, 'gxp_relevant'>

interface FieldDef {
  key: TextKey
  label: string
  placeholder: string
  multiline?: boolean
  rows?: number
  wide?: boolean
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Application name', placeholder: 'e.g. LabTrack LIMS' },
  { key: 'business_function', label: 'Business function', placeholder: 'e.g. QC release testing of finished drug product' },
  {
    key: 'description',
    label: 'Description',
    placeholder: 'What the application does, who relies on it and why it matters',
    multiline: true,
    rows: 3,
    wide: true,
  },
  {
    key: 'tech_stack',
    label: 'Tech stack',
    placeholder: 'Languages, frameworks, versions, app servers, libraries',
    multiline: true,
    rows: 3,
  },
  { key: 'database', label: 'Database', placeholder: 'Engine, version, size, stored procedures, backups', multiline: true, rows: 3 },
  { key: 'hosting', label: 'Hosting', placeholder: 'Servers, OS, data center, load balancing', multiline: true, rows: 3 },
  {
    key: 'integrations',
    label: 'Integrations',
    placeholder: 'ERP, instruments, identity, email, file drops...',
    multiline: true,
    rows: 3,
  },
  { key: 'users', label: 'Users', placeholder: 'e.g. ~350 QC analysts across 3 sites' },
  {
    key: 'data_classification',
    label: 'Data classification',
    placeholder: 'e.g. GxP records under 21 CFR Part 11, PII, retention',
  },
  {
    key: 'pain_points',
    label: 'Pain points',
    placeholder: 'Outages, audit findings, end-of-support, slow releases...',
    multiline: true,
    rows: 3,
  },
  {
    key: 'constraints',
    label: 'Constraints',
    placeholder: 'Validated state, downtime windows, data residency, budget...',
    multiline: true,
    rows: 3,
  },
]

const inputClass =
  'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 transition focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:outline-none'

export function ProfileForm({
  profile,
  onChange,
  nameError,
}: {
  profile: AppProfile
  onChange: (next: AppProfile) => void
  nameError?: boolean
}) {
  const set = (key: keyof AppProfile, value: string | boolean) => onChange({ ...profile, [key]: value })

  return (
    <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      {FIELDS.map((f) => {
        const id = `field-${f.key}`
        const invalid = f.key === 'name' && nameError
        return (
          <div key={f.key} className={cx(f.wide && 'md:col-span-2')}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
              {f.label}
              {f.key === 'name' && <span className="ml-0.5 text-red-600">*</span>}
            </label>
            {f.multiline ? (
              <textarea
                id={id}
                rows={f.rows ?? 3}
                value={profile[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                className={cx(inputClass, 'resize-y leading-relaxed')}
              />
            ) : (
              <input
                id={id}
                type="text"
                value={profile[f.key]}
                placeholder={f.placeholder}
                required={f.key === 'name'}
                aria-invalid={invalid || undefined}
                onChange={(e) => set(f.key, e.target.value)}
                className={cx(inputClass, invalid && 'ring-2 ring-red-500')}
              />
            )}
            {invalid && <p className="mt-1 text-xs font-medium text-red-600">Application name is required.</p>}
          </div>
        )
      })}

      <div className="md:col-span-2">
        <label
          className={cx(
            'flex cursor-pointer items-center justify-between gap-4 rounded-xl p-4 ring-1 ring-inset transition',
            profile.gxp_relevant ? 'bg-violet-50/70 ring-violet-200' : 'bg-slate-50 ring-slate-200',
          )}
        >
          <span className="flex items-start gap-3">
            <ShieldCheck
              className={cx('mt-0.5 size-5 shrink-0', profile.gxp_relevant ? 'text-violet-600' : 'text-slate-400')}
              aria-hidden
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">GxP-relevant system</span>
              <span className="block text-sm text-slate-500">
                Creates or holds regulated records (21 CFR Part 11 / EU Annex 11) - adds IQ/OQ/PQ validation gates to the plan.
              </span>
            </span>
          </span>
          <span className="relative inline-flex shrink-0 items-center">
            <input
              type="checkbox"
              role="switch"
              checked={profile.gxp_relevant}
              onChange={(e) => set('gxp_relevant', e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-violet-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-600" />
            <span className="absolute left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </div>
  )
}
