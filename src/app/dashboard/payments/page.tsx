'use client';

import React, { useState, useEffect } from "react";
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
import { CreditCard, QrCode, ShieldCheck, X, CheckCircle2 } from "lucide-react";
import { updateDoc, doc } from "firebase/firestore";

export default function PaymentsPage() {
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [refNumber, setRefNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  async function fetchPendingPayments() {
    setLoading(true);
    try {
      const user = authClient.getCurrentUser();
      if (!user || !db) return;

      const [bookingsSnap, vehiclesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(
            collection(db, 'bookings'), 
            where('user_id', '==', user.id), 
            where('status', 'in', ['approved', 'paid', 'pending']),
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

      setPendingBookings(data.filter(b => b.status === 'approved' || b.status === 'pending'));
    } catch (err) {
      console.error("Error fetching pending payments:", err);
    } finally {
      setLoading(false);
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber || !selectedBooking || !db) return;

    setIsSubmitting(true);
    try {
      const ref = doc(db, 'bookings', selectedBooking.id);
      await updateDoc(ref, {
        status: 'paid',
        payment_ref: refNumber,
        paid_at: new Date().toISOString()
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedBooking(null);
        setRefNumber("");
        fetchPendingPayments();
      }, 2000);
    } catch (err) {
      alert("Failed to process payment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="text-lg text-slate-600 mt-2 font-medium">Manage your dues and view transaction history.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => alert("Support chat integrated in the sidebar!")}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2 group"
          >
            <span className="text-xl group-hover:rotate-12 transition-transform">💬</span>
            Payment Help
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-amber-600" />
               </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Yet to be Paid</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">Requests that are awaiting payment.</p>
            
            {loading ? (
                <div className="py-12 flex justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                </div>
            ) : pendingBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="text-5xl mb-4">✅</div>
                <p className="font-bold text-slate-900">All Clear!</p>
                <p className="text-slate-500 text-sm">No pending payments found.</p>
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
                          Due: ₱{booking.total_price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="w-full md:w-auto px-8 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all text-sm shadow-lg shadow-green-700/20"
                    >
                      Pay Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <h3 className="text-xl font-black mb-6">Payment Guide</h3>
              <div className="space-y-6">
                 {[
                   { id: 1, title: 'Check Status', text: 'Admin may review your request.' },
                   { id: 2, title: 'Send GCash', text: 'Use the QR code provided in the Pay Now modal.' },
                   { id: 3, title: 'Submit Reference', text: 'Enter the 13-digit GCash ref number.' }
                 ].map(step => (
                   <div key={step.id} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-black shrink-0">{step.id}</div>
                      <div>
                        <p className="text-sm font-bold">{step.title}</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.text}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setSelectedBooking(null)}></div>
          
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {showSuccess ? (
              <div className="p-12 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Payment Received!</h2>
                <p className="text-slate-500 font-medium">Your reference number has been recorded. Admin will verify shortly.</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-8 flex items-center justify-between border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Complete Payment</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Booking #{selectedBooking.id.slice(0,8)}</p>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="p-8 space-y-8">
                  <div className="flex flex-col items-center gap-4 py-4 bg-green-50/50 rounded-3xl border border-green-100 border-dashed">
                     <QrCode size={120} className="text-slate-900" />
                     <div className="text-center">
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em]">Scan to Pay via GCash</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">QuickRide GenSan Branch</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <span className="text-sm font-bold text-slate-500">Total Amount Due</span>
                       <span className="text-2xl font-black text-green-700">₱{selectedBooking.total_price.toLocaleString()}</span>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">GCash Reference Number</label>
                      <input 
                        required
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="e.g. 0012 345 678901"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-lg focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-5 bg-green-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-green-700/20 hover:bg-green-800 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Verifying..." : "Submit Payment Proof"}
                    {!isSubmitting && <ShieldCheck size={16} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

