import { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';

interface SectionProps { title: string; description?: string; children: ReactNode; }
export function Section({ title, description, children }: SectionProps) {
  return (
    <Card padding="lg" className="space-y-5">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h2 className="text-base font-black text-[var(--text-primary)]">{title}</h2>
        {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

interface FieldProps { label: string; hint?: string; children: ReactNode; }
export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-[var(--text-secondary)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20 focus:border-[var(--color-primary-500)] outline-none text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] transition-all ${className}`}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { children: ReactNode; }
export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20 focus:border-[var(--color-primary-500)] outline-none text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] transition-all ${className}`}
    >
      {children}
    </select>
  );
}

interface ToggleProps { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; }
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer group select-none">
      <div>
        <p className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{label}</p>
        {description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${checked ? 'bg-[var(--color-primary-600)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]'}`}
      >
        <span className={`absolute top-[1px] left-[1px] w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </label>
  );
}

interface RadioGroupProps<T extends string> {
  label: string; value: T; options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
}
export function RadioGroup<T extends string>({ label, value, options, onChange }: RadioGroupProps<T>) {
  return (
    <Field label={label}>
      <div className="space-y-2 mt-1">
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              value === opt.value ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-secondary)]'
            }`}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-[var(--color-primary-600)]"
            />
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{opt.label}</p>
              {opt.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </Field>
  );
}
