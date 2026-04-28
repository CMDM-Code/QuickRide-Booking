import { db } from "./firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";

export const POINTS_PER_HOUR = 10;
export const POINTS_PER_PH_PESO = 0.01; // 1% back in points equivalent

export async function getUserPoints(userId: string): Promise<number> {
  if (!db) return 0;
  try {
    const userRef = doc(db, 'profiles', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data().loyalty_points || 0;
    }
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
  }
  return 0;
}

export async function addPointsForBooking(userId: string, totalPrice: number, totalHours: number, bookingId: string) {
  if (!db) return;
  
  const pointsFromPrice = Math.floor(totalPrice * POINTS_PER_PH_PESO);
  const pointsFromDuration = Math.floor(totalHours * POINTS_PER_HOUR);
  const totalPoints = pointsFromPrice + pointsFromDuration;

  try {
    const userRef = doc(db, 'profiles', userId);
    await updateDoc(userRef, {
      loyalty_points: increment(totalPoints)
    });

    // Log the transaction
    await addDoc(collection(db, 'loyalty_transactions'), {
      user_id: userId,
      booking_id: bookingId,
      points: totalPoints,
      type: 'earned',
      description: `Points earned from Booking #${bookingId.substring(0, 8)}`,
      created_at: serverTimestamp()
    });

    return totalPoints;
  } catch (error) {
    console.error("Error adding loyalty points:", error);
  }
}

export async function usePoints(userId: string, pointsToUse: number, description: string) {
  if (!db) return false;
  
  try {
    const currentPoints = await getUserPoints(userId);
    if (currentPoints < pointsToUse) return false;

    const userRef = doc(db, 'profiles', userId);
    await updateDoc(userRef, {
      loyalty_points: increment(-pointsToUse)
    });

    await addDoc(collection(db, 'loyalty_transactions'), {
      user_id: userId,
      points: pointsToUse,
      type: 'used',
      description: description,
      created_at: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Error using loyalty points:", error);
    return false;
  }
}
