'use client';
import { BookingSettings } from '@/lib/settings-service';
import { Section, Field, Select, Toggle, Input, RadioGroup } from './shared';

interface Props { data: BookingSettings; onChange: (d: BookingSettings) => void; }
export default function BookingTab({ data, onChange }: Props) {
  const upd = <K extends keyof BookingSettings>(k: K, v: BookingSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Booking Mode" description="Controls how bookings are confirmed after creation.">
        <RadioGroup label="Confirmation Mode" value={data.booking_mode} onChange={v => upd('booking_mode', v)} options={[
          { value: 'auto_confirm', label: '⚡ Auto Confirm', description: 'Bookings are immediately approved without staff review.' },
          { value: 'requires_approval', label: '✋ Requires Approval', description: 'Staff or admin must manually approve each booking.' },
        ]} />
      </Section>

      <Section title="Booking Creation Rules">
        <Toggle label="Allow Pending Booking Creation" description="Clients can create bookings before slot is confirmed." checked={data.allow_pending_booking_creation} onChange={v => upd('allow_pending_booking_creation', v)} />
        <Toggle label="Require Driver" description="All bookings must include a driver." checked={data.require_driver} onChange={v => upd('require_driver', v)} />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Field label="Min Booking Duration (hours)" hint="Minimum rental period allowed.">
            <Input type="number" min={1} value={data.min_booking_duration_hours} onChange={e => upd('min_booking_duration_hours', +e.target.value)} />
          </Field>
          <Field label="Max Booking Duration (hours)" hint="0 = no limit.">
            <Input type="number" min={0} value={data.max_booking_duration_hours} onChange={e => upd('max_booking_duration_hours', +e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Approval Rules">
        <Toggle label="Auto-Reject on Conflict" description="Pending bookings conflicting with approved ones are auto-rejected." checked={data.auto_reject_on_conflict} onChange={v => upd('auto_reject_on_conflict', v)} />
        <Toggle label="Auto-Cancel Conflicting Pending" description="When a booking is approved, conflicting pending bookings are auto-cancelled." checked={data.auto_cancel_conflicting_pending} onChange={v => upd('auto_cancel_conflicting_pending', v)} />
      </Section>

      <Section title="Lifecycle Rules">
        <Toggle label="Allow Reactivation of Cancelled" description="Cancelled bookings can be reactivated." checked={data.allow_reactivation_of_cancelled} onChange={v => upd('allow_reactivation_of_cancelled', v)} />
        <Toggle label="Allow Re-approval of Rejected" description="Rejected bookings can be moved back to approved." checked={data.allow_reapprove_rejected} onChange={v => upd('allow_reapprove_rejected', v)} />
      </Section>
    </div>
  );
}
