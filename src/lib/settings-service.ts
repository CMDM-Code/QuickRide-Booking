import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ─── 1. GENERAL ────────────────────────────────────────────────────────────
export interface GeneralSettings {
  system_name: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  default_language: string;
  system_status: 'active' | 'maintenance';
}

// ─── 2. BOOKING ────────────────────────────────────────────────────────────
export interface BookingSettings {
  booking_mode: 'auto_confirm' | 'requires_approval';
  allow_pending_booking_creation: boolean;
  approval_roles_allowed: string[];
  auto_reject_on_conflict: boolean;
  auto_cancel_conflicting_pending: boolean;
  allow_reactivation_of_cancelled: boolean;
  allow_reapprove_rejected: boolean;
  require_driver: boolean;
  max_booking_duration_hours: number;
  min_booking_duration_hours: number;
}

// ─── 3. PAYMENT ────────────────────────────────────────────────────────────
export interface PaymentSettings {
  downpayment_required: boolean;
  downpayment_type: 'percentage' | 'fixed';
  downpayment_value: number;
  payment_timing: 'before_approval' | 'after_approval' | 'flexible';
  allow_partial_payment: boolean;
  allow_payment_retry: boolean;
  failed_payment_behavior: 'keep_record' | 'create_new_record';
  pending_payment_expiry_minutes: number;
  auto_cancel_unpaid_booking: boolean;
  refund_mode: 'percentage' | 'flat' | 'hybrid';
  refund_default_percentage: number;
  refund_default_flat: number;
  refund_override_allowed: boolean;
  payment_verification_mode: 'manual' | 'api' | 'hybrid';
}

// ─── 4. PRICING ────────────────────────────────────────────────────────────
export interface PricingSettings {
  pricing_mode: 'locked' | 'recalculated';
  rounding_rule: 'ceil' | 'floor' | 'nearest';
  allow_staff_pricing_override: boolean;
  allow_admin_pricing_override: boolean;
  scheduled_pricing_enabled: boolean;
  overlap_resolution: 'priority_based' | 'latest_created_wins';
}

// ─── 5. AVAILABILITY ───────────────────────────────────────────────────────
export interface AvailabilitySettings {
  buffer_time_minutes: number;
  overlap_policy: 'block' | 'warn' | 'allow_override';
  allow_pending_conflict_hold: boolean;
  pending_booking_priority_expiry_minutes: number;
}

// ─── 6. VEHICLES ───────────────────────────────────────────────────────────
export interface VehicleSettings {
  car_type_enabled: boolean;
  car_model_enabled: boolean;
  car_unit_tracking_enabled: boolean;
  assignment_mode: 'auto_first_available' | 'auto_best_match' | 'manual_required';
  conflict_policy: 'block' | 'warn' | 'override_allowed';
  vehicle_unavailable_behavior: 'auto_reassign' | 'manual_intervention';
  vehicle_maintenance_mode_enabled: boolean;
  maintenance_blocks_booking: boolean;
}

// ─── 7. CHAT ───────────────────────────────────────────────────────────────
export interface ChatSettings {
  booking_chat_enabled: boolean;
  support_chat_enabled: boolean;
  support_mode: 'ticket_based' | 'group_based';
  support_assignment_mode: 'auto' | 'manual';
  allow_client_chat_edit: boolean;
  allow_client_chat_delete: boolean;
  allow_staff_chat_moderation: boolean;
  chat_close_behavior: 'archived_readonly' | 'deleted';
}

// ─── 8. NOTIFICATIONS ──────────────────────────────────────────────────────
export interface NotificationSettings {
  in_app_notifications: boolean;
  email_notifications: boolean;
  trigger_booking_created: boolean;
  trigger_booking_approved: boolean;
  trigger_booking_rejected: boolean;
  trigger_payment_received: boolean;
  trigger_payment_failed: boolean;
  trigger_refund_processed: boolean;
  urgency_only_flag: boolean;
}

