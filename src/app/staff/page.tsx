'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffRootPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/staff/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading staff portal...</p>
      </div>
    </div>
  );
}
