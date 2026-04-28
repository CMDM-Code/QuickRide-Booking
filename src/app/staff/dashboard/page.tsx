'use client';

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { fetchStaffDashboardStats } from "@/lib/staff-service";
import { Booking } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
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

/**
 * Staff Dashboard - Huashu Design
 * 
 * Operational dashboard for staff members:
 * - Clean card-based layout
 * - Amber accent for staff distinction
 * - High whitespace for readability
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent-600)]" />
        <p className="text-[var(--text-tertiary)] font-medium">Syncing Assignments...</p>
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-success-light)] text-[var(--color-success)]">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">System Live</span>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatCard
          label="Total Assigned"
          value={stats?.total_assigned || 0}
          change=""
          changeType="neutral"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Approval"
          value={stats?.pending_approval || 0}
          change={stats?.pending_approval > 0 ? 'Needs attention' : ''}
          changeType={stats?.pending_approval > 0 ? 'negative' : 'positive'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Active Rentals"
          value={stats?.active_rentals || 0}
          change=""
          changeType="positive"
          icon={<Truck className="w-5 h-5" />}
        />
        <StatCard
          label="Completed"
          value={stats?.completed || 0}
          change=""
          changeType="positive"
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </StatsGrid>

      {/* Content Grid */}
      <ContentGrid
        sidebar={
          <Card variant="elevated" padding="lg" className="bg-[var(--color-ink-800)] text-white !border-0">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-[var(--color-accent-400)]" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Customer Messaging</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-6">
              Respond to your assigned customers in real-time. Good communication leads to better ratings.
            </p>
            <Link href="/staff/messages">
              <Button variant="secondary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Messages
              </Button>
            </Link>
          </Card>
        }
      >
        {/* Recent Activity */}
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Recent Activity"
            subtitle="Your latest booking operations"
            action={
              <Link href="/staff/bookings">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            }
          />
          
          {stats?.recent_activity?.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Calendar className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No recent activity</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Your booking operations will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.recent_activity?.map((booking: Booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--bg-tertiary)] transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    booking.status === 'pending' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' :
                    booking.status === 'active' ? 'bg-[var(--color-info-light)] text-[var(--color-info)]' :
                    'bg-[var(--color-success-light)] text-[var(--color-success)]'
                  }`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      Booking #{booking.id.substring(0, 8)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Status updated to <span className="font-semibold">{booking.status}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                    </p>
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
