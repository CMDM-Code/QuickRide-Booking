'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useBranding } from "@/components/providers/BrandingProvider";

const StaffSidebar = () => {
  const { branding } = useBranding();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/staff", icon: "📊" },
    { name: "Booking Management", href: "/staff/bookings", icon: "📋" },
    { name: "Approvals", href: "/staff/approvals", icon: "✅" },
    { name: "Assign Vehicle", href: "/staff/assign", icon: "🚗" },
    { name: "Active Rentals", href: "/staff/rentals", icon: "📍" },
    { name: "Customers", href: "/staff/customers", icon: "👤" },
    { name: "Messages", href: "/staff/messages", icon: "💬" },
    { name: "Fleet Management", href: "/staff/fleet", icon: "🔧" },
    { name: "Notifications", href: "/staff/notifications", icon: "🔔" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[100] lg:hidden bg-green-700 text-white p-3.5 rounded-2xl shadow-xl shadow-green-700/30 hover:bg-green-800 transition-all"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img 
                src={branding.logo_url} 
                alt={branding.system_name} 
                className="w-full h-full object-contain"
              />
            </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  {branding.system_name}
                </span>
                <p className="text-xs text-slate-500">Staff Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-item ${
                    isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>


        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default StaffSidebar;
