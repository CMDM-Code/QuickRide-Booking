'use client';
import { PricingSettings } from '@/lib/settings-service';
import { Section, Toggle, RadioGroup } from './shared';

interface Props { data: PricingSettings; onChange: (d: PricingSettings) => void; }
export default function PricingTab({ data, onChange }: Props) {
  const upd = <K extends keyof PricingSettings>(k: K, v: PricingSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Pricing Mode" description="Controls whether booking prices are locked at creation or recalculated dynamically.">
        <RadioGroup label="Pricing Behavior" value={data.pricing_mode} onChange={v => upd('pricing_mode', v)} options={[
          { value: 'locked',       label: '🔒 Locked Pricing',       description: 'Price is snapshotted at booking creation and never changes.' },
          { value: 'recalculated', label: '🔄 Recalculated Pricing', description: 'Price updates dynamically if pricing rules change after booking.' },
        ]} />
      </Section>

      <Section title="Pricing Algorithm" description="Algorithm: 24h → 12h blocks → hourly remainder.">
        <RadioGroup label="Rounding Rule" value={data.rounding_rule} onChange={v => upd('rounding_rule', v)} options={[
          { value: 'ceil',    label: 'Ceil (Round Up)',  description: 'Always charge the next full block. Recommended.' },
          { value: 'floor',   label: 'Floor (Round Down)', description: 'Never charge for partial blocks.' },
          { value: 'nearest', label: 'Nearest',          description: 'Round to closest block.' },
        ]} />
      </Section>

      <Section title="Override Rules">
        <Toggle label="Allow Staff Pricing Override"  description="Staff can manually override calculated price."        checked={data.allow_staff_pricing_override}  onChange={v => upd('allow_staff_pricing_override', v)} />
        <Toggle label="Allow Admin Pricing Override"  description="Admin can manually override calculated price."        checked={data.allow_admin_pricing_override}  onChange={v => upd('allow_admin_pricing_override', v)} />
      </Section>

      <Section title="Scheduled Pricing">
        <Toggle label="Enable Scheduled Pricing"  description="Allow time-based pricing overrides (peak seasons, promos)." checked={data.scheduled_pricing_enabled} onChange={v => upd('scheduled_pricing_enabled', v)} />
        {data.scheduled_pricing_enabled && (
          <RadioGroup label="Schedule Overlap Resolution" value={data.overlap_resolution} onChange={v => upd('overlap_resolution', v)} options={[
            { value: 'priority_based',       label: 'Priority Based',        description: 'Higher-priority schedule wins when they overlap.' },
            { value: 'latest_created_wins',  label: 'Latest Created Wins',   description: 'Most recently created schedule takes precedence.' },
          ]} />
        )}
      </Section>
    </div>
  );
}
