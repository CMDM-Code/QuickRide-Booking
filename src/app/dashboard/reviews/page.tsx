'use client';

import { useState, useEffect } from "react";
import { reviewStore, Review } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";
import { format } from "date-fns";
import { withTimeout } from "@/lib/api-utils";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const user = authClient.getCurrentUser();
      if (!user || !db) return;

      // Fetch existing reviews
      setReviews(reviewStore.getAll(user.id));

      // Fetch completed bookings with vehicles for manual join
      const [bookingsSnap, vehiclesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(
            collection(db, 'bookings'), 
            where('user_id', '==', user.id), 
            where('status', '==', 'completed'),
            orderBy('end_date', 'desc')
          )),
          getDocs(collection(db, 'vehicles'))
        ]),
        5000
      );

      const vehiclesMap = Object.fromEntries(
          vehiclesSnap.docs.map((d: any) => [d.id, d.data()])
      );

      const data = bookingsSnap.docs.map((d: any) => {
          const b = d.data();
          return {
              id: d.id,
              ...b,
              vehicle: vehiclesMap[b.car_id] || { name: 'Unknown Vehicle', image_url: '' }
          };
      });

      setCompletedBookings(data);
    } catch (err) {
      console.error("Error fetching reviews data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    reviewStore.create({
      bookingId: selectedBooking.id,
      vehicleId: selectedBooking.car_id,
      rating,
      comment
    });

    // Reset and Refresh
    setSelectedBooking(null);
    setComment("");
    setRating(5);
    const user = authClient.getCurrentUser();
    if (user) setReviews(reviewStore.getAll(user.id));
    alert("Thank you! Your review has been submitted.");
  };

  const deleteReview = (id: string) => {
    if (confirm("Are you sure you want to delete this review?")) {
      reviewStore.delete(id);
      const user = authClient.getCurrentUser();
      if (user) setReviews(reviewStore.getAll(user.id));
    }
  };

  const renderStars = (rat: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(s)}
            className={`text-2xl transition-all ${
              s <= rat ? 'text-amber-400 scale-110' : 'text-slate-200'
            } ${interactive ? 'hover:scale-125 cursor-pointer' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reviews & Feedback</h1>
          <p className="text-lg text-slate-600 mt-2 font-medium">Share your experience and browse your past ratings.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Submission Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-6">Leave a Review</h2>
            
            {!selectedBooking ? (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-6">Select a completed rental to share your thoughts about.</p>
                {completedBookings.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold text-sm">No completed rentals available to review.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedBookings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-green-50 hover:border-green-200 transition-all border border-slate-100 rounded-2xl group"
                      >
                         <div className="w-12 h-10 bg-white rounded-lg overflow-hidden shadow-sm shrink-0">
                            <img src={b.vehicle?.image_url} alt="car" className="w-full h-full object-cover" />
                         </div>
                         <div className="text-left flex-1">
                            <p className="font-bold text-slate-900 text-sm group-hover:text-green-800">{b.vehicle?.name}</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{format(new Date(b.end_date), 'MMM d, yyyy')}</p>
                         </div>
                         <span className="text-green-600 font-black text-[10px] uppercase tracking-widest">Review ➔</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 mb-8 p-4 bg-green-50 rounded-2xl border border-green-100">
                    <img src={selectedBooking.vehicle?.image_url} alt="car" className="w-16 h-12 object-cover rounded-xl" />
                    <div>
                        <p className="font-black text-green-900 leading-none">{selectedBooking.vehicle?.name}</p>
                        <button type="button" onClick={() => setSelectedBooking(null)} className="text-[10px] font-black uppercase text-green-600 hover:text-green-800 mt-1">Change Vehicle</button>
                    </div>
                </div>

                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Your Rating</label>
                      {renderStars(rating, true)}
                   </div>
                   <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Detailed Feedback</label>
                      <textarea
                        required
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What did you like about the vehicle and our service?"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] min-h-[120px] focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-slate-900"
                      />
                   </div>
                   <button
                     type="submit"
                     className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-800 transition-all shadow-xl shadow-green-700/20 active:scale-95"
                   >
                     Submit My Review
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 px-2 flex items-center gap-3">
             <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-lg shadow-inner">📄</span>
             My Past Reviews
          </h2>
          
          {loading ? (
             <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div></div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-16 text-center">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No feedback yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                Your reviews will appear here once you've submitted them for your rentals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 group animate-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-4">{renderStars(review.rating)}</div>
                      <p className="text-slate-900 font-bold leading-relaxed italic">"{review.comment}"</p>
                      <div className="flex items-center gap-4 mt-6">
                         <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Date</p>
                            <p className="text-xs font-bold text-slate-700">{format(new Date(review.createdAt), 'MMM d, yyyy')}</p>
                         </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all bg-red-50 rounded-xl"
                      title="Delete Review"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

