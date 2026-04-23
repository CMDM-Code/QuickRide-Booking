import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  arrayUnion, 
  serverTimestamp,
  getDoc,
  Timestamp,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { BookingInvite, BookingParticipant, Booking } from "./types";
import { createNotification } from "./notification-service";

const INVITES_COLLECTION = "booking_invites";
const BOOKINGS_COLLECTION = "bookings";

/**
 * Sends an invite to a user to participate in a booking.
 */
export async function inviteToBooking(bookingId: string, inviterId: string, inviterName: string, email: string) {
  try {
    // 1. Check if invite already exists
    const q = query(
      collection(db, INVITES_COLLECTION),
      where("booking_id", "==", bookingId),
      where("email", "==", email),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error("A pending invite already exists for this email.");
    }

    // 2. Create the invite document
    const inviteRef = await addDoc(collection(db, INVITES_COLLECTION), {
      booking_id: bookingId,
      inviter_id: inviterId,
      email: email,
      role: 'participant',
      status: 'pending',
      created_at: serverTimestamp()
    });

    // 3. (Optional) In a real system, you'd trigger an email here.
    // For now, if the user exists, notify them in-app.
    const profilesQ = query(collection(db, "profiles"), where("email", "==", email));
    const profilesSnap = await getDocs(profilesQ);
    if (!profilesSnap.empty) {
      const invitedUserId = profilesSnap.docs[0].id;
      await createNotification({
        user_id: invitedUserId,
        type: 'system',
        title: 'New Booking Invite',
        message: `${inviterName} has invited you to participate in a booking.`,
        data: { invite_id: inviteRef.id, booking_id: bookingId }
      });
    }

    return inviteRef.id;
  } catch (error) {
    console.error("Error sending invite:", error);
    throw error;
  }
}

/**
 * Accepts a booking invite.
 */
export async function acceptInvite(inviteId: string, userId: string) {
  try {
    const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("Invite not found.");
    }

    const inviteData = inviteSnap.data() as BookingInvite;
    if (inviteData.status !== 'pending') {
      throw new Error("This invite is no longer pending.");
    }

    // 1. Add user to booking participants
    const bookingRef = doc(db, BOOKINGS_COLLECTION, inviteData.booking_id);
    const participant: BookingParticipant = {
      user_id: userId,
      role: 'participant',
      joined_at: new Date().toISOString()
    };

    await updateDoc(bookingRef, {
      participants: arrayUnion(participant),
      participant_ids: arrayUnion(userId)
    });

    // 2. Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted'
    });

    // 3. Notify the inviter
    await createNotification({
      user_id: inviteData.inviter_id,
      type: 'system',
      title: 'Invite Accepted',
      message: `The invite for booking ${inviteData.booking_id.substring(0, 8)} has been accepted.`,
      data: { booking_id: inviteData.booking_id }
    });

  } catch (error) {
    console.error("Error accepting invite:", error);
    throw error;
  }
}

/**
 * Declines a booking invite.
 */
export async function declineInvite(inviteId: string) {
  try {
    const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
    await updateDoc(inviteRef, {
      status: 'declined'
    });
  } catch (error) {
    console.error("Error declining invite:", error);
    throw error;
  }
}

/**
 * Fetches all pending invites for a user email.
 */
export async function fetchPendingInvites(email: string) {
  try {
    const q = query(
      collection(db, INVITES_COLLECTION),
      where("email", "==", email),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (BookingInvite & { id: string })[];
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
}

/**
 * Fetches all bookings where the user is a participant or owner.
 */
export async function fetchUserBookings(userId: string) {
  try {
    // 1. Fetch bookings where user is owner
    const ownerQ = query(collection(db, BOOKINGS_COLLECTION), where("user_id", "==", userId));
    const ownerSnap = await getDocs(ownerQ);
    
    // 2. Fetch bookings where user is in participants list
    // Note: Firestore array-contains on objects is tricky, but we store user_id in the participant object.
    // A better approach for scalability might be a subcollection or a simple array of IDs for queries.
    // For now, we'll fetch all bookings and filter locally, OR assume participants is an array of IDs.
    // Let's adjust the structure slightly to include participant_ids for easier querying.
    const participantQ = query(collection(db, BOOKINGS_COLLECTION), where("participant_ids", "array-contains", userId));
    const participantSnap = await getDocs(participantQ);

    const allBookings = [...ownerSnap.docs, ...participantSnap.docs];
    // Remove duplicates
    const uniqueBookings = Array.from(new Set(allBookings.map(d => d.id)))
      .map(id => allBookings.find(d => d.id === id));

    return uniqueBookings.map(d => ({ id: d?.id, ...d?.data() })) as Booking[];
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return [];
  }
}
