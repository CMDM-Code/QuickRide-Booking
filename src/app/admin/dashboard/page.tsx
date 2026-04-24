'use client';
import { useEffect, useState } from "react";
import { fetchGlobalStats, fetchRecentActivity, DashboardStats } from "@/lib/dashboard-utils";
import { subscribeToNotifications } from "@/lib/notification-service";
import { Notification } from "@/lib/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [s, a] = await Promise.all([
        fetchGlobalStats(),
        fetchRecentActivity()
      ]);
      setStats(s);
      setActivities(a);
      setLoading(false);
    }
    loadData();

    // Subscribe to admin notifications
    const unsubscribe = subscribeToNotifications('admin', (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium animate-pulse">Calculating Real-Time Metrics...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Revenue", value: `₱${stats?.totalRevenue.toLocaleString()}`, icon: "💰", change: stats?.revenueChange, color: "green" },
    { label: "Active Users", value: stats?.activeUsers.toLocaleString(), icon: "👤", change: stats?.usersChange, color: "blue" },
    { label: "Active Rentals", value: stats?.activeRentals.toLocaleString(), icon: "🚗", change: stats?.rentalsChange, color: "violet" },
    { label: "Total Bookings", value: stats?.totalBookings.toLocaleString(), icon: "📋", change: stats?.bookingsChange, color: "amber" },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">Admin Dashboard</h1>
            <p className="text-slate-600">Analytics and revenue overview based on real-time data.</p>
          </div>
          <div className="flex items-center gap-2">
             <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${stats?.revenueChange === 'Local' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {stats?.revenueChange === 'Local' ? '⚠ Offline Mode' : '● Cloud Active'}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-slate-50 rounded-xl text-2xl">
                  {stat.icon}
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                  <p className={`text-sm font-medium mt-1 ${
                    stat.change?.includes('+') ? 'text-green-600' : 
                    stat.change === 'Local' ? 'text-amber-600 text-xs uppercase font-black' : 
                    'text-slate-400'
                  }`}>
                    {stat.change}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs opacity-50">Recent System Activity</h2>
            <div className="space-y-3">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all px-2 rounded-lg">
                  <div>
                    <p className="font-bold text-slate-900">{activity.action}</p>
                    <p className="text-sm text-slate-500 leading-none mt-1">{activity.user}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-mono italic">{activity.time}</p>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic">No recent activity detected.</p>
              )}
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs opacity-50 flex items-center justify-between">
              <span>System Notifications</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">{notifications.filter(n => !n.read).length} New</span>
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {notifications.map((notif, i) => (
                <div key={notif.id || i} className={`p-4 rounded-xl border transition-all ${notif.read ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className={`font-bold text-sm ${notif.read ? 'text-slate-700' : 'text-blue-900'}`}>{notif.title}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs ${notif.read ? 'text-slate-500' : 'text-blue-700/80'}`}>{notif.message}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3 opacity-50">📭</div>
                  <p className="text-slate-400 italic text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs opacity-50">Revenue Distribution</h2>
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
               <div className="w-full max-w-[200px] aspect-square rounded-full border-[20px] border-slate-100 relative flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">Total</p>
                    <p className="text-lg font-black text-slate-900 truncate px-2 max-w-[150px]">₱{stats?.totalRevenue.toLocaleString()}</p>
                  </div>
                  {/* Mock Visual Rings */}
                  <div className="absolute inset-[-20px] border-[20px] border-l-green-500 border-t-blue-500 border-r-amber-400 border-b-transparent rounded-full rotate-45 opacity-60"></div>
               </div>
               <div className="flex gap-4 mt-6">
                  <div className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500"></span> Economy</div>
                  <div className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-blue-500"></span> SUV</div>
                  <div className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Luxury</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
