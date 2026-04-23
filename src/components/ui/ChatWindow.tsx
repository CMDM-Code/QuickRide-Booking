'use client';

import { useState, useEffect, useRef } from "react";
import { Message, Chat } from "@/lib/types";
import { subscribeToMessages, sendMessage, ensureChatExists } from "@/lib/chat-service";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { Send, X, User, MessageSquare } from "lucide-react";

interface ChatWindowProps {
  chatId: string;
  bookingTitle: string;
  onClose?: () => void;
  participantIds: string[];
}

export default function ChatWindow({ chatId, bookingTitle, onClose, participantIds }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserId(user.id);
      setUserName(user.name);
      
      // Initialize chat and subscribe to messages
      const initChat = async () => {
        await ensureChatExists(chatId, participantIds);
        const unsubscribe = subscribeToMessages(chatId, (data) => {
          setMessages(data);
        });
        return unsubscribe;
      };

      const unsubscribePromise = initChat();
      return () => {
        unsubscribePromise.then(unsubscribe => unsubscribe());
      };
    }
  }, [chatId, participantIds]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !userName) return;

    try {
      const content = newMessage.trim();
      setNewMessage("");
      await sendMessage(chatId, userId, userName, content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-700/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{bookingTitle}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Support</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare className="w-6 h-6 text-slate-200" />
            </div>
            <p className="text-sm font-medium text-slate-400">No messages yet. Send a message to start chatting with support.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isMe ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                    {msg.sender_name.charAt(0)}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${
                    isMe 
                      ? 'bg-slate-950 text-white rounded-br-none' 
                      : 'bg-white text-slate-900 border border-slate-100 shadow-sm rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1 mx-10">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-green-700 text-white rounded-xl shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
