"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { getPortalSession, clearPortalSession } from "@/lib/portal-auth";
import { initSessionManagement, destroySessionManagement } from "@/lib/session-service";
import NotificationBell from "@/components/ui/NotificationBell";
import { User } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const session = getPortalSession();
      if (!session) {
        router.push("/admin-login");
        return;
      }
      if (session.authenticated === true && session.role === 'admin') {
        setIsVerified(true);
        setAdminName(session.email || 'Admin');
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

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying administrator access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main 
        className="min-h-screen transition-all duration-300 flex flex-col"
        style={{ marginLeft: 'var(--sidebar-width, 288px)' }}
      >
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Overview</p>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-none">{adminName}</p>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mt-1">Super Admin</p>
              </div>
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 lg:p-10 flex-1">{children}</div>
      </main>
    </div>
  );
}
