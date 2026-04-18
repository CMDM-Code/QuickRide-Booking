'use client';

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AboutUsPage() {
  return (
    <>
    <Navbar />
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div className="space-y-8">
            <div className="inline-block px-4 py-1.5 bg-green-50 border border-green-100 rounded-full text-green-700 font-bold text-xs uppercase tracking-widest">
              Our Story
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Redefining <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-green-500">Premium Mobility</span> in the South.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Established with a vision to elevate the car rental experience, Quick Ride Booking bridges the gap between luxury and accessibility. We don't just rent cars; we curate journeys tailored for professionals, adventurers, and those who demand excellence on the road.
            </p>
            <div className="flex gap-4 pt-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-3xl font-black text-slate-900 mb-1">5k+</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Elite Members</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-3xl font-black text-slate-900 mb-1">6</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Regions Served</p>
              </div>
            </div>
          </div>
          <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-green-900 mix-blend-multiply opacity-20"></div>
            <img 
              src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80" 
              alt="Premium Car Fleet" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Values */}
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black mb-4">Our Core Directives</h2>
            <p className="text-slate-400 font-medium">The principles that drive every mile.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
               <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center text-2xl">🛡️</div>
               <h3 className="text-xl font-bold">Uncompromising Safety</h3>
               <p className="text-slate-400 text-sm leading-relaxed">Every vehicle undergoes rigorous mechanical and aesthetic inspections before every dispatch.</p>
            </div>
            <div className="space-y-4">
               <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center text-2xl">⚡</div>
               <h3 className="text-xl font-bold">Seamless Efficiency</h3>
               <p className="text-slate-400 text-sm leading-relaxed">From digital booking to key handover, our processes are stripped of friction and optimized for your time.</p>
            </div>
            <div className="space-y-4">
               <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center text-2xl">👑</div>
               <h3 className="text-xl font-bold">Elite Status</h3>
               <p className="text-slate-400 text-sm leading-relaxed">We treat every client as a VIP, offering personalized support and professional chauffeur services.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
           <h2 className="text-3xl font-black text-slate-900 mb-6">Ready to hit the road?</h2>
           <Link href="/auth/signup" className="inline-block px-10 py-5 bg-green-700 text-white rounded-full font-bold text-lg hover:bg-green-800 transition-all shadow-xl shadow-green-700/20 hover:scale-105">
              Initialize Your Membership
           </Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
