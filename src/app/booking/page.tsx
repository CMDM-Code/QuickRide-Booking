'use client';

import { Suspense } from 'react';
import ModernBookingFlow from '@/components/forms/ModernBookingFlow';

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading booking...</div>}>
      <ModernBookingFlow />
    </Suspense>
  );
}
