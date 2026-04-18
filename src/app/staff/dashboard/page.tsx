'use client';

import StaffLayout from "../layout";
import Link from "next/link";

export default function StaffDashboardPage() {
  return (
    <StaffLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Staff Dashboard</h1>
            <p className="text-slate-600 mt-1">Operations command center</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('quickride_staff_session');
              window.location.href = '/staff-login';
            }}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            title="Log Out"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              label: "Today's Deliveries", 
              value: "3",
              icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              )
            },
            { 
              label: "Pending Returns", 
              value: "5",
              icon: (
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            },
            { 
              label: "Vehicles in Maintenance", 
              value: "2",
              icon: (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            },
            { 
              label: "Active Rentals", 
              value: "12",
              icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )
            },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  {stat.icon}
                </div>
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
              </div>
              <p className="text-sm text-slate-500 mt-4 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="card">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Real-time Activity Feed</h2>
          <div className="space-y-4">
            {[
              { event: "Booking created", customer: "John Smith", time: "2 minutes ago", type: "success" },
              { event: "Vehicle returned", customer: "Sarah Johnson", time: "15 minutes ago", type: "info" },
              { event: "Maintenance completed", vehicle: "Toyota Vios #7", time: "1 hour ago", type: "success" },
              { event: "Booking approved", customer: "Mike Wilson", time: "2 hours ago", type: "success" },
              { event: "Overdue return alert", customer: "David Brown", time: "3 hours ago", type: "warning" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' : 
                  activity.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{activity.event}</p>
                  <p className="text-sm text-slate-500">{activity.customer}</p>
                </div>
                <p className="text-sm text-slate-400">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

