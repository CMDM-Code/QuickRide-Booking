/**
 * booking-engine.ts — Core Booking Validation Engine (B2 + B3)
 *
 * Reads all settings at runtime from Firestore via getFullConfig().
 * Never uses hardcoded values.
 *
 * Functions:
 *  checkConflict()        — live overlap detection with buffer time (B3)
 *  onSubmitBooking()      — validates + creates booking doc (B2.1)
 *  onApproveBooking()     — approves + auto-cancels conflicts (B2.2)
 *  canReactivate()        — checks allow_reactivation_of_cancelled (B2.3)
 *  canReapprove()         — checks allow_reapprove_rejected (B2.4)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { getFullConfig } from './settings-service';
import type { FirestoreBooking } from './booking-service';
import type { BookingActivityLog } from './booking-service';

const BOOKINGS = 'bookings';

// ─── B3 — Overlap + Buffer Time ───────────────────────────────────────────────

export interface ConflictResult {
  hasConflict: boolean;
  conflictingIds: string[];
  policy: 'block' | 'warn' | 'allow_override';
}

/**
 * Check if a vehicle has overlapping bookings for a given date range,
 * applying the configured buffer_time_minutes on both ends.
 *
 * @param vehicleId       The vehicle to check.
 * @param startDate       Requested start date (ISO string).
 * @param endDate         Requested end date (ISO string).
 * @param excludeId       Optional booking ID to exclude (for edits).
 * @param statusFilter    Booking statuses to check against (defaults to active/pending/approved).
 */
export async function checkConflict(
  vehicleId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
  statusFilter: FirestoreBooking['status'][] = ['pending', 'approved', 'active']
): Promise<ConflictResult> {
  const config = getFullConfig();
  const bufferMs = config.availability.buffer_time_minutes * 60 * 1000;
  const policy = config.availability.overlap_policy as ConflictResult['policy'];

  const reqStart = new Date(startDate).getTime() - bufferMs;
  const reqEnd   = new Date(endDate).getTime()   + bufferMs;

  // Query Firestore for all active/pending bookings for this vehicle
  const q = query(
    collection(db, BOOKINGS),
    where('car_id', '==', vehicleId),
    where('status', 'in', statusFilter)
  );

  const snap = await getDocs(q);
  const conflicting: string[] = [];

  for (const d of snap.docs) {
    if (excludeId && d.id === excludeId) continue;
    const data = d.data();
    const bStart = new Date(data.start_date?.toDate?.() ?? data.start_date).getTime();
    const bEnd   = new Date(data.end_date?.toDate?.()   ?? data.end_date).getTime();

    // Two ranges overlap if start1 < end2 AND end1 > start2
    if (reqStart < bEnd && reqEnd > bStart) {
      conflicting.push(d.id);
    }
  }

  return { hasConflict: conflicting.length > 0, conflictingIds: conflicting, policy };
}

// ─── B2.1 — Submit Booking ────────────────────────────────────────────────────

export interface SubmitBookingResult {
  allowed: boolean;
  reason?: string;
  conflict?: ConflictResult;
}

/**
 * Validates whether a new booking can be submitted for a vehicle and date range.
 * Checks:
 *  - Maintenance mode (B5.1)
 *  - Vehicle maintenance blocks booking (B4.4)
 *  - Overlap policy (B3)
 *  - Auto-reject on conflict (B2.1)
 *
 * Does NOT write to Firestore — validation only.
 */
