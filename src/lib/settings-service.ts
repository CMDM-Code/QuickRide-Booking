export type PricingBehaviorMode = 'locked' | 'recalculated';

const SYSTEM_SETTINGS_KEY = 'quickride_system_settings';

export interface SystemSettings {
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
  pricingBehaviorMode: PricingBehaviorMode;
}

export function getSystemSettings(): SystemSettings {
  try {
    const saved = localStorage.getItem(SYSTEM_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        companyName: parsed.companyName || 'QuickRide Booking',
        supportEmail: parsed.supportEmail || 'support@quickridebooking.com',
        supportPhone: parsed.supportPhone || '+63 XXX XXX XXXX',
        currency: parsed.currency || 'PHP',
        timezone: parsed.timezone || 'Asia/Manila',
        taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : 12,
        minimumRentalHours: typeof parsed.minimumRentalHours === 'number' ? parsed.minimumRentalHours : 12,
        lateFeeMethod: parsed.lateFeeMethod || 'hourly_rate',
        lateFeeHourlyNote: parsed.lateFeeHourlyNote || 'Charges +1hr worth of rental cost per hour late, rounded up.',
        lateFeeFlat: typeof parsed.lateFeeFlat === 'number' ? parsed.lateFeeFlat : 500,
        lateFeePercent: typeof parsed.lateFeePercent === 'number' ? parsed.lateFeePercent : 15,
        sessionTimeoutMinutes: typeof parsed.sessionTimeoutMinutes === 'number' ? parsed.sessionTimeoutMinutes : 120,
        pricingBehaviorMode: parsed.pricingBehaviorMode || 'locked',
      };
    }
  } catch {}
  return getDefaultSettings();
}

export function getDefaultSettings(): SystemSettings {
  return {
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
}

export function getPricingBehaviorMode(): PricingBehaviorMode {
  const settings = getSystemSettings();
  return settings.pricingBehaviorMode;
}

export function shouldStorePriceAtBookingTime(): boolean {
  return getPricingBehaviorMode() === 'locked';
}

export function shouldRecalculatePrice(): boolean {
  return getPricingBehaviorMode() === 'recalculated';
}

export function getSessionTimeoutMs(): number {
  const settings = getSystemSettings();
  return settings.sessionTimeoutMinutes * 60 * 1000;
}