import type { CloudProvider } from '../../types'
import { CLOUD_LABEL, CLOUD_LONG_LABEL } from '../../lib/format'
import { cx } from '../ui'

const OPTIONS: CloudProvider[] = ['aws', 'azure', 'gcp']

/** Segmented control: AWS / Azure / GCP. */
export function CloudPicker({ value, onChange }: { value: CloudProvider; onChange: (c: CloudProvider) => void }) {
  return (
    <div role="radiogroup" aria-label="Target cloud" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
      {OPTIONS.map((c) => {
        const active = value === c
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            title={CLOUD_LONG_LABEL[c]}
            onClick={() => onChange(c)}
            className={cx(
              'rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600',
              active ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {CLOUD_LABEL[c]}
          </button>
        )
      })}
    </div>
  )
}
