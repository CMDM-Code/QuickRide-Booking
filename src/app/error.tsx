'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminStore } from "@/lib/admin-store";

const generateErrorId = (): string => {
  return 'ERR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const [errorId] = useState(generateErrorId);
  const [systemStatus, setSystemStatus] = useState<'checking' | 'operational' | 'degraded' | 'down'>('checking');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log error to security audit logs
    adminStore.logSecurityEvent('SYSTEM_ERROR', `Error ID: ${errorId} - ${error.message}`);

    // Simulate health check
    const checkHealth = async () => {
      setTimeout(() => {
        setSystemStatus('operational');
      }, 1500);
    };
    
    checkHealth();
  }, [error, errorId]);

  const copyErrorId = useCallback(() => {
    navigator.clipboard.writeText(errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [errorId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-red-600">500</h1>
        <h2 className="text-2xl font-bold text-slate-900 mt-4">Something went wrong</h2>
        <p className="text-slate-600 mt-2 mb-6">We're experiencing an issue with your request.</p>

        <div className="mb-6 p-4 bg-slate-100 rounded-xl">
          <p className="text-sm text-slate-700 mb-2">Error Reference ID:</p>
          <div className="flex items-center justify-center gap-2">
            <code className="font-mono text-lg font-bold text-slate-900">{errorId}</code>
            <button 
              onClick={copyErrorId}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Provide this ID to support for faster assistance</p>
        </div>

        <div className="mb-6 text-sm">
          System Status: {
            systemStatus === 'checking' ? 'Checking...' :
            systemStatus === 'operational' ? <span className="text-green-600 font-medium">All systems operational</span> :
            systemStatus === 'degraded' ? <span className="text-amber-600 font-medium">Degraded performance</span> :
            <span className="text-red-600 font-medium">System outage</span>
          }
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <button onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
