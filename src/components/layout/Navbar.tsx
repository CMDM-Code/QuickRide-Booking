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
            <span className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {branding.system_name}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
              Home
            </Link>
            <Link href="/about-us" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
              About Us
            </Link>
            <Link href="/services" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
              Services
            </Link>
            <Link href="/fleet" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
              Fleet
            </Link>
            <Link href="/price-rates" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
              Rates
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2.5 px-5 py-2 rounded-full text-sm font-bold border transition-all active:scale-95 group"
                    style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white"
                      style={{ backgroundColor: "var(--color-primary)" }}>
                      {userName?.charAt(0) || "U"}
                    </div>
                    <span>{userName}</span>
                    <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: "var(--text-muted)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 backdrop-blur-xl border rounded-2xl shadow-2xl py-2 z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                      style={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: "var(--border-default)" }}>
                      <div className="px-4 py-3 border-b mb-1" style={{ borderColor: "var(--border-subtle)" }}>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Active Account</p>
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
                      </div>
                      <Link 
                        href="/dashboard" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        View Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold transition-colors text-left"
                        style={{ color: "var(--error)" }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login" className="transition-colors font-medium" style={{ color: "var(--text-secondary)" }}>
                  Login
                </Link>
                <Link href="/auth/signup" className="text-white px-6 py-2.5 rounded-full transition-all transform hover:scale-105 shadow-lg font-bold"
                  style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 10px 15px -3px rgba(21,128,61,0.25)" }}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button 
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "var(--text-secondary)" }}
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
          <div className="md:hidden py-6 space-y-2 border-t animate-in slide-in-from-top-4 duration-300"
            style={{ borderColor: "var(--border-subtle)" }}>
            <Link href="/" className="block transition-colors font-bold px-4 py-3 rounded-2xl" style={{ color: "var(--text-secondary)" }}>
              Home
            </Link>
            <Link href="/about-us" className="block transition-colors font-bold px-4 py-3 rounded-2xl" style={{ color: "var(--text-secondary)" }}>
              About Us
            </Link>
            <Link href="/services" className="block transition-colors font-bold px-4 py-3 rounded-2xl" style={{ color: "var(--text-secondary)" }}>
              Services
            </Link>
            <Link href="/fleet" className="block transition-colors font-bold px-4 py-3 rounded-2xl" style={{ color: "var(--text-secondary)" }}>
              Fleet
            </Link>
            <Link href="/price-rates" className="block transition-colors font-bold px-4 py-3 rounded-2xl" style={{ color: "var(--text-secondary)" }}>
              Rates
            </Link>

            {isAuthenticated ? (
              <div className="pt-4 border-t mt-4 px-4 space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="p-4 rounded-2xl border" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-subtle)" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Authenticated Account</p>
                  <p className="font-bold" style={{ color: "var(--text-primary)" }}>{userName}</p>
                </div>
                <Link href="/dashboard" className="block w-full py-4 text-center font-black border-2 rounded-2xl transition-all" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full py-4 text-center font-black rounded-2xl transition-all"
                  style={{ color: "var(--error)", backgroundColor: "var(--error-bg)" }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-3 px-4">
                <Link href="/auth/login" className="block w-full py-4 text-center font-bold border-2 rounded-2xl" style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}>
                  Login
                </Link>
                <Link href="/auth/signup" className="block w-full py-4 text-center text-white font-bold rounded-2xl shadow-lg" style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 10px 15px -3px rgba(21,128,61,0.2)" }}>
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
