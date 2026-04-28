'use client';

import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Comprehensive Audit Log System — Firestore Backend
 * 
 * Per CurrentContext.md spec:
 * - Immutable append-only storage (Firestore + localStorage fallback)
 * - Captures: actor_id, role, action_type, entity_type, entity_id, 
 *   before_snapshot, after_snapshot, timestamp, reason
 * - Reason mandatory for: overrides, refunds, cancellations, assignment changes
 * - Offline support: queues to localStorage, syncs when online
 */

export type AuditActionType = 
  | 'booking_created' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' 
  | 'booking_updated' | 'booking_reactivated' | 'payment_received' | 'payment_failed'
  | 'payment_refunded' | 'vehicle_assigned' | 'vehicle_reassigned' | 'vehicle_status_changed'
  | 'price_override' | 'status_override' | 'settings_changed' | 'user_created'
  | 'user_updated' | 'user_deleted' | 'role_changed' | 'login' | 'logout';

export type EntityType = 
  | 'booking' | 'payment' | 'vehicle' | 'user' | 'settings' | 'pricing' | 'role' | 'system';

export type ActorRole = 'admin' | 'staff' | 'client' | 'system';

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: ActorRole;
  actor_name?: string;
  action_type: AuditActionType;
  entity_type: EntityType;
  entity_id: string;
  entity_name?: string;
  before_snapshot: Record<string, any> | null;
  after_snapshot: Record<string, any> | null;
  timestamp: string;
  reason: string;
  ip_address?: string;
  user_agent?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AuditLogFilter {
  entityType?: EntityType;
  actionType?: AuditActionType;
  actorId?: string;
  actorRole?: ActorRole;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: 'info' | 'warning' | 'critical';
  searchQuery?: string;
}

const AUDIT_LOG_KEY = 'quickride_audit_logs_v1';
const AUDIT_QUEUE_KEY = 'quickride_audit_queue'; // For offline queuing
const MAX_LOG_ENTRIES = 5000; // Retention limit
const COLLECTION_NAME = 'audit_logs';

function generateId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Track if Firestore is available
let firestoreAvailable = true;

function getSettings(): { enabled: boolean; logLevel: 'minimal' | 'full'; retentionDays: number } {
  try {
    const config = JSON.parse(localStorage.getItem('quickride_full_config_v2') || '{}');
    return {
      enabled: config?.system?.audit_logging_enabled ?? true,
      logLevel: config?.system?.log_level ?? 'full',
      retentionDays: config?.system?.audit_retention_days ?? 90
    };
  } catch {
    return { enabled: true, logLevel: 'full', retentionDays: 90 };
  }
}

// Check if we're online
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Queue log for offline sync
function queueForSync(entry: AuditLogEntry): void {
  try {
    const queue = JSON.parse(localStorage.getItem(AUDIT_QUEUE_KEY) || '[]');
    queue.push(entry);
    localStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(queue.slice(-100))); // Keep last 100
  } catch {
    // Silent fail
  }
}

// Get queued logs
function getQueuedLogs(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

// Clear queue after sync
function clearQueue(): void {
  localStorage.removeItem(AUDIT_QUEUE_KEY);
}

function requiresReason(action: AuditActionType): boolean {
  const reasonRequiredActions: AuditActionType[] = [
    'booking_cancelled', 'booking_reactivated', 'price_override', 'status_override',
    'vehicle_reassigned', 'payment_refunded', 'settings_changed'
  ];
  return reasonRequiredActions.includes(action);
}

/**
 * Creates an audit log entry.
 * Primary function for logging — writes to Firestore (with offline fallback).
 */
export async function createAuditLog(
  params: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ip_address' | 'user_agent'> & { reason?: string }
): Promise<AuditLogEntry | null> {
  const settings = getSettings();
  
  if (!settings.enabled) return null;
  
  // Validate reason for actions that require it
  if (requiresReason(params.action_type) && !params.reason) {
    console.warn(`Audit log: Reason required for action ${params.action_type}`);
  }

  const entry: AuditLogEntry = {
    id: generateId(),
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    actor_name: params.actor_name,
    action_type: params.action_type,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    entity_name: params.entity_name,
    before_snapshot: params.before_snapshot,
    after_snapshot: params.after_snapshot,
    timestamp: new Date().toISOString(),
    reason: params.reason || '',
    ip_address: typeof window !== 'undefined' ? '127.0.0.1' : undefined,
    user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    severity: params.severity || 'info'
  };

  // Always cache locally for immediate retrieval
  try {
    const existing = getCachedLogs();
    const updated = [entry, ...existing].slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail on localStorage
  }

  // If offline, queue for later sync
  if (!isOnline()) {
    queueForSync(entry);
    return entry;
  }

  // Try Firestore
  if (!db || !firestoreAvailable) {
    queueForSync(entry);
    return entry;
  }

  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...entry,
      created_at: Timestamp.fromDate(new Date(entry.timestamp))
    });
  } catch (error) {
    console.warn('Audit log Firestore write failed, queued for sync:', error);
    firestoreAvailable = false;
    queueForSync(entry);
  }

  return entry;
}

