'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchGlobalStats, fetchRecentActivity, DashboardStats } from '@/lib/dashboard-utils';
import { subscribeToNotifications } from '@/lib/notification-service';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@/components/ui/Button';

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
  const [paymentQueue, setPaymentQueue] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [s, a] = await Promise.all([fetchGlobalStats(), fetchRecentActivity()]);
    setStats(s);
    setActivities(a);

    if (db) {
      try {
        const allSnap = await getDocs(collection(db, 'bookings'));
        console.log(`📊 Loaded ${allSnap.size} bookings for stats calculation`);
        const counts: Record<string, number> = {};
        allSnap.docs.forEach(d => {
          const st = d.data().status || 'unknown';
          counts[st] = (counts[st] || 0) + 1;
        });
        console.log("📈 Status counts:", counts);
        setStatusCounts(counts);
      } catch (err) {
        console.error("❌ Stats load failed:", err);
      }
    }
    if (!silent) setLoading(false); else setRefreshing(false);
  }, []);

  const getTimeAgo = (date: Date) => {
    const diff = (new Date().getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAction = async (id: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status: newStatus,
        updated_at: Timestamp.now(),
        processed_at: Timestamp.now(),
        processed_by: 'admin'
      });
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsubNotifications = subscribeToNotifications('admin', setNotifications);

    let unsubPending = () => {};
    let unsubPayments = () => {};
    
    if (db) {
      // Pending bookings
      unsubPending = onSnapshot(query(
        collection(db, 'bookings'),
        where('status', '==', 'pending'),
        limit(20) // Fetch more to allow client-side sorting
      ), (snap) => {
        const data = snap.docs.map(d => {
          const b = d.data();
          return { 
            id: d.id, 
            ...b,
            total_price: b.total_price || 0,
            created_at: b.created_at, // Keep as-is for sorting below, will format in render
            start_date: typeof b.start_date?.seconds === 'number' 
              ? new Date(b.start_date.seconds * 1000).toLocaleDateString()
              : b.start_date,
            end_date: typeof b.end_date?.seconds === 'number' 
              ? new Date(b.end_date.seconds * 1000).toLocaleDateString()
              : b.end_date
          } as PendingBooking;
        });
        // Client-side sort by created_at desc to avoid composite index requirements
        data.sort((a: any, b: any) => {
          const ta = a.created_at?.seconds || (a.created_at instanceof Date ? a.created_at.getTime() / 1000 : 0);
          const tb = b.created_at?.seconds || (b.created_at instanceof Date ? b.created_at.getTime() / 1000 : 0);
          return tb - ta;
        });
        setPending(data.slice(0, 5));
      }, (err) => {
        console.error("❌ Pending Bookings Listener Error:", err);
        if (err.message.includes('index')) {
          console.warn("💡 Missing composite index detected for pending bookings query.");
        }
      });

      // Payment verification queue
      unsubPayments = onSnapshot(query(
        collection(db, 'bookings'),
        where('payment_status', '==', 'pending_verification'),
        limit(5)
      ), (snap) => {
        setPaymentQueue(snap.docs.map(d => {
          const b = d.data();
          return { 
            id: d.id, 
            ...b,
            start_date: typeof b.start_date?.seconds === 'number' 
              ? new Date(b.start_date.seconds * 1000).toLocaleDateString()
              : b.start_date,
            end_date: typeof b.end_date?.seconds === 'number' 
              ? new Date(b.end_date.seconds * 1000).toLocaleDateString()
              : b.end_date
          };
        }));
      }, (err) => {
        console.error("❌ Payment Queue Listener Error:", err);
      });
    }

    return () => {
      unsubNotifications();
      unsubPending();
      unsubPayments();
    };
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
    { key: 'pending', label: 'Pending', color: 'bg-[var(--color-accent-400)]', textColor: 'text-[var(--color-accent-700)]', icon: <Clock className="w-3 h-3" /> },
    { key: 'approved', label: 'Approved', color: 'bg-[var(--color-info)]', textColor: 'text-[var(--color-info)]', icon: <CheckCircle className="w-3 h-3" /> },
    { key: 'active', label: 'Active', color: 'bg-[var(--color-success)]', textColor: 'text-[var(--color-success)]', icon: <Activity className="w-3 h-3" /> },
    { key: 'completed', label: 'Completed', color: 'bg-[var(--text-tertiary)]', textColor: 'text-[var(--text-tertiary)]', icon: <CheckCircle className="w-3 h-3" /> },
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
        
        {/* Progress Bar with Interactive Segments */}
        <div 
          className="flex gap-1 h-3 rounded-full overflow-hidden mb-8 bg-[var(--bg-tertiary)]"
          onMouseLeave={() => setActiveSegment(null)}
        >
          {pipeline.map(p => {
            const count = statusCounts[p.key] || 0;
            const percentage = (count / total) * 100;
            const isActive = activeSegment === p.key;
            const isAnyActive = activeSegment !== null;

            return (
              <motion.div
                key={p.key}
                className={`${p.color} relative cursor-pointer group`}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${percentage}%`,
                  opacity: isAnyActive ? (isActive ? 1 : 0.4) : 1,
                  scaleY: isActive ? 1.2 : 1
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setActiveSegment(p.key)}
              >
                {/* Micro Tooltip on Hover */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: -40, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-premium whitespace-nowrap z-50 pointer-events-none"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {p.label}: {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Pipeline Stats with Hover Highlight */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {pipeline.map(p => (
            <motion.div 
              key={p.key} 
              className={`text-center p-4 rounded-xl transition-all ${activeSegment === p.key ? 'bg-[var(--bg-secondary)] shadow-premium scale-105' : 'bg-transparent'}`}
              onMouseEnter={() => setActiveSegment(p.key)}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <motion.p 
                className="text-3xl font-bold text-[var(--text-primary)]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {statusCounts[p.key] || 0}
              </motion.p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`p-1 rounded-md bg-[var(--bg-tertiary)] ${p.textColor}`}>
                  {p.icon}
                </span>
                <p className={`text-xs font-bold uppercase tracking-widest ${p.textColor}`}>
                  {p.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Main Content Grid */}
      <ContentGrid
        sidebar={
          <div className="space-y-6">
            {/* Payment Verification Queue */}
            <Card variant="elevated" padding="md" className="border-l-4 border-l-[var(--color-info)]">
              <CardHeader
                title="Payment Queue"
                subtitle="Awaiting proof verification"
                action={
                  paymentQueue.length > 0 && (
                    <span className="bg-[var(--color-info-light)] text-[var(--color-info)] text-xs font-semibold px-2 py-0.5 rounded-full animate-pulse">
                      {paymentQueue.length}
                    </span>
                  )
                }
              />
              <div className="space-y-3">
                {paymentQueue.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] italic">No payments pending verification</p>
                ) : (
                  <div className="space-y-2">
                    {paymentQueue.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Link href={`/admin/bookings?id=${p.id}`}>
                          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-all border border-transparent hover:border-[var(--color-info)]/20 cursor-pointer group">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-info)] transition-colors">
                                #{p.id.slice(0, 8).toUpperCase()}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)] animate-ping" />
                                <p className="text-[10px] font-black text-[var(--color-info)] uppercase tracking-tighter">Verify</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate">
                              {p.user_name || 'Customer'} · ₱{(p.total_price || 0).toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

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
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <InfoCard type="info" icon={<CheckCircle className="w-4 h-4" />}>
                    All caught up! No new notifications.
                  </InfoCard>
                ) : (
                  notifications.slice(0, 5).map((n, i) => (
                    <motion.div 
                      key={n.id || i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-3 rounded-lg text-sm border transition-all ${
                        n.read 
                          ? 'bg-[var(--bg-tertiary)] border-transparent opacity-80' 
                          : 'bg-[var(--color-info-light)] border-[var(--color-info)]/20 shadow-sm'
                      }`}
                    >
                      <p className={`font-semibold ${
                        n.read ? 'text-[var(--text-secondary)]' : 'text-[var(--color-info)]'
                      }`}>
                        {n.title}
                      </p>
                      <p className={`mt-1 text-xs leading-relaxed ${
                        n.read ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {n.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card variant="elevated" padding="md">
              <CardHeader title="Recent Activity" />
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  activities.slice(0, 6).map((a, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 group"
                    >
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-150 ${
                        a.status === 'approved' ? 'bg-[var(--color-info)] shadow-[var(--color-info)]/20' :
                        a.status === 'active'   ? 'bg-[var(--color-success)] shadow-[var(--color-success)]/20' :
                        a.status === 'pending'  ? 'bg-[var(--color-warning)] shadow-[var(--color-warning)]/20' : 
                        'bg-[var(--text-tertiary)]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary-700)] transition-colors truncate">
                          {a.action}
                        </p>
                        <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
                          {a.user} · {a.time}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <Link 
                  href="/admin/audit-logs" 
                  className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--color-primary-700)] transition-all group"
                >
                  View Full Command Logs 
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
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
          
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {pending.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-success-light)] flex items-center justify-center shadow-inner">
                    <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
                  </div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">System Clear</p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2 max-w-[240px] mx-auto">
                    All pending bookings have been successfully processed.
                  </p>
                </motion.div>
              ) : (
                pending.map((b, idx) => {
                  const created = b.created_at instanceof Timestamp 
                    ? b.created_at.toDate() 
                    : (typeof b.created_at?.seconds === 'number'
                        ? new Date(b.created_at.seconds * 1000)
                        : new Date(b.created_at));
                  return (
                    <motion.div 
                      key={b.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: idx * 0.1, duration: 0.4, ease: "easeOut" }}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--color-warning)]/40 hover:shadow-premium transition-all group relative overflow-hidden"
                    >
                      {/* Interaction Glow */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-warning)] opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-light)] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                          <Clock className="w-6 h-6 text-[var(--color-warning)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--color-warning)] transition-colors">
                              {b.vehicle_name || 'Booking'} 
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-black uppercase tracking-widest border border-[var(--border-subtle)]">
                              {getTimeAgo(created)}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[var(--text-secondary)] mt-1.5 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">₱{(b.total_price || 0).toLocaleString()}</span>
                            <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span>{b.start_date} → {b.end_date}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-[var(--color-success)] border-[var(--color-success)]/20 hover:bg-[var(--color-success)] hover:text-white transition-all shadow-sm"
                          onClick={() => handleAction(b.id, 'approved')}
                        >
                          Quick Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-[var(--text-tertiary)] hover:text-[var(--color-error)]"
                          onClick={() => handleAction(b.id, 'rejected')}
                        >
                          Reject
                        </Button>
                        <Link href={`/admin/bookings?id=${b.id}`}>
                          <IconButton icon={<ChevronRight className="w-5 h-5" />} variant="ghost" className="rounded-full" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </Card>
      </ContentGrid>
    </div>
  );
}
