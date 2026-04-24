'use client';

import Link from "next/link";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import ModernBookingFlow from "@/components/forms/ModernBookingFlow";
import ChatWindow from "@/components/ui/ChatWindow";
import InviteModal from "@/components/modals/InviteModal";
import { MessageSquare, UserPlus, Users, CheckCircle, XCircle } from "lucide-react";
import { fetchUserBookings, fetchPendingInvites, acceptInvite, declineInvite } from "@/lib/booking-access-service";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [carMap, setCarMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [activeInvite, setActiveInvite] = useState<any | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user && db) {
      setUserId(user.id);
      setUserEmail(user.email);
      fetchData(user.id, user.email);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async (uid: string, email: string) => {
    setLoading(true);
    await Promise.all([
      fetchBookings(uid),
      loadPendingInvites(email)
    ]);
    setLoading(false);
  };

  const loadPendingInvites = async (email: string) => {
    const invites = await fetchPendingInvites(email);
    setPendingInvites(invites);
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!userId) return;
    try {
      await acceptInvite(inviteId, userId);
      if (userEmail) fetchData(userId, userEmail);
    } catch (err) {
      alert("Failed to accept invite.");
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineInvite(inviteId);
      if (userEmail) loadPendingInvites(userEmail);
    } catch (err) {
      alert("Failed to decline invite.");
    }
  };

  const fetchBookings = async (userId: string) => {
    if (!db) return;
    try {
      // 1. Fetch all vehicles to map IDs to names
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const cmap: Record<string, string> = {};
      vSnap.forEach(d => {
        cmap[d.id] = d.data().name;
      });
      // Fallback mocks
      cmap['veh_mazdavan'] = 'Mazda DA17 2024';
      cmap['veh_mirage_gls'] = 'Mitsubishi Mirage GLS';
      cmap['veh_vios_xle'] = 'Toyota Vios XLE';
      cmap['veh_ertiga'] = 'Suzuki Ertiga Hybrid';
      setCarMap(cmap);

      // 2. Fetch bookings (owned + shared)
      const fetched = await fetchUserBookings(userId);
      
      const processed = fetched.map(data => {
        let sDate = data.start_date as any;
        let eDate = data.end_date as any;
        
        if (sDate && typeof sDate.toDate === 'function') sDate = sDate.toDate();
        else if (sDate) sDate = new Date(sDate);
        
        if (eDate && typeof eDate.toDate === 'function') eDate = eDate.toDate();
        else if (eDate) eDate = new Date(eDate);

        return {
          ...data,
          start_date: sDate,
          end_date: eDate
        };
      });
      
      // Sort newest first
      processed.sort((a,b) => {
         const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : (a.created_at ? new Date(a.created_at).getTime() : 0);
         const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : (b.created_at ? new Date(b.created_at).getTime() : 0);
         return timeB - timeA;
      });

      setBookings(processed);
    } catch (e) {
      console.error("Failed to load bookings:", e);
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
        if (!db) return;
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

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Pending Booking Invites ({pendingInvites.length})
            </h3>
            <div className="grid gap-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white p-4 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Invite for Booking #{invite.booking_id.substring(0, 8)}</p>
                    <p className="text-xs text-slate-500">You've been invited to participate in this rental.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Accept"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeclineInvite(invite.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Decline"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <div className="flex flex-wrap md:justify-end gap-2">
                      <button
                        onClick={() => setActiveChat({
                          id: booking.id,
                          title: carMap[booking.car_id] || 'Support Chat',
                          participants: [userId, 'admin']
                        })}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </button>
                      
                      {/* Shared Access Buttons */}
                      {booking.user_id === userId && (
                        <button
                          onClick={() => setActiveInvite(booking.id)}
                          className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-bold bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-all active:scale-95"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </button>
                      )}
                      
                      {booking.participants && booking.participants.length > 0 && (
                        <div className="flex items-center -space-x-2 ml-2">
                          {booking.participants.map((p: any, idx: number) => (
                            <div 
                              key={p.user_id} 
                              className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm"
                              title={`${p.role}: ${p.user_id}`}
                            >
                              {p.user_id.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {booking.user_id !== userId && (
                            <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-green-700 shadow-sm" title="Owner">
                              O
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {(booking.status === 'pending' || booking.status === 'approved') && booking.user_id === userId && (
                      <div className="flex gap-2">
                        {booking.status === 'approved' && (
                          <Link
                            href={`/dashboard/payments?booking=${booking.id}`}
                            className="text-green-600 hover:text-green-800 text-sm font-bold bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                          >
                            Pay via GCash
                          </Link>
                        )}
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

        {/* Invite Modal */}
        {activeInvite && (
          <InviteModal 
            bookingId={activeInvite} 
            onClose={() => setActiveInvite(null)} 
            onInviteSent={() => {
              if (userId && userEmail) fetchData(userId, userEmail);
            }}
          />
        )}

        {/* Floating Chat Window */}
        {activeChat && (
          <div className="fixed bottom-6 right-6 z-[1000]">
            <ChatWindow 
              chatId={activeChat.id}
              bookingTitle={activeChat.title}
              participantIds={activeChat.participants}
              onClose={() => setActiveChat(null)}
            />
          </div>
        )}
      </div>
  );
}