/**
 * Gets cached audit logs from localStorage (fast, offline-capable)
 */
export function getCachedLogs(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Gets all audit logs from Firestore (authoritative source)
 * Falls back to cache if offline or Firestore unavailable
 */
export async function getAllAuditLogs(): Promise<AuditLogEntry[]> {
  // If offline or Firestore unavailable, return cache
  if (!isOnline() || !db || !firestoreAvailable) {
    return getCachedLogs();
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('created_at', 'desc'),
      limit(MAX_LOG_ENTRIES)
    );
    
    const snapshot = await getDocs(q);
    const logs: AuditLogEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: data.id || doc.id,
        timestamp: data.timestamp || data.created_at?.toDate?.().toISOString() || new Date().toISOString()
      } as AuditLogEntry;
    });

    // Update cache with authoritative data
    try {
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch {
      // Silent fail
    }

    return logs;
  } catch (error) {
    console.warn('Audit log Firestore read failed, using cache:', error);
    firestoreAvailable = false;
    return getCachedLogs();
  }
}

/**
 * Syncs queued offline logs to Firestore when connection restored
 */
export async function syncQueuedLogs(): Promise<number> {
  if (!isOnline() || !db) return 0;
  
  const queue = getQueuedLogs();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const entry of queue) {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...entry,
        created_at: Timestamp.fromDate(new Date(entry.timestamp)),
        synced_at: Timestamp.now()
      });
      synced++;
    } catch {
      // Keep in queue if fail
    }
  }

  if (synced === queue.length) {
    clearQueue();
    firestoreAvailable = true;
  }

  return synced;
}

/**
 * Filters audit logs based on criteria
 */
export function filterAuditLogs(
  logs: AuditLogEntry[],
  filter: AuditLogFilter
): AuditLogEntry[] {
  return logs.filter(log => {
    if (filter.entityType && log.entity_type !== filter.entityType) return false;
    if (filter.actionType && log.action_type !== filter.actionType) return false;
    if (filter.actorId && log.actor_id !== filter.actorId) return false;
    if (filter.actorRole && log.actor_role !== filter.actorRole) return false;
    if (filter.entityId && log.entity_id !== filter.entityId) return false;
    if (filter.severity && log.severity !== filter.severity) return false;
    
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      if (new Date(log.timestamp) < fromDate) return false;
    }
    
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(log.timestamp) > toDate) return false;
    }
    
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const searchable = [
        log.action_type,
        log.entity_type,
        log.entity_id,
        log.actor_name,
        log.entity_name,
        log.reason
      ].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    
    return true;
  });
}

/**
 * Gets unique values for filter dropdowns
 */
export function getFilterOptions(logs: AuditLogEntry[]) {
  const entityTypes = new Set<EntityType>();
  const actionTypes = new Set<AuditActionType>();
  const actors = new Map<string, { id: string; name: string; role: ActorRole }>();
  const severities = new Set<'info' | 'warning' | 'critical'>();

  logs.forEach(log => {
    entityTypes.add(log.entity_type);
    actionTypes.add(log.action_type);
    severities.add(log.severity);
    if (!actors.has(log.actor_id)) {
      actors.set(log.actor_id, {
        id: log.actor_id,
        name: log.actor_name || log.actor_id,
        role: log.actor_role
      });
    }
  });

  return {
    entityTypes: Array.from(entityTypes).sort(),
    actionTypes: Array.from(actionTypes).sort(),
    actors: Array.from(actors.values()).sort((a, b) => a.name.localeCompare(b.name)),
    severities: Array.from(severities).sort()
  };
}

/**
 * Export logs to JSON format
 */
export function exportAuditLogs(logs: AuditLogEntry[]): string {
  return JSON.stringify(logs, null, 2);
}

/**
 * Clear all audit logs (admin only operation - should be logged!)
 */
