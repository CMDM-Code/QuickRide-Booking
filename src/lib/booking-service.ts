'use client';
/**
 * booking-service.ts — Firestore-Only Service (A5)
 *
 * All LocalStorage caching, offline queues, and sync logic have been removed.
 * Every read/write goes directly to Firestore in real time.
 * Draft form state (dates, vehicle choice before submit) stays in React state — that is fine.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface BookingActivityLog {
  at: string;
  by: string;
  action: string;
  detail?: string;
}

export interface FirestoreBooking {
  id: string;
  user_id: string;
  car_id: string;
  pickup_location_id: string;
  dropoff_locations_ids: string[];
  specific_address: string;
  start_date: string;
  end_date: string;
  total_price: number;
  /** Price is always locked at submission time (A4). */
  price_locked_at?: string;
  price_breakdown?: Record<string, any>;
  /** Price override set by admin (A3). */
  price_override?: number;
  price_override_log?: Array<{ at: string; by: string; reason: string; original: number; override: number }>;
  with_driver: boolean;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled' | 'rejected';
  payment_status?: 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
  payment_timing?: string;
  downpayment_amount?: number;
  amount_paid?: number;
  payment_expires_at?: string;
  refund_amount?: number;
  assigned_vehicle_id?: string;
  assigned_staff_id?: string;
  needs_attention?: boolean;
  is_edit_pending: boolean;
  activity_log?: BookingActivityLog[];
  created_at: string;
  updated_at?: string;
  // Joined data (not stored in Firestore, populated by queries)
  vehicle?: Record<string, any>;
  pickup_location?: Record<string, any>;
  profile?: Record<string, any>;
}

const COLLECTION = 'bookings';

/** Fetch a single booking from Firestore by ID. */
export async function getBookingById(id: string): Promise<FirestoreBooking | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return normalizeBooking(snap.id, snap.data());
  } catch (e) {
    console.error('[booking-service] getBookingById error:', e);
    return null;
  }
}

/** Fetch all bookings for a specific user. */
export async function getBookingsByUser(userId: string): Promise<FirestoreBooking[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeBooking(d.id, d.data()));
  } catch (e) {
    console.error('[booking-service] getBookingsByUser error:', e);
    return [];
  }
}

/** Fetch all bookings (admin/staff). */
export async function getAllBookings(): Promise<FirestoreBooking[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeBooking(d.id, d.data()));
  } catch (e) {
    console.error('[booking-service] getAllBookings error:', e);
    return [];
  }
}

/** Fetch active/approved bookings for a specific vehicle (for conflict checking). */
export async function getBookingsForVehicle(
  vehicleId: string,
  statuses: FirestoreBooking['status'][] = ['approved', 'active', 'pending']
): Promise<FirestoreBooking[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('car_id', '==', vehicleId),
      where('status', 'in', statuses)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeBooking(d.id, d.data()));
  } catch (e) {
    console.error('[booking-service] getBookingsForVehicle error:', e);
    return [];
  }
}

/** Update a booking's status and append an activity log entry. */
export async function updateBookingStatus(
  id: string,
  status: FirestoreBooking['status'],
  logEntry: BookingActivityLog
): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().activity_log || []) : [];

    await updateDoc(ref, {
      status,
      activity_log: [...existing, logEntry],
      updated_at: serverTimestamp(),
    });
  } catch (e) {
    console.error('[booking-service] updateBookingStatus error:', e);
    throw e;
  }
}

/** Partially update a booking document. */
export async function patchBooking(
  id: string,
  updates: Partial<FirestoreBooking>,
  logEntry?: BookingActivityLog
): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, COLLECTION, id);
    const patch: Record<string, any> = { ...updates, updated_at: serverTimestamp() };

    if (logEntry) {
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data().activity_log || []) : [];
      patch.activity_log = [...existing, logEntry];
    }

    await updateDoc(ref, patch);
  } catch (e) {
    console.error('[booking-service] patchBooking error:', e);
    throw e;
  }
}

/** Normalizes Firestore document data into FirestoreBooking shape. */
function normalizeBooking(id: string, data: Record<string, any>): FirestoreBooking {
  return {
    id,
    user_id: data.user_id || '',
    car_id: data.car_id || '',
    pickup_location_id: data.pickup_location_id || '',
    dropoff_locations_ids: data.dropoff_locations_ids || [],
    specific_address: data.specific_address || '',
    start_date: toISOString(data.start_date),
    end_date: toISOString(data.end_date),
    total_price: data.total_price || 0,
    price_locked_at: data.price_locked_at,
    price_breakdown: data.price_breakdown,
    price_override: data.price_override,
    price_override_log: data.price_override_log,
    with_driver: Boolean(data.with_driver),
    status: data.status || 'pending',
    payment_status: data.payment_status,
    payment_timing: data.payment_timing,
    downpayment_amount: data.downpayment_amount,
    payment_expires_at: data.payment_expires_at,
    refund_amount: data.refund_amount,
    assigned_vehicle_id: data.assigned_vehicle_id,
    assigned_staff_id: data.assigned_staff_id,
    needs_attention: data.needs_attention,
    is_edit_pending: Boolean(data.is_edit_pending),
    activity_log: data.activity_log || [],
    created_at: toISOString(data.created_at),
    updated_at: data.updated_at ? toISOString(data.updated_at) : undefined,
  };
}

function toISOString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}