// ─── 9. BRANDING (managed by branding-service.ts, stub here) ───────────────
// Branding is handled by src/lib/branding-service.ts + /admin/settings/branding

// ─── 10. ROLES & PERMISSIONS ───────────────────────────────────────────────
export interface RolePermission {
  role_id: string;
  role_name: string;
  permissions: {
    bookings: boolean;
    payments: boolean;
    vehicles: boolean;
    chat: boolean;
    users: boolean;
    settings: boolean;
  };
}

export interface RolesSettings {
  roles: RolePermission[];
}

// ─── 11. SYSTEM BEHAVIOR ───────────────────────────────────────────────────
export interface SystemBehaviorSettings {
  audit_logging_enabled: boolean;
  log_level: 'minimal' | 'full';
  audit_retention_days: number;
  chat_retention_policy: string;
  maintenance_enabled: boolean;
  maintenance_allow_admin_bypass: boolean;
  maintenance_blocks_booking_creation: boolean;
  maintenance_blocks_payment_processing: boolean;
  // Legacy
  sessionTimeoutMinutes: number;
  lateFeeMethod: 'hourly_rate' | 'flat_amount' | 'percentage';
  lateFeeFlat: number;
  lateFeePercent: number;
  taxRate: number;
}

// ─── FULL CONFIG ───────────────────────────────────────────────────────────
export interface FullSystemConfig {
  general: GeneralSettings;
  booking: BookingSettings;
  payment: PaymentSettings;
  pricing: PricingSettings;
  availability: AvailabilitySettings;
  vehicles: VehicleSettings;
  chat: ChatSettings;
  notifications: NotificationSettings;
  roles: RolesSettings;
  system: SystemBehaviorSettings;
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────
export function getDefaultFullConfig(): FullSystemConfig {
  return {
    general: {
      system_name: 'QuickRide Booking',
      support_email: 'support@quickridebooking.com',
      support_phone: '+63 XXX XXX XXXX',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      default_language: 'en',
      system_status: 'active',
    },
    booking: {
      booking_mode: 'requires_approval',
      allow_pending_booking_creation: true,
      approval_roles_allowed: ['admin', 'staff'],
      auto_reject_on_conflict: false,
      auto_cancel_conflicting_pending: true,
      allow_reactivation_of_cancelled: true,
      allow_reapprove_rejected: true,
      require_driver: false,
      max_booking_duration_hours: 720,
      min_booking_duration_hours: 12,
    },
    payment: {
      downpayment_required: true,
      downpayment_type: 'percentage',
      downpayment_value: 50,
      payment_timing: 'after_approval',
      allow_partial_payment: false,
      allow_payment_retry: true,
      failed_payment_behavior: 'keep_record',
      pending_payment_expiry_minutes: 60,
      auto_cancel_unpaid_booking: false,
      refund_mode: 'percentage',
      refund_default_percentage: 80,
      refund_default_flat: 500,
      refund_override_allowed: true,
      payment_verification_mode: 'manual',
    },
    pricing: {
      pricing_mode: 'locked',
      rounding_rule: 'ceil',
      allow_staff_pricing_override: false,
      allow_admin_pricing_override: true,
      scheduled_pricing_enabled: false,
      overlap_resolution: 'priority_based',
    },
    availability: {
      buffer_time_minutes: 30,
      overlap_policy: 'block',
      allow_pending_conflict_hold: true,
      pending_booking_priority_expiry_minutes: 30,
    },
    vehicles: {
      car_type_enabled: true,
      car_model_enabled: true,
      car_unit_tracking_enabled: true,
      assignment_mode: 'auto_first_available',
      conflict_policy: 'block',
      vehicle_unavailable_behavior: 'manual_intervention',
      vehicle_maintenance_mode_enabled: true,
      maintenance_blocks_booking: true,
    },
    chat: {
      booking_chat_enabled: true,
      support_chat_enabled: true,
      support_mode: 'ticket_based',
      support_assignment_mode: 'auto',
      allow_client_chat_edit: false,
      allow_client_chat_delete: false,
      allow_staff_chat_moderation: true,
      chat_close_behavior: 'archived_readonly',
    },
    notifications: {
      in_app_notifications: true,
      email_notifications: false,
      trigger_booking_created: true,
      trigger_booking_approved: true,
      trigger_booking_rejected: true,
      trigger_payment_received: true,
      trigger_payment_failed: true,
      trigger_refund_processed: true,
      urgency_only_flag: false,
    },
    roles: {
      roles: [
        {
          role_id: 'admin',
          role_name: 'Admin',
          permissions: { bookings: true, payments: true, vehicles: true, chat: true, users: true, settings: true },
        },
        {
          role_id: 'staff',
          role_name: 'Staff',
          permissions: { bookings: true, payments: true, vehicles: false, chat: true, users: false, settings: false },
        },
      ],
    },
    system: {
      audit_logging_enabled: true,
      log_level: 'full',
      audit_retention_days: 90,
      chat_retention_policy: '365 days',
      maintenance_enabled: false,
      maintenance_allow_admin_bypass: true,
      maintenance_blocks_booking_creation: true,
      maintenance_blocks_payment_processing: true,
      sessionTimeoutMinutes: 120,
      lateFeeMethod: 'hourly_rate',
      lateFeeFlat: 500,
      lateFeePercent: 15,
      taxRate: 12,
    },
  };
}

const SETTINGS_DOC_PATH = 'system_config/settings';
const SETTINGS_CACHE_KEY = 'quickride_full_config_v2';

function loadCache(): FullSystemConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) return { ...getDefaultFullConfig(), ...JSON.parse(raw) };
  } catch {}
  return getDefaultFullConfig();
}

