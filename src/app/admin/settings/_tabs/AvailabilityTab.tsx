'use client';
import { AvailabilitySettings } from '@/lib/settings-service';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';

interface Props { data: AvailabilitySettings; onChange: (d: AvailabilitySettings) => void; }
export default function AvailabilityTab({ data, onChange }: Props) {
  const upd = <K extends keyof AvailabilitySettings>(k: K, v: AvailabilitySettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Buffer Time" description="Padding applied before and after every booking for cleaning, handover, etc.">
        <Field label="Buffer Time (minutes)" hint="Applied automatically before and after each booking window.">
          <Input type="number" min={0} max={240} value={data.buffer_time_minutes} onChange={e => upd('buffer_time_minutes', +e.target.value)} className="max-w-xs" />
        </Field>
      </Section>

      <Section title="Overlap Policy" description="What happens when a new booking's datetime overlaps with an existing one.">
        <RadioGroup label="Overlap Behavior" value={data.overlap_policy} onChange={v => upd('overlap_policy', v)} options={[
          { value: 'block',          label: '🚫 Block',          description: 'Overlapping bookings are rejected outright.' },
          { value: 'warn',           label: '⚠️ Warn',           description: 'Staff are warned but can proceed.' },
          { value: 'allow_override', label: '✅ Allow Override', description: 'Overlaps are allowed with explicit admin override.' },
        ]} />
      </Section>

      <Section title="Pending Conflict Hold">
        <Toggle
          label="Allow Pending Conflict Hold"
          description="Pending bookings reserve the slot temporarily, blocking others."
          checked={data.allow_pending_conflict_hold}
          onChange={v => upd('allow_pending_conflict_hold', v)}
        />
        {data.allow_pending_conflict_hold && (
          <Field label="Priority Expiry (minutes)" hint="How long a pending booking holds priority before others can take the slot.">
            <Input type="number" min={5} value={data.pending_booking_priority_expiry_minutes} onChange={e => upd('pending_booking_priority_expiry_minutes', +e.target.value)} className="max-w-xs" />
          </Field>
        )}
      </Section>
    </div>
  );
}
