'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import bcrypt from 'bcryptjs';
import logo from "@/assets/images/quickride_logo.png";

const STAFF_PASSWORD_HASH = "$2b$08$kHeMZDCbidXchSuw4aBEyuihBBHb0zqjCdnSGspNdPSCa6sZWUXDe";
const STAFF_USERNAME = "staff@quickridebooking.com";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === STAFF_USERNAME && password === "staff321") {
      localStorage.setItem('quickride_staff_session', JSON.stringify({ 
        authenticated: true, 
        loginTime: new Date().toISOString(),
        userAgent: navigator.userAgent
      }));
      window.location.href = "/staff/dashboard";
    } else {
      setError("Invalid staff credentials");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 shadow-lg shadow-green-700/30">
            <Image 
              src={logo} 
              alt="QuickRide Booking" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">QuickRide Booking</h1>
          <p className="text-green-300 mt-2">Staff Portal Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Staff Authentication</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@quickridebooking.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter staff password"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-green-800 hover:to-green-700 transition-all shadow-lg shadow-green-700/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </div>
              ) : "Access Staff Portal"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Authorized personnel only. All access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
