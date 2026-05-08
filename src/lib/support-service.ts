import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notification-service';

const THREADS_COLLECTION = 'support_threads';

export type SupportThreadStatus = 'open' | 'resolved';

export interface SupportThread {
  id: string;
  user_id: string;
  user_name?: string;
  subject: string;
  status: SupportThreadStatus;
  assigned_to?: string;      // staff ID of first replier
  assigned_name?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;     // unread for the customer
  unread_staff_count?: number; // unread for staff
}

export interface SupportReply {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'customer' | 'staff' | 'admin';
  content: string;
  created_at: string;
}

/**
 * Customer creates a new support thread.
 */
export async function createSupportThread(
  userId: string,
  userName: string,
  subject: string,
  message: string
): Promise<string> {
  if (!db) throw new Error('Firestore not available');

  const threadRef = await addDoc(collection(db, THREADS_COLLECTION), {
    user_id: userId,
    user_name: userName,
    subject,
    status: 'open' satisfies SupportThreadStatus,
    assigned_to: null,
    assigned_name: null,
    last_message: message,
    unread_staff_count: 1,
    unread_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Add the opening message as a reply
  await addDoc(collection(db, THREADS_COLLECTION, threadRef.id, 'replies'), {
    sender_id: userId,
    sender_name: userName,
    sender_role: 'customer',
    content: message,
    created_at: serverTimestamp(),
  });

  return threadRef.id;
}

/**
 * Staff or admin replies to a support thread.
 * First reply auto-assigns the thread to the responder.
 */
export async function replyToThread(
  threadId: string,
  staffId: string,
  staffName: string,
  staffRole: 'staff' | 'admin',
  content: string
): Promise<void> {
  if (!db) throw new Error('Firestore not available');

  const threadRef = doc(db, THREADS_COLLECTION, threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Thread not found');

  const threadData = threadSnap.data();
  const isFirstReply = !threadData.assigned_to;

  // Add reply
  await addDoc(collection(db, THREADS_COLLECTION, threadId, 'replies'), {
    sender_id: staffId,
    sender_name: staffName,
    sender_role: staffRole,
    content,
    created_at: serverTimestamp(),
  });

  // Update thread: auto-assign on first reply, increment customer unread
  await updateDoc(threadRef, {
    ...(isFirstReply ? { assigned_to: staffId, assigned_name: staffName } : {}),
    last_message: content,
    unread_count: (threadData.unread_count || 0) + 1,
    unread_staff_count: 0, // staff just read/replied, reset their counter
    updated_at: serverTimestamp(),
  });

  // Notify customer
  await createNotification({
    user_id: threadData.user_id,
    type: 'system',
    title: 'Support Reply',
    message: `${staffName} replied to your support request: "${threadData.subject}"`,
    data: { thread_id: threadId },
  });
}

/**
 * Customer replies to a thread (re-opens if resolved).
 */
export async function customerReplyToThread(
  threadId: string,
  userId: string,
  userName: string,
  content: string
): Promise<void> {
  if (!db) throw new Error('Firestore not available');

  const threadRef = doc(db, THREADS_COLLECTION, threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Thread not found');

  const threadData = threadSnap.data();

  await addDoc(collection(db, THREADS_COLLECTION, threadId, 'replies'), {
    sender_id: userId,
    sender_name: userName,
    sender_role: 'customer',
    content,
    created_at: serverTimestamp(),
  });

  await updateDoc(threadRef, {
    status: 'open', // re-open if resolved
    last_message: content,
    unread_staff_count: (threadData.unread_staff_count || 0) + 1,
    unread_count: 0,
    updated_at: serverTimestamp(),
  });
}

/**
 * Staff marks a thread as resolved.
 */
export async function resolveThread(threadId: string, staffName: string): Promise<void> {
  if (!db) throw new Error('Firestore not available');

  const threadRef = doc(db, THREADS_COLLECTION, threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) return;

  const threadData = threadSnap.data();

  await updateDoc(threadRef, {
    status: 'resolved' satisfies SupportThreadStatus,
    updated_at: serverTimestamp(),
  });

  // Notify customer
  await createNotification({
    user_id: threadData.user_id,
    type: 'system',
    title: 'Support Request Resolved',
    message: `Your support request "${threadData.subject}" has been marked as resolved. Reply to re-open.`,
    data: { thread_id: threadId },
  });
}

/**
 * Subscribe to all open support threads (for staff/admin inbox).
 */
export function subscribeToSupportThreads(
  callback: (threads: SupportThread[]) => void
) {
  const q = query(
    collection(db, THREADS_COLLECTION),
    orderBy('updated_at', 'desc')
  );

  return onSnapshot(q, snap => {
    const threads = snap.docs.map(d => normalizeThread(d.id, d.data()));
    callback(threads);
  });
}

/**
 * Subscribe to support threads for a specific customer.
 */
export function subscribeToUserThreads(
  userId: string,
  callback: (threads: SupportThread[]) => void
) {
  const q = query(
    collection(db, THREADS_COLLECTION),
    where('user_id', '==', userId),
    orderBy('updated_at', 'desc')
  );

  return onSnapshot(q, snap => {
    const threads = snap.docs.map(d => normalizeThread(d.id, d.data()));
    callback(threads);
  });
}

/**
 * Subscribe to replies for a specific thread.
 */
export function subscribeToReplies(
  threadId: string,
  callback: (replies: SupportReply[]) => void
) {
  const q = query(
    collection(db, THREADS_COLLECTION, threadId, 'replies'),
    orderBy('created_at', 'asc')
  );

  return onSnapshot(q, snap => {
    const replies: SupportReply[] = snap.docs.map(d => ({
      id: d.id,
      thread_id: threadId,
      sender_id: d.data().sender_id,
      sender_name: d.data().sender_name,
      sender_role: d.data().sender_role,
      content: d.data().content,
      created_at: toISO(d.data().created_at),
    }));
    callback(replies);
  });
}

/** Mark thread as read for staff (reset unread_staff_count). */
export async function markThreadReadByStaff(threadId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, THREADS_COLLECTION, threadId), { unread_staff_count: 0 });
}

/** Mark thread as read for customer (reset unread_count). */
export async function markThreadReadByCustomer(threadId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, THREADS_COLLECTION, threadId), { unread_count: 0 });
}

function normalizeThread(id: string, data: Record<string, any>): SupportThread {
  return {
    id,
    user_id: data.user_id,
    user_name: data.user_name,
    subject: data.subject,
    status: data.status || 'open',
    assigned_to: data.assigned_to,
    assigned_name: data.assigned_name,
    last_message: data.last_message,
    unread_count: data.unread_count || 0,
    unread_staff_count: data.unread_staff_count || 0,
    created_at: toISO(data.created_at),
    updated_at: toISO(data.updated_at),
  };
}

function toISO(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  return new Date().toISOString();
}
