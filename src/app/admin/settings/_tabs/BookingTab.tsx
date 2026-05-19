'use client';
import { useState } from 'react';
import { AvailabilitySettings, BookingSettings } from '@/lib/settings-service';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  booking: BookingSettings;
  availability: AvailabilitySettings;
  onBooking: (d: BookingSettings) => void;
  onAvailability: (d: AvailabilitySettings) => void;
}

export default function BookingTab({ booking, availability, onBooking, onAvailability }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const bUpd = <K extends keyof BookingSettings>(k: K, v: BookingSettings[K]) =>
    onBooking({ ...booking, [k]: v });
  const aUpd = <K extends keyof AvailabilitySettings>(k: K, v: AvailabilitySettings[K]) =>
    onAvailability({ ...availability, [k]: v });

  return (
    <div className="space-y-4">
      {/* ── Core ── */}
      <Section title="Booking Mode" description="Controls how bookings are confirmed after creation.">
        <RadioGroup
          label="Confirmation Mode"
          value={booking.booking_mode}
          onChange={v => bUpd('booking_mode', v)}
          options={[
            { value: 'auto_confirm',      label: '⚡ Auto Confirm',       description: 'Bookings are immediately approved without staff review.' },
            { value: 'requires_approval', label: '✋ Requires Approval',  description: 'Staff or admin must manually approve each booking.' },
          ]}
        />
      </Section>

      <Section title="Booking Creation Rules">
        <Toggle label="Allow Pending Booking Creation" description="Clients can create bookings before slot is confirmed." checked={booking.allow_pending_booking_creation} onChange={v => bUpd('allow_pending_booking_creation', v)} />
        <Toggle label="Require Driver"                  description="All bookings must include a driver."                 checked={booking.require_driver}                   onChange={v => bUpd('require_driver', v)} />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Field label="Min Booking Duration (hours)" hint="Minimum rental period allowed.">
            <Input type="number" min={1} value={booking.min_booking_duration_hours} onChange={e => bUpd('min_booking_duration_hours', +e.target.value)} />
          </Field>
          <Field label="Max Booking Duration (hours)" hint="0 = no limit.">
            <Input type="number" min={0} value={booking.max_booking_duration_hours} onChange={e => bUpd('max_booking_duration_hours', +e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Availability &amp; Buffer Time" description="Padding applied around bookings for cleaning, handover, etc.">
        <Field label="Buffer Time (minutes)" hint="Applied automatically before and after each booking window.">
          <Input type="number" min={0} max={240} value={availability.buffer_time_minutes} onChange={e => aUpd('buffer_time_minutes', +e.target.value)} className="max-w-xs" />
        </Field>
        <RadioGroup
          label="Overlap Behavior"
          value={availability.overlap_policy}
          onChange={v => aUpd('overlap_policy', v)}
          options={[
            { value: 'block',          label: '🚫 Block',          description: 'Overlapping bookings are rejected outright.' },
            { value: 'warn',           label: '⚠️ Warn',           description: 'Staff are warned but can proceed.' },
            { value: 'allow_override', label: '✅ Allow Override',  description: 'Overlaps are allowed with explicit admin override.' },
          ]}
        />
      </Section>

      {/* ── Advanced ── */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors pt-1"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
      </button>

      {showAdvanced && (
        <>
          <Section title="Conflict &amp; Approval Rules">
            <Toggle label="Auto-Reject on Conflict"          description="Pending bookings conflicting with approved ones are auto-rejected."               checked={booking.auto_reject_on_conflict}          onChange={v => bUpd('auto_reject_on_conflict', v)} />
            <Toggle label="Auto-Cancel Conflicting Pending"  description="When a booking is approved, conflicting pending bookings are auto-cancelled."      checked={booking.auto_cancel_conflicting_pending}   onChange={v => bUpd('auto_cancel_conflicting_pending', v)} />
          </Section>

          <Section title="Lifecycle Rules">
            <Toggle label="Allow Reactivation of Cancelled" description="Cancelled bookings can be reactivated."              checked={booking.allow_reactivation_of_cancelled} onChange={v => bUpd('allow_reactivation_of_cancelled', v)} />
            <Toggle label="Allow Re-approval of Rejected"   description="Rejected bookings can be moved back to approved."    checked={booking.allow_reapprove_rejected}         onChange={v => bUpd('allow_reapprove_rejected', v)} />
          </Section>

          <Section title="Pending Conflict Hold">
            <Toggle
              label="Allow Pending Conflict Hold"
              description="Pending bookings reserve the slot temporarily, blocking others."
              checked={availability.allow_pending_conflict_hold}
              onChange={v => aUpd('allow_pending_conflict_hold', v)}
            />
            {availability.allow_pending_conflict_hold && (
              <Field label="Priority Expiry (minutes)" hint="How long a pending booking holds priority before others can take the slot.">
                <Input type="number" min={5} value={availability.pending_booking_priority_expiry_minutes} onChange={e => aUpd('pending_booking_priority_expiry_minutes', +e.target.value)} className="max-w-xs" />
              </Field>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
