'use client';

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { format } from "date-fns";
import { withTimeout } from "@/lib/api-utils";

export default function PaymentsPage() {
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  async function fetchPendingPayments() {
    try {
      const user = authClient.getCurrentUser();
      if (!user || !db) return;

      const [bookingsSnap, vehiclesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(
            collection(db, 'bookings'), 
            where('user_id', '==', user.id), 
            where('status', '==', 'approved'),
            orderBy('created_at', 'desc')
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

      setPendingBookings(data);
    } catch (err) {
      console.error("Error fetching pending payments:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="text-lg text-slate-600 mt-2 font-medium">Manage your dues and view transaction history.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => alert("Please contact our support for GCash/Bank transfer details.")}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2 group"
          >
            <span className="text-xl group-hover:rotate-12 transition-transform">💬</span>
            Payment Support Chat
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Yet to be Paid Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
               </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Yet to be Paid</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">Requests that have been approved and are awaiting payment proof.</p>
            
            {loading ? (
                <div className="py-12 flex justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                </div>
            ) : pendingBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">✅</div>
                <p className="font-bold text-slate-900">All caught up!</p>
                <p className="text-slate-500 text-sm">No pending payments for your approved bookings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100 rounded-[1.5rem] gap-6">
                    <div className="flex items-center space-x-5 w-full">
                      <div className="w-20 h-14 bg-white rounded-xl overflow-hidden shadow-sm shrink-0">
                        <img src={booking.vehicle?.image_url} alt="car" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900 truncate">{booking.vehicle?.name}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                          {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-8">
                       <div className="text-right">
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Amount Due</p>
                          <p className="text-xl font-black text-green-700">₱{booking.total_price.toLocaleString()}</p>
                       </div>
                       <button
                         onClick={() => alert("Upload feature coming soon! Please send proof of payment to our Viber/Support.")}
                         className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all text-sm whitespace-nowrap"
                       >
                         Send Proof
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info / Summary Side */}
        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16"></div>
              <h3 className="text-xl font-black mb-4 relative z-10">Payment Guide</h3>
              <ul className="space-y-4 relative z-10">
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    <p className="text-sm text-green-100/80 font-medium leading-relaxed">Wait for admin to <span className="text-white font-bold">Approve</span> your booking request first.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <p className="text-sm text-green-100/80 font-medium leading-relaxed">Pay via GCash, Bank Transfer, or Cash at our GenSan office.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                    <p className="text-sm text-green-100/80 font-medium leading-relaxed">Upload a screenshot of your <span className="text-white font-bold">Receipt/Reference No.</span> here.</p>
                 </li>
              </ul>
           </div>

           <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
               <span className="text-2xl">📑</span>
               History
            </h2>
            <div className="text-center py-10 opacity-40">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-900 font-bold text-sm">No recent transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

