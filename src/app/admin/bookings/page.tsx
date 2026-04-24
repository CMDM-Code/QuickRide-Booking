'use client';
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";
import { createNotification } from "@/lib/notification-service";
import { fetchStaffMembers, assignBookingToStaff } from "@/lib/staff-service";
import { Profile, PricingSheet, Location } from "@/lib/types";
import { authClient } from "@/lib/auth-client";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { User, ShieldCheck, UserPlus, DollarSign, Zap, Lock } from "lucide-react";
import { getDisplayPrice } from "@/lib/booking-price-service";
import { normalizeSchedule, type PricingSchedule } from "@/lib/schedules";

type BookingSort =
  | 'created_desc'
  | 'created_asc'
  | 'upcoming_start_asc'
  | 'active_recent_desc'
  | 'cancelled_recent_desc'
  | 'due_soon_asc';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export default function BookingManagementPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pricingSheets, setPricingSheets] = useState<PricingSheet[]>([]);
  const [schedules, setSchedules] = useState<PricingSchedule[]>([]);
  const [pricingMeta, setPricingMeta] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BookingSort>('created_desc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  ];

  useEffect(() => {
    fetchBookings();
    fetchStaff();
  }, []);

  async function fetchStaff() {
    const data = await fetchStaffMembers();
    setStaff(data);
  }

  async function fetchBookings() {
    setLoading(true);
    setError(null);
    
    if (db) {
      try {
        const [bookingsSnap, profilesSnap, vehiclesSnap, locationsSnap, sheetsSnap, schedulesSnap, settingsSnap] = await withTimeout(
          Promise.all([
            getDocs(query(collection(db, 'bookings'), orderBy('created_at', 'desc'))),
            getDocs(collection(db, 'profiles')),
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'locations')),
            getDocs(collection(db, 'pricing_sheets')),
            getDocs(collection(db, 'pricing_schedules')),
            getDoc(doc(db, 'settings', 'pricing'))
          ]),
          8000
        );

        const profilesMap = Object.fromEntries(profilesSnap.docs.map((d: any) => [d.id, d.data()]));
        const vehiclesMap = Object.fromEntries(vehiclesSnap.docs.map((d: any) => [d.id, { id: d.id, ...d.data() }]));
        const locs = locationsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Location));
        const sheets = sheetsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PricingSheet));
        const scheds = schedulesSnap.docs.map((d: any) => normalizeSchedule({ id: d.id, ...d.data() }));
        const pCfg = settingsSnap.exists() ? settingsSnap.data() : {};
        
        setLocations(locs);
        setPricingSheets(sheets);
        setSchedules(scheds);
        setPricingMeta({
          hourlyRate: pCfg.hourly_rate ?? 200,
          driverFee: pCfg.driver_fee ?? 1000,
          fallbackLocationId: pCfg.fallback_location_id ?? 'default'
        });

        const data = bookingsSnap.docs.map(d => {
          const b = d.data();
          return {
            id: d.id,
            ...b,
            profile: profilesMap[b.user_id] || { full_name: 'Unknown User' },
            vehicle: vehiclesMap[b.car_id] || { name: 'Unknown Vehicle' },
            created_at: toDate(b.created_at),
            start_date: toDate(b.start_date),
            end_date: toDate(b.end_date)
          };
        });

        setBookings(data);
        setMode('cloud');
      } catch (err: any) {
        console.error("❌ Firestore fetch failed:", err);
        setError("Failed to load live data. Using local session data.");
        setMode('local');
        setBookings(adminStore.getBookings());
      } finally {
        setLoading(false);
      }
    }
  }

  // Filter & Sort Logic
  const processedBookings = useMemo(() => {
    let list = [...bookings];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(s) ||
        b.profile?.full_name?.toLowerCase().includes(s) ||
        b.vehicle?.name?.toLowerCase().includes(s)
      );
    }

    // Status filter
    if (activeFilters.status && activeFilters.status !== 'all') {
      list = list.filter(b => b.status === activeFilters.status);
    }

    // Sort
    list.sort((a, b) => {
      if (sort === 'created_desc') return (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0);
      if (sort === 'created_asc') return (a.created_at?.getTime() || 0) - (b.created_at?.getTime() || 0);
      if (sort === 'upcoming_start_asc') return (a.start_date?.getTime() || 0) - (b.start_date?.getTime() || 0);
      return 0;
    });

    return list;
  }, [bookings, search, activeFilters, sort]);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    if (mode === 'local') return;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updated_at: serverTimestamp()
      });
      
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await createNotification({
          user_id: booking.user_id,
          title: `Booking Update`,
          message: `Your booking for ${booking.vehicle.name} has been updated to ${newStatus}.`,
          type: 'booking_status',
          data: { 
            booking_id: bookingId,
            action_url: `/dashboard/bookings/${bookingId}` 
          }
        });
      }
      
      fetchBookings();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleAssign = async (bookingId: string, staffId: string) => {
    setIsAssigning(bookingId);
    try {
      const adminName = authClient.getCurrentUser()?.name || "Administrator";
      await assignBookingToStaff(bookingId, staffId, adminName);
      await fetchBookings();
    } catch (err) {
      alert("Assignment failed.");
    } finally {
      setIsAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Syncing bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Bookings</h1>
          <p className="text-slate-600">Manage rental requests and monitor active fleet operations.</p>
        </div>
        <div className="flex items-center gap-3">
           <FilterDropdown filters={filterConfigs} onApply={setActiveFilters} />
           <select 
             value={sort}
             onChange={(e) => setSort(e.target.value as BookingSort)}
             className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
           >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="upcoming_start_asc">Upcoming Start</option>
           </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Booking ID</th>
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Customer</th>
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Vehicle</th>
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Rental Period</th>
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Pricing</th>
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Status</th>
                <th className="p-6 text-right text-xs font-black uppercase text-slate-500 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedBookings.map((b) => {
                const { price, mode: pMode, schedule } = getDisplayPrice(b, locations, pricingSheets, schedules, pricingMeta);
                const isRecalculated = pMode === 'live' && Math.abs(price - b.total_price) > 1;

                return (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <span className="font-mono text-xs font-bold text-slate-400">#{b.id.slice(-6).toUpperCase()}</span>
                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">{b.created_at?.toLocaleDateString()}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none">{b.profile?.full_name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold">{b.profile?.phone || 'No Phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="font-bold text-slate-900">{b.vehicle?.name}</p>
                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{b.vehicle?.transmission || 'Auto'} • {b.vehicle?.fuel_type || 'Gas'}</p>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {b.start_date?.toLocaleDateString()}
                        </p>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          {b.end_date?.toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900">₱{price.toLocaleString()}</span>
                          {pMode === 'locked' ? (
                            <span title="Locked Price"><Lock className="w-3 h-3 text-slate-300" /></span>
                          ) : (
                            <span title="Live/Recalculated Price"><Zap className="w-3 h-3 text-green-500 animate-pulse" /></span>
                          )}
                        </div>
                        {isRecalculated && (
                          <p className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 uppercase tracking-tighter">
                            Live Adjustment
                          </p>
                        )}
                        {schedule && (
                           <p className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                             <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                             {schedule.name}
                           </p>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <select 
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border-none outline-none cursor-pointer transition-all ${
                          b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          b.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'active' ? 'bg-green-100 text-green-700' :
                          b.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                          'bg-red-100 text-red-700'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {b.assigned_to ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100" title={`Assigned to: ${staff.find(s => s.id === b.assigned_to)?.full_name}`}>
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span className="text-[10px] font-black text-slate-600 uppercase">Assigned</span>
                          </div>
                        ) : (
                          <div className="relative group">
                            <button 
                              className={`p-2.5 rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 ${isAssigning === b.id ? 'animate-pulse bg-slate-100' : ''}`}
                            >
                              <UserPlus className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase">Assign</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-2xl rounded-2xl border border-slate-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                              <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Staff</p>
                              {staff.length > 0 ? staff.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => handleAssign(b.id, s.id)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  {s.full_name}
                                </button>
                              )) : (
                                <p className="px-4 py-2 text-xs text-slate-400">No staff found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
