/**
 * payment-service.ts — Payment Logic Engine (B1)
 *
 * All payment calculations and lifecycle rules read from getFullConfig() at runtime.
 * Never hardcodes payment amounts, percentages, or timing rules.
 *
 * Covers:
 *  B1.1 — calculateDownpayment()
 *  B1.2 — getPaymentTiming()
 *  B1.3 — isPaymentRequired()
 *  B1.6 — checkPaymentExpiry() / auto-cancel unpaid
 *  B1.7 — processRefund()
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getFullConfig } from './settings-service';
import type { FirestoreBooking, BookingActivityLog } from './booking-service';

// ─── B1.1 — Downpayment Calculation ──────────────────────────────────────────

export interface DownpaymentResult {
  required: boolean;
  amount: number;      // actual ₱ amount to collect
  type: 'percentage' | 'fixed';
  value: number;       // the raw % or fixed value from settings
  total: number;       // the full booking total for context
}

/**
 * Returns how much downpayment is required for a booking.
 * If downpayment_required is false, returns { required: false, amount: 0 }.
 */
export function calculateDownpayment(totalPrice: number): DownpaymentResult {
  const config = getFullConfig();
  const pay = config.payment;

  if (!pay.downpayment_required) {
    return { required: false, amount: 0, type: pay.downpayment_type, value: pay.downpayment_value, total: totalPrice };
  }

  let amount: number;
  if (pay.downpayment_type === 'percentage') {
    amount = Math.round((totalPrice * pay.downpayment_value) / 100 * 100) / 100;
  } else {
    amount = pay.downpayment_value;
  }

  return {
    required: true,
    amount,
    type: pay.downpayment_type,
    value: pay.downpayment_value,
    total: totalPrice,
  };
}

// ─── B1.x — Maintenance Block Check ─────────────────────────────────────────

function isPaymentProcessingBlocked(): { blocked: boolean; reason?: string } {
  const cfg = getFullConfig();
  if (cfg.system.maintenance_enabled && cfg.system.maintenance_blocks_payment_processing) {
    return { blocked: true, reason: 'Payment processing is temporarily disabled during maintenance.' };
  }
  return { blocked: false };
}

// ─── B1.2 — Payment Timing Helpers ────────────────────────────────────────────────────

/**
 * Returns when payment must be made relative to booking approval.
 * 'before_approval' → payment upload shown in booking flow before submission.
 * 'after_approval'  → payment upload shown after booking is approved.
 * 'flexible'        → no enforcement.
 */
export function getPaymentTiming(): 'before_approval' | 'after_approval' | 'flexible' {
  return getFullConfig().payment.payment_timing;
}

// ─── B1.3 — Is Payment Required at Current Status ─────────────────────────────

/**
 * Returns whether a payment proof upload should be visible/required
 * given the current booking status and the configured payment_timing.
 */
export function isPaymentRequiredNow(bookingStatus: FirestoreBooking['status']): boolean {
  const timing = getPaymentTiming();
  const config = getFullConfig();

  if (!config.payment.downpayment_required) return false;

  if (timing === 'before_approval') {
    return bookingStatus === 'pending';
  }
  if (timing === 'after_approval') {
    return bookingStatus === 'approved';
  }
  // flexible — show payment option in both pending and approved states
  return bookingStatus === 'pending' || bookingStatus === 'approved';
}

// ─── B1.6 — Auto-Cancel Unpaid Bookings ──────────────────────────────────────

export interface ExpiryCheckResult {
  expired: boolean;
  shouldAutoCancel: boolean;
  minutesRemaining?: number;
}

/**
 * Checks if a booking's payment window has expired.
 * If auto_cancel_unpaid_booking is on and payment_expires_at has passed,
 * marks the booking as cancelled in Firestore.
 *
 * @param bookingId  The booking to check.
 * @returns ExpiryCheckResult
 */
export async function checkPaymentExpiry(bookingId: string): Promise<ExpiryCheckResult> {
  const config = getFullConfig();
  const pay = config.payment;

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return { expired: false, shouldAutoCancel: false };

  const data = snap.data() as FirestoreBooking;

  // Only check pending/approved unpaid bookings
  if (!['pending', 'approved'].includes(data.status)) {
    return { expired: false, shouldAutoCancel: false };
  }
  if (data.payment_status === 'paid') {
    return { expired: false, shouldAutoCancel: false };
  }

  // Compute expiry time from created_at + expiry window
  const createdAt = new Date(data.created_at).getTime();
  const expiryMs = pay.pending_payment_expiry_minutes * 60 * 1000;
  const expiresAt = createdAt + expiryMs;
  const now = Date.now();

  if (now < expiresAt) {
    return {
      expired: false,
      shouldAutoCancel: false,
      minutesRemaining: Math.ceil((expiresAt - now) / 60000),
    };
  }

  // Expired — auto-cancel if setting is on
  if (pay.auto_cancel_unpaid_booking) {
    const existingLog = (data.activity_log || []) as BookingActivityLog[];
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      activity_log: [
        ...existingLog,
        {
          at: new Date().toISOString(),
          by: 'system',
          action: 'auto_cancelled',
          detail: `Auto-cancelled: payment not received within ${pay.pending_payment_expiry_minutes} minutes.`,
        } as BookingActivityLog,
      ],
      updated_at: serverTimestamp(),
    });
    return { expired: true, shouldAutoCancel: true };
  }

  return { expired: true, shouldAutoCancel: false };
}

