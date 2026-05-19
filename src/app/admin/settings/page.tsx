'use client';
import { useState, useEffect } from 'react';
import { fetchFullConfig, saveFullConfig, FullSystemConfig, getDefaultFullConfig } from '@/lib/settings-service';
import GeneralTab from './_tabs/GeneralTab';
import BookingTab from './_tabs/BookingTab';
import PaymentTab from './_tabs/PaymentTab';
import FleetTab from './_tabs/FleetTab';
import SystemTab from './_tabs/SystemTab';
import {
  Settings2, ClipboardList, CreditCard, Car, Cpu, CheckCircle2, Loader2,
} from 'lucide-react';
import { PageHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

  // Save the full configuration state
  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await saveFullConfig(config);
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
      <PageHeader
        title="System Settings"
        subtitle="5 configuration modules — all changes sync to Firestore"
        action={
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs font-bold text-[var(--color-error)] bg-[var(--color-error-light)] border border-[var(--color-error)]/20 px-3 py-2 rounded-xl">
                {error}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`shadow-lg w-40 justify-center ${
                saved   ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white scale-105 transition-transform' :
                saving  ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]' :
                          'bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {/* Layout */}
      <div className="flex gap-6">
        {/* Tab Sidebar */}
        <aside className="w-48 shrink-0">
          <Card padding="none" className="overflow-hidden mb-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all border-b border-[var(--border-subtle)] last:border-0 text-left ${
                    isActive
                      ? 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] border-l-[3px] border-l-[var(--color-primary-600)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border-l-[3px] border-l-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-primary-600)]' : ''}`} />
                  <span className="leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </Card>

          {/* Branding link */}
          <Card padding="none" className="overflow-hidden">
            <a
              href="/admin/settings/branding"
              className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-all"
            >
              <span className="text-base">🎨</span>
              <span>Branding</span>
              <span className="ml-auto text-[9px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded font-black uppercase">Page</span>
            </a>
          </Card>
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
            <PaymentTab 
              data={config.payment} 
              pricing={config.pricing} 
              onChange={d => update('payment', d)} 
              onPricing={d => update('pricing', d)}
            />
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
