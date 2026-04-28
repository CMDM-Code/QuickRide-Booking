'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getPortalSession, clearPortalSession } from "@/lib/portal-auth";
import { initSessionManagement, destroySessionManagement } from "@/lib/session-service";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [adminName, setAdminName] = useState<string>('Admin');
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    try {
      const session = getPortalSession();
      if (!session) {
        router.push("/admin-login");
        return;
      }
      if (session.authenticated === true && session.role === 'admin') {
        setIsVerified(true);
        setAdminName(session.email?.split('@')[0] || 'Admin');
        setAdminEmail(session.email || '');
        initSessionManagement(() => {
          clearPortalSession();
          router.push("/auth/logged-out");
        });
      } else {
        router.push("/admin-login");
      }
    } catch {
      router.push("/admin-login");
    }

    return () => {
      destroySessionManagement();
    };
  }, [router]);

  const handleLogout = () => {
    clearPortalSession();
    router.push("/admin-login");
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary-700)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] font-medium">Verifying administrator access...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role="admin"
      userName={adminName}
      userEmail={adminEmail}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
