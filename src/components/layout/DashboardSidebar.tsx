"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useBranding } from "@/components/providers/BrandingProvider";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "My Bookings", href: "/dashboard/bookings", icon: "🚗" },
  { name: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { name: "Payments", href: "/dashboard/payments", icon: "💳" },
  { name: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
  { name: "Reviews", href: "/dashboard/reviews", icon: "⭐" },
  { name: "Profile Settings", href: "/dashboard/settings", icon: "⚙️" },
  { name: "Support Tickets", href: "/dashboard/support", icon: "🎫" },
];

const Sidebar = () => {
  const { branding } = useBranding();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = authClient.getCurrentUser();
    setUser(u);
  }, []);

  return (
    <>
      {/* Mobile Menu Button - High Contrast */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[100] lg:hidden bg-green-700 text-white p-3.5 rounded-2xl shadow-xl shadow-green-700/30 hover:bg-green-800 transition-all active:scale-95"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar - Premium Dark Look */}
      <aside
        className={`fixed top-20 md:top-24 bottom-0 left-0 z-40 w-72 bg-slate-900 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* Brand Header */}
          <div className="p-8 pb-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                <img 
                  src={branding.logo_url} 
                  alt={branding.system_name} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tighter block leading-none">{branding.system_name}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80">Premium Access</span>
              </div>
            </Link>

          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? "bg-gradient-to-r from-green-700 to-green-600 text-white shadow-xl shadow-green-900/40 translate-x-1"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span className={`font-bold text-sm tracking-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 pt-0 mt-auto">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 w-full py-4 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl transition-all border border-white/5 font-bold text-sm"
          >
            <span>⬅️</span>
            <span>Back to Main Site</span>
          </Link>
          <div className="mt-4 text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">© 2026 {branding.system_name}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay - Premium Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-30 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
