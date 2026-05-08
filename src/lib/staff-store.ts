'use client';
/**
 * staff-store.ts — Staff Access Layer (A5)
 *
 * Deprecated: No longer uses localStorage.
 * All data comes from Firestore via booking-service and vehicle-service.
 * Pages should import those services directly instead of this store.
 *
 * This file is kept for backwards compatibility. New code should use:
 * - booking-service.ts for bookings
 * - vehicle-service.ts for vehicles
 */

export { type FirestoreBooking as Booking } from './booking-service';
export { type Vehicle } from './vehicle-service';
export { getAllBookings as getBookings, getBookingsForVehicle, updateBookingStatus, patchBooking } from './booking-service';
export { getAllVehicles as getVehicles, getVehiclesByStatus, updateVehicleStatus, updateVehicle } from './vehicle-service';
