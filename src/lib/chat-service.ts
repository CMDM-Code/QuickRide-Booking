import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Chat, Message } from './types';
import { createNotification } from './notification-service';
import { getFullConfig } from './settings-service';

const CHATS_COLLECTION = 'chats';

/**
 * Ensures a chat doc exists for a booking.
 * Adds any missing participants to the participants array.
 */
export async function ensureChatExists(
  bookingId: string,
  participantIds: string[],
  type: 'booking' | 'support' = 'booking'
) {
  const chatRef = doc(db, CHATS_COLLECTION, bookingId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      type,
      participants: participantIds,
      unread_counts: {},
      updated_at: serverTimestamp(),
    });
  } else {
    const existing = chatSnap.data().participants as string[];
    const missing = participantIds.filter(id => !existing.includes(id));
    if (missing.length > 0) {
      await updateDoc(chatRef, { participants: arrayUnion(...missing) });
    }
  }
  return bookingId;
}

/**
 * Sends a message in a chat.
 * A6: Removes per-message read_by tracking.
 * Instead increments unread_[userId] counter on the chat doc for each other participant.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  content: string,
  senderRole: 'customer' | 'support' = 'customer'
) {
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, 'messages');
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    // 1. Add message (no read_by field — A6)
    await addDoc(messagesRef, {
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      content,
      created_at: serverTimestamp(),
    });

    // 2. Get participants to increment unread counters
    const chatSnap = await getDoc(chatRef);
    const participants: string[] = chatSnap.exists() ? chatSnap.data().participants : [];

    // 3. Build unread counter increments for all OTHER participants
    const unreadUpdates: Record<string, any> = {
      last_message: {
        content,
        sender_id: senderId,
        created_at: new Date().toISOString(),
      },
      updated_at: serverTimestamp(),
    };
    for (const pid of participants) {
      if (pid !== senderId) {
        unreadUpdates[`unread_counts.${pid}`] = increment(1);
      }
    }

    await updateDoc(chatRef, unreadUpdates);

    // 4. Send in-app notifications to other participants
    const notifyPromises = participants
      .filter(id => id !== senderId)
      .map(id =>
        createNotification({
          user_id: id,
          type: 'chat',
          title: `New Message from ${senderName}`,
          message: content.length > 50 ? content.substring(0, 47) + '…' : content,
          data: { chat_id: chatId, booking_id: chatId },
        })
      );
    await Promise.allSettled(notifyPromises);
  } catch (error) {
    console.error('[chat-service] sendMessage error:', error);
    throw error;
  }
}

/**
 * Marks all messages in a chat as read for a specific user.
 * A6: Resets the unread counter on the chat doc to 0 for this user.
 */
export async function markChatAsRead(chatId: string, userId: string) {
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    await updateDoc(chatRef, {
      [`unread_counts.${userId}`]: 0,
    });
  } catch (error) {
    console.error('[chat-service] markChatAsRead error:', error);
  }
}

/**
 * Returns the unread count for a specific user from a chat doc's unread_counts map.
 */
export function getUnreadCount(chatData: Record<string, any>, userId: string): number {
  return chatData?.unread_counts?.[userId] ?? 0;
}

/**
 * Returns the retention cutoff date based on settings.
 * Default: 90 days. Uses chat_retention_policy or chat_retention_days if available.
 */
function getRetentionCutoff(): Date {
  const cfg = getFullConfig();
  const policy = cfg.system.chat_retention_policy || '90 days';
  const days = parseInt(policy, 10) || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

/**
 * Subscribes to messages in a chat (real-time).
 * A6: Messages no longer have read_by field.
 * B5.4: Filters out messages older than retention window.
 */
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(db, CHATS_COLLECTION, chatId, 'messages'),
    orderBy('created_at', 'asc')
  );

  return onSnapshot(q, snapshot => {
    const cutoff = getRetentionCutoff();
    const messages = snapshot.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        created_at:
          (d.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        read_by: [], // backward compat shim — A6 uses unread_counts on chat doc instead
      }))
      .filter(m => new Date(m.created_at) >= cutoff) as Message[];
    callback(messages);
  });
}

/**
 * Subscribes to all chats for a user (admin/staff inbox, customer booking list).
 */
export function subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
  const q = query(
    collection(db, CHATS_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('updated_at', 'desc')
  );

  return onSnapshot(q, snapshot => {
    const chats = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      updated_at:
        (d.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    })) as Chat[];
    callback(chats);
  });
}
