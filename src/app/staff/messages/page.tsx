'use client';

import { useState } from "react";
import ChatList from "@/components/ui/ChatList";
import ChatWindow from "@/components/ui/ChatWindow";
import { authClient } from "@/lib/auth-client";
import { MessageSquare } from "lucide-react";

export default function StaffMessagesPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Customer Messages</h1>
        <p className="text-slate-500 font-medium mt-1">Real-time support for active and upcoming rentals.</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Chat List */}
        <div className="w-96 flex-shrink-0 overflow-hidden">
          <ChatList 
            onChatSelect={(id) => setSelectedChatId(id)} 
            selectedChatId={selectedChatId || undefined} 
          />
        </div>

        {/* Right: Active Chat */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
          {selectedChatId ? (
            <div className="absolute inset-0">
              <ChatWindow 
                chatId={selectedChatId} 
                bookingTitle={`Booking #${selectedChatId.substring(0, 8)}`}
                participantIds={[authClient.getCurrentUser()?.id || 'staff']} 
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Select a conversation</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">
                Choose a customer from the list to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