// ─── B1.7 — Refund Processing ─────────────────────────────────────────────────

export interface RefundResult {
  success: boolean;
  refundAmount: number;
  mode: string;
  reason?: string;
}

/**
 * Calculates the refund amount for a booking based on settings,
 * and writes it to the booking Firestore doc.
 *
 * @param bookingId     The booking to refund.
 * @param staffName     Name of the staff processing the refund (for log).
 * @param overrideAmount Optional admin override of the refund amount.
 */
export async function processRefund(
  bookingId: string,
  staffName: string,
  overrideAmount?: number
): Promise<RefundResult> {
  const block = isPaymentProcessingBlocked();
  if (block.blocked) {
    return { success: false, refundAmount: 0, mode: 'percentage', reason: block.reason };
  }

  const config = getFullConfig();
  const pay = config.payment;

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return { success: false, refundAmount: 0, mode: pay.refund_mode, reason: 'Booking not found.' };

  const data = snap.data() as FirestoreBooking;
  const total = data.price_override ?? data.total_price ?? 0;

  // Calculate refund
  let refundAmount: number;
  if (overrideAmount !== undefined && pay.refund_override_allowed) {
    refundAmount = overrideAmount;
  } else {
    switch (pay.refund_mode) {
      case 'percentage':
        refundAmount = Math.round((total * pay.refund_default_percentage) / 100 * 100) / 100;
        break;
      case 'flat':
        refundAmount = pay.refund_default_flat;
        break;
      case 'hybrid':
        refundAmount = Math.round((total * pay.refund_default_percentage) / 100 * 100) / 100
                     + pay.refund_default_flat;
        break;
      default:
        refundAmount = 0;
    }
  }

  const existingLog = (data.activity_log || []) as BookingActivityLog[];
  const detail = overrideAmount !== undefined
    ? `Refund override by ${staffName}: ₱${refundAmount.toLocaleString()}`
    : `Refund processed by ${staffName}: ₱${refundAmount.toLocaleString()} (${pay.refund_mode} mode)`;

  await updateDoc(doc(db, 'bookings', bookingId), {
    payment_status: 'refunded',
    refund_amount: refundAmount,
    activity_log: [
      ...existingLog,
      { at: new Date().toISOString(), by: staffName, action: 'refund_processed', detail } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  });

  return { success: true, refundAmount, mode: pay.refund_mode };
}

// ─── B1.x — Failed Payment Handling ─────────────────────────────────────────

/**
 * Handles what happens when a payment upload is marked as failed.
 * 'keep_record'       → updates existing payment_status to 'failed'.
 * 'create_new_record' → same (Firestore doesn't have separate payment records,
 *                        so we log the failure and reset for retry).
 */
export async function handleFailedPayment(
  bookingId: string,
  staffName: string
): Promise<void> {
  const config = getFullConfig();
  const behavior = config.payment.failed_payment_behavior;

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return;

  const data = snap.data() as FirestoreBooking;
  const existingLog = (data.activity_log || []) as BookingActivityLog[];

  const update: Record<string, any> = {
    payment_status: 'failed',
    activity_log: [
      ...existingLog,
      {
        at: new Date().toISOString(),
        by: staffName,
        action: 'payment_failed',
        detail: `Payment marked failed by ${staffName}. Behavior: ${behavior}.`,
      } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  };

  // 'create_new_record' resets retry eligibility flag
  if (behavior === 'create_new_record') {
    update.payment_retry_count = ((data as any).payment_retry_count ?? 0) + 1;
  }

  await updateDoc(doc(db, 'bookings', bookingId), update);
}

// ─── B1.3 — Partial Payment Support ──────────────────────────────────────────

export interface PartialPaymentResult {
  success: boolean;
  newStatus: 'partial' | 'paid';
  amountPaid: number;
  remainingBalance: number;
  reason?: string;
}

/**
 * Submits a partial payment for a booking.
 * If total paid >= total due, marks booking as 'paid'.
 * Otherwise marks as 'partial' with remaining balance tracked.
 *
 * @param bookingId     The booking to apply partial payment to.
 * @param paidAmount    The amount being paid now.
 * @param paymentMethod Optional method (e.g., 'cash', 'card').
 */
export async function submitPartialPayment(
  bookingId: string,
  paidAmount: number,
  paymentMethod?: string
): Promise<PartialPaymentResult> {
  const block = isPaymentProcessingBlocked();
  if (block.blocked) {
    return { success: false, newStatus: 'paid', amountPaid: 0, remainingBalance: 0, reason: block.reason };
  }

  const config = getFullConfig();
  if (!config.payment.allow_partial_payment) {
    return { success: false, newStatus: 'paid', amountPaid: 0, remainingBalance: 0, reason: 'Partial payment not allowed.' };
  }

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) {
    return { success: false, newStatus: 'paid', amountPaid: 0, remainingBalance: 0, reason: 'Booking not found.' };
  }

  const data = snap.data() as FirestoreBooking;
  const totalDue = data.price_override ?? data.total_price ?? 0;
  const alreadyPaid = (data as any).amount_paid ?? 0;
  const totalPaidNow = alreadyPaid + paidAmount;
  const remainingBalance = Math.max(0, totalDue - totalPaidNow);

  const newStatus = remainingBalance === 0 ? 'paid' : 'partial';
  const existingLog = (data.activity_log || []) as BookingActivityLog[];

  const detail = `Partial payment received: ₱${paidAmount.toLocaleString()}${paymentMethod ? ` (${paymentMethod})` : ''}. Total paid: ₱${totalPaidNow.toLocaleString()} / ₱${totalDue.toLocaleString()}. Remaining: ₱${remainingBalance.toLocaleString()}.`;

  await updateDoc(doc(db, 'bookings', bookingId), {
    payment_status: newStatus,
    amount_paid: totalPaidNow,
    activity_log: [
      ...existingLog,
      { at: new Date().toISOString(), by: 'customer', action: 'payment_partial', detail } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  });

  return { success: true, newStatus, amountPaid: totalPaidNow, remainingBalance };
}

/**
 * Calculates the remaining balance for a booking.
 * Returns 0 if payment is complete.
 */
export function getRemainingBalance(booking: FirestoreBooking): number {
  const totalDue = booking.price_override ?? booking.total_price ?? 0;
  const alreadyPaid = (booking as any).amount_paid ?? 0;
  return Math.max(0, totalDue - alreadyPaid);
}

// ─── B1.4 — Payment Retry Support ───────────────────────────────────────────

export interface PaymentRetryEligibility {
  canRetry: boolean;
  reason?: string;
  currentStatus?: string;
}

/**
 * Checks if a booking with failed payment can be retried.
 * Returns false if allow_payment_retry is off or status is not 'failed'.
 */
export async function canRetryPayment(bookingId: string): Promise<PaymentRetryEligibility> {
  const config = getFullConfig();
  if (!config.payment.allow_payment_retry) {
    return { canRetry: false, reason: 'Payment retry not allowed by settings.' };
  }

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) {
    return { canRetry: false, reason: 'Booking not found.' };
  }

  const data = snap.data() as FirestoreBooking;
  const paymentStatus = data.payment_status;

  if (paymentStatus !== 'failed') {
    return { canRetry: false, reason: `Current payment status: ${paymentStatus}. Cannot retry.`, currentStatus: paymentStatus };
  }

  return { canRetry: true, currentStatus: 'failed' };
}

/**
 * Initiates a payment retry for a booking with failed payment.
 * Resets payment_status to 'pending' and logs the retry attempt.
 *
 * @param bookingId   The booking to retry payment for.
 * @param staffName   Name of the staff/customer initiating retry.
 */
export async function retryPayment(bookingId: string, staffName: string = 'customer'): Promise<boolean> {
  const block = isPaymentProcessingBlocked();
  if (block.blocked) return false;

  const config = getFullConfig();
  const eligibility = await canRetryPayment(bookingId);

  if (!eligibility.canRetry) {
    return false;
  }

  const snap = await getDoc(doc(db, 'bookings', bookingId));
  if (!snap.exists()) return false;

  const data = snap.data() as FirestoreBooking;
  const existingLog = (data.activity_log || []) as BookingActivityLog[];
  const behavior = config.payment.failed_payment_behavior;

  const detail = `Payment retry initiated by ${staffName}. Previous status: failed. Behavior: ${behavior}.`;

  const update: Record<string, any> = {
    payment_status: 'pending',
    activity_log: [
      ...existingLog,
      { at: new Date().toISOString(), by: staffName, action: 'payment_retry_initiated', detail } as BookingActivityLog,
    ],
    updated_at: serverTimestamp(),
  };

  // Reset retry count if using 'create_new_record' behavior
  if (behavior === 'create_new_record') {
    update.payment_retry_count = 0;
  }

  await updateDoc(doc(db, 'bookings', bookingId), update);
  return true;
}