function saveCache(config: FullSystemConfig) {
  try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(config)); } catch {}
}

export function getFullConfig(): FullSystemConfig {
  if (typeof window === 'undefined') return getDefaultFullConfig();
  return loadCache();
}

export async function fetchFullConfig(): Promise<FullSystemConfig> {
  if (!db) return loadCache();
  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC_PATH));
    if (snap.exists()) {
      const data = snap.data() as any;
      const merged: FullSystemConfig = {
        ...getDefaultFullConfig(),
        ...data,
        general: { ...getDefaultFullConfig().general, ...(data.general || {}) },
        booking: { ...getDefaultFullConfig().booking, ...(data.booking || {}) },
        payment: { ...getDefaultFullConfig().payment, ...(data.payment || {}) },
        pricing: { ...getDefaultFullConfig().pricing, ...(data.pricing || {}) },
        availability: { ...getDefaultFullConfig().availability, ...(data.availability || {}) },
        vehicles: { ...getDefaultFullConfig().vehicles, ...(data.vehicles || {}) },
        chat: { ...getDefaultFullConfig().chat, ...(data.chat || {}) },
        notifications: { ...getDefaultFullConfig().notifications, ...(data.notifications || {}) },
        roles: { ...getDefaultFullConfig().roles, ...(data.roles || {}) },
        system: { ...getDefaultFullConfig().system, ...(data.system || {}) },
      };
      saveCache(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Failed to fetch full config from Firestore:', e);
  }
  return loadCache();
}

export async function saveFullConfig(config: FullSystemConfig): Promise<void> {
  saveCache(config);
  if (!db) return;
  await setDoc(doc(db, SETTINGS_DOC_PATH), { ...config, updated_at: serverTimestamp() }, { merge: true });
}

export async function saveConfigSection<K extends keyof FullSystemConfig>(
  section: K,
  data: FullSystemConfig[K]
): Promise<void> {
  const current = loadCache();
  const updated = { ...current, [section]: data };
  saveCache(updated);
  if (!db) return;
  await setDoc(doc(db, SETTINGS_DOC_PATH), { [section]: data, updated_at: serverTimestamp() }, { merge: true });
}

// ─── LEGACY COMPAT (used by other files) ──────────────────────────────────
export type PricingBehaviorMode = 'locked' | 'recalculated';

