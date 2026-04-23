'use client';

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import NotificationBell from "@/components/ui/NotificationBell";
import { User } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  role: 'admin' | 'staff' | 'customer';
}

export default function DashboardHeader({ title, role }: DashboardHeaderProps) {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    setUserName(user?.name || null);
  }, []);

  return (
    <header className="flex items-center justify-between mb-8 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{role} Control</h2>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="h-10 w-[1px] bg-slate-100 mx-2 hidden md:block"></div>
        
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
          <div className="w-8 h-8 bg-green-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-700/20">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-black text-slate-900 leading-none">{userName || 'User'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
