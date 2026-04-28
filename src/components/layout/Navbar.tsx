'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import NotificationBell from "@/components/ui/NotificationBell";
import { useBranding } from "@/components/providers/BrandingProvider";

export default function Navbar() {
  const { branding } = useBranding();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authClient.getCurrentUser();
    setIsAuthenticated(!!currentUser);
    setUserName(currentUser?.name || null);
    
    const unsubscribe = authClient.subscribe((user) => {
      setIsAuthenticated(!!user);
      setUserName(user?.name || null);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await authClient.logout();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] glass-effect border-b border-white/20">
      <nav className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <img 
                src={branding.logo_url} 
                alt={branding.system_name} 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {branding.system_name}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
              Home
            </Link>
            <Link href="/about-us" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
              About Us
            </Link>
            <Link href="/services" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
              Services
            </Link>
            <Link href="/fleet" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
              Fleet
            </Link>
            <Link href="/price-rates" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
              Rates
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2 rounded-full text-sm font-bold border border-slate-200 transition-all active:scale-95 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center text-[10px] text-white">
                      {userName?.charAt(0) || "U"}
                    </div>
                    <span>{userName}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl py-2 z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Account</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                      </div>
                      <Link 
                        href="/dashboard" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-green-50 hover:text-green-800 transition-colors"
                      >
                        View Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login" className="text-slate-700 hover:text-green-700 transition-colors font-medium">
                  Login
                </Link>
                <Link href="/auth/signup" className="bg-green-700 text-white px-6 py-2.5 rounded-full hover:bg-green-800 transition-all transform hover:scale-105 shadow-lg shadow-green-700/25 font-bold">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button 
            className="md:hidden text-slate-700 p-2 hover:bg-slate-100 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-6 space-y-2 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
            <Link href="/" className="block text-slate-700 hover:text-green-700 transition-colors font-bold px-4 py-3 rounded-2xl hover:bg-slate-50">
              Home
            </Link>
            <Link href="/about-us" className="block text-slate-700 hover:text-green-700 transition-colors font-bold px-4 py-3 rounded-2xl hover:bg-slate-50">
              About Us
            </Link>
            <Link href="/services" className="block text-slate-700 hover:text-green-700 transition-colors font-bold px-4 py-3 rounded-2xl hover:bg-slate-50">
              Services
            </Link>
            <Link href="/fleet" className="block text-slate-700 hover:text-green-700 transition-colors font-bold px-4 py-3 rounded-2xl hover:bg-slate-50">
              Fleet
            </Link>
            <Link href="/price-rates" className="block text-slate-700 hover:text-green-700 transition-colors font-bold px-4 py-3 rounded-2xl hover:bg-slate-50">
              Rates
            </Link>

            {isAuthenticated ? (
              <div className="pt-4 border-t border-slate-100 mt-4 px-4 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
                  <p className="text-slate-900 font-bold">{userName}</p>
                </div>
                <Link href="/dashboard" className="block w-full py-4 text-center text-slate-900 font-black border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full py-4 text-center text-red-600 font-black bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-3 px-4">
                <Link href="/auth/login" className="block w-full py-4 text-center text-slate-700 font-bold border-2 border-slate-200 rounded-2xl">
                  Login
                </Link>
                <Link href="/auth/signup" className="block w-full py-4 text-center text-white font-bold bg-green-700 rounded-2xl shadow-lg shadow-green-700/20">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
