import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { Notification, NotificationPreferences } from "./types";

const NOTIFICATIONS_COLLECTION = "notifications";
const PROFILES_COLLECTION = "profiles";

/**
 * Creates a new notification in Firestore.
 */
export async function createNotification(notification: Omit<Notification, "id" | "created_at" | "read">) {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      read: false,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Subscribes to notifications for a specific user.
 */
export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("user_id", "==", userId),
    orderBy("created_at", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    })) as Notification[];
    callback(notifications);
  });
}

/**
 * Marks a notification as read.
 */
export async function markAsRead(notificationId: string) {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId: string) {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("user_id", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking all as read:", error);
    throw error;
  }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(notificationId: string) {
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Updates user notification preferences.
 */
export async function updateNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  try {
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    await updateDoc(docRef, { notification_preferences: preferences });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    throw error;
  }
}

/**
 * Default preferences for new users.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  in_app: true,
  email: true,
  sms: false,
  types: {
    booking_updates: true,
    promotions: true,
    reminders: true,
    chat: true,
  },
};
