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
import { Location, PricingSheet, LocationLevel } from "@/lib/types";
import { normalizeSchedule, pickActiveSchedule, type PricingSchedule } from "@/lib/schedules";
import { titleFromId, resolveRatesForLocation } from "@/lib/pricing";
import { adminStore } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { LocationTree } from "@/components/ui/LocationTree";
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
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    if (db) {
      try {
        // Increase timeout to 15s and handle individual failures if needed
        const [locsSnap, sheetsSnap, levelsSnap, typesSnap] = await Promise.all([
          getDocs(collection(db, 'locations')),
          getDocs(collection(db, 'pricing_sheets')),
          getDocs(query(collection(db, 'levels'), orderBy('order', 'asc'))),
          getDocs(collection(db, 'car_types'))
        ]);
        
        const locs = locsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
        const sheets = sheetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingSheet));
        const levs = levelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LocationLevel));
        
        // Canonical list of car types: from car_types collection OR pricing_sheets IDs
        let types = typesSnap.docs.map(d => ({ id: d.id, name: d.data().name || titleFromId(d.id) } as CarTypeRow));
        
        if (types.length === 0) {
          // Fallback to pricing sheets IDs if car_types is empty
          types = sheets.map(s => ({ id: s.id, name: titleFromId(s.id) }));
        }

        if (types.length === 0) {
          // Final seed fallback to ensure the UI is functional
          types = [
            { id: 'economy', name: 'Economy' },
            { id: 'luxury', name: 'Luxury' },
            { id: 'suv', name: 'SUV' },
            { id: 'van', name: 'Van' }
          ];
        }

        // De-duplicate just in case
        const seen = new Set<string>();
        types = types.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        }).sort((a, b) => a.name.localeCompare(b.name));

        setCarTypes(types);
        setLocations(locs);
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
        if (locs.length > 0) {
          const defaultLoc = locs.find(l => l.id === 'default');
          setSelectedLocId(defaultLoc?.id || locs[0].id);
        }
        setLoading(false);
        return;
      } catch (err: any) {
        console.error("Pricing fetch failed:", err);
      }
    }

    setLoading(false);
  }

  const handleRateChange = (carTypeId: string, locationId: string, field: keyof RateCell, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setPricingMatrix(prev => ({
      ...prev,
      [carTypeId]: {
        ...prev[carTypeId],
        [locationId]: {
          ...prev[carTypeId][locationId] || { hourly: null, "12h": null, "24h": null },
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

  const locationsById = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l])), [locations]);
  
  const tree = useMemo(() => {
    const children: Record<string, string[]> = {};
    const roots: string[] = [];
    for (const l of locations) {
      const p = l.parentId;
      if (!p || !locationsById[p]) roots.push(l.id);
      else (children[p] ||= []).push(l.id);
    }
    return { children, roots };
  }, [locations, locationsById]);

  const treeNodes = useMemo(() => 
    locations.map(l => ({
      id: l.id,
      name: l.name,
      parentId: l.parentId,
      childCount: (tree.children[l.id] || []).length
    })), [locations, tree]);

  const treeById = useMemo(() => Object.fromEntries(treeNodes.map(n => [n.id, n])), [treeNodes]);

  const getInheritedRates = (carTypeId: string, locId: string) => {
    if (locId === 'default') return null;
    
    const cell = pricingMatrix[carTypeId]?.[locId];
    if (cell && (cell.hourly !== null || cell["12h"] !== null || cell["24h"] !== null)) return null;

    let current = locationsById[locId];
    while (current?.parentId) {
      const parentId = current.parentId;
      const pCell = pricingMatrix[carTypeId]?.[parentId];
      if (pCell && (pCell.hourly !== null || pCell["12h"] !== null || pCell["24h"] !== null)) {
        return { rates: pCell, from: locationsById[parentId]?.name || parentId };
      }
      current = locationsById[parentId];
    }

    const dCell = pricingMatrix[carTypeId]?.['default'];
    if (dCell && (dCell.hourly !== null || dCell["12h"] !== null || dCell["24h"] !== null)) {
      return { rates: dCell, from: 'Default' };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Loading pricing engine...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)] h-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 leading-tight">Rate Management</h1>
             <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">
               Hierarchical Active
             </span>
          </div>
          <p className="text-slate-600">Set direct rates or inherit from parent locations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">🔄</button>
          <button 
            onClick={saveRates}
            disabled={saving}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 flex flex-col gap-4 min-h-0 bg-white rounded-3xl-plus border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 shrink-0 bg-slate-900">
             <h2 className="text-xs font-black text-white uppercase tracking-widest mb-1">Select Context</h2>
             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Editing rates for the selected branch</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <LocationTree
              nodes={treeNodes}
              byId={treeById}
              children={tree.children}
              roots={tree.roots}
              selectedId={selectedLocId}
              onSelect={setSelectedLocId}
              onAddChild={() => {}}
              onEdit={() => {}}
              onChangeParent={() => {}}
            />
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col min-h-0 bg-white rounded-3xl-plus border border-slate-200 shadow-sm overflow-hidden">
          {selectedLocId ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-900">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {locationsById[selectedLocId]?.name} 
                    {selectedLocId === 'default' && <span className="ml-2 text-xs text-amber-400 bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-700 uppercase tracking-widest">Global Default</span>}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Rates for all vehicle categories</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Vehicle Class</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Hourly</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">12 Hours</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">24 Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {carTypes.map(type => {
                      const rate = pricingMatrix[type.id]?.[selectedLocId] || { hourly: null, "12h": null, "24h": null };
                      const inheritance = getInheritedRates(type.id, selectedLocId);
                      const isInherited = !!inheritance;

                      return (
                        <tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-sm tracking-tight">{type.name}</span>
                              {isInherited ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <ArrowUp size={10} className="text-blue-500" />
                                  <span className="text-[9px] font-bold text-blue-600 uppercase">Inherited from {inheritance.from}</span>
                                </div>
                              ) : selectedLocId !== 'default' ? (
                                <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1">Direct Rate</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rate.hourly ?? ''}
                              placeholder={isInherited ? String(inheritance.rates.hourly || '0') : '0'}
                              onChange={(e) => handleRateChange(type.id, selectedLocId, 'hourly', e.target.value)}
                              className={`w-24 px-3 py-2 rounded-xl border text-sm font-bold transition-all outline-none ${
                                isInherited 
                                  ? 'bg-slate-50 border-slate-100 text-slate-400 placeholder:text-slate-400' 
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rate["12h"] ?? ''}
                              placeholder={isInherited ? String(inheritance.rates["12h"] || '0') : '0'}
                              onChange={(e) => handleRateChange(type.id, selectedLocId, '12h', e.target.value)}
                              className={`w-24 px-3 py-2 rounded-xl border text-sm font-bold transition-all outline-none ${
                                isInherited 
                                  ? 'bg-slate-50 border-slate-100 text-slate-400 placeholder:text-slate-400' 
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rate["24h"] ?? ''}
                              placeholder={isInherited ? String(inheritance.rates["24h"] || '0') : '0'}
                              onChange={(e) => handleRateChange(type.id, selectedLocId, '24h', e.target.value)}
                              className={`w-24 px-3 py-2 rounded-xl border text-sm font-bold transition-all outline-none ${
                                isInherited 
                                  ? 'bg-slate-50 border-slate-100 text-slate-400 placeholder:text-slate-400' 
                                  : 'bg-white border-slate-200 text-slate-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-slate-900 text-white shrink-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0">
                    <Info size={20} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-1">Inheritance System</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      To revert to an inherited rate, simply clear the input field. The system will automatically walk up the parent chain to find the next available rate, eventually falling back to the Global Default.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                 <span className="text-4xl text-slate-300">💰</span>
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Select a Context</h3>
               <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                 Choose a location from the hierarchy to view and manage its specific rental rates.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
