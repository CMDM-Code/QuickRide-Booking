'use client';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  where 
} from "firebase/firestore";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";

export default function BookingManagementPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    setError(null);
    
    if (db) {
      try {
        const [bookingsSnap, profilesSnap, vehiclesSnap, locationsSnap] = await withTimeout(
          Promise.all([
            getDocs(query(collection(db, 'bookings'), orderBy('created_at', 'desc'))),
            getDocs(collection(db, 'profiles')),
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'locations'))
          ]),
          5000
        );

        const profilesMap = Object.fromEntries(profilesSnap.docs.map((d: any) => [d.id, d.data()]));
        const vehiclesMap = Object.fromEntries(vehiclesSnap.docs.map((d: any) => [d.id, d.data()]));
        vehiclesMap['veh_mazdavan'] = { name: 'Mazda DA17 2024' };
        vehiclesMap['veh_mirage_gls'] = { name: 'Mitsubishi Mirage GLS' };
        vehiclesMap['veh_vios_xle'] = { name: 'Toyota Vios XLE' };
        vehiclesMap['veh_ertiga'] = { name: 'Suzuki Ertiga Hybrid' };
        
        const locationsMap = Object.fromEntries(locationsSnap.docs.map((d: any) => [d.id, d.data()]));

        const data = bookingsSnap.docs.map((d: any) => {
            const b = d.data();
            return {
                id: d.id,
                ...b,
                profile: profilesMap[b.user_id] || { full_name: 'Unknown User' },
                vehicle: vehiclesMap[b.car_id] || { name: 'Unknown Vehicle' },
                pickup_location: locationsMap[b.pickup_location_id] || { name: 'Unknown Location' }
            };
        });
        
        setBookings(data);
        setMode('cloud');
        setLoading(false);
        return;
      } catch (err: any) {
        console.warn("Firestore booking fetch failed, falling back to Local Mode:", err);
      }
    }

    // Fallback to Local Mode
    const localBookings = adminStore.getBookings();
    setBookings(localBookings.map((b: any) => ({
      id: b.id,
      profile: { full_name: b.userName, phone: b.userEmail },
      vehicle: { name: b.vehicleName },
      pickup_location: { name: b.pickupLocation },
      start_date: b.startDate,
      end_date: b.endDate,
      total_price: b.totalAmount,
      status: b.status,
      specific_address: b.notes,
      with_driver: false,
      _source: 'local'
    })));
    setMode('local');
    setLoading(false);
  }

  const handleStatusChange = async (id: string, status: string) => {
    if (mode === 'cloud' && db) {
      try {
        const bookingRef = doc(db, 'bookings', id);
        await updateDoc(bookingRef, { status });
        fetchBookings();
      } catch (err) {
          console.error("Error updating booking status:", err);
      }
    } else {
      adminStore.updateBookingStatus(id, status as any);
      fetchBookings();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filterStatus);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Reviewing Cloud Sync...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-slate-900 leading-tight">Booking Requests</h1>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                 {mode === 'cloud' ? '● Live' : '⚠ Local Mode'}
               </span>
            </div>
            <p className="text-slate-600">Review and manage rental schedules.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchBookings} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">🔄</button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-6 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-600 focus:ring-2 focus:ring-green-500/20 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {mode === 'local' && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
             <div className="flex gap-4">
                <span className="text-2xl">🚨</span>
                <div>
                   <h3 className="font-black text-amber-900 uppercase text-xs tracking-widest">Connection Interrupted</h3>
                   <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                     The booking center could not be reached. You are viewing <strong>Local Bookings</strong>. 
                     New bookings from customers <strong>will not appear</strong> until cloud sync is restored.
                   </p>
                </div>
             </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total</p>
            <p className="text-3xl font-black text-slate-900">{bookings.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">New</p>
            <p className="text-3xl font-black text-amber-600">{bookings.filter(b => b.status === 'pending').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active</p>
            <p className="text-3xl font-black text-green-700">{bookings.filter(b => b.status === 'active').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Revenue</p>
            <p className="text-3xl font-black text-slate-900">₱{(bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0)).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Customer</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Vehicle</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Duration</th>
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <p className="font-black text-slate-900">{booking.profile?.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono italic">{booking.id}</p>
                    </td>
                    <td className="p-6 font-bold text-slate-900">
                      {booking.vehicle?.name}
                    </td>
                    <td className="p-6 text-xs">
                      <p className="font-bold text-slate-800">
                        {new Date(booking.start_date?.seconds ? booking.start_date.seconds * 1000 : booking.start_date).toLocaleDateString()} - {new Date(booking.end_date?.seconds ? booking.end_date.seconds * 1000 : booking.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-slate-500">{booking.pickup_location?.name}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-2 items-start">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                           {booking.status}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {booking.status === 'pending' && (
                                <>
                                  <button onClick={() => handleStatusChange(booking.id, 'approved')} className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 text-[10px] font-bold rounded">Approve</button>
                                  <button onClick={() => handleStatusChange(booking.id, 'cancelled')} className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-bold rounded">Cancel</button>
                                </>
                            )}
                            {booking.status === 'approved' && (
                                <>
                                  <button onClick={() => handleStatusChange(booking.id, 'active')} className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-[10px] font-bold rounded">Mark Active</button>
                                  <button onClick={() => handleStatusChange(booking.id, 'completed')} className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold rounded">Complete</button>
                                  <button onClick={() => handleStatusChange(booking.id, 'cancelled')} className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-bold rounded">Cancel</button>
                                </>
                            )}
                            {booking.status === 'active' && (
                                <>
                                  <button onClick={() => handleStatusChange(booking.id, 'completed')} className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold rounded">Complete</button>
                                </>
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
