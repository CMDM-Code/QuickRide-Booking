'use client';
import { PaymentSettings } from '@/lib/settings-service';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';

interface Props { data: PaymentSettings; onChange: (d: PaymentSettings) => void; }
export default function PaymentTab({ data, onChange }: Props) {
  const upd = <K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Downpayment" description="Configure if and how a downpayment is collected before confirmation.">
        <Toggle label="Require Downpayment" description="Clients must pay a downpayment to proceed." checked={data.downpayment_required} onChange={v => upd('downpayment_required', v)} />
        {data.downpayment_required && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <RadioGroup label="Downpayment Type" value={data.downpayment_type} onChange={v => upd('downpayment_type', v)} options={[
              { value: 'percentage', label: 'Percentage (%)' },
              { value: 'fixed', label: 'Fixed Amount' },
            ]} />
            <Field label={data.downpayment_type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₱)'}>
              <Input type="number" min={0} value={data.downpayment_value} onChange={e => upd('downpayment_value', +e.target.value)} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Payment Timing">
        <RadioGroup label="When must payment be made?" value={data.payment_timing} onChange={v => upd('payment_timing', v)} options={[
          { value: 'before_approval', label: 'Before Approval', description: 'Payment required before staff reviews the booking.' },
          { value: 'after_approval',  label: 'After Approval',  description: 'Payment required only after booking is approved.' },
          { value: 'flexible',        label: 'Flexible',        description: 'No strict timing enforcement.' },
        ]} />
      </Section>

      <Section title="Payment Lifecycle">
        <Toggle label="Allow Partial Payment"    description="Clients can pay in installments."        checked={data.allow_partial_payment}    onChange={v => upd('allow_partial_payment', v)} />
        <Toggle label="Allow Payment Retry"      description="Failed payments can be retried."         checked={data.allow_payment_retry}      onChange={v => upd('allow_payment_retry', v)} />
        <Toggle label="Auto-Cancel Unpaid"       description="Cancel booking if payment expires."      checked={data.auto_cancel_unpaid_booking} onChange={v => upd('auto_cancel_unpaid_booking', v)} />
        <Field label="Payment Expiry (minutes)"  hint="How long before an unpaid booking auto-cancels.">
          <Input type="number" min={5} value={data.pending_payment_expiry_minutes} onChange={e => upd('pending_payment_expiry_minutes', +e.target.value)} className="max-w-xs" />
        </Field>
        <RadioGroup label="Failed Payment Behavior" value={data.failed_payment_behavior} onChange={v => upd('failed_payment_behavior', v)} options={[
          { value: 'keep_record',      label: 'Keep Record',      description: 'Update the existing payment record with failed status.' },
          { value: 'create_new_record',label: 'Create New Record','description': 'Create a fresh payment record on retry.' },
        ]} />
      </Section>

      <Section title="Refund System">
        <RadioGroup label="Refund Mode" value={data.refund_mode} onChange={v => upd('refund_mode', v)} options={[
          { value: 'percentage', label: 'Percentage',  description: 'Refund a % of total booking cost.' },
          { value: 'flat',       label: 'Flat Amount', description: 'Refund a fixed amount.' },
          { value: 'hybrid',     label: 'Hybrid',      description: 'Combination of percentage and flat.' },
        ]} />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Field label="Default Refund %" hint="Used when mode is Percentage or Hybrid.">
            <Input type="number" min={0} max={100} value={data.refund_default_percentage} onChange={e => upd('refund_default_percentage', +e.target.value)} />
          </Field>
          <Field label="Default Flat Refund (₱)" hint="Used when mode is Flat or Hybrid.">
            <Input type="number" min={0} value={data.refund_default_flat} onChange={e => upd('refund_default_flat', +e.target.value)} />
          </Field>
        </div>
        <Toggle label="Allow Refund Override" description="Staff/admin can override the default refund amount." checked={data.refund_override_allowed} onChange={v => upd('refund_override_allowed', v)} />
      </Section>

      <Section title="Verification Mode">
        <RadioGroup label="Payment Verification" value={data.payment_verification_mode} onChange={v => upd('payment_verification_mode', v)} options={[
          { value: 'manual', label: 'Manual',  description: 'Staff manually marks payments as verified.' },
          { value: 'api',    label: 'API',     description: 'Gateway API auto-verifies payment.' },
          { value: 'hybrid', label: 'Hybrid',  description: 'API first, manual fallback.' },
        ]} />
      </Section>
    </div>
  );
}
