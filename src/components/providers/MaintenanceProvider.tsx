'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getFullConfig } from '@/lib/settings-service';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Wrench } from 'lucide-react';

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribe = () => {};

    const checkMaintenance = async () => {
      try {
        const config = await getFullConfig();
        
        if (!config.system.maintenance_enabled) {
          setIsMaintenance(false);
          setIsChecking(false);
          return;
        }

        // If enabled, check if user is admin AND bypass is allowed
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            // Not logged in -> block
            setIsMaintenance(true);
            setIsChecking(false);
            return;
          }

          // Check if admin
          if (config.system.maintenance_allow_admin_bypass) {
            const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
              // Admin bypass allowed
              setIsMaintenance(false);
              setIsChecking(false);
              return;
            }
          }

          // Logged in but not admin or bypass not allowed
          setIsMaintenance(true);
          setIsChecking(false);
        });

      } catch (err) {
        console.error('Failed to check maintenance mode:', err);
        setIsChecking(false);
      }
    };

    checkMaintenance();

    return () => unsubscribe();
  }, []);

  // Let admin login page through so they can actually log in to bypass
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
          <Wrench className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">We'll be back shortly</h1>
        <p className="text-slate-500 max-w-md font-medium">
          The booking platform is currently undergoing scheduled maintenance to improve our services.
          Please check back later.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
