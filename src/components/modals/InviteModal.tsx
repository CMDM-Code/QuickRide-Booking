'use client';

import { useState } from "react";
import { inviteToBooking } from "@/lib/booking-access-service";
import { authClient } from "@/lib/auth-client";
import { X, Send, UserPlus } from "lucide-react";

interface InviteModalProps {
  bookingId: string;
  onClose: () => void;
  onInviteSent: () => void;
}

export default function InviteModal({ bookingId, onClose, onInviteSent }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = authClient.getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to send invites.");
      }

      await inviteToBooking(bookingId, user.id, user.name, email);
      onInviteSent();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-[1.5rem] flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Share Booking</h2>
          <p className="text-slate-500 font-medium mt-1">Invite others to view and manage this reservation.</p>
        </div>

        <form onSubmit={handleInvite} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Guest Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