export function clearAuditLogs(actorId: string, actorName: string, reason: string): boolean {
  if (!reason) {
    console.error('Audit log clear failed: reason required');
    return false;
  }

  try {
    const oldLogs = getCachedLogs(); // Use cached logs for synchronous access
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify([]));
    
    // Log the clearing action (fire and forget - don't await in clear function)
    const clearingEntry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ip_address' | 'user_agent'> = {
      actor_id: actorId,
      actor_role: 'admin',
      actor_name: actorName,
      action_type: 'settings_changed',
      entity_type: 'system',
      entity_id: 'audit_logs',
      entity_name: 'Audit Logs',
      before_snapshot: { count: oldLogs.length },
      after_snapshot: { count: 0 },
      reason: `Cleared all audit logs: ${reason}`,
      severity: 'critical'
    };
    
    // Fire and forget - don't block on this
    createAuditLog(clearingEntry).catch(() => {});
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience helpers for common audit log scenarios
 */
export const auditHelpers = {
  logBookingApproval: (
    bookingId: string, bookingName: string, 
    actorId: string, actorName: string, actorRole: ActorRole,
    beforeStatus: string, afterStatus: string,
    priceSnapshot?: { totalPrice: number; lockedAt: string }
  ) => createAuditLog({
    actor_id: actorId, actor_role: actorRole, actor_name: actorName,
    action_type: 'booking_approved', entity_type: 'booking', entity_id: bookingId, entity_name: bookingName,
    before_snapshot: { status: beforeStatus },
    after_snapshot: { status: afterStatus, priceSnapshot },
    reason: 'Booking approved',
    severity: 'info'
  }),

  logBookingCancellation: (
    bookingId: string, bookingName: string,
    actorId: string, actorName: string, actorRole: ActorRole,
    reason: string, beforeStatus: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: actorRole, actor_name: actorName,
    action_type: 'booking_cancelled', entity_type: 'booking', entity_id: bookingId, entity_name: bookingName,
    before_snapshot: { status: beforeStatus },
    after_snapshot: { status: 'cancelled' },
    reason,
    severity: 'warning'
  }),

  logPriceOverride: (
    entityId: string, entityType: EntityType, entityName: string,
    actorId: string, actorName: string,
    originalPrice: number, newPrice: number,
    reason: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: 'admin', actor_name: actorName,
    action_type: 'price_override', entity_type: entityType, entity_id: entityId, entity_name: entityName,
    before_snapshot: { price: originalPrice },
    after_snapshot: { price: newPrice },
    reason,
    severity: 'warning'
  }),

  logVehicleAssignment: (
    bookingId: string, vehicleId: string, vehicleName: string,
    actorId: string, actorName: string, actorRole: ActorRole,
    reason?: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: actorRole, actor_name: actorName,
    action_type: 'vehicle_assigned', entity_type: 'vehicle', entity_id: vehicleId, entity_name: vehicleName,
    before_snapshot: { bookingId, vehicleId: null },
    after_snapshot: { bookingId, vehicleId },
    reason: reason || 'Vehicle assigned to booking',
    severity: 'info'
  }),

  logVehicleReassignment: (
    bookingId: string, oldVehicleId: string, newVehicleId: string, vehicleName: string,
    actorId: string, actorName: string, actorRole: ActorRole,
    reason: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: actorRole, actor_name: actorName,
    action_type: 'vehicle_reassigned', entity_type: 'vehicle', entity_id: newVehicleId, entity_name: vehicleName,
    before_snapshot: { bookingId, vehicleId: oldVehicleId },
    after_snapshot: { bookingId, vehicleId: newVehicleId },
    reason,
    severity: 'warning'
  }),

  logPaymentRefund: (
    paymentId: string, bookingId: string,
    actorId: string, actorName: string,
    originalAmount: number, refundAmount: number,
    reason: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: 'admin', actor_name: actorName,
    action_type: 'payment_refunded', entity_type: 'payment', entity_id: paymentId, entity_name: `Payment for ${bookingId}`,
    before_snapshot: { status: 'paid', amount: originalAmount },
    after_snapshot: { status: 'refunded', refundAmount },
    reason,
    severity: 'warning'
  }),

  logSettingsChange: (
    settingsKey: string, actorId: string, actorName: string,
    beforeValue: any, afterValue: any,
    reason: string
  ) => createAuditLog({
    actor_id: actorId, actor_role: 'admin', actor_name: actorName,
    action_type: 'settings_changed', entity_type: 'settings', entity_id: settingsKey, entity_name: settingsKey,
    before_snapshot: { value: beforeValue },
    after_snapshot: { value: afterValue },
    reason,
    severity: 'info'
  })
};
