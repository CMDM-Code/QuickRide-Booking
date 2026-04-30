'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CreditCard, Check, Lock, ChevronRight,
  AlertCircle, Smartphone, ShieldCheck,
} from 'lucide-react';

interface BookingRequest {
  id: string;
  car: { name: string; type: string; image: string };
  destinations: { specificLocation: string; city: string; province: string; region: string }[];
  details: {
    startDate: string; startTime: string;
    endDate: string; endTime: string;
    professionalDriver: string;
  };
  totalPrice: number;
}

interface PaymentModalProps {
  requests: BookingRequest[];
  grandTotal: number;
  onClose: () => void;
  onPay: () => Promise<void>;
}

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'cashapp', label: 'Cash App Pay', icon: Smartphone },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]['id'];

function formatCurrency(n: number) {
  return '₱' + n.toLocaleString('en-PH');
}

export default function PaymentModal({ requests, grandTotal, onClose, onPay }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  const serviceFee = Math.round(grandTotal * 0.02);
  const subtotal = grandTotal;
  const total = grandTotal + serviceFee;

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  function formatExpiry(v: string) {
    const cleaned = v.replace(/\D/g, '').slice(0, 4);
    return cleaned.length > 2 ? cleaned.slice(0, 2) + '/' + cleaned.slice(2) : cleaned;
  }

  async function handlePay() {
    setError('');
    if (method === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) return setError('Please enter a valid 16-digit card number.');
      if (expiry.length < 5) return setError('Please enter a valid expiry date (MM/YY).');
      if (cvc.length < 3) return setError('Please enter a valid CVC (3-4 digits).');
      if (!name.trim()) return setError('Please enter the cardholder name.');
    }
    setPaying(true);
    try {
      await onPay();
      setPaid(true);
    } catch (e: any) {
      setError(e?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl"
        style={{ background: 'var(--bg-secondary)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-20" />
        </div>

        {paid ? (
          /* ── Success State ── */
          <div className="flex flex-col items-center justify-center p-12 text-center gap-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/30"
            >
              <Check size={44} className="text-white" strokeWidth={3} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Payment Successful!
              </h2>
              <p className="text-[var(--text-secondary)] mt-2">
                Your booking has been confirmed. Check your email for details.
              </p>
            </div>
            <p className="text-4xl font-black text-green-600">{formatCurrency(total)}</p>
            <button
              onClick={onClose}
              className="mt-2 px-10 py-4 rounded-2xl font-bold text-white w-full max-w-xs hover:brightness-90 transition-all"
              style={{ background: '#15803d' }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">Secure Checkout</p>
                <h2 className="text-xl font-black text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Complete Payment
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
                  <Lock size={12} className="text-green-600" />
                  SSL Secured
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-subtle)] transition-colors"
                >
                  <X size={18} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-[1fr_280px] gap-6">
              {/* LEFT: Payment Form */}
              <div className="space-y-5 order-2 sm:order-1">
                {/* Payment Method Tabs */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all text-sm font-bold ${
                          method === m.id
                            ? 'border-green-600 bg-green-50/60 text-green-700'
                            : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <m.icon size={18} />
                        <span className="text-xs leading-tight">{m.label}</span>
                        {method === m.id && <Check size={14} className="ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Form */}
                <AnimatePresence mode="wait">
                  {method === 'card' ? (
                    <motion.div
                      key="card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5 block">Card Number</label>
                        <div className="relative">
                          <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input
                            className="payment-input pl-10"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={e => setCardNumber(formatCard(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5 block">Expiry</label>
                          <input
                            className="payment-input"
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={e => setExpiry(formatExpiry(e.target.value))}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5 block">CVC</label>
                          <input
                            className="payment-input"
                            placeholder="•••"
                            type="password"
                            maxLength={4}
                            value={cvc}
                            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5 block">Cardholder Name</label>
                        <input
                          className="payment-input"
                          placeholder="Full name on card"
                          value={name}
                          onChange={e => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5 block">Country</label>
                        <select className="payment-input appearance-none">
                          <option>Philippines</option>
                          <option>United States</option>
                          <option>Singapore</option>
                          <option>United Kingdom</option>
                          <option>Australia</option>
                        </select>
                      </div>

                      {/* Save Info Checkbox */}
                      <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            saveInfo
                              ? 'bg-green-600 border-green-600'
                              : 'border-[var(--border-default)] group-hover:border-green-500'
                          }`}
                          onClick={() => setSaveInfo(!saveInfo)}
                        >
                          {saveInfo && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          Securely save my information for faster checkouts
                        </span>
                      </label>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cashapp"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex flex-col items-center justify-center py-10 gap-4"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-[#00d632] flex items-center justify-center shadow-lg shadow-green-500/30">
                        <Smartphone size={32} className="text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-black text-[var(--text-primary)] text-lg">Cash App Pay</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[200px] leading-relaxed">
                          You will be redirected to Cash App to complete your payment securely.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl"
                    >
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-red-700">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pay Button */}
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full py-4 rounded-2xl font-black text-white shadow-xl shadow-green-700/30 hover:brightness-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base"
                  style={{ background: '#15803d' }}
                >
                  {paying ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <Lock size={16} />
                      Pay {formatCurrency(total)}
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  <ShieldCheck size={12} className="text-green-600" />
                  256-bit SSL encryption · PCI DSS compliant
                </div>
              </div>

              {/* RIGHT: Order Summary (Ticket) */}
              <div className="order-1 sm:order-2">
                <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden">
                  {/* Dark header */}
                  <div className="bg-slate-900 text-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-3">Order Summary</p>
                    <div className="space-y-2">
                      {requests.map((req, i) => (
                        <div key={req.id} className="flex justify-between text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{req.car.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                              {req.details.startDate} → {req.details.endDate}
                            </p>
                          </div>
                          <span className="font-bold text-green-400 shrink-0 ml-2">{formatCurrency(req.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ticket stub divider */}
                  <div className="relative flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[var(--bg-primary)] absolute -left-2" />
                    <div className="w-full border-t-2 border-dashed border-[var(--border-default)]" />
                    <div className="w-4 h-4 rounded-full bg-[var(--bg-primary)] absolute -right-2" />
                  </div>

                  {/* Price breakdown */}
                  <div className="p-5 space-y-3 bg-[var(--bg-secondary)]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">Subtotal</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] font-medium">Service Fee (2%)</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between">
                      <span className="font-black text-[var(--text-primary)]">Total</span>
                      <span className="font-black text-xl text-green-700">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Security badges */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {['Visa', 'Mastercard', 'GCash', 'PayMaya'].map(b => (
                    <span
                      key={b}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg text-[var(--text-tertiary)]"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
