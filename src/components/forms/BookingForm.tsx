'use client';
import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  doc,
  Timestamp 
} from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { Location, PricingRate, PricingSheet } from "@/lib/types";
import { calculateTotalRental } from "@/lib/pricing-engine";
import { buildLocationsIndex, resolveRatesForLocation } from "@/lib/pricing";
import { applyScheduleAdjustment, normalizeSchedule, pickActiveSchedule, type PricingSchedule } from "@/lib/schedules";
import { DEFAULT_BOOKING_FORM_CONFIG, normalizeBookingFormConfig } from "@/lib/booking-form-config";
import { format, isValid } from "date-fns";
import { MOCK_LOCATIONS, MOCK_VEHICLES, MOCK_RATES } from "@/lib/mock-data";

// Leaflet imports need to be handled carefully in Next.js (SSR)
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Helper for timeout
const withTimeout = (promise: Promise<any>, ms: number) => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
  return Promise.race([promise, timeout]);
};

export default function BookingForm() {
  const [step, setStep] = useState<'selecting' | 'reviewing'>('selecting');
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [pricingSheets, setPricingSheets] = useState<PricingSheet[]>([]);
  const [schedules, setSchedules] = useState<PricingSchedule[]>([]);
  const [pricingMeta, setPricingMeta] = useState({ hourlyRate: 200, driverFee: 1000, fallbackLocationId: 'default' });
  const [formConfig, setFormConfig] = useState(DEFAULT_BOOKING_FORM_CONFIG);
  const [isCloudSync, setIsCloudSync] = useState(false);
  
  // Selection State
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [isCarDropdownOpen, setIsCarDropdownOpen] = useState(false);
  const [carSearch, setCarSearch] = useState("");
  const [dropoffLocationIds, setDropoffLocationIds] = useState<string[]>([]);
  const [specificAddress, setSpecificAddress] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("08:00");
  const [withDriver, setWithDriver] = useState(false);
  
  // Availability State
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'warning' | 'blocked'>('available');
  const [conflictBooking, setConflictBooking] = useState<any>(null);

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);
  const carDropdownRef = useRef<HTMLDivElement>(null);

  // Hydration fix
  const [isMounted, setIsMounted] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setToday(format(new Date(), 'yyyy-MM-dd'));
    fetchData();
  }, []);

  async function fetchData() {
    console.log("🔄 Initializing fleet directory sync...");
    
    if (db) {
      try {
        const [locsSnap, vehsSnap, carTypesSnap, sheetsSnap, pricingCfgSnap, schedulesSnap, bookingFormSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'locations')),
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'car_types')),
            getDocs(collection(db, 'pricing_sheets')),
            getDoc(doc(db, 'system_config', 'pricing')),
            getDocs(collection(db, 'pricing_schedules')),
            getDoc(doc(db, 'system_config', 'booking_form'))
          ]), 
          5000
        );

        if (!vehsSnap.empty) {
          console.log("✅ Firestore Sync Successful");
          
          const carTypesMap = Object.fromEntries(carTypesSnap.docs.map((d: any) => [d.id, d.data()]));
          const vehs = vehsSnap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            car_type: carTypesMap[d.data().car_type_id] || { name: 'Standard', driver_only: false }
          }));

          setLocations(locsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Location)));
          setVehicles(vehs);
          setPricingSheets(sheetsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PricingSheet)));
          setSchedules(schedulesSnap.docs.map((d: any) => normalizeSchedule({ id: d.id, ...d.data() })));
          setFormConfig(normalizeBookingFormConfig(bookingFormSnap.exists() ? bookingFormSnap.data() : null));
          const cfg = pricingCfgSnap.exists() ? pricingCfgSnap.data() : null;
          setPricingMeta({
            hourlyRate: typeof cfg?.hourly_rate === 'number' ? cfg.hourly_rate : 200,
            driverFee: typeof cfg?.driver_fee === 'number' ? cfg.driver_fee : 1000,
            fallbackLocationId: typeof cfg?.fallback_location_id === 'string' ? cfg.fallback_location_id : 'default'
          });
          setIsCloudSync(true);
          return;
        }
      } catch (err) {
        console.error("❌ Firestore connection failed:", err);
      }
    }

    // FALLBACK
    setLocations(MOCK_LOCATIONS);
    setVehicles(MOCK_VEHICLES);
    setPricingSheets([]);
    setSchedules([]);
    setFormConfig(DEFAULT_BOOKING_FORM_CONFIG);
    setIsCloudSync(false);
  }

  // Close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destDropdownRef.current && !destDropdownRef.current.contains(e.target as Node)) setIsDestDropdownOpen(false);
      if (carDropdownRef.current && !carDropdownRef.current.contains(e.target as Node)) setIsCarDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Availability Check
  useEffect(() => {
    if (selectedVehicleId && startDate && endDate) {
      checkOverlap();
    }
  }, [selectedVehicleId, startDate, startTime, endDate, endTime]);

  async function checkOverlap() {
    if (!db) return;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    try {
      const q = query(
          collection(db, 'bookings'),
          where('car_id', '==', selectedVehicleId),
          where('status', 'in', ['approved', 'active', 'pending'])
      );
      
      const snap = await getDocs(q);
      const conflicts = snap.docs.filter((docRef: any) => {
          const b = docRef.data();
          const bStart = b.start_date instanceof Timestamp ? b.start_date.toDate() : new Date(b.start_date);
          const bEnd = b.end_date instanceof Timestamp ? b.end_date.toDate() : new Date(b.end_date);
          return bStart < end && bEnd > start;
      });

      if (conflicts.length > 0) {
        const confirmed = conflicts.find((d: any) => ['approved', 'active'].includes(d.data().status));
        if (confirmed) {
          setAvailabilityStatus('blocked');
          setConflictBooking(confirmed.data());
        } else {
          setAvailabilityStatus('warning');
          setConflictBooking(conflicts[0].data());
        }
      } else {
        setAvailabilityStatus('available');
        setConflictBooking(null);
      }
    } catch (error) {
      console.error("Error checking overlap:", error);
    }
  }

  // Price Calculation
  const pricingResult = useMemo(() => {
    if (!selectedVehicleId || !startDate || !endDate || dropoffLocationIds.length === 0) return null;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    if (!isValid(start) || !isValid(end) || end <= start) return null;

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return null;

    const sheet = pricingSheets.find(s => s.id === vehicle.car_type_id);
    if (!sheet) {
      return { pricing: null, error: "Pricing sheet missing for this car type." as const };
    }

    const { byId } = buildLocationsIndex(locations);

    // Policy for multi-destination: booking is allowed only if ALL destinations have a valid rate.
    // We compute price using the highest applicable rates among destinations (conservative).
    let max12h: number | null = null;
    let max24h: number | null = null;
    let appliedFrom: string | null = null;

    for (const locId of dropoffLocationIds) {
      const resolved = resolveRatesForLocation(sheet, locId, byId, pricingMeta.fallbackLocationId);
      if (!resolved) return { pricing: null, error: "No pricing found for one of the selected destinations." as const };
      if (resolved.rate12h === null || resolved.rate24h === null) {
        return { pricing: null, error: "Selected destination is not available for this car type." as const };
      }

      if (max12h === null || resolved.rate12h > max12h) {
        max12h = resolved.rate12h;
      }
      if (max24h === null || resolved.rate24h > max24h) {
        max24h = resolved.rate24h;
        appliedFrom = resolved.matchedLocationId;
      }
    }

    if (max12h === null || max24h === null) {
      return { pricing: null, error: "No pricing found for the selected route." as const };
    }

    const forcedWithDriver = Boolean(vehicle?.car_type?.driver_only);
    const finalWithDriver = forcedWithDriver ? true : withDriver;
    const pricing = calculateTotalRental(start, end, max12h, max24h, finalWithDriver, pricingMeta.hourlyRate, pricingMeta.driverFee);

    // Apply schedule adjustment to BASE only (non-stacking), then add driver fee once.
    const activeSchedule = pickActiveSchedule(schedules, {
      carTypeId: vehicle.car_type_id,
      locationIds: dropoffLocationIds,
      now: new Date()
    });
    const baseTotal =
      pricing.blocks24h * pricing.baseRate24hr +
      pricing.blocks12h * pricing.baseRate12hr +
      pricing.extraHours * pricingMeta.hourlyRate;
    const adjustedBase = activeSchedule ? applyScheduleAdjustment(baseTotal, activeSchedule.adjustment) : baseTotal;
    const adjustedTotal = adjustedBase + pricing.driverFee;
    const adjustedPricing = { ...pricing, totalPrice: adjustedTotal };

    return { pricing: adjustedPricing, appliedFrom, forcedWithDriver, schedule: activeSchedule };
  }, [dropoffLocationIds, selectedVehicleId, startDate, startTime, endDate, endTime, withDriver, vehicles, pricingSheets, locations, pricingMeta, schedules]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
        v.available && 
        v.name.toLowerCase().includes(carSearch.toLowerCase())
    );
  }, [vehicles, carSearch]);

  // Leaflet
  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([6.116, 125.172], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }

    if (leafletMap.current && locations.length > 0) {
      const coords: Record<string, [number, number]> = {
        'gensan': [6.116, 125.172]
      };
      
      const gensan = locations.find(l => l.name.toLowerCase().includes('gensan'));
      if (gensan) {
        leafletMap.current.setView(coords['gensan'], 10);
        L.marker(coords['gensan']).addTo(leafletMap.current).bindPopup("Pickup: GenSan").openPopup();
      }
    }
  }, [locations]);

  const handleToggleDropoff = (id: string) => {
    setDropoffLocationIds(prev => {
      const enabled = formConfig.fields.locations?.enabled ?? true;
      if (!enabled) return prev;

      const allowMulti = formConfig.fields.locations?.allowMultiDestination ?? true;
      const max = formConfig.fields.locations?.maxDestinations ?? 3;

      const has = prev.includes(id);
      if (has) return prev.filter(x => x !== id);

      if (!allowMulti) return [id];
      if (prev.length >= max) {
        alert(`Maximum destinations is ${max}.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleBookNow = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authClient.getCurrentUser();
    if (!user) {
        alert("Please login first to reserve a vehicle.");
        window.location.href = "/auth/login";
        return;
    }
    if (pricing) setStep('reviewing');
  };

  const handleConfirm = async () => {
    if (!db) return;
    try {
      const user = authClient.getCurrentUser();
      if (!user) {
        alert("Session expired. Please login again.");
        window.location.href = "/auth/login";
        return;
      }

      const pricing = pricingResult?.pricing;
      if (!pricing || !selectedVehicleId) return;

      // Validate required custom fields
      const enabledFields = (formConfig.custom_fields || []).filter((f) => f.enabled !== false);
      const missing = enabledFields
        .filter((f) => f.required)
        .filter((f) => !String(customFields[f.key] ?? "").trim())
        .map((f) => f.label || f.key);
      if (missing.length > 0) {
        alert("Please fill required fields: " + missing.join(", "));
        return;
      }

      await addDoc(collection(db, 'bookings'), {
        user_id: user.id,
        car_id: selectedVehicleId,
        start_date: Timestamp.fromDate(new Date(`${startDate}T${startTime}`)),
        end_date: Timestamp.fromDate(new Date(`${endDate}T${endTime}`)),
        total_price: pricing.totalPrice,
        status: 'pending',
        specific_address: (formConfig.fields.specific_address?.enabled ?? true) ? specificAddress : '',
        custom_fields: customFields,
        with_driver: withDriver,
        pickup_location_id: 'loc_gensan',
        created_at: serverTimestamp()
      });

      alert("Booking request sent successfully! Awaiting admin confirmation.");
      setStep('selecting');
      window.location.href = "/dashboard/bookings";
    } catch (error: any) {
      console.error("Error creating booking:", error);
      alert("Failed to send booking request: " + error.message);
    }
  };

  if (step === 'reviewing' && pricingResult?.pricing) {
    const pricing = pricingResult.pricing;
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    let appliedRegionName = 'General Santos City (Base)';
    if (pricingResult.appliedFrom) {
      const loc = locations.find(l => l.id === pricingResult.appliedFrom);
      appliedRegionName = loc?.name || appliedRegionName;
    }

    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-3xl font-black text-slate-900 mb-6">Review Booking</h2>
        <div className="space-y-6">
          <div className="flex gap-6 items-center p-4 bg-slate-50 rounded-2xl">
            <div className="w-24 h-16 bg-white rounded-xl overflow-hidden shadow-sm">
                <img src={selectedVehicle?.image_url} alt="car" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900">{selectedVehicle?.name}</p>
              <p className="text-sm text-slate-500 font-bold uppercase">{selectedVehicle?.car_type?.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div className="p-4 border border-slate-100 rounded-xl">
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Duration</p>
              <p className="text-slate-900">{pricing.totalHours} Hours Total</p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl">
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Mode</p>
              <p className="text-slate-900">{withDriver ? '🚗 With Driver' : '🔑 Self Drive'}</p>
            </div>
          </div>
          <div className="p-4 border border-slate-100 rounded-xl space-y-3">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Pickup Hub</p>
              <p className="text-slate-900 text-sm font-semibold">📍 General Santos City</p>
            </div>
            {dropoffLocationIds.length > 0 && (
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Destinations ({dropoffLocationIds.length})</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {dropoffLocationIds.map(id => {
                    const loc = locations.find(l => l.id === id);
                    return <span key={id} className="px-2 py-1 bg-green-50 text-green-800 rounded-lg text-xs font-semibold border border-green-100">{loc?.name}</span>;
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Rate Applied From</p>
              <p className="text-slate-900 text-sm font-semibold">⚡ {appliedRegionName} <span className="text-slate-400 font-normal">(highest rate)</span></p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-bold text-slate-900 mb-4">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              {pricing.blocks24h > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{pricing.blocks24h} × 24hr — ₱{pricing.baseRate24hr.toLocaleString()} each</span>
                  <span>₱{(pricing.blocks24h * pricing.baseRate24hr).toLocaleString()}</span>
                </div>
              )}
              {pricing.blocks12h > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{pricing.blocks12h} × 12hr — ₱{pricing.baseRate12hr.toLocaleString()} each</span>
                  <span>₱{(pricing.blocks12h * pricing.baseRate12hr).toLocaleString()}</span>
                </div>
              )}
              {pricing.extraHours > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{pricing.extraHours} Extra Hour(s) — ₱{pricingMeta.hourlyRate.toLocaleString()} each</span>
                  <span>₱{(pricing.extraHours * pricingMeta.hourlyRate).toLocaleString()}</span>
                </div>
              )}
              {withDriver && (
                <div className="flex justify-between text-slate-600">
                  <span>Professional Driver Fee</span>
                  <span>₱{pricing.driverFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-green-700 pt-4 border-t border-slate-50 mt-4">
                <span>Total Amount</span>
                <span>₱{pricing.totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep('selecting')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Back to Edit</button>
            <button onClick={handleConfirm} className="flex-[2] py-4 bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all hover:scale-[1.02] active:scale-95">Confirm & Book Now</button>
          </div>
        </div>
      </div>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="bg-white shadow-xl rounded-3xl p-6 md:p-8 max-w-5xl mx-auto border border-slate-100 relative mt-4 md:mt-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <form onSubmit={handleBookNow} className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Reserve Your Journey</h2>
            <p className="text-sm text-slate-500 font-medium">Select your preferences and get instant pricing.</p>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative" ref={destDropdownRef}>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Location</label>
                    <div 
                        onClick={() => setIsDestDropdownOpen(!isDestDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex justify-between items-center"
                    >
                        <span className={dropoffLocationIds.length === 0 ? "text-slate-500 font-normal" : "text-slate-900"}>
                            {dropoffLocationIds.length === 0 
                                ? "Select Locations..." 
                                : `${dropoffLocationIds.length} Location${dropoffLocationIds.length > 1 ? 's' : ''} Selected`}
                        </span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isDestDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {isDestDropdownOpen && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-[100%] left-0 mt-2 w-full bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-2 grid grid-cols-1 gap-1 animate-in fade-in slide-in-from-top-2"
                        >
                            {locations.map(loc => (
                                <label key={loc.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${dropoffLocationIds.includes(loc.id) ? 'bg-green-50 text-green-900' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-600 border-slate-300" checked={dropoffLocationIds.includes(loc.id)} onChange={() => handleToggleDropoff(loc.id)} />
                                    <span className="text-xs font-semibold">{loc.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-1.5 relative" ref={carDropdownRef}>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Car Model</label>
                    <div 
                        onClick={() => setIsCarDropdownOpen(!isCarDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex justify-between items-center"
                    >
                        <span className={!selectedVehicle ? "text-slate-500 font-normal" : "text-slate-900"}>
                            {selectedVehicle ? selectedVehicle.name : "Select a Vehicle"}
                        </span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isCarDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {isCarDropdownOpen && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-[100%] left-0 mt-2 w-full bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-3 animate-in fade-in slide-in-from-top-2"
                        >
                             <div className="mb-2">
                                <input 
                                    type="text" 
                                    placeholder="Search model..." 
                                    value={carSearch}
                                    onChange={(e) => setCarSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium focus:bg-white outline-none"
                                />
                             </div>
                             <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                {filteredVehicles.map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedVehicleId(v.id);
                                            setIsCarDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${selectedVehicleId === v.id ? 'bg-green-50 text-green-900' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                       <div className="w-10 h-8 rounded-lg bg-white overflow-hidden shadow-sm shrink-0">
                                          <img src={v.image_url} alt="car" className="w-full h-full object-cover" />
                                       </div>
                                       <div>
                                          <p className="text-xs font-bold leading-none">{v.name}</p>
                                          <p className="text-[9px] font-black uppercase text-slate-400 mt-0.5 tracking-tight">{v.car_type?.name}</p>
                                       </div>
                                    </button>
                                ))}
                                {filteredVehicles.length === 0 && <p className="text-[10px] text-slate-400 p-4 text-center">No available vehicles found.</p>}
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {(formConfig.fields.specific_address?.enabled ?? true) && (
              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">{formConfig.fields.specific_address?.label || 'Specific Landmark / Notes'}</label>
                  <input
                    type="text"
                    value={specificAddress}
                    onChange={(e) => setSpecificAddress(e.target.value)}
                    placeholder={formConfig.fields.specific_address?.placeholder || "E.g. SM GenSan, Francisco Gold Hotel, Terminal..."}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:bg-white transition-all outline-none"
                    required={Boolean(formConfig.fields.specific_address?.required)}
                  />
              </div>
            )}

            {(formConfig.custom_fields || []).filter((f) => f.enabled !== false).length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Additional details</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {(formConfig.custom_fields || [])
                    .filter((f) => f.enabled !== false)
                    .map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">
                          {f.label}{f.required ? " *" : ""}
                        </label>
                        {f.type === "textarea" ? (
                          <textarea
                            value={customFields[f.key] || ""}
                            onChange={(e) => setCustomFields((p) => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder || ""}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:bg-white transition-all outline-none min-h-[90px]"
                            required={Boolean(f.required)}
                          />
                        ) : f.type === "select" ? (
                          <select
                            value={customFields[f.key] || ""}
                            onChange={(e) => setCustomFields((p) => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:bg-white transition-all outline-none"
                            required={Boolean(f.required)}
                          >
                            <option value="">Select...</option>
                            {(f.options || []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                            value={customFields[f.key] || ""}
                            onChange={(e) => setCustomFields((p) => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder || ""}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl font-semibold text-sm text-slate-900 focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:bg-white transition-all outline-none"
                            required={Boolean(f.required)}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Starting Date & Time</label>
                    <div className="flex gap-2">
                        <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-[2] bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none focus:border-green-600 transition-all focus:bg-white" required />
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none focus:border-green-600 transition-all focus:bg-white" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Ending Date & Time</label>
                    <div className="flex gap-2">
                        <input type="date" min={startDate || today} value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-[2] bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none focus:border-green-600 transition-all focus:bg-white" required />
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none focus:border-green-600 transition-all focus:bg-white" />
                    </div>
                </div>
            </div>

            {(formConfig.fields.with_driver?.enabled ?? true) && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                     <p className="font-semibold text-sm text-slate-900">{formConfig.fields.with_driver?.label || 'Professional Driver'}</p>
                     <p className="text-[10px] text-slate-500 font-medium mt-0.5">+ ₱{pricingMeta.driverFee.toLocaleString()} service fee</p>
                  </div>
                  <button type="button" onClick={() => setWithDriver(!withDriver)} className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 ${withDriver ? 'bg-green-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${withDriver ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
              </div>
            )}
          </div>

          <button type="submit" className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${availabilityStatus === 'blocked' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-700 hover:bg-green-800 shadow-green-700/20'}`} disabled={!pricingResult?.pricing || availabilityStatus === 'blocked'}>
            {availabilityStatus === 'blocked' ? '🚫 This car is already BOOKED' : pricingResult?.pricing ? `Review Booking - ₱${pricingResult.pricing.totalPrice.toLocaleString()}` : (pricingResult?.error ? 'Pricing Not Available' : 'Complete Details to Review')}
          </button>

          {pricingResult?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-semibold text-red-800">
              {pricingResult.error}
            </div>
          )}
          
          {availabilityStatus === 'warning' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start animate-pulse">
                  <span className="text-xl shrink-0 leading-none">⚠️</span>
                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed mt-0.5">Another customer has requested these dates. You can still proceed, but subject to approval.</p>
              </div>
          )}
        </form>

        <div className="lg:w-[340px] flex flex-col gap-4">
            <div className="bg-slate-100 rounded-2xl overflow-hidden grow border border-slate-200 min-h-[240px] relative shadow-inner">
                <div ref={mapRef} className="absolute inset-0 z-0" />
            </div>
            <div className="p-5 bg-gradient-to-br from-green-800 to-green-900 rounded-2xl text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                <h4 className="font-bold text-base mb-1.5 flex items-center gap-2 relative z-10">
                  <svg className="w-5 h-5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Premium Support
                </h4>
                <p className="text-xs text-green-100/90 leading-relaxed font-medium relative z-10">Our dispatch team is available 24/7 to coordinate your pick-up and drop-off points seamlessly.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
