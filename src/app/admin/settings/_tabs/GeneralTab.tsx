'use client';
import { GeneralSettings } from '@/lib/settings-service';
import { Section, Field, Input, Select, Toggle, RadioGroup } from './shared';

interface Props { data: GeneralSettings; onChange: (d: GeneralSettings) => void; }
const set = <K extends keyof GeneralSettings>(data: GeneralSettings, onChange: Props['onChange'], k: K, v: GeneralSettings[K]) => onChange({ ...data, [k]: v });

export default function GeneralTab({ data, onChange }: Props) {
  const upd = <K extends keyof GeneralSettings>(k: K, v: GeneralSettings[K]) => set(data, onChange, k, v);
  return (
    <div className="space-y-4">
      <Section title="System Identity" description="Core identity fields displayed across the platform.">
        <Field label="System Name">
          <Input value={data.system_name} onChange={e => upd('system_name', e.target.value)} placeholder="QuickRide Booking" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Support Email">
            <Input type="email" value={data.support_email} onChange={e => upd('support_email', e.target.value)} />
          </Field>
          <Field label="Support Phone">
            <Input type="tel" value={data.support_phone} onChange={e => upd('support_phone', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Locale & Format" description="Controls how dates, times and currency display across the system.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Currency">
            <Select value={data.currency} onChange={e => upd('currency', e.target.value)}>
              <option value="PHP">PHP (₱) — Philippine Peso</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </Select>
          </Field>
          <Field label="Timezone">
            <Select value={data.timezone} onChange={e => upd('timezone', e.target.value)}>
              <option value="Asia/Manila">Asia/Manila (PHT +8)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT +8)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </Select>
          </Field>
          <Field label="Date Format">
            <Select value={data.date_format} onChange={e => upd('date_format', e.target.value)}>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </Select>
          </Field>
          <Field label="Time Format">
            <Select value={data.time_format} onChange={e => upd('time_format', e.target.value as any)}>
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="System Status" description="Activating maintenance mode blocks all client-facing actions.">
        <RadioGroup
          label="System Status"
          value={data.system_status}
          onChange={v => upd('system_status', v)}
          options={[
            { value: 'active', label: '✅ Active', description: 'Platform is fully operational.' },
            { value: 'maintenance', label: '🔧 Maintenance Mode', description: 'Blocks bookings and payments for non-admins.' },
          ]}
        />
      </Section>
    </div>
  );
}
