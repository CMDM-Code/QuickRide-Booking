'use client';

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminStore } from "@/lib/admin-store";

// Levenshtein distance algorithm for smart suggestions
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]) + 1;
    }
  }
  
  return matrix[a.length][b.length];
};

const validRoutes = [
  { path: '/', name: 'Home' },
  { path: '/vehicles', name: 'Vehicles' },
  { path: '/bookings', name: 'Bookings' },
  { path: '/admin/dashboard', name: 'Admin Dashboard' },
  { path: '/admin/users', name: 'User Management' },
  { path: '/admin/vehicles', name: 'Vehicle Management' },
  { path: '/admin/bookings', name: 'Booking Management' },
  { path: '/admin/security', name: 'Security Logs' },
  { path: '/admin/pricing', name: 'Pricing Engine' },
  { path: '/admin/reports', name: 'Reports' },
  { path: '/admin/notifications', name: 'Notifications' },
  { path: '/admin/settings', name: 'System Settings' },
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/signup', name: 'Sign Up' },
  { path: '/dashboard', name: 'Customer Dashboard' },
  { path: '/staff', name: 'Staff Portal' },
];

export default function NotFoundPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [suggestion, setSuggestion] = useState<{ path: string; name: string; distance: number } | null>(null);

  useEffect(() => {
    // Log 404 hit to security audit logs
    adminStore.logSecurityEvent('PAGE_NOT_FOUND', `Attempted access to ${pathname}`);
    
    // Check if user came from internal page
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  const bestSuggestion = useMemo(() => {
    const searchPath = pathname.toLowerCase().replace(/\//g, '');
    
    const scoredRoutes = validRoutes.map(route => {
      const routePath = route.path.toLowerCase().replace(/\//g, '');
      return {
        ...route,
        distance: levenshteinDistance(searchPath, routePath)
      };
    }).filter(r => r.distance <= Math.max(3, searchPath.length * 0.3))
      .sort((a, b) => a.distance - b.distance);
    
    return scoredRoutes[0] || null;
  }, [pathname]);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-green-700">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 mt-4">Page Not Found</h2>
        <p className="text-slate-600 mt-2 mb-6">The page you're looking for doesn't exist or has been moved.</p>

        {bestSuggestion && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-slate-700 mb-2">Did you mean:</p>
            <Link href={bestSuggestion.path} className="font-semibold text-blue-700 hover:underline text-lg">
              {bestSuggestion.name}
            </Link>
          </div>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          {canGoBack && (
            <button onClick={handleGoBack} className="btn-secondary">
              Go Back
            </button>
          )}
          <Link href="/" className="btn-primary">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
