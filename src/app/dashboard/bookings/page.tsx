'use client';

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import ModernBookingFlow from "@/components/forms/ModernBookingFlow";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [carMap, setCarMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user && db) {
      fetchBookings(user.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchBookings = async (userId: string) => {
    try {
      // 1. Fetch all vehicles to map IDs to names
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const cmap: Record<string, string> = {};
      vSnap.forEach(d => {
        cmap[d.id] = d.data().name;
      });
      // Fallback mocks if the vehicles aren't in Firestore yet
      cmap['veh_mazdavan'] = 'Mazda DA17 2024';
      cmap['veh_mirage_gls'] = 'Mitsubishi Mirage GLS';
      cmap['veh_vios_xle'] = 'Toyota Vios XLE';
      cmap['veh_ertiga'] = 'Suzuki Ertiga Hybrid';
      setCarMap(cmap);

      // 2. Fetch bookings
      const q = query(collection(db, 'bookings'), where('user_id', '==', userId));
      const bSnap = await getDocs(q);
      const fetched: any[] = [];
      bSnap.forEach(docSnap => {
        const data = docSnap.data();
        let sDate = data.start_date;
        let eDate = data.end_date;
        
        // Convert Timestamp to Date if applicable
        if (sDate && typeof sDate.toDate === 'function') sDate = sDate.toDate();
        else if (sDate) sDate = new Date(sDate);
        
        if (eDate && typeof eDate.toDate === 'function') eDate = eDate.toDate();
        else if (eDate) eDate = new Date(eDate);

        fetched.push({
          id: docSnap.id,
          ...data,
          start_date: sDate,
          end_date: eDate
        });
      });
      
      // Sort newest first
      fetched.sort((a,b) => {
         const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
         const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
         return timeB - timeA;
      });

      setBookings(fetched);
    } catch (e) {
      console.error("Failed to load bookings:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = activeTab === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === activeTab);

  const cancelBooking = async (id: string, currentStatus: string) => {
    if (currentStatus !== 'pending' && currentStatus !== 'approved') {
        alert("You cannot cancel a booking that has already started.");
        return;
    }
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
        const ref = doc(db, 'bookings', id);
        await updateDoc(ref, { status: 'cancelled' });
        
        // Update local state smoothly
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch(e) {
        alert("Failed to cancel booking. Check your connection.");
        console.error(e);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-600 mt-1">Manage your rental reservations</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'active', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-green-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
             <div className="text-center py-10"><div className="animate-spin w-8 h-8 rounded-full border-4 border-green-700 border-t-transparent mx-auto"></div></div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-600">Browse our fleet and book your first rental</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{carMap[booking.car_id] || 'Unknown Vehicle'}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Booking ID: {booking.id.slice(0,8)}</p>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-700 w-16">Dates:</span>
                            <span className="text-slate-600">
                                {booking.start_date ? booking.start_date.toLocaleDateString() : 'TBD'} - {booking.end_date ? booking.end_date.toLocaleDateString() : 'TBD'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-700 w-16">Route:</span>
                            <span className="text-slate-600">
                                {booking.destinations?.length > 0 ? booking.destinations.join(" → ") : "HQ Return"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-700 w-16">Driver:</span>
                            <span className="text-slate-600 font-medium">
                                {booking.with_driver ? 'Yes (Pro Driver)' : 'No (Self Drive)'}
                            </span>
                        </div>
                    </div>
                    <p className="text-xl font-black text-green-700 mt-2">₱{booking.total_price?.toLocaleString() || 0}</p>
                  </div>
                  <div className="flex flex-col md:items-end gap-3 min-w-[140px]">
                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusBadgeColor(booking.status)} uppercase tracking-wider`}>
                      {booking.status}
                    </span>
                    {(booking.status === 'pending' || booking.status === 'approved') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBooking(booking)}
                          className="text-amber-600 hover:text-amber-800 text-sm font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => cancelBooking(booking.id, booking.status)}
                          className="text-red-600 hover:text-red-800 text-sm font-bold bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Modal */}
        {editingBooking && (
           <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
             <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col">
                <button onClick={() => setEditingBooking(null)} className="absolute top-6 right-6 z-10 w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
                  ✕
                </button>
                <div className="flex-1 overflow-hidden">
                  <ModernBookingFlow 
                     editMode 
                     existingBooking={editingBooking} 
                     onClose={() => setEditingBooking(null)}
                     onEditComplete={() => {
                        setEditingBooking(null);
                        const user = authClient.getCurrentUser();
                        if (user) fetchBookings(user.id);
                     }}
                  />
                </div>
             </div>
           </div>
        )}
      </div>
  );
}
