'use client';

import { useState } from "react";
import Link from "next/link";
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
        className="fixed top-6 left-6 z-[100] lg:hidden text-white p-3.5 rounded-2xl shadow-xl transition-all"
        style={{ backgroundColor: "var(--sidebar-item-active)" }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-20 bottom-0 left-0 z-40 w-64 shadow-xl transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <img
                  src={branding.logo_url}
                  alt={branding.system_name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {branding.system_name}
                </span>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Staff Portal</p>
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
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200"
                  style={
                    isActive
                      ? { backgroundColor: "var(--sidebar-item-active)", color: "var(--sidebar-text-active)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm" style={{ color: "inherit" }}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default StaffSidebar;
