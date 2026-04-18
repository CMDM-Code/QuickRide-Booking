'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  Timestamp 
} from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { Booking, Vehicle, Location } from "@/lib/types";
import { withTimeout } from "@/lib/api-utils";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserDataAndBookings();
  }, []);

  async function fetchUserDataAndBookings() {
    setLoading(true);
    try {
      const user = authClient.getCurrentUser();
      
      if (user && db) {
        setUserId(user.id);
        
        // Fetch all needed data in parallel for manual join
        const [bookingsSnap, vehiclesSnap, locationsSnap] = await withTimeout(
          Promise.all([
            getDocs(query(collection(db, 'bookings'), where('user_id', '==', user.id), orderBy('created_at', 'desc'))),
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'locations'))
          ]),
          6000
        );

        const vehiclesMap = Object.fromEntries(
            vehiclesSnap.docs.map((d: any) => [d.id, d.data()])
        );
        const locationsMap = Object.fromEntries(
            locationsSnap.docs.map((d: any) => [d.id, d.data()])
        );

        const data = bookingsSnap.docs.map((d: any) => {
            const b = d.data();
            return {
                id: d.id,
                ...b,
                vehicle: vehiclesMap[b.car_id] || { name: 'Unknown Vehicle' },
                pickup_location: locationsMap[b.pickup_location_id] || { name: 'Unknown Location' }
            };
        }) as Booking[];
        
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (id: string, status: string) => {
    if (status !== 'pending' && !confirm('This booking is already confirmed. Request cancellation?')) return;
    if (status === 'pending' && !confirm('Are you sure you want to cancel this request?')) return;

    if (!db) return;
    try {
      await updateDoc(doc(db, 'bookings', id), {
          status: 'cancelled'
      });
      fetchUserDataAndBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  const handleEditRequest = () => {
    // Navigate to the dedicated bookings page which has the full Edit modal
    router.push('/dashboard/bookings');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
    );
  }

  return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Trips</h1>
            <p className="text-slate-500 font-medium">Manage your rental requests and confirmed journeys.</p>
          </div>
          <Link 
            href="/" 
            className="px-6 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <span>✨ New Booking</span>
          </Link>
        </div>

        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-48 h-32 bg-slate-50 rounded-2xl overflow-hidden shadow-inner flex shrink-0">
                  {booking.vehicle?.image_url ? (
                      <img src={booking.vehicle.image_url} alt="car" className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🚗</div>
                  )}
              </div>
              
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{booking.vehicle?.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0 ${
                    booking.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                    booking.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                  <div>
                    <p className="text-slate-400 mb-1">Duration</p>
                    <p className="text-slate-900">
                      {(typeof (booking.start_date as any)?.toDate === 'function' ? (booking.start_date as any).toDate() : new Date(booking.start_date)).toLocaleDateString()} –{' '}
                      {(typeof (booking.end_date as any)?.toDate === 'function' ? (booking.end_date as any).toDate() : new Date(booking.end_date)).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Location</p>
                    <p className="text-slate-900">{booking.pickup_location?.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Total Paid</p>
                    <p className="text-green-700">₱{booking.total_price.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <>
                    <button 
                        onClick={() => handleEditRequest()}
                        className="px-6 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all text-sm"
                    >
                        {booking.status === 'pending' ? 'Edit Request' : 'Request Changes'}
                    </button>
                    <button 
                        onClick={() => handleCancel(booking.id, booking.status)}
                        className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-400 rounded-xl font-bold hover:border-red-100 hover:text-red-500 transition-all text-sm"
                    >
                        Cancel Booking
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {bookings.length === 0 && (
            <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
               <div className="text-6xl mb-4">🗺️</div>
               <h3 className="text-xl font-black text-slate-900">No Trips Found</h3>
               <p className="text-slate-400 font-bold mt-1">Ready for an adventure? Start by booking a vehicle.</p>
               <Link href="/" className="inline-block mt-8 px-10 py-4 bg-green-700 text-white rounded-2xl font-black shadow-xl shadow-green-700/20">
                  Explore Fleet
               </Link>
            </div>
          )}
        </div>
      </div>
  );
}

