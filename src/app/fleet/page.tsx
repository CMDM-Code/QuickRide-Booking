'use client';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp 
} from "firebase/firestore";
import { Vehicle, PricingRate } from "@/lib/types";
import { format, addDays, startOfDay } from "date-fns";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import { MOCK_VEHICLES, MOCK_RATES, MOCK_LOCATIONS } from "@/lib/mock-data";

// Helper for timeout
const withTimeout = (promise: Promise<any>, ms: number) => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
  return Promise.race([promise, timeout]);
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineDays, setTimelineDays] = useState<Date[]>([]);

  useEffect(() => {
    setTimelineDays(Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i)));
    fetchFleetData();
  }, []);

  async function fetchFleetData() {
    setLoading(true);
    console.log("🔄 Fetching fleet directory...");
    
    if (db) {
      try {
        // Firestore doesn't support joins, so we fetch related collections separately
        const [vehsSnap, carTypesSnap, ratesSnap, locationsSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'car_types')),
            getDocs(collection(db, 'pricing_sheets')),
            getDocs(collection(db, 'locations'))
          ]), 
          5000
        );

        const carTypesMap = Object.fromEntries(carTypesSnap.docs.map((doc: any) => [doc.id, doc.data()]));
        const locationsMap = Object.fromEntries(locationsSnap.docs.map((doc: any) => [doc.id, doc.data()]));

        if (vehsSnap.docs.length > 0) {
          console.log("✅ Fleet Cloud Sync: Success");
          
          const vehs = vehsSnap.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            car_type: carTypesMap[doc.data().car_type_id] || { name: 'Unknown', driver_only: false }
          }));

          const rt: any[] = [];
          ratesSnap.docs.forEach((doc: any) => {
            const carTypeId = doc.id;
            const sheetData = doc.data();
            const sheetRates = sheetData.rates || {};
            
            for (const locId in sheetRates) {
              if (locId !== 'default' && locationsMap[locId]) {
                const r = sheetRates[locId];
                if (r.rate_12hr || r.rate_24hr) {
                  rt.push({
                    id: `${carTypeId}_${locId}`,
                    car_type_id: carTypeId,
                    location_id: locId,
                    location: locationsMap[locId],
                    rate_12hr: r.rate_12hr,
                    rate_24hr: r.rate_24hr
                  });
                }
              }
            }
          });

          setVehicles(vehs);
          setRates(rt);

          // Fetch bookings separately for the timeline
          const today = startOfDay(new Date());
          const nextWeek = addDays(new Date(), 7);
          
          const bksQuery = query(
              collection(db, 'bookings'),
              where('status', 'in', ['approved', 'active']),
              where('end_date', '>=', Timestamp.fromDate(today))
          );
          
          const bksSnap = await getDocs(bksQuery);
          // Filter start_date manually if needed, or refine query
          const bks = bksSnap.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() }))
            .filter((bk: any) => {
                const start = bk.start_date instanceof Timestamp ? bk.start_date.toDate() : new Date(bk.start_date);
                return start <= nextWeek;
            });
          
          setBookings(bks);
          setLoading(false);
          return;
        } else {
             console.warn("⚠️ Firestore returned empty fleet");
        }
      } catch (err) {
        console.error("❌ Fleet Sync Error:", err);
      }
    }

    // FALLBACK
    console.log("ℹ️ Loading local high-performance fleet demo data...");
    setVehicles(MOCK_VEHICLES);
    const mockRates = MOCK_RATES.map(r => ({
        ...r,
        location: MOCK_LOCATIONS.find(l => l.id === r.location_id)
    }));
    setRates(mockRates as any);
    setBookings([]);
    setLoading(false);
  }

  if (loading) {
    return (
      <>
      <Navbar />
      <div className="pt-32 pb-20 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
      <Footer />
      </>
    );
  }

  return (
    <>
    <Navbar />
    <div className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Our Elite Fleet</h1>
          <p className="text-lg text-slate-600">
            Browse our premium selection of vehicles, view real-time availability, and explore detailed specifications.
          </p>
        </div>

        <div className="space-y-12">
          {vehicles.map(vehicle => {
            // Get rates for this vehicle type
            const vehicleRates = rates.filter(r => r.car_type_id === vehicle.car_type_id && (r.rate_12hr || r.rate_24hr));
            // Get bookings for this vehicle
            const vehicleBookings = bookings.filter(b => b.car_id === vehicle.id);

            return (
              <div key={vehicle.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col lg:flex-row">
                
                {/* Image & Specs */}
                <div className="w-full lg:w-1/3 relative bg-slate-100 min-h-[300px]">
                  {vehicle.image_url ? (
                    <img src={vehicle.image_url} alt={vehicle.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl">🚗</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h2 className="text-2xl font-black mb-1">{vehicle.name}</h2>
                    <p className="text-sm font-semibold uppercase tracking-widest text-green-400 mb-4">{vehicle.car_type?.name}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                      <div className="bg-black/30 backdrop-blur rounded-lg p-2.5">
                        <span className="block text-white/50 text-[10px] uppercase mb-0.5">Year</span>
                        {vehicle.year || 'N/A'}
                      </div>
                      <div className="bg-black/30 backdrop-blur rounded-lg p-2.5">
                        <span className="block text-white/50 text-[10px] uppercase mb-0.5">Plate</span>
                        {vehicle.license_plate}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  {/* Specifications details */}
                  {vehicle.specs && Object.keys(vehicle.specs).length > 0 && (
                     <div className="mb-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Specifications</h3>
                        <div className="flex flex-wrap gap-2">
                           {Object.entries(vehicle.specs).map(([key, value]) => (
                               <span key={key} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                                   <span className="capitalize text-slate-400 mr-2">{key.replace('_', ' ')}:</span> 
                                   {String(value)}
                               </span>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Pricing Matrix */}
                  <div className="mb-8">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Location Rates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {vehicleRates.map(rate => (
                        <div key={rate.id} className="p-3 border border-slate-100 rounded-xl justify-between flex flex-col">
                          <p className="text-xs font-bold text-slate-900 mb-2 truncate">{rate.location?.name}</p>
                          <div className="space-y-1">
                            {rate.rate_12hr && <p className="text-[10px] text-slate-500 font-medium">12hr: <span className="font-bold text-green-700">₱{rate.rate_12hr.toLocaleString()}</span></p>}
                            {rate.rate_24hr && <p className="text-[10px] text-slate-500 font-medium">24hr: <span className="font-bold text-green-700">₱{rate.rate_24hr.toLocaleString()}</span></p>}
                          </div>
                        </div>
                      ))}
                      {vehicleRates.length === 0 && <p className="text-sm text-slate-400 italic">No specific rates defined.</p>}
                    </div>
                  </div>

                  {/* Availability Visual Timeline */}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                       <span>Availability (Next 7 Days)</span>
                       <div className="flex gap-3 text-[9px]">
                           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Available</span>
                           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Booked</span>
                       </div>
                    </h3>
                    
                    <div className="relative pt-6">
                        {/* Day Headers */}
                        <div className="flex w-full absolute top-0 left-0 right-0">
                           {timelineDays.map((day, i) => (
                               <div key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 border-l border-slate-100 first:border-l-0">
                                   {format(day, 'EEE')}
                               </div>
                           ))}
                        </div>
                        
                        {/* Timeline Track */}
                        <div className="h-8 bg-slate-100 rounded-lg w-full relative overflow-hidden flex border border-slate-200 mt-2">
                           {/* Grid lines */}
                           {timelineDays.map((_, i) => (
                               <div key={i} className="flex-1 border-l border-white/50 first:border-l-0 z-10 h-full"></div>
                           ))}

                           {/* Booking Blocks */}
                           {vehicleBookings.map((bk, i) => {
                               const start = bk.start_date instanceof Timestamp ? bk.start_date.toDate() : new Date(bk.start_date);
                               const end = bk.end_date instanceof Timestamp ? bk.end_date.toDate() : new Date(bk.end_date);
                               const weekStart = timelineDays[0];
                               const weekEnd = addDays(weekStart, 7);

                               // Calculate bounds
                               const effectiveStart = start < weekStart ? weekStart : start;
                               const effectiveEnd = end > weekEnd ? weekEnd : end;

                               // Calculate percentages for CSS
                               const totalMs = 7 * 24 * 60 * 60 * 1000;
                               const leftPct = Math.max(0, (effectiveStart.getTime() - weekStart.getTime()) / totalMs) * 100;
                               const widthPct = Math.min(100 - leftPct, ((effectiveEnd.getTime() - effectiveStart.getTime()) / totalMs) * 100);

                               if (widthPct <= 0) return null;

                               return (
                                   <div 
                                      key={i}
                                      className="absolute top-1 bottom-1 bg-green-500 rounded shadow-sm z-20 transition-all hover:bg-green-600 cursor-help"
                                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                      title={`Booked: ${format(start, 'MMM d, h:mm a')} to ${format(end, 'MMM d, h:mm a')}`}
                                   ></div>
                               );
                           })}
                        </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
