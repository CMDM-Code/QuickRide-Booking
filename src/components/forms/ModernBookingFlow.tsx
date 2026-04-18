'use client';
import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, MapPin, Calendar, Clock,
  Plus, Trash2, ArrowRight, Check, Car, Edit3, Users,
  Settings, ChevronDown, Navigation, AlertCircle, Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp, query, where, limit } from "firebase/firestore";
import { authClient } from "@/lib/auth-client";
import { PricingRate } from "@/lib/types";
import { MOCK_VEHICLES, MOCK_RATES } from "@/lib/mock-data";
import { ImageWithFallback } from "../ui/ImageWithFallback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
  type: string;
  seats: number;
  transmission: string;
  pricePerDay: number;
  image: string;
  car_type_id?: string;
}

interface Destination {
  region: string;
  province: string;
  city: string;
  specificLocation: string;
}

interface BookingDetails {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  professionalDriver: string; // 'yes' | 'no'
}

interface BookingRequest {
  id: string;
  car: Vehicle;
  destinations: Destination[];
  details: BookingDetails;
  totalPrice: number;
}

type Stage = 'car' | 'destinations' | 'details' | 'confirmation' | 'summary';
type LocationStep = 'region' | 'province' | 'city' | 'input';

// ─── Static Data ──────────────────────────────────────────────────────────────

const LOCATION_DATA: Record<string, Record<string, string[]>> = {
  'Region XI (Davao Region)': {
    'Davao del Norte': ['Tagum City', 'Panabo City', 'Island Garden City of Samal', 'Carmen', 'Asuncion'],
    'Davao del Sur': ['Digos City', 'Hagonoy', 'Kiblawan', 'Padada', 'Sulop'],
    'Davao de Oro': ['Nabunturan', 'Montevista', 'Mawab', 'Monkayo', 'Compostela'],
    'Davao Occidental': ['Jose Abad Santos', 'Don Marcelino', 'Malita', 'Sarangani', 'Santa Maria'],
    'Davao Oriental': ['Mati City', 'Baganga', 'Caraga', 'Boston', 'Cateel'],
    'Davao City': ['Davao City'],
  },
  'Region XII (SOCCSKSARGEN)': {
    'South Cotabato': ['General Santos City', 'Koronadal City', 'Surallah', 'Tboli', 'Banga'],
    'Sarangani': ['Alabel', 'Malapatan', 'Glan', 'Maasim', 'Malungon'],
    'North Cotabato': ['Kidapawan City', 'Mlang', 'Kabacan', 'Matalam', 'Pigcawayan'],
    'Sultan Kudarat': ['Tacurong City', 'Isulan', 'Lebak', 'Kalamansig', 'Palimbang'],
  },
  'Region X (Northern Mindanao)': {
    'Bukidnon': ['Malaybalay City', 'Valencia City', 'Quezon', 'Maramag', 'Impasugong'],
    'Misamis Oriental': ['Cagayan de Oro City', 'Gingoog City', 'El Salvador', 'Villanueva'],
    'Misamis Occidental': ['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Jimenez'],
    'Lanao del Norte': ['Iligan City', 'Bacolod', 'Kapatagan', 'Kolambugan'],
    'Camiguin': ['Mambajao', 'Sagay', 'Catarman', 'Guinsiliban'],
  },
};

const SUGGESTION_MAP: Record<string, string[]> = {
  'Davao City': [
    'Brgy. Buhangin, Davao City',
    'SM Lanang Premier, JP Laurel Ave',
    'Davao International Airport, Buhangin',
    'Abreeza Mall, J.P. Laurel Ave',
    'SM City Davao, Quimpo Blvd',
    'Victoria Plaza Mall, JP Laurel',
    'Brgy. Poblacion, Davao City',
    'Brgy. Talomo, Davao City',
    'NCCC Mall Buhangin',
  ],
  'Tagum City': [
    'Gaisano Grand Mall Tagum',
    'Brgy. Magugpo Poblacion, Tagum',
    'Tagum City Terminal',
    'Brgy. Visayan Village, Tagum City',
  ],
  'General Santos City': [
    'GenSan Fish Market Complex',
    'SM City General Santos',
    'Brgy. Calumpang, General Santos City',
    'General Santos Airport',
    'Robinsons Place GenSan',
  ],
  'Koronadal City': [
    'Brgy. Zone 4, Koronadal City',
    'South Cotabato Provincial Capitol',
    'Marbel Public Market',
  ],
  'default': [
    'Public Market',
    'City Hall',
    'Bus Terminal',
    'Town Plaza',
  ],
};

function getSuggestions(city: string, query: string): string[] {
  const base = SUGGESTION_MAP[city] || SUGGESTION_MAP['default'];
  if (!query) return base.slice(0, 5);
  return base.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
}

