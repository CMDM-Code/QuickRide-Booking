'use client';

import { MessageCircle, Clock, ShieldCheck, Headphones, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SupportPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)] mb-1">
          Customer Support
        </p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Help & Support Center
        </h1>
        <h2 className="text-[var(--text-secondary)] mt-1.5">
          We're here to ensure your journey is seamless and comfortable.
        </h2>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Mail className="w-6 h-6" />,
            title: 'Email Support',
            desc: 'Send us your queries anytime. We aim to reply within 24 hours.',
            action: 'support@quickride.com'
          },
          {
            icon: <Phone className="w-6 h-6" />,
            title: 'Phone Support',
            desc: 'Available for urgent booking changes or roadside assistance.',
            action: '+63 (917) 123-4567'
          },
          {
            icon: <Clock className="w-6 h-6" />,
            title: '24 / 7 Available',
            desc: 'Our emergency assistance team is always on standby.',
            action: 'Always Active'
          },
          {
            icon: <ShieldCheck className="w-6 h-6" />,
            title: 'Secure Booking',
            desc: 'Your data and payment information are fully protected.',
            action: 'Verified'
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-3xl p-6 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-all hover:border-[var(--color-primary-300)] hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-700)] mb-4 transition-transform group-hover:scale-110">
              {f.icon}
            </div>
            <p className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tight">{f.title}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed h-10">{f.desc}</p>
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] font-black text-[var(--color-primary-700)] uppercase tracking-widest">{f.action}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Support Action */}
      <div
        className="rounded-[2.5rem] border border-[var(--border-subtle)] overflow-hidden relative shadow-premium bg-[var(--bg-secondary)]"
        style={{ minHeight: '400px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-50)]/30 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center justify-center h-full py-16 gap-6 px-8 text-center relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-white shadow-elite flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[var(--color-primary-500)] opacity-10 rounded-3xl blur-xl" />
            <Headphones className="w-12 h-12 text-[var(--color-primary-700)] relative" />
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Need Direct Assistance?
            </h2>
            <p className="text-[var(--text-secondary)] mt-3 leading-relaxed text-sm">
              Our dedicated support team is ready to help you with any issues regarding your booking, payments, or vehicle inquiries.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button 
              className="flex-1 py-6 rounded-2xl font-black uppercase tracking-widest text-xs"
              onClick={() => window.location.href = 'mailto:support@quickride.com'}
            >
              Email Us
            </Button>
            <Button 
              variant="outline"
              className="flex-1 py-6 rounded-2xl font-black uppercase tracking-widest text-xs"
            >
              Call Hotline
            </Button>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center py-6">
        <p className="text-xs text-[var(--text-tertiary)] font-medium">
          QuickRide Support · © 2026 · Premium Mobility Services
        </p>
      </div>
    </div>
  );
}
