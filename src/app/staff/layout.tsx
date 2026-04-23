"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StaffSidebar from "@/components/layout/StaffSidebar";
import { staffAuth } from "@/lib/staff-auth";
import NotificationBell from "@/components/ui/NotificationBell";
import { User } from "lucide-react";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);

  useEffect(() => {
    if (!staffAuth.isAuthenticated()) {
      router.push("/staff-login");
    } else {
      setIsVerified(true);
      const session = staffAuth.getSession();
      setStaffName(session?.email || 'Staff member');
    }
  }, [router]);

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffSidebar />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Staff Dashboard</p>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-none">{staffName}</p>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mt-1">Authorized Staff</p>
              </div>
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
