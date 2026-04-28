'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchGlobalStats, fetchRecentActivity, DashboardStats } from '@/lib/dashboard-utils';
import { subscribeToNotifications } from '@/lib/notification-service';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Notification } from '@/lib/types';
import Link from 'next/link';
import { Card, StatCard, CardHeader, InfoCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, StatsGrid, ContentGrid } from '@/components/layout/DashboardShell';
import {
  TrendingUp, Users, Car, ClipboardList, ArrowRight,
  CheckCircle, Clock, Activity, Bell, Zap, RefreshCw,
  AlertCircle, ChevronRight
} from 'lucide-react';

interface PendingBooking {
  id: string;
  user_name?: string;
  vehicle_name?: string;
  start_date: string;
  end_date: string;
  total_price: number;
  created_at: any;
}

/**
 * Admin Dashboard - Huashu Design
 * 
 * Clean, minimalist layout with:
 * - High whitespace
 * - Subtle depth (shadows)
 * - Forest green + amber accent
 * - Clear information hierarchy
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [s, a] = await Promise.all([fetchGlobalStats(), fetchRecentActivity()]);
    setStats(s);
    setActivities(a);

    if (db) {
      try {
        const pSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('status', '==', 'pending'),
          orderBy('created_at', 'desc'),
          limit(5)
        ));
        setPending(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const allSnap = await getDocs(collection(db, 'bookings'));
        const counts: Record<string, number> = {};
        allSnap.docs.forEach(d => {
          const st = d.data().status || 'unknown';
          counts[st] = (counts[st] || 0) + 1;
        });
        setStatusCounts(counts);
      } catch {}
    }
    if (!silent) setLoading(false); else setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeToNotifications('admin', setNotifications);
    return () => unsub();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary-700)]" />
        <p className="text-[var(--text-tertiary)] font-medium text-sm animate-pulse">
          Loading dashboard data…
        </p>
      </div>
    );
  }

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const pipeline = [
    { key: 'pending', label: 'Pending', color: 'bg-[var(--color-accent-400)]', textColor: 'text-[var(--color-accent-700)]' },
    { key: 'approved', label: 'Approved', color: 'bg-[var(--color-info)]', textColor: 'text-[var(--color-info)]' },
    { key: 'active', label: 'Active', color: 'bg-[var(--color-success)]', textColor: 'text-[var(--color-success)]' },
    { key: 'completed', label: 'Completed', color: 'bg-[var(--text-tertiary)]', textColor: 'text-[var(--text-tertiary)]' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Command Center"
        subtitle="Real-time platform overview and key metrics"
        action={
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              stats?.revenueChange === 'Local' 
                ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' 
                : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
            }`}>
              <Zap className="w-3.5 h-3.5" />
              {stats?.revenueChange === 'Local' ? 'Offline Mode' : 'Cloud Live'}
            </div>
            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => loadData(true)}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatCard
          label="Total Revenue"
          value={`₱${(stats?.totalRevenue || 0).toLocaleString()}`}
          change={stats?.revenueChange || '+0%'}
          changeType={(stats?.revenueChange || '').startsWith('+') ? 'positive' : 'neutral'}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Active Users"
          value={String(stats?.activeUsers || 0)}
          change={stats?.usersChange || '+0%'}
          changeType="positive"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Active Rentals"
          value={String(stats?.activeRentals || 0)}
          change={stats?.rentalsChange || '+0%'}
          changeType="positive"
          icon={<Car className="w-5 h-5" />}
        />
        <StatCard
          label="Total Bookings"
          value={String(stats?.totalBookings || 0)}
          change={stats?.bookingsChange || '+0%'}
          changeType="positive"
          icon={<ClipboardList className="w-5 h-5" />}
        />
      </StatsGrid>

      {/* Pipeline Card */}
      <Card variant="elevated" padding="lg">
        <CardHeader
          title="Booking Pipeline"
          subtitle="Current status distribution across all bookings"
        />
        
        {/* Progress Bar */}
        <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mb-6 bg-[var(--bg-tertiary)]">
          {pipeline.map(p => (
            <div
              key={p.key}
              className={`${p.color} transition-all duration-500`}
              style={{ 
                width: `${((statusCounts[p.key] || 0) / total) * 100}%`,
                minWidth: statusCounts[p.key] ? '2%' : 0 
              }}
            />
          ))}
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {pipeline.map(p => (
            <div key={p.key} className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {statusCounts[p.key] || 0}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className={`w-2 h-2 rounded-full ${p.color}`} />
                <p className={`text-xs font-medium ${p.textColor}`}>
                  {p.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content Grid */}
      <ContentGrid
        sidebar={
          <div className="space-y-6">
            {/* Notifications */}
            <Card variant="elevated" padding="md">
              <CardHeader
                title="Notifications"
                action={
                  notifications.filter(n => !n.read).length > 0 && (
                    <span className="bg-[var(--color-info-light)] text-[var(--color-info)] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {notifications.filter(n => !n.read).length} new
                    </span>
                  )
                }
              />
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <InfoCard type="info" icon={<CheckCircle className="w-4 h-4" />}>
                    All caught up! No new notifications.
                  </InfoCard>
                ) : (
                  notifications.slice(0, 5).map((n, i) => (
                    <div 
                      key={n.id || i} 
                      className={`p-3 rounded-lg text-sm ${
                        n.read 
                          ? 'bg-[var(--bg-tertiary)]' 
                          : 'bg-[var(--color-info-light)] border border-[var(--color-info)]/20'
                      }`}
                    >
                      <p className={`font-semibold ${
                        n.read ? 'text-[var(--text-secondary)]' : 'text-[var(--color-info)]'
                      }`}>
                        {n.title}
                      </p>
                      <p className={`mt-0.5 text-xs ${
                        n.read ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card variant="elevated" padding="md">
              <CardHeader title="Recent Activity" />
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  activities.slice(0, 6).map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        a.status === 'approved' ? 'bg-[var(--color-info)]' :
                        a.status === 'active'   ? 'bg-[var(--color-success)]' :
                        a.status === 'pending'  ? 'bg-[var(--color-warning)]' : 
                        'bg-[var(--text-tertiary)]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {a.action}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {a.user} · {a.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <Link 
                  href="/admin/audit-logs" 
                  className="flex items-center justify-center gap-1 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  View Full Logs <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </div>
        }
      >
        {/* Pending Approvals */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Pending Approvals"
            subtitle={`${statusCounts.pending || 0} booking${statusCounts.pending !== 1 ? 's' : ''} awaiting review`}
            action={
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            }
          />
          
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-success-light)] flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
                </div>
                <p className="text-[var(--text-secondary)] font-medium">No pending bookings</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  All bookings have been processed
                </p>
              </div>
            ) : (
              pending.map(b => {
                const created = b.created_at instanceof Timestamp 
                  ? b.created_at.toDate() 
                  : new Date(b.created_at);
                return (
                  <div 
                    key={b.id} 
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--color-warning)]/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-warning-light)] flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {b.vehicle_name || 'Booking'} 
                        <span className="text-[var(--text-tertiary)] ml-1">
                          #{b.id.slice(0, 8).toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {b.start_date} → {b.end_date} · ₱{(b.total_price || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Link href={`/admin/bookings?id=${b.id}`}>
                      <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Review
                      </Button>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </ContentGrid>
    </div>
  );
}
