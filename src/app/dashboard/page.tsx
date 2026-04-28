'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { authClient } from '@/lib/auth-client';
import { Booking, Notification } from '@/lib/types';
import { withTimeout } from '@/lib/api-utils';
import { subscribeToNotifications, markAllAsRead } from '@/lib/notification-service';
import { Card, StatCard, CardHeader, InfoCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, StatsGrid, ContentGrid } from '@/components/layout/DashboardShell';
import {
  Car, Calendar, CheckCircle2, CreditCard, Bell,
  Star, ShieldCheck, MapPin, ArrowRight, Clock,
  Zap, ChevronRight
} from 'lucide-react';

// ─── Animated Counter ──────────────────────────────────────────────────────
function CountUp({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (to === 0) return;
    const step = Math.ceil(to / 30);
    let cur = 0;
    ref.current = setInterval(() => {
      cur = Math.min(cur + step, to);
      setVal(cur);
      if (cur >= to && ref.current) clearInterval(ref.current);
    }, 30);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [to]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

// ─── Status colour maps ────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-500',
};
const STEP_LABELS: Record<string, string> = {
  pending: 'Under Review', approved: 'Awaiting Payment',
  active: 'On Trip', completed: 'Finished', cancelled: 'Cancelled',
};
const STEPS = ['pending', 'approved', 'active', 'completed'];

function BookingProgress({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-black transition-all ${
            i < idx ? 'bg-green-500 text-white' :
            i === idx ? 'bg-slate-900 text-white scale-110 ring-2 ring-slate-900/20' :
            'bg-slate-100 text-slate-300'
          }`}>{i + 1}</div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all ${i < idx ? 'bg-green-400' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
      <span className="ml-2 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {STEP_LABELS[status] || status}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, upcoming: 0, totalTrips: 0, totalSpent: 0 });

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      setLoading(true);
      try {
        const user = authClient.getCurrentUser();
        if (user && db) {
          const [bookingsSnap, vehiclesSnap, locationsSnap] = await withTimeout(
            Promise.all([
              getDocs(query(collection(db, 'bookings'), where('user_id', '==', user.id), orderBy('created_at', 'desc'))),
              getDocs(collection(db, 'vehicles')),
              getDocs(collection(db, 'locations')),
            ]),
            6000
          );
          const vehiclesMap = Object.fromEntries(vehiclesSnap.docs.map((d: any) => [d.id, d.data()]));
          const locationsMap = Object.fromEntries(locationsSnap.docs.map((d: any) => [d.id, d.data()]));
          const data = bookingsSnap.docs.map((d: any) => {
            const b = d.data();
            return { id: d.id, ...b, vehicle: vehiclesMap[b.car_id] || { name: 'Vehicle' }, pickup_location: locationsMap[b.pickup_location_id] || { name: 'Location' } };
          }) as Booking[];
          setBookings(data);
          setStats({
            pending:    data.filter(b => b.status === 'pending').length,
            upcoming:   data.filter(b => b.status === 'approved').length,
            totalTrips: data.filter(b => b.status === 'completed').length,
            totalSpent: data.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total_price || 0), 0),
          });
          unsub = subscribeToNotifications(user.id, setNotifications);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary-700)]" />
        <p className="text-[var(--text-tertiary)] font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const unread = notifications.filter(n => !n.read);
  const user = authClient.getCurrentUser();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Drive Premium"
        subtitle="Manage your rentals with precision"
        action={
          <div className="flex items-center gap-3">
            <Link href="/booking">
              <Button leftIcon={<Car className="w-4 h-4" />}>
                New Booking
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatCard
          label="Pending"
          value={stats.pending}
          change={stats.pending > 0 ? 'Awaiting approval' : ''}
          changeType={stats.pending > 0 ? 'negative' : 'positive'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          change="Ready for pickup"
          changeType="positive"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="Total Trips"
          value={stats.totalTrips}
          change="Completed"
          changeType="positive"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Total Spent"
          value={`₱${stats.totalSpent.toLocaleString()}`}
          change="Lifetime"
          changeType="neutral"
          icon={<CreditCard className="w-5 h-5" />}
        />
      </StatsGrid>

      {/* Main Content Grid */}
      <ContentGrid
        sidebar={
          <div className="space-y-6">
            {/* Notifications */}
            <Card variant="elevated" padding="lg">
              <CardHeader
                title="Notifications"
                action={
                  unread.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-info)] animate-pulse" />
                      <button
                        onClick={() => user && markAllAsRead(user.id)}
                        className="text-xs font-medium text-[var(--color-info)] hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                  )
                }
              />
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {notifications.length === 0 ? (
                  <InfoCard type="info" icon={<Bell className="w-4 h-4" />}>
                    All caught up! No new notifications.
                  </InfoCard>
                ) : (
                  notifications.slice(0, 5).map((n, i) => (
                    <div 
                      key={n.id || i} 
                      className={`pl-3 border-l-2 ${n.read ? 'border-[var(--border-subtle)]' : 'border-[var(--color-info)]'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)]" />}
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Review CTA */}
            {stats.totalTrips > 0 && (
              <Card variant="elevated" padding="lg" className="!bg-[var(--color-primary-50)] !border-[var(--color-primary-200)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-100)] flex items-center justify-center">
                    <Star className="w-5 h-5 text-[var(--color-primary-600)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Leave a Review</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Share your experience</p>
                  </div>
                </div>
                <Link href="/dashboard/reviews">
                  <Button variant="outline" fullWidth size="sm">
                    Write a Review
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        }
      >
        {/* Current Bookings */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Current Activity"
            subtitle="Your active and recent bookings"
            action={
              <Link href="/dashboard/bookings">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            }
          />

          {bookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Car className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No bookings yet</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Book your first ride to get started
              </p>
              <Link href="/booking" className="inline-block mt-4">
                <Button size="sm">Book Now</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 4).map(booking => (
                <div 
                  key={booking.id} 
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary-300)] hover:shadow-sm transition-all group"
                >
                  <div className="w-full sm:w-28 h-20 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden shrink-0">
                    {booking.vehicle?.image_url ? (
                      <img 
                        src={booking.vehicle.image_url} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">
                        {booking.vehicle?.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_BG[booking.status] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <MapPin className="w-3 h-3" /> {booking.pickup_location?.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <ShieldCheck className="w-3 h-3" /> {booking.with_driver ? 'Chauffeur' : 'Self-Drive'}
                      </div>
                    </div>
                    <BookingProgress status={booking.status} />
                  </div>
                  <div className="flex items-center justify-center sm:justify-end">
                    <Link href={`/dashboard/bookings?id=${booking.id}`}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </ContentGrid>
    </div>
  );
}
