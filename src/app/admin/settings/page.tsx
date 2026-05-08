'use client';
import { useState, useEffect } from 'react';
import { fetchFullConfig, saveConfigSection, FullSystemConfig, getDefaultFullConfig } from '@/lib/settings-service';
import GeneralTab from './_tabs/GeneralTab';
import BookingTab from './_tabs/BookingTab';
import PaymentTab from './_tabs/PaymentTab';
import FleetTab from './_tabs/FleetTab';
import SystemTab from './_tabs/SystemTab';
import {
  Settings2, ClipboardList, CreditCard, Car, Cpu, CheckCircle2, Loader2,
} from 'lucide-react';

// A7: Collapsed from 10 tabs → 5 tabs
// Pricing, Availability, Chat, Notifications, Roles tabs removed.
// Availability merged into Booking. Chat + Vehicles merged into Fleet.
// Notifications + Roles info merged into System.
const TABS = [
  { id: 'general', label: 'General', icon: Settings2    },
  { id: 'booking', label: 'Booking', icon: ClipboardList },
  { id: 'payment', label: 'Payment', icon: CreditCard    },
  { id: 'fleet',   label: 'Fleet',   icon: Car           },
  { id: 'system',  label: 'System',  icon: Cpu           },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SystemSettingsPage() {
  const [active, setActive] = useState<TabId>('general');
  const [config, setConfig] = useState<FullSystemConfig>(getDefaultFullConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFullConfig().then(c => { setConfig(c); setLoading(false); });
  }, []);

  const update = <K extends keyof FullSystemConfig>(section: K, data: FullSystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [section]: data }));
  };

  // Save all sections relevant to the current tab
  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      if (active === 'general') {
        await saveConfigSection('general', config.general);
      } else if (active === 'booking') {
        await saveConfigSection('booking', config.booking);
        await saveConfigSection('availability', config.availability);
      } else if (active === 'payment') {
        await saveConfigSection('payment', config.payment);
      } else if (active === 'fleet') {
        await saveConfigSection('vehicles', config.vehicles);
        await saveConfigSection('chat', config.chat);
      } else if (active === 'system') {
        await saveConfigSection('system', config.system);
        await saveConfigSection('notifications', config.notifications);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
      <p className="text-slate-500 font-medium">Loading system settings…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">System Settings</h1>
          <p className="text-slate-500 mt-1 font-medium">5 configuration modules — all changes sync to Firestore</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
              saved   ? 'bg-green-600 text-white scale-105' :
              saving  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
                        'bg-green-700 hover:bg-green-800 text-white'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-6">
        {/* Tab Sidebar */}
        <aside className="w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all border-b border-slate-50 last:border-0 text-left ${
                    isActive
                      ? 'bg-green-50 text-green-800 border-l-[3px] border-l-green-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-green-700' : ''}`} />
                  <span className="leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Branding link */}
          <div className="mt-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <a
              href="/admin/settings/branding"
              className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all"
            >
              <span className="text-base">🎨</span>
              <span>Branding</span>
              <span className="ml-auto text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Page</span>
            </a>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === 'general' && (
            <GeneralTab data={config.general} onChange={d => update('general', d)} />
          )}
          {active === 'booking' && (
            <BookingTab
              booking={config.booking}
              availability={config.availability}
              onBooking={d => update('booking', d)}
              onAvailability={d => update('availability', d)}
            />
          )}
          {active === 'payment' && (
            <PaymentTab data={config.payment} onChange={d => update('payment', d)} />
          )}
          {active === 'fleet' && (
            <FleetTab
              vehicles={config.vehicles}
              chat={config.chat}
              onVehicles={d => update('vehicles', d)}
              onChat={d => update('chat', d)}
            />
          )}
          {active === 'system' && (
            <SystemTab
              system={config.system}
              notifications={config.notifications}
              onSystem={d => update('system', d)}
              onNotifications={d => update('notifications', d)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
