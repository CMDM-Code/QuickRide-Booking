"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import logo from "@/assets/images/quickride_logo.png";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.signup(name, email, password);
      
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "An account with this email already exists");
        setIsLoading(false);
      }
    } catch (e) {
      setError("Unexpected error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 py-6 px-8">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
              <Image 
                src={logo} 
                alt="QuickRide Booking" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-slate-900 lg:text-white tracking-tight">
              QuickRide Booking
            </span>
          </div>
          <Link href="/" className="flex items-center space-x-2 text-slate-500 hover:text-green-700 transition-colors">
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-900 to-green-800">
          <div className="absolute inset-0 opacity-10">
            <Image
              src="https://assets.kiloapps.io/user_bc07d79b-502e-47d8-aa85-a2d78aa3c851/54e7622e-04e6-46b6-a8bb-b9d5f9a95743/368d7c42-20fd-4323-9ff9-f3b76d6ff19f.png"
              alt="Mitsubishi Mirage GLS 2025"
              fill
              className="object-contain p-12"
            />
          </div>
          <div className="relative z-10 flex flex-col justify-center px-16 py-20">
            <div className="space-y-8">
              <div className="text-green-400 font-semibold text-sm uppercase tracking-wider">
                Membership Access
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                The Future Of Motion.
              </h2>
              <p className="text-green-100 text-lg leading-relaxed max-w-md">
                Join an exclusive collective of drivers redefining the premium journey through precision engineering.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Sign Up Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-20 bg-white">
          <div className="w-full max-w-md">
            <div className="text-center lg:text-left mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Initialize Membership</h1>
              <p className="text-slate-600">Start your premium automotive experience.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  required
                />
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-green-800 hover:to-green-700 transition-all transform hover:scale-[1.02] shadow-lg shadow-green-700/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating account...</span>
                    </div>
                  ) : "Initialize Membership"}
                </button>

                <div className="flex items-center justify-center py-2">
                    <div className="h-px bg-slate-200 w-full flex-1"></div>
                    <span className="text-xs text-slate-400 font-semibold px-4 uppercase tracking-widest">Or</span>
                    <div className="h-px bg-slate-200 w-full flex-1"></div>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                      setError("");
                      setIsLoading(true);
                      const res = await authClient.loginWithGoogle();
                      if(!res.success) {
                        setError(res.error || "Failed to initialize Google Login");
                        setIsLoading(false);
                      } else {
                        router.push("/");
                      }
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-700 py-4 px-8 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="text-center text-sm text-slate-500 pt-4">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-green-700 font-semibold hover:underline">
                  Sign In
                </Link>
              </div>
            </form>

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
            © {new Date().getFullYear()} QuickRide Booking Automotive Group.
          </p>
        </div>
      </footer>
    </div>
  );
}
