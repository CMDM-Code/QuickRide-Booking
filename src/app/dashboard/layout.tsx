"use client";

import Sidebar from "@/components/layout/DashboardSidebar";
import NotificationBell from "@/components/ui/NotificationBell";
import { User, ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string | null>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    const user = authClient.getCurrentUser();
    setUserName(user?.name || "User");
  }, []);

  const pageTitle = pathname.split('/').pop()?.replace('-', ' ') || 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        {/* Dashboard Header - Premium Sticky Style */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Overview</p>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-none">{userName}</p>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mt-1">Verified Client</p>
              </div>
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 lg:p-10 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
