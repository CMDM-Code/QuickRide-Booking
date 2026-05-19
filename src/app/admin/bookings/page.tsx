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
import { withTimeout, toSafeDate } from "@/lib/api-utils";
import { createNotification } from "@/lib/notification-service";
import { fetchStaffMembers, assignBookingToStaff } from "@/lib/staff-service";
import { Profile, PricingSheet, Location } from "@/lib/types";
import { authClient } from "@/lib/auth-client";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { User, ShieldCheck, UserPlus, DollarSign, Zap, Lock, ChevronRight } from "lucide-react";
import { getDisplayPrice } from "@/lib/booking-price-service";
import { normalizeSchedule, type PricingSchedule } from "@/lib/schedules";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";

type BookingSort =
  | 'created_desc'
  | 'created_asc'
  | 'upcoming_start_asc'
  | 'active_recent_desc'
  | 'cancelled_recent_desc'
  | 'due_soon_asc';


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
            getDoc(doc(db, 'system_config', 'settings'))
          ]),
          8000
        );

        const profilesMap = Object.fromEntries(profilesSnap.docs.map((d: any) => [d.id, d.data()]));
        const vehiclesMap = Object.fromEntries(vehiclesSnap.docs.map((d: any) => [d.id, { id: d.id, ...d.data() }]));
        const locs = locationsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Location));
        const sheets = sheetsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PricingSheet));
        const scheds = schedulesSnap.docs.map((d: any) => normalizeSchedule({ id: d.id, ...d.data() }));
        const pCfg = settingsSnap.exists() ? settingsSnap.data()?.pricing : {};
        
        setLocations(locs);
        setPricingSheets(sheets);
        setSchedules(scheds);
        setPricingMeta({
          hourlyRate: pCfg?.global_hourly_rate ?? 200,
          driverFee: pCfg?.global_driver_fee ?? 1000,
          fallbackLocationId: pCfg?.fallback_location_id ?? 'loc_gensan'
        });

        const data = bookingsSnap.docs.map(d => {
          const b = d.data();
          return {
            id: d.id,
            ...b,
            profile: profilesMap[b.user_id] || { full_name: 'Unknown User' },
            vehicle: vehiclesMap[b.car_id] || { name: 'Unknown Vehicle' },
            created_at: toSafeDate(b.created_at),
            start_date: toSafeDate(b.start_date),
            end_date: toSafeDate(b.end_date)
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
      const adminUser = authClient.getCurrentUser();
      const adminName = adminUser?.name || adminUser?.email || 'Admin';
      
      const bookingRef = doc(db, 'bookings', bookingId);
      const snap = await getDoc(bookingRef);
      const existingLog = snap.exists() ? (snap.data().activity_log || []) : [];
      
      await updateDoc(bookingRef, {
        status: newStatus,
        activity_log: [
          ...existingLog,
          {
            at: new Date().toISOString(),
            by: adminName,
            action: 'status_changed',
            detail: `Status updated from ${snap.data()?.status || 'unknown'} to ${newStatus}`
          }
        ],
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
        }, `trigger_booking_${newStatus}` as any); // Use dynamic trigger
      }
      
      fetchBookings();
    } catch (err) {
      console.error("Update status error:", err);
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

  const [overrideModal, setOverrideModal] = useState<{ id: string, oldPrice: number } | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");

  const handleOverride = async () => {
    if (!overrideModal || !newPrice) return;
    const priceVal = parseFloat(newPrice);
    if (isNaN(priceVal)) return;

    try {
      const admin = authClient.getCurrentUser();
      const adminName = admin?.name || "Administrator";
      
      const booking = bookings.find(b => b.id === overrideModal.id);
      const activityLog = [...(booking?.activity_log || [])];
      
      activityLog.push({
        at: new Date().toISOString(),
        by: adminName,
        action: 'price_override',
        detail: `[Override] ${adminName} changed price for Booking ${overrideModal.id} — original ₱${overrideModal.oldPrice} → override ₱${priceVal}. Reason: ${overrideReason || 'Not specified'}`
      });

      await updateDoc(doc(db, 'bookings', overrideModal.id), {
        price_override: priceVal,
        price_override_reason: overrideReason,
        activity_log: activityLog,
        updated_at: serverTimestamp()
      });

      setOverrideModal(null);
      setNewPrice("");
      setOverrideReason("");
      fetchBookings();
    } catch (err) {
      alert("Override failed.");
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
      <PageHeader
        title="Bookings Registry"
        subtitle="Manage rental requests and monitor active fleet operations."
        action={
          <div className="flex items-center gap-3">
             <FilterDropdown filters={filterConfigs} onApply={setActiveFilters} />
             <select 
               value={sort}
               onChange={(e) => setSort(e.target.value as BookingSort)}
               className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold outline-none text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-500)] transition-all"
             >
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="upcoming_start_asc">Upcoming Start</option>
             </select>
          </div>
        }
      />

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Booking ID</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Customer</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Vehicle</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Rental Period</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Pricing</th>
                <th className="p-6 text-left text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Status</th>
                <th className="p-6 text-right text-xs font-black uppercase text-[var(--text-tertiary)] tracking-wider">Actions</th>
              </tr>
            </thead>
            <AnimatePresence>
              <motion.tbody>
              {processedBookings.map((b, idx) => {
                const { price, mode: pMode, schedule } = getDisplayPrice(b, locations, pricingSheets, schedules, pricingMeta);
                const isRecalculated = pMode === 'live' && Math.abs(price - b.total_price) > 1;

                return (
                  <motion.tr 
                    key={b.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:shadow-sm transition-all relative group"
                  >
                    <td className="p-6">
                      <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">#{b.id.slice(-6).toUpperCase()}</span>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] mt-1 uppercase">{b.created_at?.toLocaleDateString()}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center text-[var(--text-tertiary)] group-hover:scale-110 transition-transform">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-[var(--text-primary)] leading-none">{b.profile?.full_name}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-bold">{b.profile?.phone || 'No Phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="font-bold text-[var(--text-primary)]">{b.vehicle?.name}</p>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] mt-1 uppercase tracking-widest">{b.vehicle?.transmission || 'Auto'} • {b.vehicle?.fuel_type || 'Gas'}</p>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
                          {b.start_date?.toLocaleDateString()}
                        </p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]"></span>
                          {b.end_date?.toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-primary)]">₱{price.toLocaleString()}</span>
                          {pMode === 'override' ? (
                            <span title="Administrative Price Override" className="bg-[var(--color-warning-light)] p-1 rounded-md">
                              <DollarSign className="w-3 h-3 text-[var(--color-warning)]" />
                            </span>
                          ) : pMode === 'locked' ? (
                            <span title="Locked Price"><Lock className="w-3 h-3 text-[var(--text-tertiary)]" /></span>
                          ) : (
                            <span title="Live/Recalculated Price"><Zap className="w-3 h-3 text-[var(--color-success)] animate-pulse" /></span>
                          )}
                        </div>
                        {pMode === 'override' && (
                          <p className="text-[9px] font-black text-[var(--color-warning)] bg-[var(--color-warning-light)] px-1.5 py-0.5 rounded border border-[var(--color-warning)]/20 uppercase tracking-tighter">
                            Admin Override
                          </p>
                        )}
                        {isRecalculated && (
                          <p className="text-[9px] font-black text-[var(--color-success)] bg-[var(--color-success-light)] px-1.5 py-0.5 rounded border border-[var(--color-success)]/20 uppercase tracking-tighter">
                            Live Adjustment
                          </p>
                        )}
                        {schedule && (
                           <p className="text-[9px] font-bold text-[var(--color-warning)] uppercase flex items-center gap-1">
                             <Zap className="w-2.5 h-2.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                             {schedule.name}
                           </p>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <select 
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border border-transparent outline-none cursor-pointer transition-all ${
                          b.status === 'pending' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)] hover:border-[var(--color-warning)]/30' :
                          b.status === 'approved' ? 'bg-[var(--color-info-light)] text-[var(--color-info)] hover:border-[var(--color-info)]/30' :
                          b.status === 'active' ? 'bg-[var(--color-success-light)] text-[var(--color-success)] hover:border-[var(--color-success)]/30' :
                          b.status === 'completed' ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]' :
                          'bg-[var(--color-error-light)] text-[var(--color-error)] hover:border-[var(--color-error)]/30'
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
                      <div className="flex items-center justify-end gap-2">
                        <IconButton 
                          icon={<DollarSign className="w-4 h-4" />}
                          variant="ghost"
                          onClick={() => {
                            setOverrideModal({ id: b.id, oldPrice: b.total_price });
                            setNewPrice(price.toString());
                          }}
                          className="text-[var(--text-tertiary)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-light)]"
                          title="Override Price"
                        />
                        {b.assigned_to ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]" title={`Assigned to: ${staff.find(s => s.id === b.assigned_to)?.full_name}`}>
                            <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Assigned</span>
                          </div>
                        ) : (
                          <div className="relative group/assign">
                            <Button 
                              variant="outline"
                              size="sm"
                              leftIcon={<UserPlus className="w-4 h-4" />}
                              className={`border-[var(--border-subtle)] ${isAssigning === b.id ? 'animate-pulse' : ''}`}
                            >
                              Assign
                            </Button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-primary)] shadow-premium rounded-2xl border border-[var(--border-subtle)] py-2 z-50 opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all">
                              <p className="px-4 py-2 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest border-b border-[var(--border-subtle)] mb-1">Select Staff</p>
                              {staff.length > 0 ? staff.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => handleAssign(b.id, s.id)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                  {s.full_name}
                                </button>
                              )) : (
                                <p className="px-4 py-2 text-xs text-[var(--text-tertiary)]">No staff found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      </Card>
      {/* Override Modal */}
      <AnimatePresence>
        {overrideModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[var(--bg-primary)] rounded-3xl p-8 max-w-md w-full shadow-premium border border-[var(--border-subtle)]"
            >
              <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">Price Override</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-6">Setting a manual price will bypass all system calculation rules for this booking.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Original System Price</label>
                  <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] text-lg font-black text-[var(--text-secondary)]">
                    ₱{overrideModal.oldPrice.toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">New Override Price (₱)</label>
                  <input 
                    type="number" 
                    value={newPrice} 
                    onChange={e => setNewPrice(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-lg font-black text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1.5 block">Reason for Override</label>
                  <textarea 
                    value={overrideReason} 
                    onChange={e => setOverrideReason(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-primary-500)] outline-none transition-all h-24"
                    placeholder="e.g. Loyalty discount, special promotion..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button 
                  variant="outline"
                  onClick={() => setOverrideModal(null)}
                  className="flex-1 border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleOverride}
                  className="flex-1 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-lg"
                >
                  Confirm Override
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
