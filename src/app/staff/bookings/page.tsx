'use client';

import { useState, useEffect } from "react";
import StaffLayout from "../layout";
import { authClient } from "@/lib/auth-client";
import { fetchAssignedBookings } from "@/lib/staff-service";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/lib/types";
import { 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare
} from "lucide-react";

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setStaffId(user.id);
      loadBookings(user.id);
    }
  }, []);

  async function loadBookings(id: string) {
    setLoading(true);
    const data = await fetchAssignedBookings(id);
    setBookings(data);
    setLoading(false);
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, { status });
      if (staffId) loadBookings(staffId);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          <p className="text-slate-500 font-medium">Loading assigned tasks...</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Assignments</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and update bookings specifically assigned to you.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No assigned bookings</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">
              When the administrator assigns you a booking, it will appear here for you to manage.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-8 flex flex-col lg:flex-row gap-8">
                  {/* Left: Booking Main Info */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          booking.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          booking.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {booking.status}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{booking.id.substring(0, 8)}</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                          <p className="font-bold text-slate-900">{booking.profile?.full_name || 'Guest User'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup Location</p>
                          <p className="font-bold text-slate-900">{booking.pickup_location?.name || 'Main Office'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rental Period</p>
                          <p className="font-bold text-slate-900">
                            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Support</p>
                          <button 
                            onClick={() => window.location.href = `/staff/messages?chatId=${booking.id}`}
                            className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Open Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:w-72 bg-slate-50 p-8 flex flex-col justify-center gap-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Manage Status</p>
                    
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => handleStatusChange(booking.id, 'approved')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Request
                      </button>
                    )}

                    {(booking.status === 'approved' || booking.status === 'pending') && (
                      <button 
                        onClick={() => handleStatusChange(booking.id, 'active')}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Mark as Active
                      </button>
                    )}

                    {booking.status === 'active' && (
                      <button 
                        onClick={() => handleStatusChange(booking.id, 'completed')}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Rental
                      </button>
                    )}

                    {['pending', 'approved'].includes(booking.status) && (
                      <button 
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        className="w-full py-4 bg-white border border-red-100 text-red-600 hover:bg-red-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
