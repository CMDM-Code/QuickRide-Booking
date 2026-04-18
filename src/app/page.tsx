"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import VehicleCard from "@/components/fleet/VehicleCard";
import ModernBookingFlow from "@/components/forms/ModernBookingFlow";
import BookingModal from "@/components/modals/BookingModal";
import Footer from "@/components/layout/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit, where, getCountFromServer } from "firebase/firestore";
import { Vehicle, CarType } from "@/lib/types";
import { withTimeout } from "@/lib/api-utils";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ChevronRight, MapPin, Clock } from "lucide-react";

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [stats, setStats] = useState({ vehicles: 0, cities: 0 });
  const router = useRouter();

  const handleOpenBooking = () => {
    const user = authClient.getCurrentUser();
    if (!user) {
      alert("Please login first to start your booking.");
      router.push("/auth/login");
      return;
    }
    setIsBookingOpen(true);
  };

  useEffect(() => {
    fetchFleet();
    fetchStats();
  }, []);

  async function fetchStats() {
    if (!db) return;
    try {
      const [vehsCountSnap, locsSnap] = await Promise.all([
        getCountFromServer(collection(db, 'vehicles')),
        getDocs(collection(db, 'granular_locations'))
      ]);
      
      // Count unique cities
      const cities = new Set(locsSnap.docs.map(d => d.data().city)).size;

      setStats({
        vehicles: vehsCountSnap.data().count || 5,
        cities: cities || 10
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({ vehicles: 6, cities: 12 }); // Fallback
    }
  }

  async function fetchFleet() {
    setLoading(true);
    if (!db) return;
    try {
      const [vehsSnap, carTypesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(collection(db, 'vehicles'), where('available', '==', true), limit(9))),
          getDocs(collection(db, 'car_types'))
        ]),
        5000
      );

      const carTypesMap = Object.fromEntries(
          carTypesSnap.docs.map((d: any) => [d.id, d.data()])
      );

      const data = vehsSnap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
        car_type: carTypesMap[d.data().car_type_id] || { name: 'Standard', driver_only: false }
      } as Vehicle));

      setVehicles(data);
    } catch (error) {
      console.error("Error fetching fleet from Firestore:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)}>
        <ModernBookingFlow onClose={() => setIsBookingOpen(false)} />
      </BookingModal>

      {/* Modern Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-slate-900 min-h-[90vh] flex items-center">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80"
            alt="Luxury Car"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">Now Accepting Bookings</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Comfort on the Road, <br />
                <span className="text-green-400">Joy in Every Mile</span>
              </h1>
              
              <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                QuickRide Booking provides premium car rental service in Region 11 and beyond. Experience transparent pricing, 
                professional drivers, and a seamless multi-stage booking process.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={handleOpenBooking}
                  className="px-8 py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-2xl transition-all shadow-xl shadow-green-500/20 flex items-center gap-2 group"
                >
                  Book Now <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => document.getElementById('fleet')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all backdrop-blur-md"
                >
                  View Fleet
                </button>
              </div>

              <div className="flex items-center gap-6 text-slate-400 text-xs font-bold pt-4 uppercase tracking-widest">
                <span className="flex items-center gap-2"><MapPin size={14} className="text-green-500" /> Region 11 & SOCCSKSARGEN</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full border-2 border-green-500"></div> Fully Insured Vehicles</span>
                <span className="flex items-center gap-2"><Clock size={14} className="text-green-500" /> 24/7 Support</span>
              </div>
            </div>

            {/* Right Interactive/Decorative Section */}
            <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
              
              {/* Quick Overview Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
                <span className="text-[10px] font-black uppercase text-green-400 tracking-[0.2em] mb-4 block">Quick Overview</span>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{stats.vehicles}+</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Vehicles</p>
                  </div>
                  <div className="border-x border-white/10 px-4">
                    <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{stats.cities}+</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Cities Covered</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>24/7</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Availability</p>
                  </div>
                </div>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Feature Box 1 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl hover:bg-white/15 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-start text-2xl mb-2">🚗</div>
                  <h4 className="text-sm font-bold text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Multi-Destination</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Plan complex trips across multiple cities in one booking.</p>
                </div>

                {/* Feature Box 2 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl hover:bg-white/15 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-start text-2xl mb-2">👨‍✈️</div>
                  <h4 className="text-sm font-bold text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Pro Driver</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Optional professional driver for a stress-free journey.</p>
                </div>

                {/* Feature Box 3 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl hover:bg-white/15 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-start text-2xl mb-2">📍</div>
                  <h4 className="text-sm font-bold text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Well-Maintained</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Regularly checked and fully fueled vehicles for your safety.</p>
                </div>

                {/* Feature Box 4 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl hover:bg-white/15 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-start text-2xl mb-2">💳</div>
                  <h4 className="text-sm font-bold text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Transparent Pricing</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Clear, fixed rates with no hidden regional surcharges.</p>
                </div>
              </div>

              {/* Booking Trigger Footer */}
              <button 
                onClick={handleOpenBooking}
                className="group w-full flex items-center justify-between p-5 bg-green-700/80 backdrop-blur-md border border-green-600/40 rounded-2xl shadow-xl hover:bg-green-700 transition-all duration-200 mt-2"
              >
                <div className="text-left">
                  <p className="text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Start Your Booking</p>
                  <p className="text-green-200 text-xs mt-0.5">Select a vehicle and plan your trip</p>
                </div>
                <ChevronRight size={22} className="text-green-300 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section (Units Available) */}
      <section id="fleet" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-700 font-bold text-sm uppercase tracking-widest">
              Available Units
            </span>
            <h2 className="text-3xl md:text-6xl font-black text-slate-900 mt-2 mb-4">
              Our Premium Fleet
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto font-medium">
              Carefully maintained vehicles for every occasion. Select a car above to see exact pricing for your destination.
            </p>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {vehicles.map((car) => (
               <VehicleCard key={car.id} car={car} />
             ))}
             {loading && (
                <div className="col-span-full text-center py-12">
                   <div className="animate-pulse flex flex-col items-center">
                      <div className="h-10 w-48 bg-slate-100 rounded-full mb-4"></div>
                      <div className="h-4 w-64 bg-slate-50 rounded-full"></div>
                   </div>
                </div>
             )}
             {!loading && vehicles.length === 0 && (
               <div className="col-span-full text-center py-12 text-slate-400 font-bold">
                 No vehicles available at this time.
               </div>
             )}
           </div>
        </div>
      </section>

      {/* Rental Policy Section */}
      <section id="policy" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-700 font-bold text-sm uppercase tracking-widest">
              Rental Terms
            </span>
            <h2 className="text-3xl md:text-6xl font-black text-slate-900 mt-2 mb-4">
              Service Policies
            </h2>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            <div className="space-y-8 relative z-10">
              <div className="flex items-start space-x-6">
                <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-700/20">
                    <span className="text-white text-2xl">🔑</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Self-Drive Option</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Maintain your privacy and freedom. Driver must present a valid driver&apos;s license and proof of identity.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-6">
                <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-700/20">
                    <span className="text-white text-2xl">👨‍✈️</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Professional Driver</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Arrive in style and stress-free. Add ₱1,000 to your base rate for our expert chauffeurs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-6">
                <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-700/20">
                    <span className="text-white text-2xl">📍</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Dynamic Logistics</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Pricing adjusts automatically based on your selected pickup region and duration (12hr/24hr blocks).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us / Trust Section */}
      <section
        id="why-choose"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-green-900 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-green-400 font-bold text-sm uppercase tracking-widest">
              Trust & Reliability
            </span>
            <h2 className="text-3xl md:text-6xl font-black text-white mt-2 mb-4">
              Why Choose QuickRide?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: "🛡️",
                title: "Fully Insured",
                description: "Complete coverage for peace of mind during your entire journey."
              },
              {
                icon: "⏱️",
                title: "24/7 Support",
                description: "Round-the-clock assistance for bookings and emergency road help."
              },
              {
                icon: "💎",
                title: "Flexible Rates",
                description: "Competitive block pricing with no hidden charges or surprise fees."
              },
              {
                icon: "✅",
                title: "Verified Fleet",
                description: "Every car undergoes a 50-point safety inspection before every rental."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 hover:bg-white/10 transition-all duration-500"
              >
                <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-xl shadow-black/10">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-green-100/70 leading-relaxed text-sm font-medium">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
