'use client';

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, RefreshCcw } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
      } else {
        throw new Error("Authentication system not initialized.");
      }
    } catch (err: any) {
      console.error("Reset failed:", err);
      setError(err.message || "Failed to send reset email. Please verify your address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 mb-6 shadow-inner">
              <KeyRound className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Forgot Password</h1>
            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
              Enter your email and we'll send you a link to reset your administrator credentials.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm font-bold text-red-700 leading-snug">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:ring-4 focus:ring-green-500/10 focus:border-green-700 transition-all outline-none"
                    placeholder="admin@quickride.com"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-700/20 hover:bg-green-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 border border-green-100 p-6 rounded-3xl flex flex-col items-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="text-green-800 font-bold leading-relaxed">
                  Check your inbox! We've sent password reset instructions to <span className="underline">{email}</span>.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Didn't receive it? Check your spam folder or wait a few minutes.
              </p>
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <Link 
              href="/admin-login" 
              className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Security Powered by QuickRide Control v2.5.0
          </p>
        </div>
      </div>
    </div>
  );
}
