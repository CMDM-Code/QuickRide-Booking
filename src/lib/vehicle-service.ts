'use client';
/**
 * vehicle-service.ts — Firestore Vehicle Management (A5)
 *
 * All vehicle data is stored in Firestore 'vehicles' collection.
 * No localStorage caching.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  color: string;
  category: 'economy' | 'compact' | 'midsize' | 'suv' | 'luxury' | 'van' | 'truck';
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  dailyRate: number;
  mileage: number;
  seats: number;
  transmission: string;
  image: string;
  lastMaintenance?: string;
  createdAt: string;
  updatedAt?: string;
}

const COLLECTION = 'vehicles';

/** Fetch a single vehicle by ID */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return normalizeVehicle(snap.id, snap.data());
  } catch (e) {
    console.error('[vehicle-service] getVehicleById error:', e);
    return null;
  }
}

/** Fetch all vehicles */
export async function getAllVehicles(): Promise<Vehicle[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeVehicle(d.id, d.data()));
  } catch (e) {
    console.error('[vehicle-service] getAllVehicles error:', e);
    return [];
  }
}

/** Fetch vehicles by status */
export async function getVehiclesByStatus(
  status: Vehicle['status']
): Promise<Vehicle[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeVehicle(d.id, d.data()));
  } catch (e) {
    console.error('[vehicle-service] getVehiclesByStatus error:', e);
    return [];
  }
}

/** Create a new vehicle */
export async function createVehicle(
  vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Vehicle> {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const newId = doc(collection(db, COLLECTION)).id;
    const now = new Date().toISOString();
    const docData = {
      ...vehicleData,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, COLLECTION, newId), docData);
    return { id: newId, ...docData };
  } catch (e) {
    console.error('[vehicle-service] createVehicle error:', e);
    throw e;
  }
}

/** Update vehicle status */
export async function updateVehicleStatus(
  id: string,
  status: Vehicle['status']
): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[vehicle-service] updateVehicleStatus error:', e);
    throw e;
  }
}

/** Update vehicle (partial) */
export async function updateVehicle(
  id: string,
  updates: Partial<Vehicle>
): Promise<void> {
  if (!db) return;
  try {
    const patch = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, COLLECTION, id), patch);
  } catch (e) {
    console.error('[vehicle-service] updateVehicle error:', e);
    throw e;
  }
}

/** Delete a vehicle */
export async function deleteVehicle(id: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (e) {
    console.error('[vehicle-service] deleteVehicle error:', e);
    throw e;
  }
}

/** Normalize Firestore document to Vehicle shape */
function normalizeVehicle(id: string, data: Record<string, any>): Vehicle {
  return {
    id,
    name: data.name || '',
    make: data.make || '',
    model: data.model || '',
    year: data.year || new Date().getFullYear(),
    licensePlate: data.licensePlate || '',
    vin: data.vin || '',
    color: data.color || '',
    category: data.category || 'economy',
    status: data.status || 'available',
    dailyRate: data.dailyRate || 0,
    mileage: data.mileage || 0,
    seats: data.seats || 4,
    transmission: data.transmission || 'automatic',
    image: data.image || '',
    lastMaintenance: data.lastMaintenance,
    createdAt: toISOString(data.createdAt),
    updatedAt: data.updatedAt ? toISOString(data.updatedAt) : undefined,
  };
}

function toISOString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}
