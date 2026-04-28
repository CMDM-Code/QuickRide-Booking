'use client';

import React, { useState } from 'react';
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
  Home
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
 * 
 * Huashu-design principles:
 * - High whitespace
 * - Subtle depth with shadows
 * - Minimal borders
 * - Clear hierarchy
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
  const pathname = usePathname();

  // Role-based navigation
  const navigation: Record<DashboardRole, NavItem[]> = {
    admin: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Bookings', href: '/admin/bookings', icon: <Calendar className="w-5 h-5" />, badge: 12 },
      { label: 'Vehicles', href: '/admin/vehicles', icon: <Car className="w-5 h-5" /> },
      { label: 'Staff/Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
      { label: 'Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: <FileText className="w-5 h-5" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
    ],
    staff: [
      { label: 'Dashboard', href: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Approvals', href: '/staff/approvals', icon: <Calendar className="w-5 h-5" />, badge: 5 },
      { label: 'Fleet', href: '/staff/fleet', icon: <Car className="w-5 h-5" /> },
      { label: 'My Bookings', href: '/staff/bookings', icon: <FileText className="w-5 h-5" /> },
    ],
    client: [
      { label: 'Home', href: '/', icon: <Home className="w-5 h-5" /> },
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'My Bookings', href: '/dashboard/bookings', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Book a Ride', href: '/fleet', icon: <Car className="w-5 h-5" /> },
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed height, independent scroll */}
      <aside
        className={cn(
          'fixed lg:sticky inset-y-0 left-0 z-50 w-[var(--sidebar-width)]',
          'bg-[var(--sidebar-bg)] text-white flex flex-col',
          'transition-transform duration-300 ease-out',
          'lg:translate-x-0 h-screen',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Area - Fixed */}
        <div className="h-[var(--header-height)] flex-none flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-500)] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">QuickRide</h1>
              <p className="text-xs text-white/50 uppercase tracking-wider">{roleLabels[role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable area with independent scroll */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-6 px-4 min-h-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg',
                      'transition-all duration-200 group',
                      isActive 
                        ? 'bg-[var(--color-primary-700)] text-white shadow-lg shadow-black/10' 
                        : 'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                    )}>
                      {item.icon}
                    </span>
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'ml-auto text-xs font-bold px-2 py-0.5 rounded-full',
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-[var(--color-accent-500)] text-white'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section - Always visible at bottom, sticky */}
        <div className="flex-none p-4 border-t border-white/10 bg-[var(--sidebar-bg)]">
          <Card variant="ghost" padding="sm" className="!bg-white/5 !border-white/10">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
                roleColors[role]
              )}>
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white truncate">{userName}</p>
                <p className="text-xs text-white/50 truncate">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      </aside>

      {/* Main Content Area - Independent scroll container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="flex-none z-30 h-[var(--header-height)] bg-[var(--header-bg)] backdrop-blur-[var(--header-bg-blur)] border-b border-[var(--border-subtle)]">
          <div className="h-full flex items-center justify-between px-4 lg:px-8">
            {/* Left: Mobile Menu + Page Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Menu className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
              
              <div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  {roleLabels[role]} Portal
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-accent-500)]" />
              </button>

              {/* Mobile User Menu Toggle */}
              <div className="lg:hidden">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                  roleColors[role]
                )}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Independent scroll */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overscroll-contain">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Page Header Component - for consistent page headers
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] mb-3">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <Link 
                  href={crumb.href}
                  className="hover:text-[var(--text-secondary)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--text-secondary)]">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--text-secondary)] mt-1.5">
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
    <div className={cn('grid gap-4 lg:gap-6', gridCols[columns])}>
      {children}
    </div>
  );
}

// Content Grid - for main content layouts
interface ContentGridProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: 'narrow' | 'wide';
}

export function ContentGrid({ children, sidebar, sidebarWidth = 'narrow' }: ContentGridProps) {
  return (
    <div className={cn(
      'grid gap-6 lg:gap-8',
      sidebar 
        ? 'grid-cols-1 lg:grid-cols-[1fr_' + (sidebarWidth === 'wide' ? '380px' : '320px') + ']' 
        : 'grid-cols-1'
    )}>
      <div className="space-y-6">
        {children}
      </div>
      {sidebar && (
        <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
          {sidebar}
        </div>
      )}
    </div>
  );
}
