'use client';

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { fetchStaffDashboardStats } from "@/lib/staff-service";
import { Booking } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { toSafeDate } from "@/lib/api-utils";
import { Card, StatCard, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatsGrid, ContentGrid } from "@/components/layout/DashboardShell";
import Link from "next/link";
import { 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  MessageSquare,
  ArrowRight,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Staff Dashboard - UI/UX Pro Max "Liquid Glass"
 * 
 * Operational dashboard for staff members:
 * - Premium frosted glass cards
 * - Amber-accented "Staff" distinction
 * - Staggered Framer Motion animations
 */
export default function StaffDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setStaffName(user.name);
      loadStats(user.id);
    }
  }, []);

  async function loadStats(staffId: string) {
    const data = await fetchStaffDashboardStats(staffId);
    setStats(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-[var(--color-accent-600)]" 
        />
        <p className="text-[var(--text-tertiary)] font-medium animate-pulse">Syncing Assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${staffName}`}
        subtitle="Overview of your assigned booking operations"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-warning-light)] text-[var(--color-warning)] font-bold text-xs shadow-sm border border-[var(--color-warning)]/10">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span className="uppercase tracking-widest">Operator Active</span>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatCard
          label="Total Assigned"
          value={String(stats?.total_assigned || 0)}
          change=""
          changeType="neutral"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Approval"
          value={String(stats?.pending_approval || 0)}
          change={stats?.pending_approval > 0 ? 'Needs attention' : 'All clear'}
          changeType={stats?.pending_approval > 0 ? 'negative' : 'positive'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Active Rentals"
          value={String(stats?.active_rentals || 0)}
          change=""
          changeType="positive"
          icon={<Truck className="w-5 h-5" />}
        />
        <StatCard
          label="Completed"
          value={String(stats?.completed || 0)}
          change=""
          changeType="positive"
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </StatsGrid>

      {/* Content Grid */}
      <ContentGrid
        sidebar={
          <div className="space-y-6">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card variant="elevated" padding="lg" className="bg-[var(--color-ink-800)] text-white !border-0 relative overflow-hidden group">
                {/* Decorative Amber Glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-warning)]/20 blur-3xl group-hover:bg-[var(--color-warning)]/30 transition-colors" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 shadow-inner">
                    <MessageSquare className="w-6 h-6 text-[var(--color-warning)]" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-3">Customer Messaging</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    Respond to your assigned customers in real-time. Direct support improves platform reliability.
                  </p>
                  <Link href="/staff/messages">
                    <Button variant="secondary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />} className="shadow-lg">
                      Open Comm-Link
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>

            {/* Shift Summary Card */}
            <Card variant="elevated" padding="md">
              <CardHeader title="Shift Summary" />
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Load Level</span>
                  <span className="text-sm font-black text-[var(--color-warning)]">
                    {stats?.total_assigned > 10 ? 'High' : 'Normal'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Response Rate</span>
                  <span className="text-sm font-black text-[var(--color-success)]">98%</span>
                </div>
              </div>
            </Card>
          </div>
        }
      >
        {/* Recent Activity */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Operational Stream"
            subtitle="Real-time log of your assigned booking actions"
            action={
              <Link href="/staff/bookings">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Full Registry
                </Button>
              </Link>
            }
          />
          
          <AnimatePresence mode="popLayout">
            {stats?.recent_activity?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shadow-inner">
                  <Calendar className="w-10 h-10 text-[var(--text-tertiary)]" />
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">Stream Empty</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-2">
                  New operations will appear here as they are assigned.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {stats?.recent_activity?.map((booking: Booking, idx: number) => (
                  <motion.div 
                    key={booking.id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-5 p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--color-warning)]/30 hover:shadow-premium transition-all group relative overflow-hidden"
                  >
                    {/* Status Indicator Bar */}
                    <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${
                      booking.status === 'pending' ? 'bg-[var(--color-warning)]' :
                      booking.status === 'active' ? 'bg-[var(--color-info)]' :
                      'bg-[var(--color-success)]'
                    }`} />

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                      booking.status === 'pending' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' :
                      booking.status === 'active' ? 'bg-[var(--color-info-light)] text-[var(--color-info)]' :
                      'bg-[var(--color-success-light)] text-[var(--color-success)]'
                    }`}>
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--color-warning)] transition-colors">
                          Booking #{booking.id.substring(0, 8).toUpperCase()}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${
                          booking.status === 'pending' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/20' :
                          booking.status === 'active' ? 'bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]/20' :
                          'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] mt-1.5">
                        Assigned operation status updated
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-tighter">
                        {(() => {
                          const d = toSafeDate(booking.created_at);
                          return d ? formatDistanceToNow(d, { addSuffix: true }) : 'just now';
                        })()}
                      </p>
                      <Link href={`/staff/bookings?id=${booking.id}`}>
                        <Button size="sm" variant="ghost" className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </Card>
      </ContentGrid>
    </div>
  );
}
