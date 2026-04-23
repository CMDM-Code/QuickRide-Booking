'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { clearPortalSession } from "@/lib/portal-auth";
import { useBranding } from "@/components/providers/BrandingProvider";

const AdminSidebar = () => {
  const { branding } = useBranding();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { name: "User Management", href: "/admin/users", icon: "👤" },
    { name: "Vehicle Management", href: "/admin/vehicles", icon: "🚗" },
    { name: "Location Management", href: "/admin/locations", icon: "🧭" },
    { name: "Pricing Management", href: "/admin/pricing", icon: "💰" },
    { name: "Pricing Schedules", href: "/admin/pricing/schedules", icon: "🗓️" },
    { name: "Booking Management", href: "/admin/bookings", icon: "📋" },
    { name: "Reports", href: "/admin/reports", icon: "📈" },
    { name: "Media Library", href: "/admin/media", icon: "🖼️" },
    { name: "Customer Support", href: "/admin/messages", icon: "💬" },
    { name: "Notifications", href: "/admin/notifications", icon: "🔔" },
    { name: "Branding", href: "/admin/settings/branding", icon: "🎨" },
    { name: "Booking Form", href: "/admin/settings/booking-form", icon: "🧩" },
    { name: "System Settings", href: "/admin/settings", icon: "⚙️" },
    { name: "System Logs", href: "/admin/logs", icon: "📋" },
    { name: "Security", href: "/admin/security", icon: "🛡️" },
    { name: "Security Logs", href: "/admin/security", icon: "🔒" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[100] lg:hidden bg-green-700 text-white p-3.5 rounded-2xl shadow-xl shadow-green-700/30 hover:bg-green-800 transition-all active:scale-95"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar - Premium Admin Look */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.7)] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-8 pb-6 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-green-900/40">
                <img 
                  src={branding.logo_url} 
                  alt={branding.system_name} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tighter block leading-none">{branding.system_name}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Admin Control</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? "bg-white/10 text-white shadow-lg border border-white/10"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span className={`font-bold text-sm tracking-tight ${isActive ? 'text-white' : ''}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1 h-1 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-black/20">
            <button
              onClick={() => {
                clearPortalSession();
                window.location.href = '/admin-login';
              }}
              className="flex items-center space-x-4 w-full px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all font-bold group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
              <span className="text-sm">Log Out System</span>
            </button>
            <div className="mt-4 text-center">
               <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Build v2.4.0 — Security Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
