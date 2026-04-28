import { ReactNode } from 'react';

interface SectionProps { title: string; description?: string; children: ReactNode; }
export function Section({ title, description, children }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5 font-medium">{description}</p>}
      </div>
      {children}
    </div>
  );
}

interface FieldProps { label: string; hint?: string; children: ReactNode; }
export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm font-medium text-slate-800 bg-white transition-all ${className}`}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { children: ReactNode; }
export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm font-medium text-slate-800 bg-white transition-all ${className}`}
    >
      {children}
    </select>
  );
}

interface ToggleProps { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; }
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer group">
      <div>
        <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${checked ? 'bg-green-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
              value === opt.value ? 'border-green-500 bg-green-50/50' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-green-700"
            />
            <div>
              <p className="text-sm font-bold text-slate-800">{opt.label}</p>
              {opt.description && <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </Field>
  );
}
