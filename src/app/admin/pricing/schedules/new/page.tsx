'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { ChevronLeft, Save, Plus, AlertCircle, Info, Zap } from "lucide-react";
import { SearchableDropdown, DropdownOption } from "@/components/ui/SearchableDropdown";
import { titleFromId } from "@/lib/pricing";

export default function NewPricingSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data for dropdowns
  const [carTypes, setCarTypes] = useState<{id: string, name: string}[]>([]);
  const [carModels, setCarModels] = useState<{id: string, name: string}[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string, parentId?: string}[]>([]);
  const [levels, setLevels] = useState<{id: string, name: string}[]>([]);

  // Form State
  const [form, setForm] = useState({
    name: "",
    enabled: true,
    priority: 0,
    scopeKind: "all" as "all" | "carType" | "carModel",
    carTypeIds: [] as string[],
    carModelIds: [] as string[],
    locationIds: [] as string[],
    levelIds: [] as string[],
    startAt: "",
    endAt: "",
    adjustmentKind: "percent" as "flat" | "percent",
    adjustmentValue: "10"
  });

  useEffect(() => {
    async function fetchData() {
      if (!db) return;
      try {
        const [sheetsSnap, vehiclesSnap, locSnap, levelsSnap] = await Promise.all([
          getDocs(collection(db, "pricing_sheets")),
          getDocs(collection(db, "vehicles")),
          getDocs(collection(db, "locations")),
          getDocs(query(collection(db, "levels"), orderBy("order", "asc")))
        ]);

        setCarTypes(sheetsSnap.docs.map(d => ({ id: d.id, name: titleFromId(d.id) })));
        setCarModels(vehiclesSnap.docs.map(d => ({ id: d.id, name: `${d.data().make} ${d.data().model}` })));
        setLocations(locSnap.docs.map(d => ({ id: d.id, name: d.data().name, parentId: d.data().parentId })));
        setLevels(levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const locationOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [];
    const roots = locations.filter(l => !l.parentId);
    const byParent = locations.reduce((acc, l) => {
      if (l.parentId) (acc[l.parentId] ||= []).push(l);
      return acc;
    }, {} as Record<string, typeof locations>);

    function walk(id: string, depth: number) {
      const loc = locations.find(l => l.id === id);
      if (!loc) return;
      list.push({ value: loc.id, label: loc.name, depth });
      (byParent[id] || []).forEach(c => walk(c.id, depth + 1));
    }
    roots.forEach(r => walk(r.id, 0));
    return list;
  }, [locations]);

  const onSave = async () => {
    if (!db) return;
    if (!form.name.trim()) { alert("Please enter a name."); return; }
    
    setSaving(true);
    try {
      const startAt = form.startAt ? new Date(`${form.startAt}T00:00:00`) : null;
      const endAt = form.endAt ? new Date(`${form.endAt}T23:59:59`) : null;

      const scope =
        form.scopeKind === "all"
          ? { kind: "all" as const }
          : form.scopeKind === "carType"
            ? { kind: "carType" as const, carTypeIds: form.carTypeIds }
            : { kind: "carModel" as const, carModelIds: form.carModelIds };

      const adjustment =
        form.adjustmentKind === "flat"
          ? { kind: "flat" as const, amount: Number(form.adjustmentValue || 0) }
          : { kind: "percent" as const, percent: Number(form.adjustmentValue || 0) };

      await addDoc(collection(db, "pricing_schedules"), {
        name: form.name,
        enabled: form.enabled,
        priority: Number(form.priority),
        scope,
        locationIds: form.locationIds,
        levelIds: form.levelIds,
        startAt,
        endAt,
        adjustment,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      router.push("/admin/pricing/schedules");
    } catch (e) {
      console.error(e);
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Preparing Interface...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
              <ChevronLeft size={24} />
           </button>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">+ New Schedule</h1>
              <p className="text-slate-500 font-medium">Create a new price adjustment rule.</p>
           </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Creating...' : 'Save Schedule'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
             <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Info size={16} /> Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Schedule Name</label>
                      <input 
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Christmas Peak 2026"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Priority Level</label>
                      <input 
                        type="number"
                        value={form.priority}
                        onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none transition-all"
                      />
                   </div>
                   <div className="flex flex-col justify-end">
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                         <button 
                           onClick={() => setForm(p => ({ ...p, enabled: true }))}
                           className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.enabled ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400'}`}
                         >
                           Enabled
                         </button>
                         <button 
                           onClick={() => setForm(p => ({ ...p, enabled: false }))}
                           className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!form.enabled ? 'bg-white text-red-700 shadow-sm' : 'text-slate-400'}`}
                         >
                           Disabled
                         </button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="pt-8 border-t border-slate-50 space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Zap size={16} /> Scope & Targeting
                </h3>
                <div className="space-y-6">
                   <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Target Vehicles</label>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(['all', 'carType', 'carModel'] as const).map(k => (
                          <button 
                            key={k}
                            onClick={() => setForm(p => ({ ...p, scopeKind: k }))}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.scopeKind === k ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {k === 'all' ? 'Entire Fleet' : k === 'carType' ? 'By Category' : 'Specific Models'}
                          </button>
                        ))}
                      </div>
                      
                      {form.scopeKind === 'carType' && (
                        <SearchableDropdown 
                          multiSelect
                          options={carTypes.map(t => ({ value: t.id, label: t.name }))}
                          value={form.carTypeIds}
                          onChange={v => setForm(p => ({ ...p, carTypeIds: v as string[] }))}
                          placeholder="Select car types..."
                        />
                      )}
                      {form.scopeKind === 'carModel' && (
                        <SearchableDropdown 
                          multiSelect
                          options={carModels.map(m => ({ value: m.id, label: m.name }))}
                          value={form.carModelIds}
                          onChange={v => setForm(p => ({ ...p, carModelIds: v as string[] }))}
                          placeholder="Select car models..."
                        />
                      )}
                   </div>

                   <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Target Locations</label>
                        <SearchableDropdown 
                          multiSelect
                          options={locationOptions}
                          value={form.locationIds}
                          onChange={v => setForm(p => ({ ...p, locationIds: v as string[] }))}
                          placeholder="All Locations"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Location Levels</label>
                        <SearchableDropdown 
                          multiSelect
                          options={levels.map(l => ({ value: l.id, label: l.name }))}
                          value={form.levelIds}
                          onChange={v => setForm(p => ({ ...p, levelIds: v as string[] }))}
                          placeholder="All Levels"
                        />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Effective From</label>
                    <input 
                      type="date"
                      value={form.startAt}
                      onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Until</label>
                    <input 
                      type="date"
                      value={form.endAt}
                      onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                    />
                 </div>
              </div>
           </div>

           <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Price Adjustment</h3>
              <div className="space-y-4">
                 <div className="flex bg-white/5 p-1.5 rounded-2xl">
                   <button 
                     onClick={() => setForm(p => ({ ...p, adjustmentKind: 'percent' }))}
                     className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.adjustmentKind === 'percent' ? 'bg-white text-slate-950' : 'text-white/40'}`}
                   >
                     Percent (%)
                   </button>
                   <button 
                     onClick={() => setForm(p => ({ ...p, adjustmentKind: 'flat' }))}
                     className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.adjustmentKind === 'flat' ? 'bg-white text-slate-950' : 'text-white/40'}`}
                   >
                     Flat (₱)
                   </button>
                 </div>
                 <input 
                   type="number"
                   value={form.adjustmentValue}
                   onChange={e => setForm(p => ({ ...p, adjustmentValue: e.target.value }))}
                   className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-3xl text-center text-white outline-none focus:border-white/30 transition-all"
                   placeholder="10"
                 />
                 <p className="text-[10px] text-white/40 font-bold text-center leading-relaxed">
                   Enter positive numbers for price hikes (Peak Season)<br />
                   Enter negative numbers for discounts (Promo)
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
