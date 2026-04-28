'use client';
import { useState, useEffect } from 'react';
import { fetchFullConfig, saveConfigSection, FullSystemConfig, getDefaultFullConfig } from '@/lib/settings-service';
import GeneralTab from './_tabs/GeneralTab';
import BookingTab from './_tabs/BookingTab';
import PaymentTab from './_tabs/PaymentTab';
import PricingTab from './_tabs/PricingTab';
import AvailabilityTab from './_tabs/AvailabilityTab';
import VehiclesTab from './_tabs/VehiclesTab';
import ChatTab from './_tabs/ChatTab';
import NotificationsTab from './_tabs/NotificationsTab';
import RolesTab from './_tabs/RolesTab';
import SystemTab from './_tabs/SystemTab';
import Link from 'next/link';
import {
  Settings2, ClipboardList, CreditCard, DollarSign, CalendarClock,
  Car, MessageSquare, Bell, Palette, ShieldCheck, Cpu, CheckCircle2, Loader2
} from 'lucide-react';

const TABS = [
  { id: 'general',       label: 'General',            icon: Settings2,     section: 'general' as const },
  { id: 'booking',       label: 'Booking',            icon: ClipboardList, section: 'booking' as const },
  { id: 'payment',       label: 'Payment',            icon: CreditCard,    section: 'payment' as const },
  { id: 'pricing',       label: 'Pricing',            icon: DollarSign,    section: 'pricing' as const },
  { id: 'availability',  label: 'Availability',       icon: CalendarClock, section: 'availability' as const },
  { id: 'vehicles',      label: 'Vehicles',           icon: Car,           section: 'vehicles' as const },
  { id: 'chat',          label: 'Chat',               icon: MessageSquare, section: 'chat' as const },
  { id: 'notifications', label: 'Notifications',      icon: Bell,          section: 'notifications' as const },
  { id: 'branding',      label: 'Branding',           icon: Palette,       section: null },
  { id: 'roles',         label: 'Roles & Permissions',icon: ShieldCheck,   section: 'roles' as const },
  { id: 'system',        label: 'System Behavior',    icon: Cpu,           section: 'system' as const },
];

export default function SystemSettingsPage() {
  const [active, setActive] = useState('general');
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

  const handleSave = async () => {
    const tab = TABS.find(t => t.id === active);
    if (!tab?.section) return;
    setSaving(true); setError(null);
    try {
      await saveConfigSection(tab.section, config[tab.section]);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const activeTab = TABS.find(t => t.id === active);
  const showSave = activeTab?.section !== null && active !== 'branding';

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
          <p className="text-slate-500 mt-1 font-medium">Configure all 11 engine modules</p>
        </div>
        {showSave && (
          <div className="flex items-center gap-3">
            {error && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                saved ? 'bg-green-600 text-white scale-105' :
                saving ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
                'bg-green-700 hover:bg-green-800 text-white'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="flex gap-6">
        {/* Tab Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return tab.id === 'branding' ? (
                <Link
                  key={tab.id}
                  href="/admin/settings/branding"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all border-b border-slate-50 last:border-0"
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className="ml-auto text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Page</span>
                </Link>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all border-b border-slate-50 last:border-0 text-left ${
                    isActive
                      ? 'bg-green-50 text-green-800 border-l-2 border-l-green-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-green-700' : ''}`} />
                  <span className="leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === 'general'       && <GeneralTab       data={config.general}       onChange={d => update('general', d)} />}
          {active === 'booking'       && <BookingTab       data={config.booking}       onChange={d => update('booking', d)} />}
          {active === 'payment'       && <PaymentTab       data={config.payment}       onChange={d => update('payment', d)} />}
          {active === 'pricing'       && <PricingTab       data={config.pricing}       onChange={d => update('pricing', d)} />}
          {active === 'availability'  && <AvailabilityTab  data={config.availability}  onChange={d => update('availability', d)} />}
          {active === 'vehicles'      && <VehiclesTab      data={config.vehicles}      onChange={d => update('vehicles', d)} />}
          {active === 'chat'          && <ChatTab          data={config.chat}          onChange={d => update('chat', d)} />}
          {active === 'notifications' && <NotificationsTab data={config.notifications} onChange={d => update('notifications', d)} />}
          {active === 'roles'         && <RolesTab         data={config.roles}         onChange={d => update('roles', d)} />}
          {active === 'system'        && <SystemTab        data={config.system}        onChange={d => update('system', d)} />}
        </div>
      </div>
    </div>
  );
}
