'use client';

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function SchedulesDeprecatedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Feature Removed</h1>
        <p className="text-slate-600 text-sm mb-6">
          Scheduled pricing has been removed per simplification A3. Prices are now locked at booking time.
        </p>
        <button
          onClick={() => router.push('/admin/pricing')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pricing
        </button>
      </div>
    </div>
  );
}

// Dead code kept only to satisfy any remaining imports during migration:
const _unused = null;
export { _unused as overlaps, _unused as normalizeSchedule };
export type PricingSchedule = never;
