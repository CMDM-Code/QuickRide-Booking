'use client';

import { DashboardShell } from "@/components/layout/DashboardShell";
import { authClient } from "@/lib/auth-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserName(user.name || user.email?.split('@')[0] || 'User');
      setUserEmail(user.email || '');
    }
  }, []);

  const handleLogout = () => {
    authClient.logout();
    router.push("/auth/login");
  };

  return (
    <DashboardShell
      role="client"
      userName={userName}
      userEmail={userEmail}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
