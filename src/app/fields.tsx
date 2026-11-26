import { useId, type InputHTMLAttributes } from 'react'

export type Option<T> = readonly [T, string]
export const options = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((k): Option<K> => [k, labels[k]])

export function Choice<T extends string | number>({ name, legend, hint, error, options, value, onChange }: {
  name: string; legend: string; hint?: string; error?: string
  options: readonly Option<T>[]; value: T | ''; onChange: (value: T) => void
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend>{legend}</legend>
      <div className="chips">
        {options.map(([v, label]) => (
          <label key={v} className="chip">
            <input type="radio" name={name} checked={v === value} onChange={() => onChange(v)} aria-invalid={error ? true : undefined} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="warn" id={`${name}-error`}>{error}</p>}
    </fieldset>
  )
}

export function Checks<T extends string>({ name, legend, hint, error, options, value, onChange }: {
  /** Needed with `error`. */
  name?: string; legend: string; hint?: string; error?: string; options: readonly Option<T>[]; value: T[]; onChange: (value: T[]) => void
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend>{legend}</legend>
      <div className="chips">
        {options.map(([v, label]) => (
          <label key={v} className="chip">
            <input type="checkbox" checked={value.includes(v)} aria-invalid={error ? true : undefined}
              onChange={(e) => onChange(e.target.checked ? [...value, v] : value.filter((x) => x !== v))} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="warn" id={`${name}-error`}>{error}</p>}
    </fieldset>
  )
}

export function Field({ label, unit, error, hint, ...input }: { label: string; unit?: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}{unit && `, ${unit}`}</label>
      <input id={id} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-text` : undefined} {...input} />
      {(error || hint) && <p id={`${id}-text`} className={error ? 'warn' : 'hint'}>{error ?? hint}</p>}
    </div>
  )
}