function getMockTravelTime(): string {
  const times = ['~25 mins', '~35 mins', '~45 mins', '~1 hr', '~1.5 hrs', '~2 hrs'];
  return times[Math.floor(Math.random() * times.length)];
}

function calcPrice(car: Vehicle, details: BookingDetails, destinations: Destination[], rates: PricingRate[]): {
  baseCost: number;
  driverFee: number;
  routeFee: number;
  total: number;
  days: number;
} {
  const startMs = details.startDate && details.startTime 
    ? new Date(`${details.startDate}T${details.startTime}`).getTime() 
    : Date.now();
  const endMs = details.endDate && details.endTime 
    ? new Date(`${details.endDate}T${details.endTime}`).getTime() 
    : startMs + 86400000;
  
  const diffHours = (endMs - startMs) / (1000 * 60 * 60);
  const days = Math.max(1, Math.ceil(diffHours / 24));
  
  const rate = rates.find(r => r.car_type_id === car.car_type_id);
  const ratePerDay = rate ? (rate.rate_24hr || car.pricePerDay || 4000) : (car.pricePerDay || 4000);
  
  const baseCost = ratePerDay * days;
  const driverFee = details.professionalDriver === 'yes' ? 1000 * days : 0;
  const routeFee = Math.max(0, destinations.length - 1) * 300;
  
  return { baseCost, driverFee, routeFee, total: baseCost + driverFee + routeFee, days };
}

function formatCurrency(n: number) {
  return '₱' + n.toLocaleString('en-PH');
}

function formatDestDisplay(d: Destination) {
  return [d.specificLocation, d.city, d.province].filter(Boolean).join(', ');
}

const withTimeout = (promise: Promise<any>, ms: number) => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
  return Promise.race([promise, timeout]);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const STAGE_LABELS = ['Select Car', 'Destinations', 'Trip Details', 'Confirm'];
const STAGE_KEYS: Stage[] = ['car', 'destinations', 'details', 'confirmation'];

