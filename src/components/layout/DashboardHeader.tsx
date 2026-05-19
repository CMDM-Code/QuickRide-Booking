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
    <header className="flex items-center justify-between mb-8 p-4 md:p-6 rounded-[2rem] border shadow-sm" style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border-subtle)" }}>
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--text-muted)" }}>{role} Control</h2>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="h-10 w-[1px] mx-2 hidden md:block" style={{ backgroundColor: "var(--border-subtle)" }}></div>
        
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-subtle)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-black leading-none" style={{ color: "var(--text-primary)" }}>{userName || 'User'}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
