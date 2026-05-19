'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewPricingSchedulePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/pricing/schedules");
  }, [router]);
  return null;
}
