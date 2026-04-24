'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
import { Booking } from "@/lib/types";
import { withTimeout } from "@/lib/api-utils";
import { 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  ArrowRight,
  Bell,
  Star,
  ShieldCheck,
  CreditCard
} from "lucide-react";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    active: 0
  });
  const router = useRouter();

  useEffect(() => {
    fetchUserDataAndBookings();
  }, []);

  async function fetchUserDataAndBookings() {
    setLoading(true);
    try {
      const user = authClient.getCurrentUser();
      
      if (user && db) {
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
        
        // Calculate stats
        setStats({
          pending: data.filter(b => b.status === 'pending').length,
          approved: data.filter(b => b.status === 'approved').length,
          active: data.filter(b => b.status === 'active').length
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Welcome & Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-slate-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2">Drive Premium.</h1>
            <p className="text-green-100/70 font-medium text-sm leading-relaxed max-w-[280px]">
              Your journey is our priority. Manage your fleet and bookings with precision.
            </p>
          </div>
          <div className="mt-8 flex gap-3 relative z-10">
            <Link href="/" className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
              New Booking
            </Link>
            <Link href="/dashboard/bookings" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all backdrop-blur-md">
              My Trips
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
           <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                 <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waitlist</span>
           </div>
           <div>
              <p className="text-4xl font-black text-slate-900">{stats.pending}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Pending Approval</p>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
           <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                 <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payments</span>
           </div>
           <div>
              <p className="text-4xl font-black text-slate-900">{stats.approved}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Awaiting Payment</p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Content: Booking Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-700" />
              Current Activity
            </h2>
            <Link href="/dashboard/bookings" className="text-xs font-bold text-green-700 hover:underline uppercase tracking-widest">
              View All History
            </Link>
          </div>

          <div className="space-y-4">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:border-green-100 transition-all flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-40 h-28 bg-slate-50 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                  {booking.vehicle?.image_url ? (
                    <img src={booking.vehicle.image_url} alt="car" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">🚗</div>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-black text-slate-900 truncate">{booking.vehicle?.name}</h3>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      booking.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'active' ? 'bg-green-100 text-green-700' :
                      booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                       <MapPin size={14} className="text-slate-300" />
                       {booking.pickup_location?.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                       <ShieldCheck size={14} className="text-slate-300" />
                       {booking.with_driver ? 'Chauffeur Service' : 'Self-Drive'}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${
                           booking.status === 'pending' ? 'w-1/4 bg-amber-500' :
                           booking.status === 'approved' ? 'w-1/2 bg-blue-500' :
                           booking.status === 'active' ? 'w-3/4 bg-green-500' :
                           booking.status === 'completed' ? 'w-full bg-slate-900' : 'w-0'
                         }`}
                       ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                       {booking.status === 'pending' ? 'Reviewing' :
                        booking.status === 'approved' ? 'Awaiting Payment' :
                        booking.status === 'active' ? 'On Trip' :
                        booking.status === 'completed' ? 'Finished' : 'Process'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:px-4">
                   <Link 
                     href={`/dashboard/bookings?id=${booking.id}`}
                     className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all shadow-sm"
                   >
                     <ArrowRight size={20} />
                   </Link>
                </div>
              </div>
            ))}

            {bookings.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">No active rentals found.</p>
                <Link href="/" className="inline-block mt-4 text-green-700 font-black uppercase text-xs tracking-widest hover:underline">
                  Start your first booking →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Notifications & Feedback */}
        <div className="space-y-8">
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 <Bell className="w-5 h-5 text-blue-600" />
                 Notifications
               </h2>
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
             </div>

             <div className="space-y-6">
                {[
                  { title: 'Payment Success', time: '2h ago', text: 'Booking #QR921 has been confirmed.', type: 'success' },
                  { title: 'Promo Unlocked', time: '5h ago', text: 'Enjoy 10% off on your next SUV rental.', type: 'promo' },
                  { title: 'System Update', time: '1d ago', text: 'New region: South Cotabato is now live.', type: 'info' }
                ].map((notif, i) => (
                  <div key={i} className="relative pl-6 border-l-2 border-slate-100 pb-2">
                     <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200"></div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{notif.time}</p>
                     <p className="text-sm font-bold text-slate-800 mt-0.5">{notif.title}</p>
                     <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.text}</p>
                  </div>
                ))}
             </div>

             <button className="w-full mt-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 transition-all">
                Mark All Read
             </button>
           </div>

           <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2.5rem] p-8 border border-green-100/50 shadow-xl">
              <Star className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Share Feedback</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                How was your recent trip with the Mitsubishi Mirage? Help us improve.
              </p>
              <Link href="/dashboard/reviews" className="flex items-center justify-center w-full py-4 bg-white text-green-700 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md transition-all">
                 Write a Review
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}

