import { useId, type ReactNode } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** A radio group drawn as a segmented control. Keyboard: arrow keys move the choice. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <div className="settings-row" role="radiogroup" aria-label={label}>
      {!hideLabel && (
        <span className="field-label" aria-hidden="true">
          {label}
        </span>
      )}
      <div className="segmented">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="range settings-row">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>{format(value)}</output>
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  return (
    <div className="settings-row">
      <label className="switch">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

/** Multi-select chips (toggle buttons). */
export function ChipToggles<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const labelId = useId();
  return (
    <div className="settings-group" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="field-label">
        {label}
      </span>
      <div className="chip-group">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
            >
              {on ? '✓ ' : ''}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
