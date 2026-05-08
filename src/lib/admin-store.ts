'use client';
/**
 * admin-store.ts — Admin Access Layer (A5)
 *
 * Deprecated: No longer uses localStorage.
 * All data comes from Firestore via booking-service, vehicle-service, and other services.
 * Pages should import those services directly instead of this store.
 *
 * This file is kept for backwards compatibility. New code should use:
 * - booking-service.ts for bookings
 * - vehicle-service.ts for vehicles
 * - audit-log-service.ts for security logs
 */

import { createVehicle, updateVehicle, deleteVehicle } from './vehicle-service';
import { createAuditLog } from './audit-log-service';

export { type FirestoreBooking as Booking } from './booking-service';
export { type Vehicle } from './vehicle-service';
export {
  getAllBookings as getBookings,
  getBookingsForVehicle,
  updateBookingStatus,
  patchBooking,
} from './booking-service';
export {
  getAllVehicles as getVehicles,
  getVehiclesByStatus,
  createVehicle,
  updateVehicleStatus,
  updateVehicle,
  deleteVehicle,
} from './vehicle-service';
export { getAllAuditLogs as getSecurityLogs, createAuditLog as logSecurityEvent } from './audit-log-service';

// Backwards compatibility types (exported for compatibility but may not match exactly)
export interface SecurityLog {
  id: string;
  timestamp: number;
  action: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'staff';
  status: 'active' | 'disabled';
  createdAt: string;
  lastLogin: string;
}

export interface PriceSnapshot {
  totalAmount: number;
  lockedAt: string;
  pricingMode: 'locked' | 'recalculated';
  lockedBy: string;
}

export interface PricingRule {
  id: string;
  name: string;
  category: string;
  type: 'base' | 'seasonal' | 'weekend' | 'holiday' | 'surge' | 'discount';
  value: number;
  valueType: 'fixed' | 'percentage';
  active: boolean;
  validFrom: string;
  validTo: string;
  priority: number;
  createdAt: string;
}

export interface NotificationTrigger {
  id: string;
  name: string;
  event: string;
  channel: 'email' | 'sms' | 'push' | 'all';
  template: string;
  subject: string;
  active: boolean;
  sendTiming: 'immediate' | '1h' | '24h' | '48h' | '7d';
  createdAt: string;
}

// Compatibility adapter for old code
export type AdminVehicle = any;

export const adminStore = {
  // These are now deprecated. Use the imported functions directly or the services.
  getUsers: () => [] as any[],
  createUser: (_email: string, _name: string, _role: string) => null,
  updateUserStatus: async () => {},
  updateUserRole: (_id: string, _role: string) => {},
  getPricingRules: async () => [],
  createPricingRule: async () => null,
  updatePricingRule: async () => {},
  deletePricingRule: async () => {},
  getNotificationTriggers: async () => [],
  createNotificationTrigger: async () => null,
  updateNotificationTrigger: async () => {},
  deleteNotificationTrigger: async () => {},
  // Bookings fallback (use getBookings directly for real data)
  getBookings: () => [] as any[],
  // Vehicle management (delegates to vehicle-service)
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicles: () => [] as any[],
  // Security logs fallback (use getSecurityLogs directly for real data)
  getSecurityLogs: () => [] as any[],
  // Security logging (delegates to audit-log-service via createAuditLog)
  logSecurityEvent: async (action: string, details: string) => {
    await createAuditLog({
      actor_id: 'system',
      actor_role: 'system',
      action_type: action as any,
      entity_type: 'system',
      entity_id: 'system',
      reason: details,
      before_snapshot: null,
      after_snapshot: null,
      severity: 'info',
    });
  },
};
