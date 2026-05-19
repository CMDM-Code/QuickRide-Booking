'use client';
import { useState } from 'react';
import { SystemBehaviorSettings, NotificationSettings } from '@/lib/settings-service';
import { ROLE_DEFINITIONS } from '@/lib/roles';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';
import { ChevronDown, ChevronUp, ShieldCheck, Users } from 'lucide-react';

interface Props {
  system: SystemBehaviorSettings;
  notifications: NotificationSettings;
  onSystem: (d: SystemBehaviorSettings) => void;
  onNotifications: (d: NotificationSettings) => void;
}

const TRIGGERS: { key: keyof NotificationSettings; label: string; urgent?: boolean }[] = [
  { key: 'trigger_booking_created',  label: 'Booking Created' },
  { key: 'trigger_booking_approved', label: 'Booking Approved', urgent: true },
  { key: 'trigger_booking_rejected', label: 'Booking Rejected', urgent: true },
  { key: 'trigger_payment_received', label: 'Payment Received', urgent: true },
  { key: 'trigger_payment_failed',   label: 'Payment Failed',   urgent: true },
  { key: 'trigger_refund_processed', label: 'Refund Processed', urgent: true },
];

export default function SystemTab({ system, notifications, onSystem, onNotifications }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const sUpd = <K extends keyof SystemBehaviorSettings>(k: K, v: SystemBehaviorSettings[K]) =>
    onSystem({ ...system, [k]: v });
  const nUpd = <K extends keyof NotificationSettings>(k: K, v: NotificationSettings[K]) =>
    onNotifications({ ...notifications, [k]: v });

  return (
    <div className="space-y-4">
      {/* ── Maintenance ── */}
      <Section title="Maintenance Mode" description="Controls whether the platform is in maintenance. Blocks client-facing operations.">
        <Toggle label="Enable Maintenance Mode"  description="Activate to block bookings and payments for non-admins." checked={system.maintenance_enabled}               onChange={v => sUpd('maintenance_enabled', v)} />
        {system.maintenance_enabled && (
          <>
            <Toggle label="Allow Admin Bypass"         description="Admins can still access the platform during maintenance."     checked={system.maintenance_allow_admin_bypass}          onChange={v => sUpd('maintenance_allow_admin_bypass', v)} />
            <Toggle label="Block Booking Creation"     description="Prevents new bookings from being created."                    checked={system.maintenance_blocks_booking_creation}    onChange={v => sUpd('maintenance_blocks_booking_creation', v)} />
            <Toggle label="Block Payment Processing"   description="Prevents all payment submissions."                           checked={system.maintenance_blocks_payment_processing}  onChange={v => sUpd('maintenance_blocks_payment_processing', v)} />
          </>
        )}
      </Section>

      {/* ── Audit Logging ── */}
      <Section title="Audit Logging" description="All critical mutations are logged with before/after snapshots.">
        <Toggle label="Enable Audit Logging" description="Recommended: Full mode for production." checked={system.audit_logging_enabled} onChange={v => sUpd('audit_logging_enabled', v)} />
      </Section>

      {/* ── Session & Fees ── */}
      <Section title="Session &amp; Fee Policy">
        <Field label="Session Timeout (minutes)" hint="Auto-logout after inactivity. Min 15, Max 480.">
          <Input type="number" min={15} max={480} value={system.sessionTimeoutMinutes} onChange={e => sUpd('sessionTimeoutMinutes', Math.max(15, Math.min(480, +e.target.value)))} className="max-w-xs" />
        </Field>
        <Field label="Tax Rate (%)" hint="Applied on top of booking total (e.g. 12 = 12% VAT).">
          <Input type="number" min={0} max={100} step={0.5} value={system.taxRate} onChange={e => sUpd('taxRate', +e.target.value)} className="max-w-xs" />
        </Field>
        <RadioGroup
          label="Late Return Fee Method"
          value={system.lateFeeMethod}
          onChange={v => sUpd('lateFeeMethod', v)}
          options={[
            { value: 'hourly_rate', label: 'Hourly Rate (Rounded Up)', description: 'Charges +1 hour of rental cost per hour late.' },
            { value: 'flat_amount', label: 'Flat Amount',              description: `Fixed fee of ₱${system.lateFeeFlat} regardless of lateness.` },
            { value: 'percentage',  label: 'Percentage of Total',      description: `${system.lateFeePercent}% of the total booking cost.` },
          ]}
        />
        {system.lateFeeMethod === 'flat_amount' && (
          <Field label="Flat Late Fee (₱)">
            <Input type="number" min={0} value={system.lateFeeFlat} onChange={e => sUpd('lateFeeFlat', +e.target.value)} className="max-w-xs" />
          </Field>
        )}
        {system.lateFeeMethod === 'percentage' && (
          <Field label="Late Fee Percentage (%)">
            <Input type="number" min={0} max={100} step={0.5} value={system.lateFeePercent} onChange={e => sUpd('lateFeePercent', +e.target.value)} className="max-w-xs" />
          </Field>
        )}
      </Section>

      {/* ── Notification Channels ── */}
      <Section title="Notifications" description="Configure notification delivery and event triggers.">
        <Toggle label="In-App Notifications" description="Real-time bell notifications inside the platform." checked={notifications.in_app_notifications} onChange={v => nUpd('in_app_notifications', v)} />
        <Toggle label="Email Notifications"  description="Send email alongside in-app for key events."      checked={notifications.email_notifications}    onChange={v => nUpd('email_notifications', v)} />
      </Section>

      {/* ── Role Permissions Info Card (A8) ── */}
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-premium)] p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)] mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-500)]/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary-600)]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[var(--text-primary)]">Role Permissions</h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Fixed system roles — not configurable</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(ROLE_DEFINITIONS) as [string, typeof ROLE_DEFINITIONS['admin']][]).map(([roleKey, role]) => (
            <div key={roleKey} className="rounded-xl border border-[var(--border-subtle)] p-4 space-y-2 bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[var(--text-tertiary)]" />
                <p className="font-black text-sm text-[var(--text-primary)]">{role.label}</p>
              </div>
              <div className="space-y-1">
                {(Object.entries(role.permissions) as [string, boolean][]).map(([perm, allowed]) => (
                  <div key={perm} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${allowed ? 'bg-[var(--color-success)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]'}`} />
                    <span className={allowed ? 'text-[var(--text-secondary)] font-medium' : 'text-[var(--text-tertiary)]'}>
                      {perm.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
          <Section title="Advanced Logging">
            {system.audit_logging_enabled && (
              <>
                <RadioGroup
                  label="Log Level"
                  value={system.log_level}
                  onChange={v => sUpd('log_level', v)}
                  options={[
                    { value: 'minimal', label: 'Minimal', description: 'Only critical events (status changes, payments).' },
                    { value: 'full',    label: 'Full',    description: 'Every mutation with before/after snapshots. Recommended.' },
                  ]}
                />
                <Field label="Audit Log Retention (days)" hint="Logs older than this are eligible for archiving.">
                  <Input type="number" min={7} value={system.audit_retention_days} onChange={e => sUpd('audit_retention_days', +e.target.value)} className="max-w-xs" />
                </Field>
              </>
            )}
            <Field label="Chat Retention Policy" hint="Natural language description (e.g. '90 days', '1 year').">
              <Input value={system.chat_retention_policy} onChange={e => sUpd('chat_retention_policy', e.target.value)} />
            </Field>
          </Section>

          <Section title="Notification Event Triggers" description="Choose which events generate in-app and email notifications.">
            {TRIGGERS.map(t => (
              <Toggle
                key={t.key}
                label={t.label + (t.urgent ? ' ⚡' : '')}
                checked={notifications[t.key] as boolean}
                onChange={v => nUpd(t.key, v as any)}
              />
            ))}
            <Toggle
              label="Urgency-Only Flag"
              description="When on, only notifications marked urgent are shown in priority views."
              checked={notifications.urgency_only_flag}
              onChange={v => nUpd('urgency_only_flag', v)}
            />
          </Section>
        </>
      )}
    </div>
  );
}
