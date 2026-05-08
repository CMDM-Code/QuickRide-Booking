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
import { getFullConfig, NotificationSettings } from "./settings-service";

const NOTIFICATIONS_COLLECTION = "notifications";
const PROFILES_COLLECTION = "profiles";

export type TriggerType = 
  | 'trigger_booking_created'
  | 'trigger_booking_approved'
  | 'trigger_booking_rejected'
  | 'trigger_payment_received'
  | 'trigger_payment_failed'
  | 'trigger_refund_processed';

const URGENT_TYPES = [
  'booking_approved',
  'booking_rejected',
  'payment_received',
  'payment_failed',
  'refund_processed',
  'maintenance_conflict',
  'late_fee_applied'
];

/**
 * Creates a new notification in Firestore (with B6.1 and B6.2 gating).
 */
export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "read">,
  triggerType?: TriggerType
) {
  try {
    const config = getFullConfig();
    const settings = config.notifications;

    // B6.1 — System-wide notification gate
    if (!settings.in_app_notifications) return null;
    if (triggerType && !settings[triggerType]) return null;

    // B6.2 — Urgency-only flag
    // Assume notification.type is string. Check if it's in URGENT_TYPES, or if the notification itself is marked urgent (if we extend the type)
    const isUrgent = URGENT_TYPES.includes(notification.type);
    
    if (settings.urgency_only_flag && !isUrgent) {
      return null; // Suppress non-urgent notifications
    }

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      read: false,
      is_urgent: isUrgent,
      created_at: serverTimestamp(),
    });

    // B6.3 Email scaffold
    if (settings.email_notifications) {
      // In a real app we'd fetch the user's email here
      sendEmailNotificationScaffold("user@example.com", notification.type, notification);
    }

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

/**
 * B6.3 - Scaffold for Email Notifications
 */
export async function sendEmailNotificationScaffold(
  email: string,
  type: string,
  data: any
) {
  try {
    // Non-blocking async fetch
    fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type, data }),
    }).catch(err => {
      console.warn('Silent failure sending email notification:', err);
    });
  } catch (err) {
    console.warn('Silent failure sending email notification:', err);
  }
}
