'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  LayoutDashboard,
  Calendar,
  Car,
  Users,
  Settings,
  FileText,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Home,
  Moon,
  Sun,
  MessageCircle,
  MapPin,
  DollarSign,
  Search
} from 'lucide-react';

// Role type for dashboard variants
export type DashboardRole = 'admin' | 'staff' | 'client';

// Navigation item type
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  role: DashboardRole;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

/**
 * Dashboard Shell
 * 
 * Unified layout component for Admin, Staff, and Client dashboards.
 * Provides consistent navigation, header, and content structure.
 */
export function DashboardShell({
  children,
  role,
  userName = 'User',
  userEmail = '',
  userAvatar,
  onLogout
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Role-based navigation
  const navigation: Record<DashboardRole, NavItem[]> = {
    admin: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Bookings', href: '/admin/bookings', icon: <Calendar className="w-5 h-5" />, badge: 12 },
      { label: 'Vehicles', href: '/admin/vehicles', icon: <Car className="w-5 h-5" /> },
      { label: 'Locations', href: '/admin/locations', icon: <MapPin className="w-5 h-5" /> },
      { label: 'Pricing', href: '/admin/pricing', icon: <DollarSign className="w-5 h-5" /> },
      { label: 'Staff/Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
      { label: 'Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: <FileText className="w-5 h-5" /> },
      { label: 'Chat Support', href: '/admin/messages', icon: <MessageCircle className="w-5 h-5" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
    ],
    staff: [
      { label: 'Dashboard', href: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Approvals', href: '/staff/approvals', icon: <Calendar className="w-5 h-5" />, badge: 5 },
      { label: 'Assign', href: '/staff/assign', icon: <Car className="w-5 h-5" /> },
      { label: 'Fleet', href: '/staff/fleet', icon: <Car className="w-5 h-5" /> },
      { label: 'My Bookings', href: '/staff/bookings', icon: <FileText className="w-5 h-5" /> },
      { label: 'Support Inbox', href: '/staff/support', icon: <MessageCircle className="w-5 h-5" /> },
    ],
    client: [
      { label: 'Home', href: '/', icon: <Home className="w-5 h-5" /> },
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'My Bookings', href: '/dashboard/bookings', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Profile', href: '/dashboard/settings', icon: <User className="w-5 h-5" /> },
    ]
  };

  const navItems = navigation[role];
  const roleLabels: Record<DashboardRole, string> = {
    admin: 'Administrator',
    staff: 'Staff Member',
    client: 'Client'
  };

  const roleColors: Record<DashboardRole, string> = {
    admin: 'bg-[var(--color-primary-700)]',
    staff: 'bg-[var(--color-accent-600)]',
    client: 'bg-[var(--color-info)]'
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-all"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky inset-y-0 left-0 z-50 w-[var(--sidebar-width)]',
          'bg-[var(--sidebar-bg)] text-white flex flex-col border-r border-white/5',
          'transition-transform duration-300 ease-out',
          'lg:translate-x-0 h-screen',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Area */}
        <div className="h-[var(--header-height)] flex-none flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-700)] flex items-center justify-center shadow-lg shadow-black/20">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">QuickRide</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1">{roleLabels[role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-6 px-4 custom-scrollbar">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard' && item.href !== '/admin/dashboard' && item.href !== '/staff/dashboard');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl',
                      'transition-all duration-300 group relative',
                      isActive 
                        ? 'bg-white/10 text-white shadow-inner' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-[var(--color-primary-500)] rounded-r-full shadow-[0_0_8px_var(--color-primary-500)]" />
                    )}
                    <span className={cn(
                      'transition-all duration-300',
                      isActive ? 'text-[var(--color-primary-400)] scale-110' : 'group-hover:text-white'
                    )}>
                      {item.icon}
                    </span>
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'ml-auto text-[10px] font-black px-2 py-0.5 rounded-lg',
                        isActive 
                          ? 'bg-[var(--color-primary-500)] text-white' 
                          : 'bg-white/10 text-white/60'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="flex-none p-4 mt-auto">
          <Card variant="ghost" padding="sm" className="!bg-white/5 !border-white/10 !rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg',
                roleColors[role]
              )}>
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{userName}</p>
                <p className="text-[10px] text-white/40 truncate font-medium">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header 
          className={cn(
            "h-[var(--header-height)] sticky top-0 z-30 transition-all duration-300 flex items-center px-6 lg:px-8",
            scrolled ? "backdrop-blur-md border-b shadow-sm" : "bg-transparent"
          )}
          style={scrolled ? { backgroundColor: "rgba(255,255,255,0.8)", borderColor: "var(--border-subtle)" } : {}}
        >
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl border shadow-sm"
                style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)" }}
              >
                <Menu size={20} />
              </button>

              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all shadow-inner"
                style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-default)" }}>
                <Search size={16} style={{ color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  placeholder="Quick search..." 
                  className="bg-transparent border-0 outline-none text-sm font-medium w-48 lg:w-64"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2.5 rounded-xl transition-all group"
                style={{ backgroundColor: "transparent" }}>
                <Bell size={20} className="group-hover:scale-110 transition-transform" style={{ color: "var(--text-secondary)" }} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2" style={{ backgroundColor: "var(--error)", borderColor: "var(--bg-surface)" }} />
              </button>
              
              <div className="h-6 w-[1px] mx-1 hidden sm:block" style={{ backgroundColor: "var(--border-default)" }} />

              <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
                  <p className="text-xs font-bold flex items-center justify-end gap-1" style={{ color: "var(--success)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--success)" }}></span>
                    Online
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center font-bold border overflow-hidden"
                  style={{
                    background: "linear-gradient(to bottom right, var(--bg-subtle), var(--border-default))",
                    color: "var(--text-primary)",
                    borderColor: "var(--bg-surface)"
                  }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto overscroll-contain custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Page Header Component
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-10">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
              {crumb.href ? (
                <Link 
                  href={crumb.href}
                  className="hover:text-[var(--color-primary-500)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "var(--text-secondary)" }}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: "var(--text-primary)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="font-medium max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// Stats Grid Component
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-6', gridCols[columns])}>
      {children}
    </div>
  );
}

// Content Grid Component
interface ContentGridProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: 'narrow' | 'wide';
}

export function ContentGrid({ children, sidebar, sidebarWidth = 'narrow' }: ContentGridProps) {
  return (
    <div className={cn(
      'grid gap-8',
      sidebar 
        ? 'grid-cols-1 lg:grid-cols-[1fr_' + (sidebarWidth === 'wide' ? '380px' : '320px') + ']' 
        : 'grid-cols-1'
    )}>
      <div className="space-y-8">
        {children}
      </div>
      {sidebar && (
        <div className="space-y-8 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
          {sidebar}
        </div>
      )}
    </div>
  );
}
