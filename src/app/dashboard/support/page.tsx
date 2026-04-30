'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle, Clock, ShieldCheck, Headphones } from 'lucide-react';

export default function SupportPage() {
  useEffect(() => {
    // Try to maximize the global widget if it's already loaded
    const checkAndMaximize = setInterval(() => {
      const api = (window as any).Tawk_API;
      if (api && api.maximize) {
        api.maximize();
        clearInterval(checkAndMaximize);
      }
    }, 500);

    return () => clearInterval(checkAndMaximize);
  }, []);

  const FEATURES = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Live Chat',
      desc: 'Connect instantly with our support team — no waiting on hold.',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: '24 / 7 Available',
      desc: 'We are here around the clock, every day of the year.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: 'Secure & Private',
      desc: 'All conversations are encrypted end-to-end.',
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: 'Expert Agents',
      desc: 'Our trained rental specialists handle every query.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)] mb-1">
          Customer Support
        </p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Live Chat Support
        </h1>
        <p className="text-[var(--text-secondary)] mt-1.5">
          Chat directly with our team — we typically reply in under 2 minutes.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl p-5 border border-[var(--border-subtle)] transition-all hover:border-[var(--color-primary-300)] hover:shadow-md"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-700)] mb-3">
              {f.icon}
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{f.title}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Chat Area — Tawk.to opens as a floating widget automatically */}
      <div
        className="rounded-3xl border border-[var(--border-default)] overflow-hidden relative"
        style={{ background: 'var(--bg-secondary)', minHeight: '420px' }}
      >
        <div className="flex flex-col items-center justify-center h-full py-20 gap-5 px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-50)] flex items-center justify-center shadow-lg">
            <MessageCircle className="w-10 h-10 text-[var(--color-primary-700)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Chat is Loading…
            </h2>
            <p className="text-[var(--text-secondary)] mt-2 max-w-xs mx-auto leading-relaxed text-sm">
              The live chat widget will appear at the bottom-right of your screen. Click the chat bubble to start a conversation with our team.
            </p>
          </div>
          <button
            onClick={() => {
              const api = (window as any).Tawk_API;
              if (api?.maximize) api.maximize();
              else if (api?.toggle) api.toggle();
            }}
            className="px-8 py-3.5 rounded-xl font-bold text-white shadow-lg hover:brightness-90 transition-all flex items-center gap-2"
            style={{ background: '#15803d' }}
          >
            <MessageCircle className="w-4 h-4" />
            Open Chat Now
          </button>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center text-[var(--text-tertiary)]">
        You can also email us at{' '}
        <a href="mailto:support@quickridebooking.com" className="text-[var(--color-primary-700)] font-semibold hover:underline">
          support@quickridebooking.com
        </a>
      </p>
    </div>
  );
}
