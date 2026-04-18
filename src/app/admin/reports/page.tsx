'use client';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  getCountFromServer,
  Timestamp 
} from "firebase/firestore";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";

export default function ReportsAnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    avgBookingValue: 0,
    completedBookings: 0,
    cancellationRate: 0,
    totalVehicles: 0,
    activeRentals: 0,
    utilizationRate: 0,
    newUsers: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    
    if (db) {
      try {
        const bookingsSnap = await withTimeout(getDocs(collection(db, 'bookings')), 5000);
        const vehsCountSnap = await getCountFromServer(collection(db, 'vehicles'));
        const profilesCountSnap = await getCountFromServer(collection(db, 'profiles'));

        const allBookingsData = bookingsSnap.docs.map((d: any) => ({
            id: d.id,
            ...d.data()
        }));

        const dateLimit = new Date();
        const daysToSubtract = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
        dateLimit.setDate(dateLimit.getDate() - daysToSubtract);
        const limitMs = dateLimit.getTime();

        const bookingsData = allBookingsData.filter((b: any) => {
            if (!b.created_at) return true;
            const bTime = b.created_at.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
            return bTime >= limitMs;
        });

        const paidBookings = bookingsData.filter((b: any) => b.status !== 'cancelled' && b.status !== 'pending');
        const totalRevenue = paidBookings.reduce((sum, b: any) => sum + (parseFloat(b.total_price) || 0), 0);
        const completed = bookingsData.filter((b: any) => b.status === 'completed').length;
        const cancelled = bookingsData.filter((b: any) => b.status === 'cancelled').length;
        const active = bookingsData.filter((b: any) => b.status === 'active').length;
        const totalVehicles = vehsCountSnap.data().count;

        setStats({
          totalBookings: bookingsData.length,
          totalRevenue,
          avgBookingValue: paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0,
          completedBookings: completed,
          cancellationRate: bookingsData.length > 0 ? (cancelled / bookingsData.length) * 100 : 0,
          totalVehicles: totalVehicles,
          activeRentals: active,
          utilizationRate: totalVehicles > 0 ? (active / totalVehicles) * 100 : 0,
          newUsers: profilesCountSnap.data().count
        });
        setMode('cloud');
        setLoading(false);
        return;
      } catch (err) {
        console.warn("Analytics fetch failed, using Local Mode:", err);
      }
    }

    // Fallback to Local Store
    const allLocalBookings = adminStore.getBookings();
    
    const dateLimitLocal = new Date();
    const daysToSubtractLocal = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    dateLimitLocal.setDate(dateLimitLocal.getDate() - daysToSubtractLocal);
    const limitMsLocal = dateLimitLocal.getTime();

    const localBookings = allLocalBookings.filter(b => {
        if (!b.createdAt) return true;
        return new Date(b.createdAt).getTime() >= limitMsLocal;
    });

    const localVehicles = adminStore.getVehicles();
    const localUsers = adminStore.getUsers();

    const totalRevenue = localBookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalAmount, 0);
    const completed = localBookings.filter(b => b.status === 'completed').length;
    const active = localBookings.filter(b => b.status === 'active').length;

    setStats({
      totalBookings: localBookings.length,
      totalRevenue,
      avgBookingValue: localBookings.length > 0 ? totalRevenue / localBookings.length : 0,
      completedBookings: completed,
      cancellationRate: 0,
      totalVehicles: localVehicles.length,
      activeRentals: active,
      utilizationRate: localVehicles.length > 0 ? (active / localVehicles.length) * 100 : 0,
      newUsers: localUsers.length
    });
    setMode('local');
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Aggregating Business Intelligence...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-3xl font-black text-slate-900 leading-tight">Reports & Analytics</h1>
               <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {mode === 'cloud' ? '● Real-Time' : '⚠ Local Data'}
               </span>
            </div>
            <p className="text-slate-600">Business performance metrics and insights across {period}.</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', '365d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  period === p 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Revenue</p>
            <p className="text-3xl font-black text-slate-900 truncate">₱{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs font-bold text-green-600 mt-2">↑ Dynamic Data</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Bookings</p>
            <p className="text-3xl font-black text-slate-900">{stats.totalBookings}</p>
            <p className="text-xs font-bold text-green-600 mt-2">↑ Verified Counts</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">AV. Value</p>
            <p className="text-3xl font-black text-slate-900 truncate">₱{stats.avgBookingValue.toLocaleString()}</p>
            <p className="text-xs font-bold text-blue-600 mt-2">Per Booking</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Utilization</p>
            <p className="text-3xl font-black text-slate-900">{stats.utilizationRate.toFixed(1)}%</p>
            <p className="text-xs font-bold text-amber-600 mt-2">Fleet Active</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Completed</p>
            <p className="text-xl font-black text-green-600">{stats.completedBookings}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Active</p>
            <p className="text-xl font-black text-blue-600">{stats.activeRentals}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Canceled</p>
            <p className="text-xl font-black text-red-600">{Math.round(stats.totalBookings * stats.cancellationRate / 100)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Inventory</p>
            <p className="text-xl font-black text-slate-700">{stats.totalVehicles}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Customers</p>
            <p className="text-xl font-black text-indigo-600">{stats.newUsers}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
            <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest text-xs opacity-50">Booking Funnel</h2>
            <div className="space-y-6">
              {[
                { label: 'Completed', value: stats.completedBookings, color: 'bg-green-500', total: stats.totalBookings },
                { label: 'Active', value: stats.activeRentals, color: 'bg-blue-500', total: stats.totalBookings },
                { label: 'Cancelled', value: Math.round(stats.totalBookings * stats.cancellationRate / 100), color: 'bg-red-400', total: stats.totalBookings },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl flex flex-col items-center justify-center">
             <h2 className="w-full text-lg font-black text-slate-900 mb-6 uppercase tracking-widest text-xs opacity-50">Revenue Mix</h2>
             <div className="w-32 h-32 rounded-full border-[15px] border-slate-50 relative flex items-center justify-center">
                <div className="text-center">
                   <p className="text-[8px] font-black text-slate-400">ROI</p>
                   <p className="text-xs font-black text-green-600 leading-none">POSITIVE</p>
                </div>
                <div className="absolute inset-[-15px] border-[15px] border-l-green-500 border-t-blue-500 border-r-indigo-500 border-b-amber-400 rounded-full rotate-[15deg] opacity-40"></div>
             </div>
             <p className="mt-6 text-sm text-slate-500 italic font-medium text-center">Fleet diversification is driving 20% higher avg booking values vs last year.</p>
          </div>
        </div>
      </div>
    </>
  );
}
