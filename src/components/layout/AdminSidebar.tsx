'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearPortalSession } from "@/lib/portal-auth";
import { useBranding } from "@/components/providers/BrandingProvider";
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  MapPin, 
  Layers, 
  DollarSign, 
  CalendarClock, 
  ClipboardList, 
  BarChart3, 
  Image as ImageIcon, 
  MessageSquare, 
  Bell, 
  Palette, 
  Settings2, 
  ShieldCheck, 
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  LayoutGrid
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const AdminSidebar = () => {
  const { branding } = useBranding();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Dashboard': true,
    'Management': true,
    'Bookings': true,
    'Users & Support': true,
    'Media & Content': true,
    'Settings': true
  });

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('admin_sidebar_collapsed', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '80px' : '288px');
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '288px');
  }, [isCollapsed]);

  const navigation: NavGroup[] = [
    {
      name: "Dashboard",
      items: [
        { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
      ]
    },
    {
      name: "Management",
      items: [
        { name: "Vehicles", href: "/admin/vehicles", icon: Car },
        { name: "Locations", href: "/admin/locations", icon: MapPin },
        { name: "Levels", href: "/admin/levels", icon: Layers },
        { name: "Pricing", href: "/admin/pricing", icon: DollarSign },
        { name: "Schedules", href: "/admin/pricing/schedules", icon: CalendarClock },
      ]
    },
    {
      name: "Bookings",
      items: [
        { name: "All Bookings", href: "/admin/bookings", icon: ClipboardList },
        { name: "Reports", href: "/admin/reports", icon: BarChart3 },
      ]
    },
    {
      name: "Users & Support",
      items: [
        { name: "Users", href: "/admin/users", icon: Users },
        { name: "Messages", href: "/admin/messages", icon: MessageSquare },
      ]
    },
    {
      name: "Media & Content",
      items: [
        { name: "Media Library", href: "/admin/media", icon: ImageIcon },
        { name: "Notifications", href: "/admin/notifications", icon: Bell },
      ]
    },
    {
      name: "Settings",
      items: [
        { name: "Branding", href: "/admin/settings/branding", icon: Palette },
        { name: "Booking Form", href: "/admin/settings/booking-form", icon: LayoutGrid },
        { name: "System Settings", href: "/admin/settings", icon: Settings2 },
        { name: "System Logs", href: "/admin/logs", icon: FileText },
        { name: "Security", href: "/admin/security", icon: ShieldCheck },
      ]
    }
  ];

  const toggleGroup = (name: string) => {
    if (isCollapsed) return;
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[100] lg:hidden text-white p-3 rounded-xl shadow-xl transition-all"
        style={{ backgroundColor: "var(--sidebar-bg)" }}
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
        className={`fixed top-20 bottom-0 left-0 z-40 shadow-2xl transform transition-all duration-300 ease-in-out border-r
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-72"}
        `}
        style={{ backgroundColor: "var(--sidebar-bg)", borderColor: "var(--text-muted)" }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className={`p-6 border-b transition-all duration-300 ${isCollapsed ? 'items-center justify-center' : ''}`}
            style={{ borderColor: "var(--text-muted)" }}>
            <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-lg bg-white p-1"
                style={{ boxShadow: "0 10px 15px -3px rgba(21,128,61,0.2)" }}>
                <img 
                  src={branding.logo_url} 
                  alt={branding.system_name} 
                  className="w-full h-full object-contain"
                />
              </div>
              {!isCollapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-lg font-black tracking-tighter block leading-none" style={{ color: "var(--sidebar-text-active)" }}>{branding.system_name}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--color-primary)" }}>Admin Control</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {navigation.map((group) => (
              <div key={group.name} className="space-y-1">
                {!isCollapsed && (
                  <button 
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center justify-between px-2 mb-2 group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: "var(--text-muted)" }}>
                      {group.name}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedGroups[group.name] ? '' : '-rotate-90'}`} style={{ color: "var(--text-secondary)" }} />
                  </button>
                )}
                
                {(isCollapsed || expandedGroups[group.name]) && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          title={isCollapsed ? item.name : undefined}
                          className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                            isCollapsed ? 'justify-center p-3' : 'px-4 py-2.5 space-x-3'
                          } ${
                            isActive
                              ? "border"
                              : "hover:bg-white/5"
                          }
                          style={
                            isActive
                              ? { backgroundColor: "rgba(21,128,61,0.1)", color: "var(--color-primary)", borderColor: "rgba(21,128,61,0.2)" }
                              : { color: "var(--sidebar-text)" }
                          }
                          }`}
                        >
                          <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                            style={{ color: isActive ? "var(--color-primary)" : "inherit" }} />
                          {!isCollapsed && (
                            <span className={`font-bold text-sm tracking-tight`} style={{ color: isActive ? "var(--sidebar-text-active)" : "inherit" }}>
                              {item.name}
                            </span>
                          )}
                          {isActive && !isCollapsed && (
                            <div className="ml-auto w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 0 8px var(--color-primary)" }}></div>
                          )}
                          {isActive && isCollapsed && (
                            <div className="absolute left-0 w-1 h-6 rounded-r-full" style={{ backgroundColor: "var(--color-primary)" }}></div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer & Collapse Toggle */}
          <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(0,0,0,0.2)" }}>
            <button
              onClick={toggleCollapse}
              className={`hidden lg:flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all mb-2 ${isCollapsed ? 'justify-center' : ''}`}
              style={{ color: "var(--sidebar-text)" }}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-xs font-bold">Collapse Sidebar</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                clearPortalSession();
                window.location.href = '/admin-login';
              }}
              className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl hover:bg-red-400/5 transition-all font-bold group ${isCollapsed ? 'justify-center' : ''}`}
              style={{ color: "var(--sidebar-text)" }}
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span className="text-sm">Log Out</span>}
            </button>
            
            {!isCollapsed && (
              <div className="mt-4 text-center">
                 <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>QuickRide v2.5.0</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
