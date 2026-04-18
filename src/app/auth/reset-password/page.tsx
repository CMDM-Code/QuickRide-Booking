"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/quickride_logo.png";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 py-6 px-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <Image 
              src={logo} 
              alt="QuickRide Booking" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            QuickRide Booking
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-900 to-green-800">
          <div className="absolute inset-0 opacity-10">
            <Image
              src="https://www.mitsubishi-motors.com.ph/uploads/vehicle/photos/1672802572_mirage-g4-exterior-01.png"
              alt="Mitsubishi Mirage G4"
              fill
              className="object-contain p-12"
            />
          </div>
          <div className="relative z-10 flex flex-col justify-center px-16 py-20">
            <div className="space-y-8">
              <div className="text-green-400 font-semibold text-sm uppercase tracking-wider">
                Secure your journey.
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Identity verification is the first step to reclaiming your premium driving experience.
              </h2>
            </div>
          </div>
        </div>

        {/* Right Panel - Reset Password Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-20 bg-white">
          <div className="w-full max-w-md">
            <div className="text-center lg:text-left mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Reset Password</h1>
              <p className="text-slate-600">
                Enter the email address associated with your QuickRide Booking account to receive reset instructions.
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-green-800 hover:to-green-700 transition-all transform hover:scale-[1.02] shadow-lg shadow-green-700/30"
                >
                  Send Recovery Link
                </button>

                <div className="text-center text-sm text-slate-500">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="text-green-700 font-semibold hover:underline">
                    Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Recovery Link Sent</h3>
                <p className="text-slate-600">Check your email for password reset instructions.</p>
              </div>
            )}

            {/* Security Badge */}
            <div className="mt-12 flex items-center justify-center space-x-2 text-green-700">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="text-sm font-semibold">Vault-Secured Connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 py-6 px-8">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 text-sm text-slate-400 mb-4 md:mb-0">
            <a href="#" className="hover:text-green-400 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-green-400 transition-colors">Terms of Service</a>
            <span>|</span>
            <a href="#" className="hover:text-green-400 transition-colors">Security</a>
          </div>
          <p className="text-sm text-slate-400">
            © 2026 QuickRide Booking Automotive Group.
          </p>
        </div>
      </footer>
    </div>
  );
}
