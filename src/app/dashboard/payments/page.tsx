'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { CreditCard, QrCode, ShieldCheck, X, CheckCircle2, Loader2 } from "lucide-react";
import { updateDoc, doc } from "firebase/firestore";
import { createXenditQRPayment, getXenditPaymentStatus } from "@/lib/xendit-service";

export default function PaymentsPage() {
  const router = useRouter();
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [refNumber, setRefNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [xenditPaymentId, setXenditPaymentId] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

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
      router.refresh();
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

  const handleGenerateQR = async () => {
    if (!selectedBooking) return;
    
    setIsGeneratingQR(true);
    try {
      const user = authClient.getCurrentUser();
      const externalId = `booking-${selectedBooking.id}-${Date.now()}`;
      
      const qrPayment = await createXenditQRPayment(
        selectedBooking.total_price,
        externalId,
        user?.email || 'customer@quickride.com'
      );
      
      if (qrPayment.actions?.url) {
        setQrCodeUrl(qrPayment.actions.url);
        setXenditPaymentId(qrPayment.id);
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (err) {
      console.error('QR generation error:', err);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!xenditPaymentId) return;
    
    setIsSubmitting(true);
    try {
      const status = await getXenditPaymentStatus(xenditPaymentId);
      
      if (status.status === 'SUCCEEDED' && selectedBooking && db) {
        const ref = doc(db, 'bookings', selectedBooking.id);
        await updateDoc(ref, {
          status: 'paid',
          payment_ref: xenditPaymentId,
          paid_at: new Date().toISOString()
        });
        
        setShowSuccess(true);
        router.refresh();
        setTimeout(() => {
          setShowSuccess(false);
          setSelectedBooking(null);
          setQrCodeUrl('');
          setXenditPaymentId('');
          fetchPendingPayments();
        }, 2000);
      } else {
        alert('Payment not yet completed. Please scan the QR code and complete the payment.');
      }
    } catch (err) {
      console.error('Status check error:', err);
      alert('Failed to check payment status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedBooking) {
      handleGenerateQR();
    }
  }, [selectedBooking]);

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

                <form onSubmit={(e) => { e.preventDefault(); handleCheckPaymentStatus(); }} className="p-8 space-y-8">
                  <div className="flex flex-col items-center gap-4 py-6 bg-green-50/50 dark:bg-green-900/20 rounded-3xl border border-green-100 dark:border-green-800 border-dashed">
                     {isGeneratingQR ? (
                       <div className="flex flex-col items-center gap-3">
                         <Loader2 size={120} className="text-green-600 dark:text-green-400 animate-spin" />
                         <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Generating QR Code...</p>
                       </div>
                     ) : qrCodeUrl ? (
                       <div className="flex flex-col items-center gap-4">
                         <div className="bg-white p-4 rounded-2xl shadow-lg">
                           <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                             alt="Xendit QR Code"
                             className="w-40 h-40"
                           />
                         </div>
                         <div className="text-center">
                            <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-[0.2em]">Scan to Pay via Xendit</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">QuickRide GenSan Branch</p>
                         </div>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center gap-3">
                         <QrCode size={120} className="text-slate-400" />
                         <p className="text-sm font-bold text-slate-500 dark:text-slate-400">QR Code not available</p>
                       </div>
                     )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Amount Due</span>
                       <span className="text-2xl font-black text-green-700 dark:text-green-400">₱{selectedBooking.total_price.toLocaleString()}</span>
                    </div>

                    {qrCodeUrl && (
                      <button
                        onClick={() => window.open(qrCodeUrl, '_blank')}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                      >
                        <QrCode size={16} />
                        Open in Xendit App
                      </button>
                    )}
                  </div>

                  <button 
                    disabled={isSubmitting || !qrCodeUrl}
                    type="submit"
                    className="w-full py-5 bg-green-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-green-700/20 hover:bg-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Checking Status..." : "Check Payment Status"}
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

