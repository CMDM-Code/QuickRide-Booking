'use client';
import { SystemBehaviorSettings } from '@/lib/settings-service';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';

interface Props { data: SystemBehaviorSettings; onChange: (d: SystemBehaviorSettings) => void; }
export default function SystemTab({ data, onChange }: Props) {
  const upd = <K extends keyof SystemBehaviorSettings>(k: K, v: SystemBehaviorSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Audit Logging" description="All critical mutations are logged with before/after snapshots.">
        <Toggle label="Enable Audit Logging" description="Recommended: Full mode for production." checked={data.audit_logging_enabled} onChange={v => upd('audit_logging_enabled', v)} />
        {data.audit_logging_enabled && (
          <>
            <RadioGroup label="Log Level" value={data.log_level} onChange={v => upd('log_level', v)} options={[
              { value: 'minimal', label: 'Minimal', description: 'Only critical events (status changes, payments).' },
              { value: 'full',    label: 'Full',    description: 'Every mutation with before/after snapshots. Recommended.' },
            ]} />
            <Field label="Audit Log Retention (days)" hint="Logs older than this are eligible for archiving.">
              <Input type="number" min={7} value={data.audit_retention_days} onChange={e => upd('audit_retention_days', +e.target.value)} className="max-w-xs" />
            </Field>
          </>
        )}
      </Section>

      <Section title="Data Retention">
        <Field label="Chat Retention Policy" hint="Natural language description (e.g. '365 days', '2 years').">
          <Input value={data.chat_retention_policy} onChange={e => upd('chat_retention_policy', e.target.value)} />
        </Field>
      </Section>

      <Section title="Maintenance Mode" description="Controls whether the platform is in maintenance. Blocks client-facing operations.">
        <Toggle label="Enable Maintenance Mode"       description="Activate to block bookings and payments for non-admins." checked={data.maintenance_enabled}                     onChange={v => upd('maintenance_enabled', v)} />
        <Toggle label="Allow Admin Bypass"            description="Admins can still access the platform during maintenance."  checked={data.maintenance_allow_admin_bypass}          onChange={v => upd('maintenance_allow_admin_bypass', v)} />
        <Toggle label="Block Booking Creation"        description="Prevents new bookings from being created."                 checked={data.maintenance_blocks_booking_creation}    onChange={v => upd('maintenance_blocks_booking_creation', v)} />
        <Toggle label="Block Payment Processing"      description="Prevents all payment submissions."                         checked={data.maintenance_blocks_payment_processing}  onChange={v => upd('maintenance_blocks_payment_processing', v)} />
      </Section>

      <Section title="Session & Late Fee Policy">
        <Field label="Session Timeout (minutes)" hint="Auto-logout after inactivity. Min 15, Max 480.">
          <Input type="number" min={15} max={480} value={data.sessionTimeoutMinutes} onChange={e => upd('sessionTimeoutMinutes', Math.max(15, Math.min(480, +e.target.value)))} className="max-w-xs" />
        </Field>
        <Field label="Tax Rate (%)" hint="Applied on top of booking total.">
          <Input type="number" min={0} max={100} step={0.5} value={data.taxRate} onChange={e => upd('taxRate', +e.target.value)} className="max-w-xs" />
        </Field>
        <RadioGroup label="Late Return Fee Method" value={data.lateFeeMethod} onChange={v => upd('lateFeeMethod', v)} options={[
          { value: 'hourly_rate',  label: 'Hourly Rate (Rounded Up)', description: 'Charges +1 hour of rental cost per hour late.' },
          { value: 'flat_amount',  label: 'Flat Amount',              description: `Fixed fee of ₱${data.lateFeeFlat} regardless of lateness.` },
          { value: 'percentage',   label: 'Percentage of Total',      description: `${data.lateFeePercent}% of the total booking cost.` },
        ]} />
        {data.lateFeeMethod === 'flat_amount' && (
          <Field label="Flat Late Fee (₱)">
            <Input type="number" min={0} value={data.lateFeeFlat} onChange={e => upd('lateFeeFlat', +e.target.value)} className="max-w-xs" />
          </Field>
        )}
        {data.lateFeeMethod === 'percentage' && (
          <Field label="Late Fee Percentage (%)">
            <Input type="number" min={0} max={100} step={0.5} value={data.lateFeePercent} onChange={e => upd('lateFeePercent', +e.target.value)} className="max-w-xs" />
          </Field>
        )}
      </Section>
    </div>
  );
}