export interface SystemSettings {
  companyName: string; supportEmail: string; supportPhone: string;
  currency: string; timezone: string; taxRate: number;
  minimumRentalHours: number;
  lateFeeMethod: 'hourly_rate' | 'flat_amount' | 'percentage';
  lateFeeHourlyNote: string; lateFeeFlat: number; lateFeePercent: number;
  sessionTimeoutMinutes: number;
  pricingBehaviorMode: PricingBehaviorMode;
  primaryColor: string; secondaryColor: string; accentColor: string;
  sidebarColor: string; headerColor: string;
}

export function getDefaultSettings(): SystemSettings {
  const d = getDefaultFullConfig();
  return {
    companyName: d.general.system_name,
    supportEmail: d.general.support_email,
    supportPhone: d.general.support_phone,
    currency: d.general.currency,
    timezone: d.general.timezone,
    taxRate: d.system.taxRate,
    minimumRentalHours: d.booking.min_booking_duration_hours,
    lateFeeMethod: d.system.lateFeeMethod,
    lateFeeHourlyNote: 'Charges +1hr worth of rental cost per hour late, rounded up.',
    lateFeeFlat: d.system.lateFeeFlat,
    lateFeePercent: d.system.lateFeePercent,
    sessionTimeoutMinutes: d.system.sessionTimeoutMinutes,
    pricingBehaviorMode: d.pricing.pricing_mode,
    primaryColor: '#10b981', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', sidebarColor: '#1e293b', headerColor: '#ffffff',
  };
}

export async function fetchSettingsFromFirestore(): Promise<SystemSettings> {
  const cfg = await fetchFullConfig();
  return {
    companyName: cfg.general.system_name,
    supportEmail: cfg.general.support_email,
    supportPhone: cfg.general.support_phone,
    currency: cfg.general.currency,
    timezone: cfg.general.timezone,
    taxRate: cfg.system.taxRate,
    minimumRentalHours: cfg.booking.min_booking_duration_hours,
    lateFeeMethod: cfg.system.lateFeeMethod,
    lateFeeHourlyNote: 'Charges +1hr worth of rental cost per hour late, rounded up.',
    lateFeeFlat: cfg.system.lateFeeFlat,
    lateFeePercent: cfg.system.lateFeePercent,
    sessionTimeoutMinutes: cfg.system.sessionTimeoutMinutes,
    pricingBehaviorMode: cfg.pricing.pricing_mode,
    primaryColor: '#10b981', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', sidebarColor: '#1e293b', headerColor: '#ffffff',
  };
}

export async function saveSettings(s: SystemSettings): Promise<void> {
  const cfg = loadCache();
  cfg.general.system_name = s.companyName;
  cfg.general.support_email = s.supportEmail;
  cfg.general.support_phone = s.supportPhone;
  cfg.general.currency = s.currency;
  cfg.general.timezone = s.timezone;
  cfg.system.taxRate = s.taxRate;
  cfg.system.lateFeeMethod = s.lateFeeMethod;
  cfg.system.lateFeeFlat = s.lateFeeFlat;
  cfg.system.lateFeePercent = s.lateFeePercent;
  cfg.system.sessionTimeoutMinutes = s.sessionTimeoutMinutes;
  cfg.pricing.pricing_mode = s.pricingBehaviorMode;
  cfg.booking.min_booking_duration_hours = s.minimumRentalHours;
  await saveFullConfig(cfg);
}

export function getPricingBehaviorMode(): PricingBehaviorMode {
  return getFullConfig().pricing.pricing_mode;
}
export function shouldStorePriceAtBookingTime(): boolean { return getPricingBehaviorMode() === 'locked'; }
export function shouldRecalculatePrice(): boolean { return getPricingBehaviorMode() === 'recalculated'; }
export function getSessionTimeoutMs(): number { return getFullConfig().system.sessionTimeoutMinutes * 60 * 1000; }