export async function validateBookingSubmit(
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<SubmitBookingResult> {
  const config = getFullConfig();

  // B5.1 — maintenance mode check
  if (config.system.maintenance_enabled && config.system.maintenance_blocks_booking_creation) {
    return { allowed: false, reason: 'The system is currently under maintenance. Booking creation is temporarily disabled.' };
  }

  // B4.4 — vehicle maintenance check
  if (config.vehicles.vehicle_maintenance_mode_enabled && config.vehicles.maintenance_blocks_booking) {
    const vSnap = await getDoc(doc(db, 'vehicles', vehicleId));
    if (vSnap.exists() && vSnap.data().status === 'maintenance') {
      return { allowed: false, reason: 'This vehicle is currently under maintenance and cannot be booked.' };
    }
  }

  // B3 — conflict check
  const conflict = await checkConflict(vehicleId, startDate, endDate);

  if (conflict.hasConflict) {
    if (conflict.policy === 'block') {
      return { allowed: false, reason: 'This vehicle is not available for the selected dates.', conflict };
    }
    if (config.booking.auto_reject_on_conflict) {
      return { allowed: false, reason: 'Booking was automatically rejected due to a scheduling conflict.', conflict };
    }
    if (conflict.policy === 'warn') {
      // Warn but allow — caller should surface the warning
      return { allowed: true, reason: 'Warning: scheduling conflict detected. Admin must review.', conflict };
    }
  }

  return { allowed: true };
}

// ─── B2.2 — Approve Booking ───────────────────────────────────────────────────

export interface ApproveResult {
  success: boolean;
  cancelledIds?: string[];
  reason?: string;
}

/**
 * Approves a booking. If auto_cancel_conflicting_pending is on,
 * also cancels any other pending bookings for the same vehicle in the same window.
 *
 * @param bookingId   ID of the booking to approve.
 * @param approverId  UID of the approving admin/staff.
 * @param approverName Name of the approving admin/staff (for log).
 */
export async function onApproveBooking(
  bookingId: string,
  approverId: string,
  approverName: string
): Promise<ApproveResult> {
  const config = getFullConfig();

  const bookingRef = doc(db, BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) return { success: false, reason: 'Booking not found.' };

  const booking = bookingSnap.data() as FirestoreBooking;
  if (booking.status !== 'pending') {
    return { success: false, reason: `Cannot approve a booking with status: ${booking.status}` };
  }

  const logEntry: BookingActivityLog = {
    at: new Date().toISOString(),
    by: approverName,
    action: 'approved',
    detail: `Approved by ${approverName}`,
  };

  const batch = writeBatch(db);
  const existingLog = (booking.activity_log || []) as BookingActivityLog[];

  // Approve the booking — lock price at this moment (A4)
  batch.update(bookingRef, {
    status: 'approved',
    price_locked_at: new Date().toISOString(),
    activity_log: [...existingLog, logEntry],
    updated_at: serverTimestamp(),
  });

  const cancelledIds: string[] = [];

  // B2.2 — Auto-cancel conflicting pending bookings
  if (config.booking.auto_cancel_conflicting_pending) {
    const conflict = await checkConflict(
      booking.car_id,
      booking.start_date,
      booking.end_date,
      bookingId,
      ['pending']
    );

    for (const cId of conflict.conflictingIds) {
      const cRef = doc(db, BOOKINGS, cId);
      const cSnap = await getDoc(cRef);
      if (!cSnap.exists()) continue;
      const cLog = (cSnap.data().activity_log || []) as BookingActivityLog[];
      batch.update(cRef, {
        status: 'cancelled',
        activity_log: [
          ...cLog,
          {
            at: new Date().toISOString(),
            by: 'system',
            action: 'auto_cancelled',
            detail: `Auto-cancelled: conflicting booking ${bookingId} was approved.`,
          } as BookingActivityLog,
        ],
        updated_at: serverTimestamp(),
      });
      cancelledIds.push(cId);
    }
  }

  await batch.commit();
  return { success: true, cancelledIds };
}

// ─── B2.3 — Reactivate Cancelled ─────────────────────────────────────────────

/**
 * Returns whether a cancelled booking can be reactivated,
 * based on allow_reactivation_of_cancelled setting.
 */
export function canReactivate(bookingStatus: FirestoreBooking['status']): boolean {
  if (bookingStatus !== 'cancelled') return false;
  return getFullConfig().booking.allow_reactivation_of_cancelled;
}

// ─── B2.4 — Re-approve Rejected ──────────────────────────────────────────────

/**
 * Returns whether a rejected booking can be re-approved,
 * based on allow_reapprove_rejected setting.
 */
export function canReapprove(bookingStatus: FirestoreBooking['status']): boolean {
  if (bookingStatus !== 'rejected') return false;
  return getFullConfig().booking.allow_reapprove_rejected;
}

/**
 * Reactivates a cancelled booking by resetting status to pending.
 * Can only be called if canReactivate() returns true.
 * Logs action and notifies customer.
 */
export async function reactivateBooking(
  bookingId: string,
  staffName: string = 'system'
): Promise<{ success: boolean; reason?: string }> {
  const bookingRef = doc(db, BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  
  if (!bookingSnap.exists()) {
    return { success: false, reason: 'Booking not found.' };
  }

  const booking = bookingSnap.data() as FirestoreBooking;
  
  if (booking.status !== 'cancelled') {
    return { success: false, reason: `Cannot reactivate a booking with status: ${booking.status}` };
  }

  if (!canReactivate(booking.status)) {
    return { success: false, reason: 'Booking reactivation is not allowed by system settings.' };
  }

  const existingLog = (booking.activity_log || []) as BookingActivityLog[];
  await updateDoc(bookingRef, {
    status: 'pending',
    activity_log: [
      ...existingLog,
      {
        at: new Date().toISOString(),
        by: staffName,
        action: 'reactivated',
        detail: `Booking reactivated by ${staffName}.`,
      } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  });

  return { success: true };
}

/**
 * Re-evaluates a rejected booking by resetting status to pending for review.
 * Can only be called if canReapprove() returns true.
 * Logs action and allows re-submission for approval.
 */
export async function reapproveRejectedBooking(
  bookingId: string,
  staffName: string = 'system'
): Promise<{ success: boolean; reason?: string }> {
  const bookingRef = doc(db, BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  
  if (!bookingSnap.exists()) {
    return { success: false, reason: 'Booking not found.' };
  }

  const booking = bookingSnap.data() as FirestoreBooking;
  
  if (booking.status !== 'rejected') {
    return { success: false, reason: `Cannot re-evaluate a booking with status: ${booking.status}` };
  }

  if (!canReapprove(booking.status)) {
    return { success: false, reason: 'Booking re-approval is not allowed by system settings.' };
  }

  const existingLog = (booking.activity_log || []) as BookingActivityLog[];
  await updateDoc(bookingRef, {
    status: 'pending',
    activity_log: [
      ...existingLog,
      {
        at: new Date().toISOString(),
        by: staffName,
        action: 'resubmitted_for_review',
        detail: `Booking resubmitted for review by ${staffName}.`,
      } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  });

  return { success: true };
}

// ─── B4.1 — Assignment Mode ───────────────────────────────────────────────────

export interface AssignmentResult {
  vehicleId: string | null;
  mode: string;
  reason?: string;
}

/**
 * Determines whether a vehicle assignment can proceed on approval,
 * and returns the assignment result based on assignment_mode setting.
 *
 * 'manual_required' → blocks approval if no vehicle assigned.
 * 'auto_first_available' → system should pick first available vehicle.
 */
export async function resolveVehicleAssignment(
  bookingId: string,
  assignedVehicleId: string | undefined
): Promise<AssignmentResult> {
  const config = getFullConfig();
  const mode = config.vehicles.assignment_mode;

  if (mode === 'manual_required') {
    if (!assignedVehicleId) {
      return {
        vehicleId: null,
        mode,
        reason: 'Manual vehicle assignment is required before approving this booking.',
      };
    }
    return { vehicleId: assignedVehicleId, mode };
  }

  // auto modes — return whatever was pre-assigned or null (caller handles picking)
  return { vehicleId: assignedVehicleId || null, mode };
}

// ─── B3.3 — Pending Conflict Hold ──────────────────────────────────────────────

export interface PendingHoldResult {
  isPending: boolean;
  holdActive: boolean;
  expiresAt?: string;
  minutesRemaining?: number;
  message?: string;
}

/**
 * Checks if a pending booking is holding a vehicle slot.
 * If allow_pending_conflict_hold is true, pending bookings block the vehicle
 * until pending_booking_priority_expiry_minutes passes.
 * 
 * Shows customers: "Vehicle tentatively reserved — check back shortly."
 */
export async function checkPendingHold(
  vehicleId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<PendingHoldResult> {
  const config = getFullConfig();
  
  if (!config.availability.allow_pending_conflict_hold) {
    return { isPending: false, holdActive: false };
  }

  const bufferMs = config.availability.buffer_time_minutes * 60 * 1000;
  const expiryMs = config.availability.pending_booking_priority_expiry_minutes * 60 * 1000;

  const reqStart = new Date(startDate).getTime() - bufferMs;
  const reqEnd = new Date(endDate).getTime() + bufferMs;

  // Query for pending bookings only
  const q = query(
    collection(db, BOOKINGS),
    where('car_id', '==', vehicleId),
    where('status', '==', 'pending')
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    if (excludeId && d.id === excludeId) continue;
    const data = d.data() as FirestoreBooking;
    const bStart = new Date(data.start_date).getTime();
    const bEnd = new Date(data.end_date).getTime();

    // Check if pending booking overlaps
    if (reqStart < bEnd && reqEnd > bStart) {
      const createdAt = new Date(data.created_at).getTime();
      const expiresAt = createdAt + expiryMs;
      const now = Date.now();

      if (now < expiresAt) {
        const minutesRemaining = Math.ceil((expiresAt - now) / 60000);
        return {
          isPending: true,
          holdActive: true,
          expiresAt: new Date(expiresAt).toISOString(),
          minutesRemaining,
          message: `Vehicle tentatively reserved — check back shortly. Hold expires in ${minutesRemaining} minutes.`,
        };
      }
    }
  }

  return { isPending: false, holdActive: false };
}

// ─── B4.1-B4.4 — Vehicle Assignment & Auto-Assignment ─────────────────────────

export interface AutoAssignResult {
  success: boolean;
  assignedVehicleId?: string;
  reason?: string;
}

/**
 * Automatically assigns a vehicle to a booking based on the assignment_mode.
 * 
 * 'auto_first_available' → Pick the first available vehicle of the requested type.
 * 'auto_best_match' → Pick the vehicle with the most recent maintenance record.
 * 
 * Checks B4.2 (vehicle conflict policy) and B4.4 (maintenance blocks booking).
 * 
 * @param bookingId    ID of the booking to assign.
 * @param carTypeId    The required vehicle type.
 * @param startDate    Booking start date (ISO string).
 * @param endDate      Booking end date (ISO string).
 * @param staffName    Name of staff performing auto-assignment (for log).
 */
export async function autoAssignVehicle(
  bookingId: string,
  carTypeId: string,
  startDate: string,
  endDate: string,
  staffName: string = 'system'
): Promise<AutoAssignResult> {
  const config = getFullConfig();
  const mode = config.vehicles.assignment_mode;

  if (mode === 'manual_required') {
    return { success: false, reason: 'Manual assignment mode is active. Automatic assignment is disabled.' };
  }

  // Get booking to update
  const bookingRef = doc(db, 'bookings', bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) {
    return { success: false, reason: 'Booking not found.' };
  }

  const booking = bookingSnap.data() as FirestoreBooking;
  
  // Query available vehicles of the requested type
  const vSnap = await getDocs(
    query(
      collection(db, 'vehicles'),
      where('car_type_id', '==', carTypeId),
      where('status', '!=', 'retired')
    )
  );

  if (vSnap.empty) {
    return { success: false, reason: 'No vehicles of this type are available.' };
  }

  const candidates: Array<{ id: string; lastMaintenance: number }> = [];

  for (const vDoc of vSnap.docs) {
    const vehicle = vDoc.data();
    
    // B4.4 — Skip maintenance-flagged vehicles if setting blocks booking
    if (config.vehicles.vehicle_maintenance_mode_enabled && 
        config.vehicles.maintenance_blocks_booking && 
        vehicle.status === 'maintenance') {
      continue;
    }

    // Check for conflicts with the requested date range
    const conflict = await checkConflict(vDoc.id, startDate, endDate);

    if (!conflict.hasConflict) {
      // Vehicle is available
      const lastMaintenance = vehicle.lastMaintenance 
        ? new Date(vehicle.lastMaintenance).getTime() 
        : 0;
      candidates.push({ id: vDoc.id, lastMaintenance });
    } else if (config.vehicles.conflict_policy !== 'block') {
      // Conflict but policy allows warn/override
      candidates.push({ id: vDoc.id, lastMaintenance: vehicle.lastMaintenance ? new Date(vehicle.lastMaintenance).getTime() : 0 });
    }
  }

  if (candidates.length === 0) {
    return { success: false, reason: 'No suitable vehicles available for this booking.' };
  }

  // Sort based on mode
  let selectedVehicle = candidates[0];
  if (mode === 'auto_best_match') {
    // Sort by most recent maintenance
    candidates.sort((a, b) => b.lastMaintenance - a.lastMaintenance);
    selectedVehicle = candidates[0];
  }

  const existingLog = (booking.activity_log || []) as BookingActivityLog[];
  await updateDoc(bookingRef, {
    assigned_vehicle_id: selectedVehicle.id,
    activity_log: [
      ...existingLog,
      {
        at: new Date().toISOString(),
        by: staffName,
        action: 'vehicle_auto_assigned',
        detail: `Vehicle ${selectedVehicle.id} auto-assigned via ${mode} mode.`,
      } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  });

  return { success: true, assignedVehicleId: selectedVehicle.id };
}

/**
 * Handles vehicle becoming unavailable during an active booking.
 * If auto_reassign is enabled, finds a replacement.
 * If manual_intervention, flags booking as needs_attention.
 */
export async function handleUnavailableVehicle(
  bookingId: string,
  currentVehicleId: string
): Promise<AutoAssignResult> {
  const config = getFullConfig();
  const bookingRef = doc(db, 'bookings', bookingId);
  const bookingSnap = await getDoc(bookingRef);

  if (!bookingSnap.exists()) {
    return { success: false, reason: 'Booking not found.' };
  }

  const booking = bookingSnap.data() as FirestoreBooking;
  const existingLog = (booking.activity_log || []) as BookingActivityLog[];

  if (config.vehicles.vehicle_unavailable_behavior === 'auto_reassign') {
    // Attempt auto-assignment
    const result = await autoAssignVehicle(
      bookingId,
      booking.car_id,
      booking.start_date,
      booking.end_date,
      'system'
    );

    if (result.success) {
      // Notify customer
      await updateDoc(bookingRef, {
        activity_log: [
          ...existingLog,
          {
            at: new Date().toISOString(),
            by: 'system',
            action: 'vehicle_reassigned',
            detail: `Vehicle was unavailable. Automatically reassigned to ${result.assignedVehicleId}.`,
          } as BookingActivityLog,
        ],
      });
      return result;
    }
  }

  // Manual intervention mode
  await updateDoc(bookingRef, {
    needs_attention: true,
    activity_log: [
      ...existingLog,
      {
        at: new Date().toISOString(),
        by: 'system',
        action: 'vehicle_unavailable',
        detail: `Vehicle ${currentVehicleId} is unavailable. Manual intervention required.`,
      } as BookingActivityLog,
    ],
  });

  return { success: false, reason: 'Vehicle unavailable. Booking flagged for manual intervention.' };
}
