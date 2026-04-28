'use client';
import { VehicleSettings } from '@/lib/settings-service';
import { Section, Toggle, RadioGroup } from './shared';

interface Props { data: VehicleSettings; onChange: (d: VehicleSettings) => void; }
export default function VehiclesTab({ data, onChange }: Props) {
  const upd = <K extends keyof VehicleSettings>(k: K, v: VehicleSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Inventory Structure" description="Configure which levels of vehicle hierarchy are tracked.">
        <Toggle label="Car Type Tracking"  description="Track vehicles by type (SUV, Sedan, Van…)."   checked={data.car_type_enabled}           onChange={v => upd('car_type_enabled', v)} />
        <Toggle label="Car Model Tracking" description="Track vehicles by model within each type."     checked={data.car_model_enabled}          onChange={v => upd('car_model_enabled', v)} />
        <Toggle label="Unit-Level Tracking (Critical)" description="Track individual rentable vehicle units. Required for conflict detection." checked={data.car_unit_tracking_enabled} onChange={v => upd('car_unit_tracking_enabled', v)} />
      </Section>

      <Section title="Assignment Engine" description="How vehicles are assigned when a booking is approved.">
        <RadioGroup label="Assignment Mode" value={data.assignment_mode} onChange={v => upd('assignment_mode', v)} options={[
          { value: 'auto_first_available', label: '⚡ Auto — First Available', description: 'Assigns the first vehicle unit that is free.' },
          { value: 'auto_best_match',      label: '🎯 Auto — Best Match',      description: 'Assigns the most suitable unit based on criteria.' },
          { value: 'manual_required',      label: '👤 Manual Required',        description: 'Admin must manually assign a unit.' },
        ]} />
      </Section>

      <Section title="Conflict Policy">
        <RadioGroup label="Vehicle Conflict Behavior" value={data.conflict_policy} onChange={v => upd('conflict_policy', v)} options={[
          { value: 'block',           label: '🚫 Block',           description: 'Prevent assigning a vehicle already booked.' },
          { value: 'warn',            label: '⚠️ Warn',            description: 'Show a warning but allow proceeding.' },
          { value: 'override_allowed',label: '✅ Override Allowed', description: 'Admin can forcefully assign despite conflict.' },
        ]} />
      </Section>

      <Section title="Failure Handling">
        <RadioGroup label="When Vehicle Becomes Unavailable" value={data.vehicle_unavailable_behavior} onChange={v => upd('vehicle_unavailable_behavior', v)} options={[
          { value: 'auto_reassign',        label: '🔄 Auto-Reassign',        description: 'System automatically finds and assigns another unit.' },
          { value: 'manual_intervention',  label: '🛠️ Manual Intervention',  description: 'Admin is notified and must reassign manually.' },
        ]} />
      </Section>

      <Section title="Maintenance Mode">
        <Toggle label="Enable Vehicle Maintenance Mode" description="Allow marking vehicles as under maintenance." checked={data.vehicle_maintenance_mode_enabled} onChange={v => upd('vehicle_maintenance_mode_enabled', v)} />
        {data.vehicle_maintenance_mode_enabled && (
          <Toggle label="Maintenance Blocks Booking" description="Vehicles in maintenance cannot be booked." checked={data.maintenance_blocks_booking} onChange={v => upd('maintenance_blocks_booking', v)} />
        )}
      </Section>
    </div>
  );
}