function ProgressBar({ stage }: { stage: Stage }) {
  const idx = STAGE_KEYS.indexOf(stage);
  if (idx === -1) return null;
  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto mb-4">
      {STAGE_LABELS.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < idx
                  ? 'bg-green-500 text-white'
                  : i === idx
                  ? 'bg-green-700 text-white ring-4 ring-green-700/20'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i < idx ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${i <= idx ? 'text-green-700' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i < STAGE_LABELS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${i < idx ? 'bg-green-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Stage 1: Car Selection ───────────────────────────────────────────────────

function CarSelectionStage({
  vehicles,
  onSelect,
  onCancel,
  onGoSummary,
  hasRequests,
}: {
  vehicles: Vehicle[];
  onSelect: (v: Vehicle) => void;
  onCancel: () => void;
  onGoSummary: () => void;
  hasRequests: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
      <div className="pb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Choose Your Vehicle
        </h2>
        <p className="text-sm text-slate-500">Select a car to start building your booking.</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {vehicles.length === 0 ? (
           <div className="flex justify-center items-center h-full text-slate-500">Loading fleet...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => onSelect(vehicle)}
                className="group text-left bg-white border-2 border-slate-100 rounded-2xl-plus overflow-hidden hover:border-green-700 hover:bg-green-50/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-40 overflow-hidden bg-slate-50 relative">
                  <ImageWithFallback
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                     <span className="text-white text-xs font-bold bg-green-600 px-3 py-1 rounded-full border border-white/20 shadow-lg">Select</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
                        {vehicle.name}
                      </h3>
                      <span className="inline-block mt-1 uppercase text-[10px] tracking-wider text-slate-400 font-bold">
                        {vehicle.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 font-semibold bg-white px-2 py-1.5 rounded-xl border border-slate-100 w-fit">
                    <span className="flex items-center gap-1"><Users size={12} className="text-slate-400" />{vehicle.seats}</span>
                    <div className="w-[1px] h-3 bg-slate-200"></div>
                    <span className="flex items-center gap-1"><Settings size={12} className="text-slate-400" />{vehicle.transmission}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-green-700 text-lg">{formatCurrency(vehicle.pricePerDay)}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">/day</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-green-700 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        {hasRequests ? (
          <button
            onClick={onGoSummary}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-green-700/20 transition-all hover:bg-green-800"
            style={{ background: '#15803d' }}
          >
            <Layers size={18} />
            View Booking Summary
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stage 2: Destinations ────────────────────────────────────────────────────

function DestinationsStage({
  destinations,
  onAddDestination,
  onRemoveDestination,
  onBack,
  onNext,
}: {
  destinations: Destination[];
  onAddDestination: () => void;
  onRemoveDestination: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
      <div className="pb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Your Destinations
        </h2>
        <p className="text-sm text-slate-500">Build your route by adding destinations.</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 bg-green-50 rounded-full border border-green-100 flex items-center justify-center shadow-inner">
              <MapPin size={28} className="text-green-700" />
            </div>
            <p className="text-slate-500 text-sm text-center">No stops added yet.<br />Where are you headed?</p>
            <button
              onClick={onAddDestination}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all"
              style={{ background: '#15803d' }}
            >
              <Plus size={18} /> Add Destination
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto w-full">
            {destinations.map((dest, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                <div className="w-8 h-8 bg-green-700/10 text-green-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-1">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{dest.specificLocation || dest.city}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{dest.city}, {dest.province}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">{dest.region}</p>
                </div>
                <button
                  onClick={() => onRemoveDestination(i)}
                  className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-100 rounded-xl shadow-sm transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={onAddDestination}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-green-700 hover:text-green-700 hover:bg-green-50 transition-all mt-4"
            >
              <Plus size={18} /> Add Next Stop
            </button>
          </div>
        )}
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={destinations.length === 0}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all disabled:opacity-40"
          style={{ background: '#15803d' }}
        >
          Dates <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Location Picker Sub-Flow ──────────────────────────────────────────────────

function LocationPicker({
  onAdd,
  onCancel,
}: {
  onAdd: (dest: Destination) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<LocationStep>('region');
  const [selected, setSelected] = useState({ region: '', province: '', city: '' });
  const [specificInput, setSpecificInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const regions = Object.keys(LOCATION_DATA);
  const provinces = selected.region ? Object.keys(LOCATION_DATA[selected.region] || {}) : [];
  const cities = selected.province ? LOCATION_DATA[selected.region]?.[selected.province] || [] : [];
  const suggestions = getSuggestions(selected.city, specificInput);

  function handleAdd() {
    onAdd({
      region: selected.region,
      province: selected.province,
      city: selected.city,
      specificLocation: specificInput,
    });
  }

  const stepTitles: Record<LocationStep, string> = {
    region: 'Select Region',
    province: 'Select Province',
    city: 'Select City',
    input: 'Enter Location',
  };

  const stepNumbers: Record<LocationStep, number> = { region: 1, province: 2, city: 3, input: 4 };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onCancel} className="p-2 bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={14} className="text-green-700" />
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Adding Stop</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              {stepTitles[step]}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-4 overflow-x-auto whitespace-nowrap hidden-scrollbar">
          {(['region', 'province', 'city', 'input'] as LocationStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={10} className="text-slate-300" />}
              <span className={`px-2 py-1 rounded-lg ${
                s === step ? 'bg-green-700 text-white' :
                stepNumbers[s] < stepNumbers[step] ? 'bg-green-50 text-green-700 border border-green-100' :
                'bg-slate-100 text-slate-400'
              }`}>
                {s === 'region' && (selected.region || 'Region')}
                {s === 'province' && (selected.province || 'Province')}
                {s === 'city' && (selected.city || 'City')}
                {s === 'input' && 'Specifics'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-2">
          {step === 'region' && regions.map((region) => (
            <button key={region} onClick={() => { setSelected({ ...selected, region, province: '', city: '' }); setStep('province'); }} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-green-700 hover:shadow-md text-left transition-all group font-semibold text-sm text-slate-800">
              {region} <ChevronRight size={18} className="text-slate-300 group-hover:text-green-700 group-hover:translate-x-1 transition-all" />
            </button>
          ))}

          {step === 'province' && provinces.map((province) => (
            <button key={province} onClick={() => { setSelected({ ...selected, province, city: '' }); setStep('city'); }} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-green-700 hover:shadow-md text-left transition-all group font-semibold text-sm text-slate-800">
              {province} <ChevronRight size={18} className="text-slate-300 group-hover:text-green-700 group-hover:translate-x-1 transition-all" />
            </button>
          ))}

          {step === 'city' && cities.map((city) => (
            <button key={city} onClick={() => { setSelected({ ...selected, city }); setStep('input'); }} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-green-700 hover:shadow-md text-left transition-all group font-semibold text-sm text-slate-800">
              {city} <ChevronRight size={18} className="text-slate-300 group-hover:text-green-700 group-hover:translate-x-1 transition-all" />
            </button>
          ))}

          {step === 'input' && (
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-200/50 w-fit px-2 py-1 rounded-md">
                Enter Specific Location
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-700" />
                <input
                  ref={inputRef} type="text" value={specificInput}
                  onChange={(e) => { setSpecificInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. SM Lanang Premier, Street Name..."
                  className="w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-green-700 focus:outline-none focus:ring-4 focus:ring-green-700/10 transition-all shadow-sm"
                />
                
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute z-20 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                      {suggestions.map((s) => (
                        <button key={s} onMouseDown={() => { setSpecificInput(s); setShowSuggestions(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-green-700 text-left transition-colors">
                          <MapPin size={14} className="text-slate-300 flex-shrink-0" /> {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                 <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                 <p className="text-xs font-medium text-blue-800 leading-relaxed">
                   You can enter a barangay, street, landmark, or full address to help your driver locate you.
                 </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex items-center justify-between">
        {step !== 'region' ? (
          <button onClick={() => {
              if (step === 'province') setStep('region');
              else if (step === 'city') setStep('province');
              else if (step === 'input') setStep('city');
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <button onClick={onCancel} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        )}
        {step === 'input' && (
          <button
            onClick={handleAdd} disabled={!specificInput.trim()}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all disabled:opacity-40"
            style={{ background: '#15803d' }}
          >
            <Check size={18} /> Confirm Location
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stage 3: Booking Details ─────────────────────────────────────────────────

function BookingDetailsStage({
  details,
  onChange,
  onBack,
  onNext,
  carId
}: {
  details: BookingDetails;
  onChange: (d: BookingDetails) => void;
  onBack: () => void;
  onNext: () => void;
  carId: string;
}) {
  const [dateTimeError, setDateTimeError] = useState<string>('');
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  const valid = details.startDate && details.startTime && details.endDate && details.endTime && !dateTimeError && availabilityWarning !== 'blocked';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (details.startDate && details.endDate && valid) {
       checkOverlap();
    }
  }, [details.startDate, details.startTime, details.endDate, details.endTime]);

  async function checkOverlap() {
    if (!db) return;
    setIsChecking(true);
    setAvailabilityWarning('');
    
    try {
      const start = new Date(`${details.startDate}T${details.startTime}`);
      const end = new Date(`${details.endDate}T${details.endTime}`);
      const q = query(collection(db, 'bookings'), where('car_id', '==', carId), where('status', 'in', ['approved', 'active', 'pending']));
      
      const snap = await getDocs(q);
      const conflicts = snap.docs.filter((docRef: any) => {
          const b = docRef.data();
          const bStart = b.start_date instanceof Timestamp ? b.start_date.toDate() : new Date(b.start_date);
          const bEnd = b.end_date instanceof Timestamp ? b.end_date.toDate() : new Date(b.end_date);
          return bStart < end && bEnd > start;
      });

      if (conflicts.length > 0) {
        const confirmed = conflicts.find((d: any) => ['approved', 'active'].includes(d.data().status));
        setAvailabilityWarning(confirmed ? 'blocked' : 'warning');
      }
    } catch (error) {
      console.error("Availability check failed");
    } finally {
      setIsChecking(false);
    }
  }

  function validateDateTime(newDetails: BookingDetails): string {
    if (!newDetails.startDate || !newDetails.startTime || !newDetails.endDate || !newDetails.endTime) return '';
    const start = new Date(`${newDetails.startDate}T${newDetails.startTime}`);
    const end = new Date(`${newDetails.endDate}T${newDetails.endTime}`);
    const now = new Date();
    if (start < now) return 'Start time cannot be in the past.';
    if (end <= start) return 'End time must be after start time.';
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours < 12) return 'Minimum rental period is 12 hours.';
    return '';
  }

  function update(field: keyof BookingDetails, value: string) {
    let newDetails = { ...details, [field]: value };
    // Auto-adjust dates...
    if (field === 'startDate' && newDetails.endDate && value > newDetails.endDate) newDetails.endDate = value;
    const error = validateDateTime(newDetails);
    setDateTimeError(error);
    onChange(newDetails);
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
      <div className="pb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Trip Details
        </h2>
        <p className="text-sm text-slate-500">When do you need the vehicle?</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest bg-slate-100 px-2 py-1 rounded-md mb-1 inline-block">Start Date & Time</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={details.startDate} min={today} onChange={e => update('startDate', e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all" />
              </div>
              <div className="relative">
                 <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="time" value={details.startTime} onChange={e => update('startTime', e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest bg-slate-100 px-2 py-1 rounded-md mb-1 inline-block">End Date & Time</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={details.endDate} min={details.startDate || today} onChange={e => update('endDate', e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all" />
              </div>
              <div className="relative">
                 <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="time" value={details.endTime} onChange={e => update('endTime', e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all" />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
             <div className="p-4 bg-slate-50 border-b border-slate-100">
               <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Users size={16} className="text-green-700"/> Driver Options</h5>
               <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 pl-6">Would you like a professional driver?</p>
             </div>
             <div className="p-4">
                <select
                  value={details.professionalDriver}
                  onChange={(e) => update('professionalDriver', e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-green-600"
                >
                  <option value="no">Self Drive (No Driver)</option>
                  <option value="yes">Yes, include Driver (+₱1000/day)</option>
                </select>
             </div>
          </div>

          <AnimatePresence mode="popLayout">
            {dateTimeError && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1">Time Error</p>
                  <p className="text-sm font-bold text-red-600 leading-snug">{dateTimeError}</p>
                </div>
              </motion.div>
            )}

            {availabilityWarning && !dateTimeError && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`flex items-start gap-3 p-4 rounded-2xl ${availabilityWarning === 'blocked' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                {availabilityWarning === 'blocked' ? <X size={20} className="text-red-500 shrink-0" /> : <AlertCircle size={20} className="text-amber-500 shrink-0" />}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${availabilityWarning === 'blocked' ? 'text-red-800' : 'text-amber-800'}`}>Availability Alert</p>
                  <p className={`text-sm font-bold leading-snug ${availabilityWarning === 'blocked' ? 'text-red-600' : 'text-amber-700'}`}>
                    {availabilityWarning === 'blocked' ? 'Vehicle is officially fully booked for these dates.' : 'Vehicle has pending requests for these dates. You can proceed, but approval relies on administrative review.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid || isChecking}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-green-700/20 hover:bg-green-800 transition-all disabled:opacity-40"
          style={{ background: '#15803d' }}
        >
          {isChecking ? 'Checking...' : 'Review Selection'} <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stage 4: Confirmation ────────────────────────────────────────────────────

function ConfirmationStage({
  car,
  destinations,
  details,
  rates,
  onBack,
  onAddToRequest,
}: {
  car: Vehicle;
  destinations: Destination[];
  details: BookingDetails;
  rates: PricingRate[];
  onBack: () => void;
  onAddToRequest: () => void;
}) {
  const pricing = calcPrice(car, details, destinations, rates);
  const routeLegs = destinations.map((_, i) => ({
    from: i === 0 ? 'Pickup (Davao HQ)' : formatDestDisplay(destinations[i - 1]),
    to: formatDestDisplay(destinations[i]),
    time: getMockTravelTime(),
  }));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex flex-col h-full">
      <div className="pb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Request Confirmation
        </h2>
        <p className="text-sm text-slate-500">Review details and add to your booking bucket.</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        <div className="grid md:grid-cols-2 gap-6 p-1">
          {/* Left Column: Visuals & Map */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                <ImageWithFallback src={car.image} alt={car.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 truncate">{car.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                   <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold text-[10px] uppercase tracking-wider rounded-md border border-green-100">{car.type}</span>
                   <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">w/ Driver: {details.professionalDriver === 'yes' ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Mock Map View */}
            <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-36 relative bg-slate-50 border-b border-slate-100" style={{ backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`, backgroundSize: '16px 16px' }}>
                 <div className="absolute top-3 inset-x-4 flex items-center justify-between z-10">
                    <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5"><Navigation size={12} className="text-green-600"/> Route Map</span>
                 </div>
                 
                 {/* Visual Nodes */}
                 <div className="absolute inset-0 flex items-center justify-center px-8">
                     <div className="w-full max-w-[200px] relative flex items-center">
                        <div className="absolute w-full border-t-2 border-dashed border-green-500/50"></div>
                        <div className="relative flex items-center justify-between w-full">
                           <div className="w-6 h-6 bg-green-100 border-4 border-green-600 rounded-full shadow-md z-10 flex items-center justify-center"></div>
                           <div className="w-6 h-6 bg-slate-800 border-4 border-slate-800 rounded-full shadow-md z-10 flex items-center justify-center">
                              <MapPin size={10} className="text-white"/>
                           </div>
                        </div>
                     </div>
                 </div>
              </div>
              
              {/* Route List */}
              <div className="p-4 bg-white">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Itinerary Timeline</p>
                 <div className="space-y-3">
                   {routeLegs.map((leg, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center mt-1">
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-50"></div>
                           {i !== routeLegs.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                        </div>
                        <div className="pb-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{leg.from}</p>
                           <p className="text-sm font-bold text-slate-900 mt-0.5">{leg.to}</p>
                           <p className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md inline-block mt-1.5">Est. {leg.time}</p>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dates & Pricing */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Retrieval</p>
                 <p className="font-black text-slate-900">{details.startDate}</p>
                 <p className="text-xs font-bold text-green-700 bg-green-100/50 w-fit px-2 py-0.5 rounded mt-1">{details.startTime}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Return</p>
                 <p className="font-black text-slate-900">{details.endDate}</p>
                 <p className="text-xs font-bold text-slate-600 bg-slate-200/50 w-fit px-2 py-0.5 rounded mt-1">{details.endTime}</p>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Financial Breakdown</h4>
               <div className="space-y-3 font-semibold text-sm">
                  <div className="flex justify-between items-end border-b border-white/10 pb-3">
                     <div>
                        <p className="text-slate-300">{car.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{pricing.days} Day{pricing.days > 1 ? 's' : ''} Rental</p>
                     </div>
                     <span>{formatCurrency(pricing.baseCost)}</span>
                  </div>
                  {pricing.driverFee > 0 && (
                    <div className="flex justify-between text-green-400">
                       <span>Pro Driver Coverage</span>
                       <span>{formatCurrency(pricing.driverFee)}</span>
                    </div>
                  )}
                  {pricing.routeFee > 0 && (
                    <div className="flex justify-between text-slate-300">
                       <span>Multi-point Complexity</span>
                       <span>{formatCurrency(pricing.routeFee)}</span>
                    </div>
                  )}
               </div>
               <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Total</span>
                  <span className="text-3xl font-black text-green-400">{formatCurrency(pricing.total)}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onAddToRequest}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-slate-900 shadow-xl shadow-green-400/20 hover:scale-[1.02] transition-all"
          style={{ background: '#4ade80' }}
        >
          <Plus size={18} /> Add to Booking Request
        </button>
      </div>
    </motion.div>
  );
}

// ─── Final: Booking Summary ───────────────────────────────────────────────────

function BookingSummaryStage({
  requests,
  onEdit,
  onRemove,
  onBack,
  onConfirm,
}: {
  requests: BookingRequest[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalBucketPrice = requests.reduce((acc, req) => acc + req.totalPrice, 0);

  const handleBookNowClick = async () => {
    setIsSubmitting(true);
    await onConfirm();
    setIsSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-slate-50/50">
      <div className="pb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Vehicle Request Summary
        </h2>
        <p className="text-sm text-slate-500 font-medium">You have <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">{requests.length}</span> request(s) queued for confirmation.</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar pr-2">
         {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
               <Layers size={48} className="text-slate-200 mb-4" />
               <h3 className="font-bold text-slate-900 mb-1">Your bucket is empty</h3>
               <p className="text-sm text-slate-500 mb-6">Start building your itinerary by selecting a vehicle.</p>
               <button onClick={onBack} className="px-6 py-3 bg-green-700 text-white font-bold rounded-xl shadow-lg hover:bg-green-800 transition-all">Browse Fleet</button>
            </div>
         ) : (
            <div className="space-y-6">
              {requests.map((req, idx) => (
                <div key={req.id} className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:border-green-200 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    <div className="w-full sm:w-32 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50 relative border border-slate-100">
                      <ImageWithFallback src={req.car.image} alt={req.car.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 shadow">
                         #{idx + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <h4 className="font-black text-slate-900 text-lg leading-tight w-full max-w-[200px] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                              {req.car.name}
                            </h4>
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5 block">{req.car.type}</span>
                         </div>
                         <div className="text-right">
                           <p className="font-black text-green-700 text-xl">{formatCurrency(req.totalPrice)}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                         <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate">{req.details.startDate} • {req.details.startTime}</span>
                         </div>
                         <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate">{req.destinations.length} Location(s)</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => onEdit(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-slate-600 hover:text-green-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit3 size={14} /> Modify Request
                    </button>
                    <div className="w-[1px] h-6 bg-slate-200"></div>
                    <button
                      onClick={() => onRemove(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
         )}
      </div>

      <div className="pt-4 border-t border-slate-200 mt-auto">
        {requests.length > 0 && (
          <div className="flex justify-between items-end mb-4 px-2">
             <span className="font-bold text-sm text-slate-500 uppercase tracking-widest">Grand Total</span>
             <span className="font-black text-3xl text-slate-900">{formatCurrency(totalBucketPrice)}</span>
          </div>
        )}
        <div className="flex gap-4">
          <button onClick={onBack} disabled={isSubmitting} className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-white hover:border-slate-300 transition-all">
            <Plus size={16} /> Add Another Car
          </button>
          <button
            onClick={handleBookNowClick}
            disabled={requests.length === 0 || isSubmitting}
            className="flex-3 w-full py-4 rounded-2xl text-sm font-bold text-white shadow-xl shadow-green-700/30 hover:bg-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            style={{ background: '#15803d' }}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Processing Booking...</span>
            ) : (
              <><Check size={18} /> Confirm Entire Booking</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ModernBookingFlow Component ───────────────────────────────────────────────

interface BookingFlowProps {
  onClose?: () => void;
  editMode?: boolean;
  existingBooking?: any;
  onEditComplete?: () => void;
}

export default function ModernBookingFlow({ onClose, editMode, existingBooking, onEditComplete }: BookingFlowProps) {
  const [stage, setStage] = useState<Stage>('car');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Firestore Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rates, setRates] = useState<PricingRate[]>([]);

  // Current booking being created
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
     startDate: '', startTime: '', endDate: '', endTime: '', professionalDriver: 'no'
  });

  // All completed booking requests
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);

  // Pre-load data if in editMode
  useEffect(() => {
    if (editMode && existingBooking && vehicles.length > 0) {
      const matchedCar = vehicles.find(v => v.id === existingBooking.car_id);
      if (!matchedCar) return;

      const parsedDestinations = (existingBooking.destinations || []).map((dStr: string) => {
         // Attempt basic parsing
         return {
            region: "Pre-loaded",
            province: "",
            city: dStr.split(',')[1]?.trim() || "City",
            specificLocation: dStr.split(',')[0]?.trim() || dStr
         };
      });

      // Extract details
      const start = existingBooking.start_date instanceof Date 
            ? existingBooking.start_date 
            : (existingBooking.start_date?.toDate ? existingBooking.start_date.toDate() : new Date(existingBooking.start_date || Date.now()));
            
      const end = existingBooking.end_date instanceof Date 
            ? existingBooking.end_date 
            : (existingBooking.end_date?.toDate ? existingBooking.end_date.toDate() : new Date(existingBooking.end_date || Date.now()));

      setBookingRequests([{
         id: existingBooking.id,
         car: matchedCar,
         destinations: parsedDestinations.length > 0 ? parsedDestinations : [{ region: 'HQ', province: 'HQ', city: 'HQ', specificLocation: 'HQ' }],
         details: {
            startDate: start.toISOString().split('T')[0],
            startTime: start.toTimeString().slice(0,5),
            endDate: end.toISOString().split('T')[0],
            endTime: end.toTimeString().slice(0,5),
            professionalDriver: existingBooking.with_driver ? 'yes' : 'no'
         },
         totalPrice: existingBooking.total_price || 0
      }]);
      setStage('summary'); // Jump straight to edit bucket
    }
  }, [editMode, existingBooking, vehicles]);

  useEffect(() => {
    fetchFirebaseData();
  }, []);

  async function fetchFirebaseData() {
    if (!db) {
       loadMockFallback();
       return;
    }
    
    try {
      const [vehsSnap, carTypesSnap, ratesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(collection(db, 'vehicles'), where('available', '==', true), limit(20))),
          getDocs(collection(db, 'car_types')),
          getDocs(collection(db, 'pricing_rates'))
        ]), 
        8000
      );

      if (!vehsSnap.empty) {
        const carTypesMap = Object.fromEntries(carTypesSnap.docs.map((d: any) => [d.id, d.data()]));
        
        const mappedVehicles: Vehicle[] = vehsSnap.docs.map((d: any) => {
           const data = d.data();
           const ct = carTypesMap[data.car_type_id];
           return {
             id: d.id,
             name: data.name,
             type: ct ? ct.name : 'Standard',
             seats: data.specs?.seats || 5,
             transmission: data.specs?.transmission || 'Automatic',
             pricePerDay: data.base_price_24hr || 4000,
             image: data.image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1080',
             car_type_id: data.car_type_id
           };
        });

        setVehicles(mappedVehicles);
        setRates(ratesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PricingRate)));
      } else {
        loadMockFallback();
      }
    } catch (err) {
      console.error("Firestore sync failed, using fallback:", err);
      loadMockFallback();
    }
  }

  function loadMockFallback() {
     setVehicles(MOCK_VEHICLES.map(v => ({
        id: v.id,
        name: v.name,
        type: v.car_type?.name || 'Standard',
        seats: v.seats || 5,
        transmission: v.transmission || 'Auto',
        pricePerDay: 4000,
        image: v.image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1080',
        car_type_id: v.car_type_id
     })));
     setRates(MOCK_RATES);
  }

  function handleAddDestination(dest: Destination) {
    setDestinations((prev) => [...prev, dest]);
    setShowLocationPicker(false);
  }

  function resetCurrentBooking() {
    setSelectedCar(null);
    setDestinations([]);
    setBookingDetails({ startDate: '', startTime: '', endDate: '', endTime: '', professionalDriver: 'no' });
    setEditingId(null);
  }

  function handleAddToRequest() {
    if (!selectedCar) return;
    const pricing = calcPrice(selectedCar, bookingDetails, destinations, rates);
    const newRequest: BookingRequest = {
      id: editingId || `req-${Date.now()}`,
      car: selectedCar,
      destinations,
      details: bookingDetails,
      totalPrice: pricing.total,
    };

    if (editingId) {
      setBookingRequests((prev) => prev.map((r) => (r.id === editingId ? newRequest : r)));
    } else {
      setBookingRequests((prev) => [...prev, newRequest]);
    }

    resetCurrentBooking();
    setStage('summary');
  }

  function handleEditRequest(id: string) {
    const req = bookingRequests.find((r) => r.id === id);
    if (!req) return;
    setSelectedCar(req.car);
    setDestinations(req.destinations);
    setBookingDetails(req.details);
    setEditingId(id);
    setStage('destinations');
  }

  async function handleFinalConfirm() {
    const user = authClient.getCurrentUser();
    
    const firestore = db;
    if (!firestore) {
       alert("Firebase is not initialized.");
       return;
    }

    try {
      if (editMode && existingBooking) {
         // Singe Edit Mode
         const req = bookingRequests[0];
         if (!req) return;
         
         const start = new Date(`${req.details.startDate}T${req.details.startTime}`);
         const end = new Date(`${req.details.endDate}T${req.details.endTime}`);
         
         const ref = doc(firestore, 'bookings', existingBooking.id);
         await updateDoc(ref, {
            car_id: req.car.id,
            start_date: Timestamp.fromDate(start),
            end_date: Timestamp.fromDate(end),
            total_price: req.totalPrice,
            status: 'pending', // Revert to pending for re-approval
            destinations: req.destinations.map(d => formatDestDisplay(d)),
            with_driver: req.details.professionalDriver === 'yes'
         });
         
         setShowSuccess(true);
      } else {
        // Create a booking document in Firebase for each request in the bucket
        const bookingPromises = bookingRequests.map(req => {
          const start = new Date(`${req.details.startDate}T${req.details.startTime}`);
          const end = new Date(`${req.details.endDate}T${req.details.endTime}`);
          
          return addDoc(collection(firestore, 'bookings'), {
            user_id: user?.id || 'guest_booking',
            car_id: req.car.id,
            start_date: Timestamp.fromDate(start),
            end_date: Timestamp.fromDate(end),
            total_price: req.totalPrice,
            status: 'pending',
            destinations: req.destinations.map(d => formatDestDisplay(d)),
            with_driver: req.details.professionalDriver === 'yes',
            pickup_location_id: 'loc_gensan',
            created_at: serverTimestamp()
          });
        });

        await Promise.all(bookingPromises);
        setShowSuccess(true);
      }
    } catch (error: any) {
      console.error("Error creating bookings:", error);
      alert("Failed to submit booking: " + error.message);
    }
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    if (editMode && onEditComplete) {
       onEditComplete();
       if (onClose) onClose();
       return;
    }
    setBookingRequests([]);
    resetCurrentBooking();
    setStage('car');
    if (onClose) onClose();
  }

  const isMainFlow = stage !== 'summary';

  return (
    <div className="h-full flex flex-col">
       {isMainFlow && !showLocationPicker && !showSuccess && <ProgressBar stage={stage} />}
       <div className="flex-1 overflow-hidden">
          {showSuccess ? (
             <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center bg-green-50/50 rounded-2xl">
               <div className="w-24 h-24 bg-white border border-green-200 rounded-full flex items-center justify-center shadow-2xl shadow-green-700/20">
                 <Check size={48} className="text-green-700" />
               </div>
               <div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                   Booking Requests Sent!
                 </h2>
                 <p className="text-slate-600 font-medium max-w-sm mx-auto leading-relaxed">
                   Thank you for choosing QuickRide Booking. Our team will review your {bookingRequests.length} vehicle request(s) and contact you shortly.
                 </p>
               </div>
               <button
                 onClick={handleSuccessClose}
                 className="px-10 py-4 mt-4 rounded-xl font-black text-white shadow-xl hover:scale-105 transition-all w-full max-w-xs"
                 style={{ background: '#15803d' }}
               >
                 Close & Return
               </button>
             </div>
          ) : stage === 'car' ? (
             <CarSelectionStage
               vehicles={vehicles}
               onSelect={(car) => { setSelectedCar(car); setStage('destinations'); }}
               onCancel={() => { if (onClose) onClose(); }}
               onGoSummary={() => setStage('summary')}
               hasRequests={bookingRequests.length > 0}
             />
          ) : stage === 'destinations' ? (
             showLocationPicker ? (
                <LocationPicker onAdd={handleAddDestination} onCancel={() => setShowLocationPicker(false)} />
             ) : (
                <DestinationsStage
                  destinations={destinations}
                  onAddDestination={() => setShowLocationPicker(true)}
                  onRemoveDestination={(i) => setDestinations(prev => prev.filter((_, idx) => idx !== i))}
                  onBack={() => setStage('car')}
                  onNext={() => setStage('details')}
                />
             )
          ) : stage === 'details' ? (
             <BookingDetailsStage
               details={bookingDetails}
               onChange={setBookingDetails}
               onBack={() => setStage('destinations')}
               onNext={() => setStage('confirmation')}
               carId={selectedCar!.id}
             />
          ) : stage === 'confirmation' ? (
             <ConfirmationStage
               car={selectedCar!}
               destinations={destinations}
               details={bookingDetails}
               rates={rates}
               onBack={() => setStage('details')}
               onAddToRequest={handleAddToRequest}
             />
          ) : stage === 'summary' ? (
             <BookingSummaryStage
               requests={bookingRequests}
               onEdit={handleEditRequest}
               onRemove={(id) => setBookingRequests((prev) => prev.filter((r) => r.id !== id))}
               onBack={() => setStage('car')}
               onConfirm={handleFinalConfirm}
             />
          ) : null}
       </div>
    </div>
  );
}
