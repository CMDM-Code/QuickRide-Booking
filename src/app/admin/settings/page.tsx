'use client';
import { useState, useEffect } from "react";

interface SystemSettings {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
  taxRate: number;
  minimumRentalHours: number;
  lateFeeMethod: 'hourly_rate' | 'flat_amount' | 'percentage';
  lateFeeHourlyNote: string;
  lateFeeFlat: number;
  lateFeePercent: number;
  sessionTimeoutMinutes: number;
  pricingBehaviorMode: 'locked' | 'recalculated';
}

const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'QuickRide Booking',
  supportEmail: 'support@quickridebooking.com',
  supportPhone: '+63 XXX XXX XXXX',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  taxRate: 12,
  minimumRentalHours: 12,
  lateFeeMethod: 'hourly_rate',
  lateFeeHourlyNote: 'Charges +1hr worth of rental cost per hour late, rounded up.',
  lateFeeFlat: 500,
  lateFeePercent: 15,
  sessionTimeoutMinutes: 120,
  pricingBehaviorMode: 'locked',
};

const getSettings = (): SystemSettings => {
  try {
    const saved = localStorage.getItem('quickride_system_settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: SystemSettings) => {
  localStorage.setItem('quickride_system_settings', JSON.stringify(settings));
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const update = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-600 mt-1">Configure global application settings</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            saved
              ? 'bg-green-600 text-white scale-105'
              : 'bg-green-700 hover:bg-green-800 text-white hover:scale-105'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Company Information */}
      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Company Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => update('supportEmail', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Support Phone</label>
            <input
              type="tel"
              value={settings.supportPhone}
              onChange={(e) => update('supportPhone', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => update('currency', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            >
              <option value="PHP">PHP (₱) — Philippine Peso</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Session & Security Settings */}
      <div className="card border-2 border-blue-100 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-blue-700 text-xl">🔐</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">Session & Security</h2>
            <p className="text-sm text-slate-500 font-medium">Configure session timeout and security settings.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              min="15"
              max="480"
              value={settings.sessionTimeoutMinutes}
              onChange={(e) => update('sessionTimeoutMinutes', Math.max(15, Math.min(480, parseInt(e.target.value) || 120)))}
              className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">Auto-logout after inactivity. Min: 15 min, Max: 480 min (8 hours). Default: 120 min (2 hours).</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pricing Behavior Mode</label>
            <div className="space-y-3">
              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.pricingBehaviorMode === 'locked'
                    ? 'border-green-500 bg-green-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="pricingBehaviorMode"
                  value="locked"
                  checked={settings.pricingBehaviorMode === 'locked'}
                  onChange={() => update('pricingBehaviorMode', 'locked')}
                  className="mt-1 accent-green-700"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">🔒 Locked Pricing</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Full price breakdown is stored at booking time and <span className="font-bold">does not change</span> even if pricing rules change later.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.pricingBehaviorMode === 'recalculated'
                    ? 'border-green-500 bg-green-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="pricingBehaviorMode"
                  value="recalculated"
                  checked={settings.pricingBehaviorMode === 'recalculated'}
                  onChange={() => update('pricingBehaviorMode', 'recalculated')}
                  className="mt-1 accent-green-700"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">🔄 Recalculated Pricing</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Pricing is <span className="font-bold">dynamically updated</span> based on current pricing rules, even after booking is confirmed.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Late Fee Policy */}
      <div className="card border-2 border-amber-100 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-amber-700 text-xl">⏰</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">Late Return Policy</h2>
            <p className="text-sm text-slate-500 font-medium">Fine-tune how clients are charged for late drop-offs.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Option 1: Hourly Rate */}
          <label
            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              settings.lateFeeMethod === 'hourly_rate'
                ? 'border-green-500 bg-green-50/50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="lateFeeMethod"
              value="hourly_rate"
              checked={settings.lateFeeMethod === 'hourly_rate'}
              onChange={() => update('lateFeeMethod', 'hourly_rate')}
              className="mt-1 accent-green-700"
            />
            <div className="flex-1">
              <p className="font-bold text-slate-900">Hourly Rate (Rounded Up)</p>
              <p className="text-sm text-slate-500 mt-1">
                Charges <span className="font-bold text-green-700">+1 hour worth of rental cost</span> per 
                hour late. Time is <span className="font-bold">rounded up</span> — being 1 second, 1 minute, 
                or up to 59 minutes late all count as 1 full hour.
              </p>
              <div className="mt-3 bg-white rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-400 font-medium">Example:</p>
                <p className="text-sm text-slate-700">If hourly rate = ₱250/hr and customer is 2h 15m late → charged ₱750 (3 hours rounded up)</p>
              </div>
            </div>
          </label>

          {/* Option 2: Flat Amount */}
          <label
            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              settings.lateFeeMethod === 'flat_amount'
                ? 'border-green-500 bg-green-50/50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="lateFeeMethod"
              value="flat_amount"
              checked={settings.lateFeeMethod === 'flat_amount'}
              onChange={() => update('lateFeeMethod', 'flat_amount')}
              className="mt-1 accent-green-700"
            />
            <div className="flex-1">
              <p className="font-bold text-slate-900">Flat Amount</p>
              <p className="text-sm text-slate-500 mt-1">
                Charges a <span className="font-bold">fixed additional amount</span> regardless of how late the return is.
              </p>
              {settings.lateFeeMethod === 'flat_amount' && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Flat Fee Amount ({settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '£'})
                  </label>
                  <input
                    type="number"
                    value={settings.lateFeeFlat}
                    onChange={(e) => update('lateFeeFlat', parseFloat(e.target.value) || 0)}
                    className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
              )}
            </div>
          </label>

          {/* Option 3: Percentage */}
          <label
            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              settings.lateFeeMethod === 'percentage'
                ? 'border-green-500 bg-green-50/50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="lateFeeMethod"
              value="percentage"
              checked={settings.lateFeeMethod === 'percentage'}
              onChange={() => update('lateFeeMethod', 'percentage')}
              className="mt-1 accent-green-700"
            />
            <div className="flex-1">
              <p className="font-bold text-slate-900">Percentage of Total</p>
              <p className="text-sm text-slate-500 mt-1">
                Charges a <span className="font-bold">percentage of the total booking cost</span> as a late fee.
              </p>
              {settings.lateFeeMethod === 'percentage' && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Late Fee Percentage (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.lateFeePercent}
                    onChange={(e) => update('lateFeePercent', parseFloat(e.target.value) || 0)}
                    className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Example: 15% on a ₱5,000 booking = ₱750 late fee</p>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
