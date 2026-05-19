'use client';
import { useState } from 'react';
import { VehicleSettings, ChatSettings } from '@/lib/settings-service';
import { Section, Field, Input, Toggle, RadioGroup } from './shared';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  vehicles: VehicleSettings;
  chat: ChatSettings;
  onVehicles: (d: VehicleSettings) => void;
  onChat: (d: ChatSettings) => void;
}

export default function FleetTab({ vehicles, chat, onVehicles, onChat }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const vUpd = <K extends keyof VehicleSettings>(k: K, v: VehicleSettings[K]) =>
    onVehicles({ ...vehicles, [k]: v });
  const cUpd = <K extends keyof ChatSettings>(k: K, v: ChatSettings[K]) =>
    onChat({ ...chat, [k]: v });

  return (
    <div className="space-y-4">
      {/* ── Core Vehicle Settings ── */}
      <Section title="Vehicle Assignment" description="How vehicles are assigned when a booking is approved.">
        <RadioGroup
          label="Assignment Mode"
          value={vehicles.assignment_mode}
          onChange={v => vUpd('assignment_mode', v)}
          options={[
            { value: 'auto_first_available', label: '⚡ Auto — First Available', description: 'Assigns the first vehicle unit that is free.' },
            { value: 'auto_best_match',      label: '🎯 Auto — Best Match',      description: 'Assigns the most suitable unit based on criteria.' },
            { value: 'manual_required',      label: '👤 Manual Required',        description: 'Admin must manually assign a unit before approving.' },
          ]}
        />
      </Section>

      <Section title="Maintenance Mode" description="Control whether vehicles under maintenance can be booked.">
        <Toggle
          label="Enable Vehicle Maintenance Mode"
          description="Allow marking individual vehicles as under maintenance."
          checked={vehicles.vehicle_maintenance_mode_enabled}
          onChange={v => vUpd('vehicle_maintenance_mode_enabled', v)}
        />
        {vehicles.vehicle_maintenance_mode_enabled && (
          <Toggle
            label="Maintenance Blocks Booking"
            description="Vehicles in maintenance cannot be selected or assigned to bookings."
            checked={vehicles.maintenance_blocks_booking}
            onChange={v => vUpd('maintenance_blocks_booking', v)}
          />
        )}
      </Section>

      <Section title="Booking Chat" description="Enable or disable chat threads on bookings.">
        <Toggle
          label="Booking Chat Enabled"
          description="Customers and staff can message within a booking thread."
          checked={chat.booking_chat_enabled}
          onChange={v => cUpd('booking_chat_enabled', v)}
        />
        <Toggle
          label="Support Chat Enabled"
          description="Customers can open support threads from the dashboard."
          checked={chat.support_chat_enabled}
          onChange={v => cUpd('support_chat_enabled', v)}
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
          <Section title="Vehicle Catalog Structure" description="Configure which levels of vehicle hierarchy are tracked.">
            <Toggle label="Car Type Tracking"  description="Track vehicles by type (SUV, Sedan, Van…)."   checked={vehicles.car_type_enabled}           onChange={v => vUpd('car_type_enabled', v)} />
            <Toggle label="Car Model Tracking" description="Track vehicles by model within each type."     checked={vehicles.car_model_enabled}          onChange={v => vUpd('car_model_enabled', v)} />
            <Toggle label="Unit-Level Tracking (Critical)" description="Track individual rentable vehicle units. Required for conflict detection." checked={vehicles.car_unit_tracking_enabled} onChange={v => vUpd('car_unit_tracking_enabled', v)} />
          </Section>

          <Section title="Conflict Policy">
            <RadioGroup
              label="Vehicle Conflict Behavior"
              value={vehicles.conflict_policy}
              onChange={v => vUpd('conflict_policy', v)}
              options={[
                { value: 'block',            label: '🚫 Block',            description: 'Prevent assigning a vehicle already booked.' },
                { value: 'warn',             label: '⚠️ Warn',             description: 'Show a warning but allow proceeding.' },
                { value: 'override_allowed', label: '✅ Override Allowed',  description: 'Admin can forcefully assign despite conflict.' },
              ]}
            />
          </Section>

          <Section title="Failure Handling">
            <RadioGroup
              label="When Vehicle Becomes Unavailable"
              value={vehicles.vehicle_unavailable_behavior}
              onChange={v => vUpd('vehicle_unavailable_behavior', v)}
              options={[
                { value: 'auto_reassign',       label: '🔄 Auto-Reassign',       description: 'System automatically finds and assigns another unit.' },
                { value: 'manual_intervention', label: '🛠️ Manual Intervention', description: 'Admin is notified and must reassign manually.' },
              ]}
            />
          </Section>

          <Section title="Chat Moderation">
            <Toggle label="Staff Chat Moderation" description="Staff can edit or delete customer messages." checked={chat.allow_staff_chat_moderation} onChange={v => cUpd('allow_staff_chat_moderation', v)} />
            <Toggle label="Client Can Edit Messages"  description="Customers can edit their own messages." checked={chat.allow_client_chat_edit}      onChange={v => cUpd('allow_client_chat_edit', v)} />
            <Toggle label="Client Can Delete Messages" description="Customers can delete their own messages." checked={chat.allow_client_chat_delete}    onChange={v => cUpd('allow_client_chat_delete', v)} />
            <RadioGroup
              label="Chat Close Behavior"
              value={chat.chat_close_behavior}
              onChange={v => cUpd('chat_close_behavior', v)}
              options={[
                { value: 'archived_readonly', label: 'Archived — Read Only', description: 'Closed chats are preserved but locked.' },
                { value: 'deleted',           label: 'Deleted',              description: 'Closed chats are permanently removed.' },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  );
}
