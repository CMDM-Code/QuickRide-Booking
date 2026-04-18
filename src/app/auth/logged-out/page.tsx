"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoggedOutPage() {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 py-6 px-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-700 to-green-600 rounded-xl flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Quick Ride Booking
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-900 to-green-800">
          <div className="absolute inset-0 opacity-10">
            <Image
              src="https://www.suzuki.com.ph/uploads/vehicles/galleries/6439977883f2d_ertiga-hybrid-exterior-01.png"
              alt="Suzuki Ertiga Hybrid"
              fill
              className="object-contain p-12"
            />
          </div>
          <div className="relative z-10 flex flex-col justify-center px-16 py-20">
            <div className="space-y-8">
              <div className="text-green-400 font-semibold text-sm uppercase tracking-wider">
                Your journey is saved.
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Quick Ride Booking ensures your preferences and bookings are secured for your next high-performance experience.
              </h2>
            </div>
          </div>
        </div>

        {/* Right Panel - Logged Out */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-20 bg-white">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-10 h-10 text-green-700"
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

            <h1 className="text-3xl font-bold text-slate-900 mb-4">You have been safely logged out.</h1>
            <p className="text-slate-600 mb-12 leading-relaxed">
              Thank you for choosing Quick Ride Booking. We look forward to seeing you in the driver&apos;s seat again soon.
            </p>

            {/* Countdown Timer */}
            <div className="bg-slate-100 rounded-2xl p-8">
              <p className="text-slate-700 mb-4">Redirecting to showroom in</p>
              <div className="text-6xl font-bold text-green-700 mb-4">{countdown}</div>
              <p className="text-sm text-slate-500">seconds</p>
            </div>

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
            © 2024 Quick Ride Booking Automotive Group.
          </p>
        </div>
      </footer>
    </div>
  );
}
