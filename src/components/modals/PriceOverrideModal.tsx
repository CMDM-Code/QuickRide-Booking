'use client';
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFullConfig } from '@/lib/settings-service';
import { X, DollarSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface PriceOverrideModalProps {
  bookingId: string;
  originalPrice: number;
  currency?: string;
  adminName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PriceOverrideModal({
  bookingId,
  originalPrice,
  currency = '₱',
  adminName,
  onClose,
  onSuccess,
}: PriceOverrideModalProps) {
  const [customPrice, setCustomPrice] = useState<string>(String(originalPrice));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getFullConfig();
  const canOverride =
    config.pricing.allow_admin_pricing_override ||
    config.pricing.allow_staff_pricing_override;

  const handleApply = async () => {
    const parsed = parseFloat(customPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid price greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required for price overrides.');
      return;
    }
    if (!canOverride) {
      setError('Price overrides are not permitted by current system settings.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const logEntry = {
        at: new Date().toISOString(),
        by: adminName,
        reason: reason.trim(),
        original: originalPrice,
        override: parsed,
      };

      await updateDoc(doc(db, 'bookings', bookingId), {
        price_override: parsed,
        price_override_log: arrayUnion(logEntry),
        updated_at: serverTimestamp(),
      });

      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to apply price override.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Price Override</h2>
              <p className="text-xs text-slate-400">Admin action — logged automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Original price display */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Original Price</span>
            <span className="text-sm font-bold text-slate-700">
              {currency}{originalPrice.toLocaleString()}
            </span>
          </div>

          {/* Custom price input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Override Price ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                {currency}
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                placeholder="Enter custom price"
              />
            </div>
          </div>

          {/* Reason field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
              placeholder="Explain why the price is being overridden…"
            />
            <p className="text-xs text-slate-400 mt-1">
              This reason will be logged permanently against the booking.
            </p>
          </div>

          {/* Log preview */}
          {reason.trim() && customPrice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <span className="font-bold">Log preview: </span>
              &ldquo;Price overridden by {adminName}: {reason.trim()} — original {currency}
              {originalPrice.toLocaleString()} → override {currency}
              {parseFloat(customPrice || '0').toLocaleString()}&rdquo;
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={saving || !canOverride}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Apply Override</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
