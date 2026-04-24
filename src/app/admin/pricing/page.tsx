'use client';
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { Location, PricingSheet, PricingSchedule, LocationLevel } from "@/lib/types";
import { titleFromId, resolveRatesForLocation } from "@/lib/pricing";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { Zap, ArrowUp, Info } from "lucide-react";
import Link from "next/link";

type CarTypeRow = { id: string; name: string };
type RateCell = { 
  "hourly": number | null;
  "12h": number | null; 
  "24h": number | null;
};

export default function PricingManagementPage() {
  const [carTypes, setCarTypes] = useState<CarTypeRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [levels, setLevels] = useState<LocationLevel[]>([]);
  const [pricingMatrix, setPricingMatrix] = useState<Record<string, Record<string, RateCell>>>({});
  const [schedules, setSchedules] = useState<PricingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    if (db) {
      try {
        const [locsSnap, sheetsSnap, schedSnap, levelsSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'locations')),
            getDocs(collection(db, 'pricing_sheets')),
            getDocs(collection(db, 'pricing_schedules')),
            getDocs(query(collection(db, 'levels'), orderBy('order', 'asc')))
          ]), 
          8000
        );
        
        const locs = locsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
        const sheets = sheetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingSheet));
        const scheds = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingSchedule));
        const levs = levelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LocationLevel));

        const types: CarTypeRow[] = sheets
          .map(s => ({ id: s.id, name: titleFromId(s.id) }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCarTypes(types);
        setLocations(locs);
        setSchedules(scheds);
        setLevels(levs);

        const matrix: Record<string, Record<string, RateCell>> = {};
        for (const t of types) {
          const sheet = sheets.find(s => s.id === t.id);
          matrix[t.id] = {};
          for (const l of locs) {
            const cell = sheet?.rates?.[l.id];
            matrix[t.id][l.id] = {
              "hourly": typeof cell?.["hourly"] === "number" ? cell["hourly"] : null,
              "12h": typeof cell?.["12h"] === "number" ? cell["12h"] : null,
              "24h": typeof cell?.["24h"] === "number" ? cell["24h"] : null
            };
          }
        }
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
    const mockTypes: CarTypeRow[] = [
      { id: 'economy', name: 'Economy' }, 
      { id: 'suv', name: 'SUV' }
    ];

    setCarTypes(mockTypes);
    setLocations(mockLocs);

    const matrix: Record<string, Record<string, RateCell>> = {};
    mockTypes.forEach(t => {
      matrix[t.id] = {};
      mockLocs.forEach(l => {
        const rule = localRules.find(r => r.category === t.id);
        matrix[t.id][l.id] = {
          "hourly": rule?.valueType === 'fixed' ? Math.round(rule.value / 10) : 150,
          "12h": rule?.valueType === 'fixed' ? rule.value * 0.6 : 1500,
          "24h": rule?.valueType === 'fixed' ? rule.value : 2500
        };
      });
    });
    setPricingMatrix(matrix);
    setMode('local');
    setLoading(false);
  }

  const handleRateChange = (carTypeId: string, locationId: string, field: keyof RateCell, value: string) => {
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
          const rates: Record<string, RateCell> = pricingMatrix[carTypeId];
          const sheetRef = doc(db, 'pricing_sheets', carTypeId);
          batch.set(
            sheetRef,
            {
              rates,
              updated_at: serverTimestamp()
            },
            { merge: true }
          );
        }
        
        await batch.commit();
        alert("Pricing sheets updated successfully!");
      } catch (err) {
        console.error("Error saving rates:", err);
        alert("Failed to save to cloud.");
      }
    } else {
      alert("Changes saved to local session. Cloud sync disabled.");
    }
    setSaving(false);
  };

  // Filtering
  const filteredCarTypes = useMemo(() => {
    const filter = activeFilters.carType as string[];
    if (!filter || filter.length === 0) return carTypes;
    return carTypes.filter(t => filter.includes(t.id));
  }, [carTypes, activeFilters]);

  const filteredLocations = useMemo(() => {
    const filter = activeFilters.location as string[];
    if (!filter || filter.length === 0) return locations;
    return locations.filter(l => filter.includes(l.id));
  }, [locations, activeFilters]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'carType',
      label: 'Car Type',
      multiSelect: true,
      options: carTypes.map(t => ({ value: t.id, label: t.name }))
    },
    {
      key: 'location',
      label: 'Location',
      multiSelect: true,
      options: locations.map(l => ({ value: l.id, label: l.name }))
    }
  ];

  // Logic to determine if a cell inherits from parent
  const getInheritance = (carTypeId: string, locationId: string) => {
    if (locationId === 'default') return null;
    
    // Check if current cell has values
    const cell = pricingMatrix[carTypeId]?.[locationId];
    if (cell && (cell["hourly"] !== null || cell["12h"] !== null || cell["24h"] !== null)) {
      return null; // Has explicit value
    }

    // Walk up the parent chain to find who it inherits from
    let currentLoc = locations.find(l => l.id === locationId);
    while (currentLoc && currentLoc.parentId) {
      const parentId = currentLoc.parentId;
      const parentCell = pricingMatrix[carTypeId]?.[parentId];
      if (parentCell && (parentCell["hourly"] !== null || parentCell["12h"] !== null || parentCell["24h"] !== null)) {
        return locations.find(l => l.id === parentId)?.name || parentId;
      }
      currentLoc = locations.find(l => l.id === parentId);
    }
    
    // Check default
    const defaultCell = pricingMatrix[carTypeId]?.['default'];
    if (defaultCell && (defaultCell["hourly"] !== null || defaultCell["12h"] !== null || defaultCell["24h"] !== null)) {
      return 'Default';
    }

    return null;
  };

  // Logic to find active schedule for a cell
  const getActiveSchedule = (carTypeId: string, locationId: string) => {
    const now = new Date();
    const active = schedules.filter(s => {
      // Basic scope check
      if (s.scope === 'car_type' && s.carTypeId !== carTypeId) return false;
      // Location check
      if (s.locationId && s.locationId !== locationId) return false;
      
      // Date range check
      const start = s.startDate.toDate();
      const end = s.endDate.toDate();
      return now >= start && now <= end;
    });

    if (active.length === 0) return null;
    // Return the one with highest priority (most specific location or latest updated)
    return active.sort((a, b) => (b.updated_at?.seconds || 0) - (a.updated_at?.seconds || 0))[0];
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 leading-tight">Rate Spreadsheet</h1>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {mode === 'cloud' ? '● Sync Active' : '⚠ Local Rules'}
             </span>
          </div>
          <p className="text-slate-600">Unified view of all vehicle rental rates across locations.</p>
        </div>
        <div className="flex gap-3">
          <FilterDropdown
            filters={filterConfigs}
            onApply={(filters) => setActiveFilters(filters)}
          >
            {() => (
              <button 
                onClick={saveRates}
                disabled={saving}
                className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                  saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save Spreadsheet'}
              </button>
            )}
          </FilterDropdown>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider sticky left-0 bg-slate-50 z-20 w-48 shadow-[1px_0_0_0_#e2e8f0]">Vehicle Type</th>
                {filteredLocations.map(loc => (
                  <th key={loc.id} className="p-6 text-center text-sm font-bold text-slate-900 min-w-[240px] border-l border-slate-200">
                    <div className="flex flex-col items-center">
                      <span>{loc.name}</span>
                      {loc.id === 'default' && (
                        <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mt-1">Fallback</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCarTypes.map(type => (
                <tr key={type.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                  <td className="p-6 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Standard Class</span>
                    </div>
                  </td>
                  {filteredLocations.map(loc => {
                    const rate = pricingMatrix[type.id]?.[loc.id] || { hourly: null, "12h": null, "24h": null };
                    const inheritedFrom = getInheritance(type.id, loc.id);
                    const activeSchedule = getActiveSchedule(type.id, loc.id);

                    return (
                      <td key={loc.id} className="p-4 border-l border-slate-100">
                        <div className="relative space-y-2 group">
                          {inheritedFrom && !activeSchedule && (
                            <div className="absolute inset-0 bg-slate-50/80 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 z-5 opacity-100 group-hover:opacity-0 transition-opacity">
                              <ArrowUp className="w-4 h-4 text-slate-300 mb-1" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Inherits from</span>
                              <span className="text-[10px] font-black text-slate-500">{inheritedFrom}</span>
                            </div>
                          )}

                          {activeSchedule && (
                            <div className="mb-2">
                              <Link 
                                href={`/admin/pricing/schedules?highlight=${activeSchedule.id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[9px] font-black uppercase tracking-wider hover:bg-amber-200 transition-colors"
                              >
                                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Active Schedule
                              </Link>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-400 w-8">HOUR</span>
                               <div className="relative flex-1">
                                 <input
                                    type="number"
                                    value={rate["hourly"] ?? ''}
                                    placeholder={inheritedFrom ? "—" : "0"}
                                    onChange={(e) => handleRateChange(type.id, loc.id, 'hourly', e.target.value)}
                                    className="w-full pl-2 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 outline-none font-bold"
                                  />
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-400 w-8">12H</span>
                               <div className="relative flex-1">
                                 <input
                                    type="number"
                                    value={rate["12h"] ?? ''}
                                    placeholder={inheritedFrom ? "—" : "0"}
                                    onChange={(e) => handleRateChange(type.id, loc.id, '12h', e.target.value)}
                                    className="w-full pl-2 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 outline-none font-bold"
                                  />
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-400 w-8">24H</span>
                               <div className="relative flex-1">
                                 <input
                                    type="number"
                                    value={rate["24h"] ?? ''}
                                    placeholder={inheritedFrom ? "—" : "0"}
                                    onChange={(e) => handleRateChange(type.id, loc.id, '24h', e.target.value)}
                                    className="w-full pl-2 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 outline-none font-bold"
                                  />
                               </div>
                            </div>
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

      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Info className="w-32 h-32" />
        </div>
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-green-400" />
          Pricing Hierarchy Logic
        </h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-300">
          <div className="space-y-2">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest text-green-400">1. Specific Location</p>
            <p>System first checks the exact location selected by the user. If rates are defined here, they are used.</p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest text-blue-400">2. Parent Chain</p>
            <p>If no rates are found, it walks up the tree (e.g. City → Region → Main Office) until it finds a rate.</p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest text-amber-400">3. Global Default</p>
            <p>If the entire parent chain is empty, it uses the "Default" column as the final fallback.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
