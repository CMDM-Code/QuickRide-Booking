"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { getPortalSession } from "@/lib/portal-auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    try {
      const session = getPortalSession();
      if (!session) {
        router.push("/admin-login");
        return;
      }
      if (session.authenticated === true && session.role === 'admin') {
        setIsVerified(true);
      } else {
        router.push("/admin-login");
      }
    } catch {
      router.push("/admin-login");
    }
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
      <main className="lg:ml-72 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
