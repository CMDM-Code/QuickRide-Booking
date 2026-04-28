'use client';
import { NotificationSettings } from '@/lib/settings-service';
import { Section, Toggle } from './shared';

interface Props { data: NotificationSettings; onChange: (d: NotificationSettings) => void; }
export default function NotificationsTab({ data, onChange }: Props) {
  const upd = <K extends keyof NotificationSettings>(k: K, v: NotificationSettings[K]) => onChange({ ...data, [k]: v });
  const triggers: { key: keyof NotificationSettings; label: string }[] = [
    { key: 'trigger_booking_created',   label: 'Booking Created' },
    { key: 'trigger_booking_approved',  label: 'Booking Approved' },
    { key: 'trigger_booking_rejected',  label: 'Booking Rejected' },
    { key: 'trigger_payment_received',  label: 'Payment Received' },
    { key: 'trigger_payment_failed',    label: 'Payment Failed' },
    { key: 'trigger_refund_processed',  label: 'Refund Processed' },
  ];
  return (
    <div className="space-y-4">
      <Section title="Delivery Channels" description="Which channels are used to deliver notifications.">
        <Toggle label="In-App Notifications (Required)" description="Real-time bell notifications inside the platform." checked={data.in_app_notifications} onChange={v => upd('in_app_notifications', v)} />
        <Toggle label="Email Notifications" description="Send email alongside in-app for key events." checked={data.email_notifications} onChange={v => upd('email_notifications', v)} />
      </Section>

      <Section title="Event Triggers" description="Choose which events generate notifications.">
        {triggers.map(t => (
          <Toggle
            key={t.key}
            label={t.label}
            checked={data[t.key] as boolean}
            onChange={v => upd(t.key, v as any)}
          />
        ))}
      </Section>

      <Section title="Behaviour">
        <Toggle
          label="Urgency-Only Flag"
          description="When on, only notifications marked urgent are shown in priority views. Does NOT change sort order."
          checked={data.urgency_only_flag}
          onChange={v => upd('urgency_only_flag', v)}
        />
      </Section>
    </div>
  );
}
