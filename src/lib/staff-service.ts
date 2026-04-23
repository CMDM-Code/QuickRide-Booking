import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  getDoc,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Profile, Booking } from "./types";
import { createNotification } from "./notification-service";

const PROFILES_COLLECTION = "profiles";
const BOOKINGS_COLLECTION = "bookings";

/**
 * Fetches all profiles with the 'staff' role.
 */
export async function fetchStaffMembers(): Promise<Profile[]> {
  try {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where("role", "==", "staff")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Profile[];
  } catch (error) {
    console.error("Error fetching staff members:", error);
    return [];
  }
}

/**
 * Assigns a booking to a specific staff member.
 */
export async function assignBookingToStaff(bookingId: string, staffId: string, adminName: string) {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      assigned_staff_id: staffId
    });

    // Notify the staff member
    await createNotification({
      user_id: staffId,
      type: 'system',
      title: 'New Booking Assigned',
      message: `${adminName} has assigned booking #${bookingId.substring(0, 8)} to you.`,
      data: { booking_id: bookingId }
    });
  } catch (error) {
    console.error("Error assigning booking to staff:", error);
    throw error;
  }
}

/**
 * Fetches bookings assigned to a specific staff member.
 */
export async function fetchAssignedBookings(staffId: string): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where("assigned_staff_id", "==", staffId),
      orderBy("created_at", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  } catch (error) {
    console.error("Error fetching assigned bookings:", error);
    return [];
  }
}

/**
 * Fetches all pending and active bookings for the staff dashboard stats.
 */
export async function fetchStaffDashboardStats(staffId: string) {
  try {
    const bookings = await fetchAssignedBookings(staffId);
    
    return {
      total_assigned: bookings.length,
      pending_approval: bookings.filter(b => b.status === 'pending').length,
      active_rentals: bookings.filter(b => b.status === 'active' || b.status === 'approved').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      recent_activity: bookings.slice(0, 5)
    };
  } catch (error) {
    console.error("Error fetching staff dashboard stats:", error);
    return null;
  }
}
