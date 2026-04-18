"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex pt-16 md:pt-20">
        <Sidebar />
        <main className="flex-1 lg:ml-72 min-h-[calc(100vh-80px)]">
          <div className="p-4 md:p-8 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
