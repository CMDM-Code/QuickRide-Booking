'use client';

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
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
  getDocs,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow, format } from "date-fns";
import { toSafeDate } from "@/lib/api-utils";
import {
  MessageCircle,
  Send,
  Search,
  Inbox,
  ChevronRight,
  Users,
  Clock,
  CheckCheck,
  Circle,
  RefreshCw,
  Plus,
} from "lucide-react";

interface ChatThread {
  id: string;
  type: "booking" | "support";
  participants: string[];
  last_message?: { content: string; sender_id: string; created_at: string };
  updated_at: string;
  unread_counts?: Record<string, number>;
  customer_name?: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role?: "customer" | "support";
  content: string;
  created_at: string;
}

function tsToStr(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts?.toDate) return ts.toDate().toISOString();
  return String(ts);
}

function ChatListPanel({
  threads,
  selectedId,
  userId,
  onSelect,
  search,
  onSearch,
}: {
  threads: ChatThread[];
  selectedId: string | null;
  userId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = threads.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.last_message?.content.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <div className="p-5 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Conversations</h2>
          <span className="text-[10px] font-black px-2 py-1 bg-green-100 text-green-700 rounded-lg uppercase tracking-widest">
            {threads.length} active
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Inbox className="w-7 h-7 text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">No conversations</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Chats will appear here when customers reach out.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((thread) => {
              const isSelected = selectedId === thread.id;
              const unread = userId ? (thread.unread_counts?.[userId] ?? 0) : 0;
              const lastTime = toSafeDate(thread.updated_at);

              return (
                <button
                  key={thread.id}
                  onClick={() => onSelect(thread.id)}
                  className={`w-full p-4 flex gap-3 rounded-2xl transition-all text-left group ${
                    isSelected
                      ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20"
                      : "hover:bg-slate-50 text-slate-900"
                  }`}
                >
                  <div
                    className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${
                      isSelected ? "bg-white/10 text-white" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {(thread.customer_name || thread.id).charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`font-bold text-[13px] truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {thread.customer_name || `Booking #${thread.id.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unread > 0 && (
                          <span className="text-[9px] font-black w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                        {lastTime && (
                          <span className="text-[9px] font-bold text-slate-400">
                            {formatDistanceToNow(lastTime, { addSuffix: false })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-[11px] truncate ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                      {thread.last_message?.content || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatWindowPanel({
  chatId,
  userId,
  userName,
  onMarkRead,
}: {
  chatId: string;
  userId: string;
  userName: string;
  onMarkRead: (chatId: string, userId: string) => void;
}) {
  const viewerRole = "support";
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMeta, setChatMeta] = useState<ChatThread | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("created_at", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        sender_id: d.data().sender_id,
        sender_name: d.data().sender_name || "Unknown",
        sender_role: d.data().sender_role,
        content: d.data().content,
        created_at: tsToStr(d.data().created_at),
      })) as Message[];
      setMessages(msgs);
      onMarkRead(chatId, userId);
    });

    const chatRef = doc(db, "chats", chatId);
    const unsubMeta = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        setChatMeta({ id: snap.id, ...snap.data(), updated_at: tsToStr(snap.data().updated_at) } as ChatThread);
      }
    });

    return () => { unsub(); unsubMeta(); };
  }, [chatId, userId, onMarkRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !db) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender_id: userId,
        sender_name: userName,
        sender_role: "support",
        content,
        created_at: serverTimestamp(),
      });
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      const participants: string[] = chatSnap.exists() ? chatSnap.data().participants : [];
      const updates: Record<string, any> = {
        last_message: { content, sender_id: userId, created_at: new Date().toISOString() },
        updated_at: serverTimestamp(),
      };
      for (const pid of participants) {
        if (pid !== userId) updates[`unread_counts.${pid}`] = increment(1);
      }
      await updateDoc(chatRef, updates);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = toSafeDate(msg.created_at);
    const dateStr = d ? format(d, "MMMM d, yyyy") : "Today";
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== dateStr) grouped.push({ date: dateStr, msgs: [msg] });
    else last.msgs.push(msg);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 shrink-0 bg-slate-900 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-green-700/30">
          {(chatMeta?.customer_name || chatId).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm truncate">
            {chatMeta?.customer_name || `Booking #${chatId.slice(0, 8)}`}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active conversation · {messages.length} messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black px-2 py-1 bg-white/10 text-slate-300 rounded-lg uppercase tracking-widest">
            {chatMeta?.type || "support"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
              <MessageCircle className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Send a message to begin the conversation.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {group.msgs.map((msg) => {
                const senderRole = msg.sender_role || (msg.sender_id === userId ? viewerRole : "customer");
                const senderRoleLabel = senderRole === "customer" ? "Customer" : "Support";
                const isViewerSide = senderRole === viewerRole;
                const d = toSafeDate(msg.created_at);

                return (
                  <div key={msg.id} className={`flex flex-col ${isViewerSide ? "items-end" : "items-start"}`}>
                    <div className={`flex items-end gap-2 max-w-[78%] ${isViewerSide ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          isViewerSide ? "bg-slate-200 text-slate-600" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {msg.sender_name.charAt(0)}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isViewerSide
                            ? "bg-slate-950 text-white rounded-br-sm"
                            : "bg-white text-slate-900 border border-slate-100 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isViewerSide ? "text-slate-300" : "text-green-600"}`}>
                          {msg.sender_name} · {senderRoleLabel}
                        </p>
                        {msg.content}
                      </div>
                    </div>
                    {d && (
                      <span className="text-[9px] font-bold text-slate-400 mt-1 mx-9">
                        {format(d, "h:mm a")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-4 border-t border-slate-100 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a reply..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-medium text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); }
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="shrink-0 p-3.5 bg-green-700 text-white rounded-2xl shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all disabled:opacity-40 disabled:shadow-none active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserId(user.id);
      setUserName(user.name || user.email?.split("@")[0] || "Admin");
    }

    if (!db) { setLoading(false); return; }

    const q = query(
      collection(db, "chats"),
      orderBy("updated_at", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updated_at: tsToStr(d.data().updated_at),
      })) as ChatThread[];
      setThreads(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function markRead(chatId: string, uid: string) {
    if (!db) return;
    try {
      await updateDoc(doc(db, "chats", chatId), { [`unread_counts.${uid}`]: 0 });
    } catch {}
  }

  const totalUnread = threads.reduce((acc, t) => {
    if (!userId) return acc;
    return acc + (t.unread_counts?.[userId] ?? 0);
  }, 0);

  return (
    <div className="flex flex-col gap-0" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 leading-tight">Chat Support</h1>
            {totalUnread > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">
                {totalUnread} unread
              </span>
            )}
          </div>
          <p className="text-slate-600">Real-time customer conversations.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <div className="w-80 xl:w-96 shrink-0 flex flex-col min-h-0 border-r border-slate-100">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
            </div>
          ) : (
            <ChatListPanel
              threads={threads}
              selectedId={selectedId}
              userId={userId}
              onSelect={(id) => setSelectedId(id)}
              search={search}
              onSearch={setSearch}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {selectedId && userId ? (
            <ChatWindowPanel
              chatId={selectedId}
              userId={userId}
              userName={userName}
              onMarkRead={markRead}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <MessageCircle className="w-12 h-12 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Select a conversation</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                Choose a chat from the list on the left to start messaging with a customer in real time.
              </p>
              {threads.length === 0 && !loading && (
                <div className="mt-8 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 font-medium">
                  No active conversations yet. Chats are created when customers reach out through bookings.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
