'use client';

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { Star, MessageSquare, Send, CheckCircle2 } from "lucide-react";

export default function ReviewsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  async function fetchCompletedBookings() {
    try {
      const user = authClient.getCurrentUser();
      if (!user || !db) return;

      const q = query(
        collection(db, 'bookings'), 
        where('user_id', '==', user.id), 
        where('status', '==', 'completed')
      );
      const snap = await getDocs(q);
      
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const vMap = Object.fromEntries(vSnap.docs.map(d => [d.id, d.data().name]));

      setBookings(snap.docs.map(d => ({
        id: d.id,
        vehicleName: vMap[d.data().car_id] || "Unknown Vehicle",
        ...d.data()
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !db) return;

    setIsSubmitting(true);
    try {
      const user = authClient.getCurrentUser();
      await addDoc(collection(db, 'reviews'), {
        booking_id: selectedBooking,
        user_id: user?.id,
        user_name: user?.name,
        rating,
        comment,
        created_at: serverTimestamp()
      });
      
      setShowSuccess(true);
      setRating(5);
      setComment("");
      setSelectedBooking("");
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reviews & Feedback</h1>
        <p className="text-lg text-slate-600 mt-2 font-medium">Share your experience to help us improve our service.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-10">
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Select Trip</label>
              <select 
                required
                value={selectedBooking}
                onChange={(e) => setSelectedBooking(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all appearance-none"
              >
                <option value="">Choose a completed booking</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>{b.vehicleName} - {b.id.slice(0,8)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Rating</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      rating >= s ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Your Comment</label>
              <textarea
                required
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about the vehicle condition, the driver, or the overall experience..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all resize-none"
              ></textarea>
            </div>

            <button
              disabled={isSubmitting || !selectedBooking}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Post Review"}
              {!isSubmitting && <Send size={16} />}
            </button>

            {showSuccess && (
              <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 border border-green-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={20} />
                <p className="text-sm font-bold">Thank you! Your review has been published.</p>
              </div>
            )}
          </form>
        </div>

        <div className="md:col-span-2 space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <MessageSquare className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-xl font-black mb-2">Why review?</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Your feedback directly impacts the quality of our fleet and the selection of our professional drivers. Each review helps maintain the premium standards of QuickRide.
              </p>
           </div>
           
           <div className="p-8 bg-green-50 rounded-[2.5rem] border border-green-100">
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Recent Tip</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                "Adding details about the cleanliness and punctuality helps other clients the most!"
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
