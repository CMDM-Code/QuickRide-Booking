'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { staffAuth } from "@/lib/staff-auth";
import { initSessionManagement, destroySessionManagement } from "@/lib/session-service";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [staffName, setStaffName] = useState<string>('Staff');
  const [staffEmail, setStaffEmail] = useState<string>('');

  useEffect(() => {
    if (!staffAuth.isAuthenticated()) {
      router.push("/staff-login");
    } else {
      setIsVerified(true);
      const session = staffAuth.getSession();
      const name = session?.email?.split('@')[0] || 'Staff';
      setStaffName(name);
      setStaffEmail(session?.email || '');
      initSessionManagement(() => {
        staffAuth.logout();
        router.push("/auth/logged-out");
      });
    }

    return () => {
      destroySessionManagement();
    };
  }, [router]);

  const handleLogout = () => {
    staffAuth.logout();
    router.push("/staff-login");
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary-700)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role="staff"
      userName={staffName}
      userEmail={staffEmail}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
