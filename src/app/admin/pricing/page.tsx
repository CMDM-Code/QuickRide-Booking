'use client';
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";
import { CarType, Location, PricingRate } from "@/lib/types";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";

export default function PricingManagementPage() {
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pricingMatrix, setPricingMatrix] = useState<Record<string, Record<string, Partial<PricingRate>>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    if (db) {
      try {
        const [typesSnap, locsSnap, ratesSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'car_types')),
            getDocs(collection(db, 'locations')),
            getDocs(collection(db, 'pricing_rates'))
          ]), 
          5000
        );
        
        const types = typesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CarType));
        const locs = locsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
        const rates = ratesSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingRate));

        setCarTypes(types);
        setLocations(locs);

        const matrix: Record<string, Record<string, Partial<PricingRate>>> = {};
        types.forEach(t => {
          matrix[t.id] = {};
          locs.forEach(l => {
            const rate = rates.find(r => r.car_type_id === t.id && r.location_id === l.id);
            matrix[t.id][l.id] = rate || { car_type_id: t.id, location_id: l.id };
          });
        });
        setPricingMatrix(matrix);
        setMode('cloud');
        setLoading(false);
        return;
      } catch (err: any) {
        console.warn("Pricing fetch failed, falling back to Local Rules:", err);
      }
    }

    // Fallback to Local Rules
    const localRules = adminStore.getPricingRules();
    const mockLocs: Location[] = [{ id: 'gensan', name: 'General Santos' }, { id: 'davao', name: 'Davao City' }];
    const mockTypes: CarType[] = [
      { id: 'economy', name: 'Economy', driver_only: false }, 
      { id: 'suv', name: 'SUV', driver_only: false }
    ];

    setCarTypes(mockTypes);
    setLocations(mockLocs);

    const matrix: Record<string, Record<string, Partial<PricingRate>>> = {};
    mockTypes.forEach(t => {
      matrix[t.id] = {};
      mockLocs.forEach(l => {
        const rule = localRules.find(r => r.category === t.id);
        matrix[t.id][l.id] = { 
          rate_12hr: rule?.valueType === 'fixed' ? rule.value * 0.6 : 1500, 
          rate_24hr: rule?.valueType === 'fixed' ? rule.value : 2500 
        };
      });
    });
    setPricingMatrix(matrix);
    setMode('local');
    setLoading(false);
  }

  const handleRateChange = (carTypeId: string, locationId: string, field: 'rate_12hr' | 'rate_24hr', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setPricingMatrix(prev => ({
      ...prev,
      [carTypeId]: {
        ...prev[carTypeId],
        [locationId]: {
          ...prev[carTypeId][locationId],
          [field]: numValue
        }
      }
    }));
  };

  const saveRates = async () => {
    setSaving(true);
    if (mode === 'cloud' && db) {
      try {
        const batch = writeBatch(db);
        
        for (const carTypeId in pricingMatrix) {
          for (const locationId in pricingMatrix[carTypeId]) {
            const rate = pricingMatrix[carTypeId][locationId];
            const id = `${carTypeId}_${locationId}`;
            const rateRef = doc(db, 'pricing_rates', id);
            
            batch.set(rateRef, {
              car_type_id: carTypeId,
              location_id: locationId,
              rate_12hr: rate.rate_12hr,
              rate_24hr: rate.rate_24hr,
              updated_at: serverTimestamp()
            }, { merge: true });
          }
        }
        
        await batch.commit();
        alert("Cloud Spreadsheet Update Successful!");
      } catch (err) {
        console.error("Error saving rates:", err);
        alert("Failed to save to cloud.");
      }
    } else {
      alert("Changes saved to local session. Cloud sync disabled.");
    }
    setSaving(false);
  };

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          <p className="text-slate-500 font-medium">Syncing Pricing Rules...</p>
        </div>
      );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">Rate Management</h1>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                 {mode === 'cloud' ? '● Sync Active' : '⚠ Local Rules'}
               </span>
            </div>
            <p className="text-slate-600">Configure vehicle rental rates per location.</p>
          </div>
          <button 
            onClick={saveRates}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
              saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 text-white'
            }`}
          >
            {saving ? 'Saving...' : 'Save Spreadsheet'}
          </button>
        </div>

        {mode === 'local' && (
           <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
           <div className="flex gap-4">
              <span className="text-2xl">📉</span>
              <div>
                 <h3 className="font-black text-amber-900 uppercase text-xs tracking-widest">Pricing Cloud Disconnected</h3>
                 <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                   Currently using static local rules. Rates changed here will <strong>not</strong> update the live booking form.
                 </p>
              </div>
           </div>
        </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Type</th>
                  {locations.map(loc => (
                    <th key={loc.id} className="p-6 text-center text-sm font-bold text-slate-900 min-w-[200px] border-l border-slate-200">
                      {loc.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carTypes.map(type => (
                  <tr key={type.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-6 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                      {type.name}
                    </td>
                    {locations.map(loc => {
                      const rate = pricingMatrix[type.id]?.[loc.id] || {};
                      return (
                        <td key={loc.id} className="p-4 border-l border-slate-100">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-slate-400 w-8">12H</span>
                               <input
                                  type="number"
                                  value={rate.rate_12hr || ''}
                                  onChange={(e) => handleRateChange(type.id, loc.id, 'rate_12hr', e.target.value)}
                                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-slate-400 w-8">24H</span>
                               <input
                                  type="number"
                                  value={rate.rate_24hr || ''}
                                  onChange={(e) => handleRateChange(type.id, loc.id, 'rate_24hr', e.target.value)}
                                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                                />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
