'use client';

import { useState, useEffect } from 'react';
import { getFullConfig } from '@/lib/settings-service';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Loader,
  RotateCcw,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { submitPartialPayment, getRemainingBalance, retryPayment } from '@/lib/payment-service';
import { canReactivate, canReapprove, reactivateBooking, reapproveRejectedBooking } from '@/lib/booking-engine';
import type { FirestoreBooking } from '@/lib/booking-service';

interface BookingDetailContentProps {
  booking: FirestoreBooking;
  onPaymentSuccess?: () => void;
}

export default function BookingDetailContent({ booking, onPaymentSuccess }: BookingDetailContentProps) {
  const config = getFullConfig();
  const [loading, setLoading] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [reapproveLoading, setReapproveLoading] = useState(false);
  const [reactivateError, setReactivateError] = useState('');
  const [reactivateSuccess, setReactivateSuccess] = useState('');
  const [reapproveError, setReapproveError] = useState('');
  const [reapproveSuccess, setReapproveSuccess] = useState('');

  const totalDue = booking.price_override ?? booking.total_price ?? 0;
  const remainingBalance = getRemainingBalance(booking);
  const isPaid = booking.payment_status === 'paid';
  const isPartial = booking.payment_status === 'partial';
  const isFailed = booking.payment_status === 'failed';
  const isPending = booking.payment_status === 'pending';
  const allowPartialPayment = config?.payment?.allow_partial_payment ?? false;
  const allowPaymentRetry = config?.payment?.allow_payment_retry ?? false;

  const handlePartialPayment = async () => {
    setError('');
    setSuccess('');

    const amount = parseFloat(partialAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amount > remainingBalance) {
      setError(`Amount cannot exceed remaining balance (₱${remainingBalance.toLocaleString()}).`);
      return;
    }

    setLoading(true);
    try {
      const result = await submitPartialPayment(booking.id, amount, paymentMethod);
      if (result.success) {
        setSuccess(`✓ Payment received! Remaining balance: ₱${result.remainingBalance.toLocaleString()}.`);
        setPartialAmount('');
        onPaymentSuccess?.();
      } else {
        setError(result.reason || 'Failed to process payment.');
      }
    } catch (e: any) {
      setError(e?.message || 'Error processing payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await retryPayment(booking.id, 'customer');
      if (result) {
        setSuccess('✓ Payment retry initiated. Please complete your payment now.');
        onPaymentSuccess?.();
      } else {
        setError('Unable to retry payment. Please contact support.');
      }
    } catch (e: any) {
      setError(e?.message || 'Error initiating payment retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateBooking = async () => {
    setReactivateError('');
    setReactivateSuccess('');
    setReactivateLoading(true);
    try {
      const result = await reactivateBooking(booking.id, 'customer');
      if (result.success) {
        setReactivateSuccess('✓ Booking has been reactivated. It is now pending review.');
        onPaymentSuccess?.();
      } else {
        setReactivateError(result.reason || 'Failed to reactivate booking.');
      }
    } catch (e: any) {
      setReactivateError(e?.message || 'Error reactivating booking.');
    } finally {
      setReactivateLoading(false);
    }
  };

  const handleReapproveBooking = async () => {
    setReapproveError('');
    setReapproveSuccess('');
    setReapproveLoading(true);
    try {
      const result = await reapproveRejectedBooking(booking.id, 'customer');
      if (result.success) {
        setReapproveSuccess('✓ Booking has been resubmitted for review.');
        onPaymentSuccess?.();
      } else {
        setReapproveError(result.reason || 'Failed to resubmit booking.');
      }
    } catch (e: any) {
      setReapproveError(e?.message || 'Error resubmitting booking.');
    } finally {
      setReapproveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Booking #{booking.id.slice(0, 8)}</h2>
        <p className="text-slate-600 text-sm mt-1">
          {booking.start_date} to {booking.end_date}
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-200">
        <h3 className="font-bold text-slate-900">Booking Details</h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Vehicle</p>
            <p className="font-bold text-slate-900">{booking.vehicle?.name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-slate-600">Status</p>
            <p className="font-bold text-slate-900 capitalize">{booking.status}</p>
          </div>
          <div>
            <p className="text-slate-600">Dates</p>
            <p className="font-bold text-slate-900">
              {booking.start_date} → {booking.end_date}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Driver</p>
            <p className="font-bold text-slate-900">{booking.with_driver ? 'Professional' : 'Self-Drive'}</p>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-2xl p-6 space-y-4 border border-slate-200">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <CreditCard size={20} />
          Payment Information
        </h3>

        {/* Total Price */}
        <div className="flex justify-between items-center py-3 border-b border-slate-200">
          <span className="text-slate-600">Total Price</span>
          <span className="font-bold text-slate-900 text-lg">₱{totalDue.toLocaleString()}</span>
        </div>

        {/* Amount Paid */}
        {isPartial && (
          <div className="flex justify-between items-center py-3 border-b border-slate-200">
            <span className="text-slate-600">Amount Paid</span>
            <span className="font-bold text-green-700">₱{(totalDue - remainingBalance).toLocaleString()}</span>
          </div>
        )}

        {/* Payment Status Badge */}
        <div className="py-3">
          <div className="flex items-center gap-2">
            {isPaid && (
              <>
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="font-bold text-green-700">Fully Paid</span>
              </>
            )}
            {isPartial && (
              <>
                <DollarSign size={20} className="text-orange-600" />
                <span className="font-bold text-orange-700">Partially Paid</span>
              </>
            )}
            {isFailed && (
              <>
                <AlertCircle size={20} className="text-red-600" />
                <span className="font-bold text-red-700">Payment Failed</span>
              </>
            )}
            {isPending && (
              <>
                <Clock size={20} className="text-slate-600" />
                <span className="font-bold text-slate-700">Payment Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Remaining Balance */}
        {!isPaid && remainingBalance > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800 mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-orange-700">₱{remainingBalance.toLocaleString()}</p>
          </div>
        )}

        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800">✓ Payment is complete. Thank you!</p>
          </div>
        )}
      </div>

      {/* Partial Payment Section */}
      {allowPartialPayment && !isPaid && remainingBalance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-blue-900 flex items-center gap-2">
            <Zap size={18} />
            Submit Partial Payment
          </h4>

          <p className="text-sm text-blue-800">
            You can pay part of the outstanding balance now and the remainder later.
          </p>

          <div className="space-y-3">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Amount (₱)</label>
              <input
                type="number"
                min="0"
                max={remainingBalance}
                step="100"
                value={partialAmount}
                onChange={e => setPartialAmount(e.target.value)}
                placeholder={`Up to ₱${remainingBalance.toLocaleString()}`}
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 placeholder-slate-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900"
              >
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePartialPayment}
              disabled={loading || !partialAmount}
              className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader size={18} className="animate-spin" />}
              {loading ? 'Processing...' : 'Submit Payment'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* Payment Retry Section */}
      {allowPaymentRetry && isFailed && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-orange-900 flex items-center gap-2">
            <RotateCcw size={18} />
            Retry Payment
          </h4>

          <p className="text-sm text-orange-800">
            Your previous payment attempt failed. You can retry now.
          </p>

          <button
            onClick={handleRetryPayment}
            disabled={loading}
            className="w-full px-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader size={18} className="animate-spin" />}
            {loading ? 'Initiating...' : 'Retry Payment Now'}
          </button>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* No Retry Available */}
      {!allowPaymentRetry && isFailed && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle size={18} />
            Payment Issue
          </h4>

          <p className="text-sm text-slate-700">
            Payment retry is not available. Please contact our support team to resolve this issue.
          </p>

          <a
            href="mailto:support@quickride.com"
            className="inline-block px-4 py-2 bg-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-300 transition-colors"
          >
            Contact Support
          </a>
        </div>
      )}

      {/* Reactivate Cancelled Booking */}
      {canReactivate(booking.status) && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-purple-900 flex items-center gap-2">
            <RefreshCw size={18} />
            Reactivate Booking
          </h4>

          <p className="text-sm text-purple-800">
            This booking was cancelled but can be reactivated. It will return to pending status for admin review.
          </p>

          <button
            onClick={handleReactivateBooking}
            disabled={reactivateLoading}
            className="w-full px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {reactivateLoading && <Loader size={18} className="animate-spin" />}
            {reactivateLoading ? 'Reactivating...' : 'Reactivate Booking'}
          </button>

          {/* Messages */}
          {reactivateError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {reactivateError}
            </div>
          )}
          {reactivateSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              {reactivateSuccess}
            </div>
          )}
        </div>
      )}

      {/* Re-evaluate Rejected Booking */}
      {canReapprove(booking.status) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-indigo-900 flex items-center gap-2">
            <RefreshCw size={18} />
            Re-evaluate Booking
          </h4>

          <p className="text-sm text-indigo-800">
            This booking was rejected but can be resubmitted for review. It will return to pending status for reconsideration.
          </p>

          <button
            onClick={handleReapproveBooking}
            disabled={reapproveLoading}
            className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {reapproveLoading && <Loader size={18} className="animate-spin" />}
            {reapproveLoading ? 'Resubmitting...' : 'Resubmit for Review'}
          </button>

          {/* Messages */}
          {reapproveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {reapproveError}
            </div>
          )}
          {reapproveSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              {reapproveSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
