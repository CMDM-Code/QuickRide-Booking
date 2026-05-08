/**
 * roles.ts — Hardcoded Role Definitions (A8)
 *
 * Replaces the granular per-module permission toggle grid.
 * Two fixed roles: Admin (full access) and Staff (limited access).
 * Role assignment still works; only the configurable permission grid is removed.
 */

export type UserRole = 'admin' | 'staff' | 'customer';

export interface RoleDefinition {
  label: string;
  description: string;
  permissions: {
    bookings: boolean;
    payments: boolean;
    paymentConfig: boolean;
    vehicles: boolean;
    vehicleAssignment: boolean;
    chat: boolean;
    users: boolean;
    settings: boolean;
    auditLogs: boolean;
    reports: boolean;
  };
}

export const ROLE_DEFINITIONS: Record<Exclude<UserRole, 'customer'>, RoleDefinition> = {
  admin: {
    label: 'Admin',
    description: 'Full access to all modules — bookings, fleet, payments, users, staff, settings, audit logs, and reports.',
    permissions: {
      bookings: true,
      payments: true,
      paymentConfig: true,
      vehicles: true,
      vehicleAssignment: true,
      chat: true,
      users: true,
      settings: true,
      auditLogs: true,
      reports: true,
    },
  },
  staff: {
    label: 'Staff',
    description: 'Booking management, vehicle assignment, and booking chat. No access to settings, audit logs, or payment configuration.',
    permissions: {
      bookings: true,
      payments: true,        // can verify payment uploads
      paymentConfig: false,  // cannot change payment settings
      vehicles: false,       // cannot manage fleet catalog
      vehicleAssignment: true, // can assign vehicles to bookings
      chat: true,
      users: false,
      settings: false,
      auditLogs: false,
      reports: false,
    },
  },
};

/**
 * Returns true if the given role has the specified permission.
 */
export function hasPermission(
  role: UserRole,
  permission: keyof RoleDefinition['permissions']
): boolean {
  if (role === 'customer') return false;
  return ROLE_DEFINITIONS[role]?.permissions[permission] ?? false;
}
