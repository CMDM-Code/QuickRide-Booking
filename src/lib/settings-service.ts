import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type PricingBehaviorMode = 'locked' | 'recalculated';

const SYSTEM_SETTINGS_KEY = 'quickride_system_settings';
const SETTINGS_DOC_PATH = 'system_config/settings';

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
  // Branding Theme Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  headerColor: string;
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
    // Branding Theme Colors (default green theme)
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    sidebarColor: '#1e293b',
    headerColor: '#ffffff',
  };
}

/** Read from localStorage cache */
function getLocalSettings(): SystemSettings {
  try {
    const saved = localStorage.getItem(SYSTEM_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultSettings(), ...parsed };
    }
  } catch {}
  return getDefaultSettings();
}

/** Write to localStorage cache */
function setLocalSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

/** Synchronous getter — returns cached/local settings immediately */
export function getSystemSettings(): SystemSettings {
  return getLocalSettings();
}

/** Async fetch from Firestore, updates local cache */
export async function fetchSettingsFromFirestore(): Promise<SystemSettings> {
  if (!db) return getLocalSettings();

  try {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const settings: SystemSettings = {
        ...getDefaultSettings(),
        ...data,
      };
      // Cache to localStorage for offline resilience
      setLocalSettings(settings);
      return settings;
    }
  } catch (e) {
    console.warn('Failed to fetch settings from Firestore, using local cache:', e);
  }

  return getLocalSettings();
}

/** Save settings to both Firestore and localStorage */
export async function saveSettings(settings: SystemSettings): Promise<void> {
  // Always cache locally
  setLocalSettings(settings);

  if (!db) return;

  try {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    await setDoc(docRef, {
      ...settings,
      updated_at: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error('Failed to save settings to Firestore:', e);
    throw e;
  }
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

// Theme color helpers
export function getThemeColors() {
  const settings = getSystemSettings();
  return {
    primary: settings.primaryColor,
    secondary: settings.secondaryColor,
    accent: settings.accentColor,
    sidebar: settings.sidebarColor,
    header: settings.headerColor,
  };
}

export function applyThemeColors(colors: {
  primary?: string;
  secondary?: string;
  accent?: string;
  sidebar?: string;
  header?: string;
}) {
  const root = document.documentElement;
  if (colors.primary) root.style.setProperty('--theme-primary', colors.primary);
  if (colors.secondary) root.style.setProperty('--theme-secondary', colors.secondary);
  if (colors.accent) root.style.setProperty('--theme-accent', colors.accent);
  if (colors.sidebar) root.style.setProperty('--theme-sidebar', colors.sidebar);
  if (colors.header) root.style.setProperty('--theme-header', colors.header);
}