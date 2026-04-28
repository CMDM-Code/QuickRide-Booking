'use client';

/**
 * Booking Service — Firestore Sync with Price Locking
 * 
 * Handles booking CRUD operations with Firestore synchronization.
 * Price locking happens at approval time and is enforced server-side (Firestore).
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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface PriceSnapshot {
  totalPrice: number;
  lockedAt: string;
  pricingMode: 'locked' | 'recalculated';
  lockedBy: string;
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  vehicleId: number;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  priceSnapshot?: PriceSnapshot;
  syncedAt?: string;
}

const COLLECTION_NAME = 'bookings';
const LOCAL_KEY = 'quickride_bookings';

// Check if Firestore is available
let firestoreAvailable = true;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Get local bookings (cache)
 */
export function getLocalBookings(): Booking[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Save to local cache
 */
function saveLocal(bookings: Booking[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(bookings));
  } catch {
    // Silent fail
  }
}

/**
 * Get pricing mode from settings
 */
function getPricingMode(): 'locked' | 'recalculated' {
  try {
    const config = JSON.parse(localStorage.getItem('quickride_full_config_v2') || '{}');
    return config?.pricing?.pricing_mode || 'locked';
  } catch {
    return 'locked';
  }
}

/**
 * Create price snapshot at approval time
 */
function createPriceSnapshot(booking: Booking, approverId: string): PriceSnapshot {
  return {
    totalPrice: booking.totalPrice,
    lockedAt: new Date().toISOString(),
    pricingMode: getPricingMode(),
    lockedBy: approverId
  };
}

/**
 * Sync a single booking to Firestore
 */
export async function syncBookingToFirestore(booking: Booking): Promise<boolean> {
  if (!isOnline() || !db) return false;
  
  try {
    const bookingRef = doc(db, COLLECTION_NAME, booking.id);
    await setDoc(bookingRef, {
      ...booking,
      syncedAt: serverTimestamp(),
      lastModified: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Failed to sync booking to Firestore:', error);
    firestoreAvailable = false;
    return false;
  }
}

/**
 * Update booking status with price locking (syncs to Firestore)
 */
export async function updateBookingStatus(
  id: string, 
  status: Booking['status'], 
  approverId: string = 'system'
): Promise<Booking | null> {
  const bookings = getLocalBookings();
  const index = bookings.findIndex(b => b.id === id);
  
  if (index === -1) return null;
  
  const oldStatus = bookings[index].status;
  bookings[index].status = status;
  
  // Lock price at approval time if transitioning to confirmed
  if (status === 'confirmed' && oldStatus !== 'confirmed') {
    const pricingMode = getPricingMode();
    if (pricingMode === 'locked' || !bookings[index].priceSnapshot) {
      bookings[index].priceSnapshot = createPriceSnapshot(bookings[index], approverId);
    }
  }
  
  // Update local cache
  saveLocal(bookings);
  
  // Sync to Firestore
  if (isOnline() && db) {
    try {
      const bookingRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = { 
        status, 
        lastModified: serverTimestamp() 
      };
      
      if (bookings[index].priceSnapshot) {
        updateData.priceSnapshot = bookings[index].priceSnapshot;
      }
      
      await updateDoc(bookingRef, updateData);
    } catch (error) {
      console.warn('Firestore update failed, will retry:', error);
      // Queue for later sync
      queuePendingUpdate(id, { status, priceSnapshot: bookings[index].priceSnapshot });
    }
  } else {
    // Queue for sync when back online
    queuePendingUpdate(id, { status, priceSnapshot: bookings[index].priceSnapshot });
  }
  
  return bookings[index];
}

/**
 * Assign vehicle to booking (syncs to Firestore)
 */
export async function assignVehicle(
  bookingId: string, 
  vehicleId: number, 
  approverId: string = 'system'
): Promise<Booking | null> {
  const bookings = getLocalBookings();
  const index = bookings.findIndex(b => b.id === bookingId);
  
  if (index === -1) return null;
  
  const oldStatus = bookings[index].status;
  bookings[index].vehicleId = vehicleId;
  bookings[index].status = 'confirmed';
  
  // Lock price at approval time
  if (oldStatus !== 'confirmed') {
    const pricingMode = getPricingMode();
    if (pricingMode === 'locked' || !bookings[index].priceSnapshot) {
      bookings[index].priceSnapshot = createPriceSnapshot(bookings[index], approverId);
    }
  }
  
  // Update local cache
  saveLocal(bookings);
  
  // Sync to Firestore
  if (isOnline() && db) {
    try {
      const bookingRef = doc(db, COLLECTION_NAME, bookingId);
      await updateDoc(bookingRef, {
        vehicleId,
        status: 'confirmed',
        priceSnapshot: bookings[index].priceSnapshot,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.warn('Firestore update failed, will retry:', error);
      queuePendingUpdate(bookingId, { 
        vehicleId, 
        status: 'confirmed', 
        priceSnapshot: bookings[index].priceSnapshot 
      });
    }
  } else {
    queuePendingUpdate(bookingId, { 
      vehicleId, 
      status: 'confirmed', 
      priceSnapshot: bookings[index].priceSnapshot 
    });
  }
  
  return bookings[index];
}

// Pending updates queue (for offline support)
const PENDING_UPDATES_KEY = 'quickride_pending_updates';

interface PendingUpdate {
  bookingId: string;
  updates: Partial<Booking>;
  timestamp: string;
}

function queuePendingUpdate(bookingId: string, updates: Partial<Booking>): void {
  try {
    const queue: PendingUpdate[] = JSON.parse(localStorage.getItem(PENDING_UPDATES_KEY) || '[]');
    queue.push({
      bookingId,
      updates,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    // Silent fail
  }
}

export function getPendingUpdates(): PendingUpdate[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_UPDATES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Sync all pending updates to Firestore
 */
export async function syncPendingUpdates(): Promise<number> {
  const pending = getPendingUpdates();
  if (pending.length === 0) return 0;
  if (!isOnline() || !db) return 0;
  
  let synced = 0;
  const failed: PendingUpdate[] = [];
  
  for (const update of pending) {
    try {
      const bookingRef = doc(db, COLLECTION_NAME, update.bookingId);
      await updateDoc(bookingRef, {
        ...update.updates,
        lastModified: serverTimestamp()
      });
      synced++;
    } catch {
      failed.push(update);
    }
  }
  
  // Save failed updates back to queue
  localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(failed));
  
  if (synced === pending.length) {
    firestoreAvailable = true;
  }
  
  return synced;
}

/**
 * Fetch all bookings from Firestore (authoritative)
 */
export async function fetchBookingsFromFirestore(): Promise<Booking[]> {
  if (!isOnline() || !db) {
    return getLocalBookings();
  }
  
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const bookings: Booking[] = snapshot.docs.map(doc => ({
      ...doc.data()
    } as Booking));
    
    // Update local cache
    saveLocal(bookings);
    
    return bookings;
  } catch (error) {
    console.warn('Firestore fetch failed, using cache:', error);
    firestoreAvailable = false;
    return getLocalBookings();
  }
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  // Check local first
  const local = getLocalBookings().find(b => b.id === id);
  
  if (!isOnline() || !db) {
    return local || null;
  }
  
  try {
    const bookingRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDoc(bookingRef);
    
    if (snapshot.exists()) {
      return { ...snapshot.data() } as Booking;
    }
    
    return local || null;
  } catch {
    return local || null;
  }
}
