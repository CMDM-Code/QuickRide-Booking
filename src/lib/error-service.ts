import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { SystemLog } from "./types";
import { createNotification } from "./notification-service";

const LOGS_COLLECTION = "system_logs";
const PROFILES_COLLECTION = "profiles";

/**
 * Logs a system error and notifies admins/staff if critical.
 */
export async function logSystemError(error: Error | string, userId?: string, extraData?: any) {
  try {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const logRef = await addDoc(collection(db, LOGS_COLLECTION), {
      type: 'error',
      message,
      stack,
      user_id: userId || 'anonymous',
      data: extraData || null,
      created_at: serverTimestamp()
    });

    // Notify Admins for critical errors
    const adminSnap = await getDocs(query(collection(db, PROFILES_COLLECTION), where('role', '==', 'admin')));
    const notifyPromises = adminSnap.docs.map(adminDoc => 
      createNotification({
        user_id: adminDoc.id,
        type: 'system',
        title: 'Critical System Error',
        message: `A new error has been logged: ${message.substring(0, 50)}...`,
        data: { log_id: logRef.id }
      })
    );
    await Promise.all(notifyPromises);

    return logRef.id;
  } catch (err) {
    // Fail silently to avoid infinite loops if Firestore is down
    console.error("Failed to log system error:", err);
  }
}

/**
 * Fetches recent system logs for the admin dashboard.
 */
export async function fetchRecentLogs(count: number = 20): Promise<SystemLog[]> {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy("created_at", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      created_at: doc.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
    })) as SystemLog[];
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}
