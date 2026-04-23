'use client';

import { useState, useEffect } from "react";
import StaffLayout from "../layout";
import { authClient } from "@/lib/auth-client";
import { fetchStaffDashboardStats } from "@/lib/staff-service";
import { Booking } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { 
  Truck, 
  Clock, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  MessageSquare
} from "lucide-react";

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setStaffName(user.name);
      loadStats(user.id);
    }
  }, []);

  async function loadStats(staffId: string) {
    const data = await fetchStaffDashboardStats(staffId);
    setStats(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          <p className="text-slate-500 font-medium">Syncing Assignments...</p>
        </div>
      </StaffLayout>
    );
  }

  const statCards = [
    { 
      label: "Total Assigned", 
      value: stats?.total_assigned || 0,
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-50"
    },
    { 
      label: "Pending My Approval", 
      value: stats?.pending_approval || 0,
      icon: <Clock className="w-6 h-6 text-amber-600" />,
      color: "bg-amber-50"
    },
    { 
      label: "Active Rentals", 
      value: stats?.active_rentals || 0,
      icon: <Truck className="w-6 h-6 text-green-600" />,
      color: "bg-green-50"
    },
    { 
      label: "Completed", 
      value: stats?.completed || 0,
      icon: <CheckCircle className="w-6 h-6 text-slate-600" />,
      color: "bg-slate-50"
    },
  ];

  return (
    <StaffLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome, {staffName}</h1>
            <p className="text-slate-500 font-medium mt-1">Here is an overview of your assigned booking operations.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">System Live</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between">
                <div className={`p-4 ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <span className="text-4xl font-black text-slate-900">{stat.value}</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-6">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Feed & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">My Recent Activity</h2>
              <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
            </div>
            <div className="p-4">
              {stats?.recent_activity?.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No recent activity found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.recent_activity?.map((booking: Booking) => (
                    <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        booking.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        booking.status === 'active' ? 'bg-blue-50 text-blue-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate uppercase tracking-tight">Booking #{booking.id.substring(0, 8)}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Status updated to <span className="font-bold uppercase">{booking.status}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Support / Chat Access */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/20 text-white flex flex-col justify-between relative overflow-hidden">
             {/* Decorative element */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
             
             <div>
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                   <MessageSquare className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black tracking-tight leading-tight">Direct Customer Messaging</h3>
                <p className="text-slate-400 text-sm font-medium mt-3 leading-relaxed">
                   Respond to your assigned customers in real-time. Good communication leads to better ratings.
                </p>
             </div>

             <button 
                onClick={() => window.location.href = '/staff/messages'}
                className="mt-10 w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-600/20"
             >
                Go to Messages
             </button>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
