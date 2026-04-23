'use client';

import { useState, useEffect } from "react";
import { Chat } from "@/lib/types";
import { subscribeToUserChats } from "@/lib/chat-service";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Search, Inbox } from "lucide-react";

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

export default function ChatList({ onChatSelect, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserId(user.id);
      const unsubscribe = subscribeToUserChats(user.id, (data) => {
        setChats(data);
      });
      return () => unsubscribe();
    }
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.id.toLowerCase().includes(search.toLowerCase()) ||
    chat.last_message?.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <h3 className="text-xl font-black text-slate-900 mb-4">Messages</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredChats.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-200" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No messages found</h4>
            <p className="text-[10px] text-slate-400 font-medium px-8">Conversations will appear here once customers reach out.</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`w-full p-4 flex gap-4 rounded-2xl transition-all text-left ${
                selectedChatId === chat.id 
                  ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/20' 
                  : 'hover:bg-slate-50 text-slate-900'
              }`}
            >
              <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedChatId === chat.id ? 'bg-white/10' : 'bg-slate-100'
              }`}>
                <MessageSquare className={`w-6 h-6 ${
                  selectedChatId === chat.id ? 'text-white' : 'text-slate-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-sm truncate uppercase tracking-tighter">
                    Booking #{chat.id.substring(0, 8)}
                  </p>
                  <span className={`text-[9px] font-bold whitespace-nowrap mt-0.5 ${
                    selectedChatId === chat.id ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-xs truncate ${
                  selectedChatId === chat.id ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {chat.last_message?.content || "No messages yet"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
