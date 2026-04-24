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
  Timestamp
} from "firebase/firestore";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";
import { createNotification } from "@/lib/notification-service";
import { fetchStaffMembers, assignBookingToStaff } from "@/lib/staff-service";
import { Profile } from "@/lib/types";
import { authClient } from "@/lib/auth-client";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { User, ShieldCheck, UserPlus } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [search, setSearch] = useState('');
  const [bookingFrom, setBookingFrom] = useState(''); // start_date >=
  const [bookingTo, setBookingTo] = useState('');     // start_date <=
  const [acctFrom, setAcctFrom] = useState('');       // profile.created_at >=
  const [acctTo, setAcctTo] = useState('');           // profile.created_at <=
  const [carQuery, setCarQuery] = useState('');       // type/model/id
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
        const vehiclesMap = Object.fromEntries(vehiclesSnap.docs.map((d: any) => [d.id, { id: d.id, ...d.data() }]));
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
                pickup_location: locationsMap[b.pickup_location_id] || { name: 'Unknown Location' },
                _createdAt: toDate(b.created_at),
                _startAt: toDate(b.start_date),
                _endAt: toDate(b.end_date),
                _acctCreatedAt: toDate(profilesMap[b.user_id]?.created_at),
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
        const bookingSnap = await getDoc(bookingRef);
        const bookingData = bookingSnap.data();

        await updateDoc(bookingRef, { status });

        // Notify Customer
        if (bookingData?.user_id) {
          await createNotification({
            user_id: bookingData.user_id,
            type: 'booking_status',
            title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your booking for ${bookingData.vehicle_name || 'your vehicle'} has been ${status}.`,
            data: { booking_id: id }
          });
        }

        fetchBookings();
      } catch (err) {
          console.error("Error updating booking status:", err);
      }
    } else {
      adminStore.updateBookingStatus(id, status as any);
      fetchBookings();
    }
  };

  const handleAssignStaff = async (bookingId: string, staffId: string) => {
    setIsAssigning(bookingId);
    try {
      const admin = authClient.getCurrentUser();
      await assignBookingToStaff(bookingId, staffId, admin?.name || 'Admin');
      fetchBookings();
    } catch (err) {
      console.error("Error assigning staff:", err);
    } finally {
      setIsAssigning(null);
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

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cq = carQuery.trim().toLowerCase();
    const fromBooking = bookingFrom ? new Date(`${bookingFrom}T00:00:00`) : null;
    const toBooking = bookingTo ? new Date(`${bookingTo}T23:59:59`) : null;
    const fromAcct = acctFrom ? new Date(`${acctFrom}T00:00:00`) : null;
    const toAcct = acctTo ? new Date(`${acctTo}T23:59:59`) : null;
    const statusFilter = activeFilters.status as string || 'all';

    const afterFilter = bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

      if (fromBooking && (!b._startAt || b._startAt < fromBooking)) return false;
      if (toBooking && (!b._startAt || b._startAt > toBooking)) return false;

      if (fromAcct && (!b._acctCreatedAt || b._acctCreatedAt < fromAcct)) return false;
      if (toAcct && (!b._acctCreatedAt || b._acctCreatedAt > toAcct)) return false;

      if (cq) {
        const vehicleName = String(b.vehicle?.name ?? '').toLowerCase();
        const carTypeId = String(b.vehicle?.car_type_id ?? '').toLowerCase();
        const carId = String(b.car_id ?? '').toLowerCase();
        if (![vehicleName, carTypeId, carId].some((x) => x.includes(cq))) return false;
      }

      if (q) {
        const customer = String(b.profile?.full_name ?? '').toLowerCase();
        const bookingId = String(b.id ?? '').toLowerCase();
        const vehicleName = String(b.vehicle?.name ?? '').toLowerCase();
        const status = String(b.status ?? '').toLowerCase();
        if (![customer, bookingId, vehicleName, status].some((x) => x.includes(q))) return false;
      }

      return true;
    });

    const now = new Date();

    const sorted = [...afterFilter].sort((a, b) => {
      const aCreated = a._createdAt?.getTime() ?? 0;
      const bCreated = b._createdAt?.getTime() ?? 0;
      const aStart = a._startAt?.getTime() ?? 0;
      const bStart = b._startAt?.getTime() ?? 0;
      const aEnd = a._endAt?.getTime() ?? 0;
      const bEnd = b._endAt?.getTime() ?? 0;

      switch (sort) {
        case 'created_desc':
          return bCreated - aCreated;
        case 'created_asc':
          return aCreated - bCreated;
        case 'upcoming_start_asc': {
          const aUpcoming = (a._startAt && a._startAt >= now) ? aStart : Number.POSITIVE_INFINITY;
          const bUpcoming = (b._startAt && b._startAt >= now) ? bStart : Number.POSITIVE_INFINITY;
          if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
          return bCreated - aCreated;
        }
        case 'active_recent_desc': {
          const aActive = a.status === 'active' ? aCreated : -1;
          const bActive = b.status === 'active' ? bCreated : -1;
          return bActive - aActive;
        }
        case 'cancelled_recent_desc': {
          const aCan = a.status === 'cancelled' ? aCreated : -1;
          const bCan = b.status === 'cancelled' ? bCreated : -1;
          return bCan - aCan;
        }
        case 'due_soon_asc': {
          const aDue = (a.status === 'active' && a._endAt) ? aEnd : Number.POSITIVE_INFINITY;
          const bDue = (b.status === 'active' && b._endAt) ? bEnd : Number.POSITIVE_INFINITY;
          if (aDue !== bDue) return aDue - bDue;
          return bCreated - aCreated;
        }
        default:
          return bCreated - aCreated;
      }
    });

    return sorted;
  }, [bookings, activeFilters, search, bookingFrom, bookingTo, acctFrom, acctTo, carQuery, sort]);

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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, booking id, vehicle..."
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none w-[260px]"
            />
            <FilterDropdown
              filters={filterConfigs}
              onApply={(filters) => setActiveFilters(filters)}
            >
              {(activeFilters) => (
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as BookingSort)}
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-600 focus:ring-2 focus:ring-green-500/20 outline-none"
                  title="Sort after filters"
                >
                  <option value="created_desc">Most recent booking</option>
                  <option value="upcoming_start_asc">Nearest upcoming booking date</option>
                  <option value="active_recent_desc">Most recent active booking</option>
                  <option value="cancelled_recent_desc">Most recent cancellation</option>
                  <option value="created_asc">Earliest booking (first-come)</option>
                  <option value="due_soon_asc">Due date (ending soonest)</option>
                </select>
              )}
            </FilterDropdown>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Booking start date</p>
            <div className="flex gap-2">
              <input type="date" value={bookingFrom} onChange={(e) => setBookingFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
              <input type="date" value={bookingTo} onChange={(e) => setBookingTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Account created date</p>
            <div className="flex gap-2">
              <input type="date" value={acctFrom} onChange={(e) => setAcctFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
              <input type="date" value={acctTo} onChange={(e) => setAcctTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Car filter (type/model/id)</p>
            <input
              value={carQuery}
              onChange={(e) => setCarQuery(e.target.value)}
              placeholder="e.g. mini_van, mazda, veh_..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm"
            />
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Results</p>
              <p className="text-2xl font-black text-slate-900">{filteredBookings.length}</p>
            </div>
            <button
              onClick={() => {
                setSearch('');
                setCarQuery('');
                setBookingFrom('');
                setBookingTo('');
                setAcctFrom('');
                setAcctTo('');
                setActiveFilters({});
                setSort('created_desc');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
            >
              Reset
            </button>
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
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Staff</th>
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
                      {booking.participants && booking.participants.length > 0 && (
                        <div className="flex items-center -space-x-2 mt-2">
                          {booking.participants.map((p: any) => (
                            <div key={p.user_id} className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold text-slate-500 shadow-sm" title={p.user_id}>
                              {p.user_id.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          <span className="ml-2 text-[10px] font-bold text-slate-400">+{booking.participants.length} Guest(s)</span>
                        </div>
                      )}
                    </td>
                    <td className="p-6 font-bold text-slate-900">
                      {booking.vehicle?.name}
                      {booking.vehicle?.car_type_id && (
                        <div className="mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{booking.vehicle.car_type_id}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-2">
                        {booking.assigned_staff_id ? (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                              {staff.find(s => s.id === booking.assigned_staff_id)?.full_name?.charAt(0) || 'S'}
                            </div>
                            <span className="text-xs font-bold text-blue-700">
                              {staff.find(s => s.id === booking.assigned_staff_id)?.full_name || 'Assigned Staff'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Unassigned</span>
                        )}
                        
                        <select
                          className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-green-500/20"
                          value={booking.assigned_staff_id || ""}
                          onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                          disabled={isAssigning === booking.id}
                        >
                          <option value="">{booking.assigned_staff_id ? 'Reassign Staff' : 'Assign Staff'}</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-6 text-xs">
                      <p className="font-bold text-slate-800">
                        {booking._startAt ? booking._startAt.toLocaleDateString() : 'N/A'} - {booking._endAt ? booking._endAt.toLocaleDateString() : 'N/A'}
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
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500 font-semibold">
                      No bookings match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
