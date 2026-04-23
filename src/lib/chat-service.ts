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
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";
import { Chat, Message } from "./types";
import { createNotification } from "./notification-service";

const CHATS_COLLECTION = "chats";

/**
 * Ensures a chat exists for a booking. If not, creates it.
 */
export async function ensureChatExists(bookingId: string, participantIds: string[], type: 'booking' | 'support' = 'booking') {
  const chatRef = doc(db, CHATS_COLLECTION, bookingId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    const newChat: Omit<Chat, "id"> = {
      type,
      participants: participantIds,
      updated_at: new Date().toISOString()
    };
    await setDoc(chatRef, {
      ...newChat,
      updated_at: serverTimestamp()
    });
  } else {
    // Ensure all participants are in the list
    const existingParticipants = chatSnap.data().participants as string[];
    const missingParticipants = participantIds.filter(id => !existingParticipants.includes(id));
    if (missingParticipants.length > 0) {
      await updateDoc(chatRef, {
        participants: arrayUnion(...missingParticipants)
      });
    }
  }
  return bookingId;
}

/**
 * Sends a message in a chat.
 */
export async function sendMessage(chatId: string, senderId: string, senderName: string, content: string) {
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, "messages");
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    // 1. Add message
    await addDoc(messagesRef, {
      sender_id: senderId,
      sender_name: senderName,
      content,
      created_at: serverTimestamp(),
      read_by: [senderId]
    });

    // 2. Update chat's last message
    await updateDoc(chatRef, {
      last_message: {
        content,
        sender_id: senderId,
        created_at: new Date().toISOString()
      },
      updated_at: serverTimestamp()
    });

    // 3. Notify other participants (simplified: notify all except sender)
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const participants = chatSnap.data().participants as string[];
      const notifyPromises = participants
        .filter(id => id !== senderId)
        .map(id => createNotification({
          user_id: id,
          type: 'chat',
          title: `New Message from ${senderName}`,
          message: content.length > 50 ? content.substring(0, 47) + "..." : content,
          data: { chat_id: chatId, booking_id: chatId }
        }));
      await Promise.all(notifyPromises);
    }
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Subscribes to messages in a chat.
 */
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(db, CHATS_COLLECTION, chatId, "messages"),
    orderBy("created_at", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    })) as Message[];
    callback(messages);
  });
}

/**
 * Subscribes to chats for a specific user (for Admin/Staff lists).
 */
export function subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
  const q = query(
    collection(db, CHATS_COLLECTION),
    where("participants", "array-contains", userId),
    orderBy("updated_at", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      updated_at: (doc.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    })) as Chat[];
    callback(chats);
  });
}

/**
 * Marks messages as read for a user in a chat.
 */
export async function markChatAsRead(chatId: string, userId: string) {
  const q = query(
    collection(db, CHATS_COLLECTION, chatId, "messages"),
    where("read_by", "not-in", [[userId]]) // Simplified logic, Firestore 'not-in' has limits
  );
  // Real implementation would use a batch update for messages where read_by doesn't include userId
}
