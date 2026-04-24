'use client';

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { withTimeout } from "@/lib/api-utils";
import { overlaps, normalizeSchedule, type PricingSchedule } from "@/lib/schedules";
import { SearchableDropdown, DropdownOption } from "@/components/ui/SearchableDropdown";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { Calendar, List, Plus, Zap, AlertCircle, ChevronLeft, ChevronRight, X, Edit3, Trash2 } from "lucide-react";
import { titleFromId } from "@/lib/pricing";

type FormState = {
  name: string;
  enabled: boolean;
  priority: number;
  scopeKind: "all" | "carType" | "carModel";
  carTypeIds: string[];
  carModelIds: string[];
  locationIds: string[];
  levelIds: string[];
  startAt: string; // yyyy-mm-dd
  endAt: string; // yyyy-mm-dd
  adjustmentKind: "flat" | "percent";
  adjustmentValue: string;
};

function toIsoDateInput(d: Date | null | undefined) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PricingSchedulesPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [schedules, setSchedules] = useState<PricingSchedule[]>([]);
  const [carTypes, setCarTypes] = useState<{id: string, name: string}[]>([]);
  const [carModels, setCarModels] = useState<{id: string, name: string}[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string, parentId?: string}[]>([]);
  const [levels, setLevels] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const [form, setForm] = useState<FormState>({
    name: "",
    enabled: true,
    priority: 0,
    scopeKind: "all",
    carTypeIds: [],
    carModelIds: [],
    locationIds: [],
    levelIds: [],
    startAt: "",
    endAt: "",
    adjustmentKind: "percent",
    adjustmentValue: "10"
  });

  async function refresh() {
    setLoading(true);
    setWarning(null);

    if (!db) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    try {
      const [schedSnap, sheetsSnap, vehiclesSnap, locSnap, levelsSnap] = await Promise.all([
        withTimeout(getDocs(collection(db, "pricing_schedules")), 8000),
        getDocs(collection(db, "pricing_sheets")),
        getDocs(collection(db, "vehicles")),
        getDocs(collection(db, "locations")),
        getDocs(query(collection(db, "levels"), orderBy("order", "asc")))
      ]);

      const scheds = schedSnap.docs.map((d) => normalizeSchedule({ id: d.id, ...d.data() }));
      const types = sheetsSnap.docs.map(d => ({ id: d.id, name: titleFromId(d.id) }));
      const models = vehiclesSnap.docs.map(d => ({ id: d.id, name: `${d.data().make} ${d.data().model}` }));
      const locs = locSnap.docs.map(d => ({ id: d.id, name: d.data().name, parentId: d.data().parentId }));
      const levs = levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

      setSchedules(scheds);
      setCarTypes(types);
      setCarModels(models);
      setLocations(locs);
      setLevels(levs);
      
      if (highlightId) {
        const target = scheds.find(s => s.id === highlightId);
        if (target) onEdit(target);
      }
    } catch (e: any) {
      console.error(e);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    let list = [...schedules];
    
    // Apply filters
    if (activeFilters.carType) {
      const ids = activeFilters.carType as string[];
      list = list.filter(s => s.scope.kind === 'carType' && s.scope.carTypeIds.some(id => ids.includes(id)));
    }
    if (activeFilters.location) {
      const ids = activeFilters.location as string[];
      list = list.filter(s => s.locationIds?.some(id => ids.includes(id)));
    }
    if (activeFilters.level) {
      const ids = activeFilters.level as string[];
      list = list.filter(s => s.levelIds?.some(id => ids.includes(id)));
    }

    return list.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const at = a.createdAt?.getTime() ?? 0;
      const bt = b.createdAt?.getTime() ?? 0;
      return bt - at;
    });
  }, [schedules, activeFilters]);

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
    },
    {
      key: 'level',
      label: 'Level',
      multiSelect: true,
      options: levels.map(l => ({ value: l.id, label: l.name }))
    }
  ];

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      enabled: true,
      priority: 0,
      scopeKind: "all",
      carTypeIds: [],
      carModelIds: [],
      locationIds: [],
      levelIds: [],
      startAt: "",
      endAt: "",
      adjustmentKind: "percent",
      adjustmentValue: "10"
    });
    setWarning(null);
  }

  function toScheduleDraft(): Omit<PricingSchedule, "id"> {
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

    return {
      name: form.name.trim() || "Schedule",
      enabled: form.enabled,
      priority: Number(form.priority || 0),
      scope,
      locationIds: form.locationIds.length > 0 ? form.locationIds : undefined,
      levelIds: form.levelIds.length > 0 ? form.levelIds : undefined,
      startAt,
      endAt,
      adjustment,
      createdAt: null,
      updatedAt: null
    };
  }

  function overlapWarning(draft: Omit<PricingSchedule, "id">) {
    const probe: PricingSchedule = { ...draft, id: "draft" };
    const overlapped = schedules.filter((s) => s.id !== editingId && overlaps(s, probe));
    if (overlapped.length === 0) return null;
    return `Warning: overlaps with ${overlapped.length} existing schedule(s).`;
  }

  async function onSave() {
    if (!db) return;
    if (!form.name.trim()) { alert("Please enter a name."); return; }
    if (form.scopeKind === "carType" && form.carTypeIds.length === 0) { alert("Please select at least one car type."); return; }
    if (form.scopeKind === "carModel" && form.carModelIds.length === 0) { alert("Please select at least one car model."); return; }

    setSaving(true);
    setWarning(null);
    try {
      const draft = toScheduleDraft();
      const w = overlapWarning(draft);
      if (w) setWarning(w);

      const payload: any = {
        name: draft.name,
        enabled: draft.enabled,
        priority: draft.priority,
        scope: draft.scope,
        locationIds: draft.locationIds ?? [],
        levelIds: draft.levelIds ?? [],
        startAt: draft.startAt ?? null,
        endAt: draft.endAt ?? null,
        adjustment: draft.adjustment
      };

      if (editingId) {
        await updateDoc(doc(db, "pricing_schedules", editingId), {
          ...payload,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "pricing_schedules"), {
          ...payload,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }

      await refresh();
      resetForm();
    } catch (e: any) {
      console.error(e);
      alert("Failed to save schedule: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!db) return;
    if (!confirm("Delete this schedule?")) return;
    try {
      await deleteDoc(doc(db, "pricing_schedules", id));
      await refresh();
    } catch (e: any) {
      console.error(e);
      alert("Failed to delete schedule: " + (e?.message ?? "unknown error"));
    }
  }

  function onEdit(s: PricingSchedule) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      enabled: s.enabled,
      priority: s.priority,
      scopeKind: s.scope.kind,
      carTypeIds: s.scope.kind === "carType" ? s.scope.carTypeIds : [],
      carModelIds: s.scope.kind === "carModel" ? s.scope.carModelIds : [],
      locationIds: s.locationIds ?? [],
      levelIds: s.levelIds ?? [],
      startAt: toIsoDateInput(s.startAt),
      endAt: toIsoDateInput(s.endAt),
      adjustmentKind: s.adjustment.kind,
      adjustmentValue:
        s.adjustment.kind === "flat"
          ? String(s.adjustment.amount)
          : String(s.adjustment.percent)
    });
    setWarning(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Dropdown Options
  const carTypeOptions = useMemo(() => carTypes.map(t => ({ value: t.id, label: t.name })), [carTypes]);
  const carModelOptions = useMemo(() => carModels.map(m => ({ value: m.id, label: m.name })), [carModels]);
  const levelOptions = useMemo(() => levels.map(l => ({ value: l.id, label: l.name })), [levels]);
  
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

  // Calendar Logic
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarDays = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days = [];
    
    // Padding for start
    for (let i = 0; i < start.getDay(); i++) {
      days.push({ day: null });
    }
    
    for (let i = 1; i <= end.getDate(); i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const activeSchedules = schedules.filter(s => {
        if (!s.enabled) return false;
        const sStart = s.startAt ? new Date(s.startAt.setHours(0,0,0,0)) : new Date(2000,0,1);
        const sEnd = s.endAt ? new Date(s.endAt.setHours(23,59,59,999)) : new Date(2100,0,1);
        return date >= sStart && date <= sEnd;
      });
      days.push({ day: i, date, schedules: activeSchedules });
    }
    return days;
  }, [currentDate, schedules]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Loading schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Pricing Schedules</h1>
          <p className="text-slate-600">Dynamic adjustments for peak seasons, promos, or specific locations.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
          <button onClick={resetForm} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>
      </div>

      {/* Form Section */}
      {(editingId || form.name || form.carTypeIds.length > 0 || form.carModelIds.length > 0) && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingId ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {editingId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <h2 className="text-xl font-black text-slate-900">{editingId ? "Edit Schedule" : "Create New Schedule"}</h2>
            </div>
            <div className="flex items-center gap-3">
              {warning && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {warning}
                </div>
              )}
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Schedule Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold"
                placeholder="e.g. Christmas Peak 2026, Weekend Promo..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setForm(p => ({ ...p, enabled: true }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${form.enabled ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Enabled
                </button>
                <button 
                  onClick={() => setForm(p => ({ ...p, enabled: false }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!form.enabled ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Disabled
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value || 0) }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Higher priority overrides lower ones.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Target Scope</label>
              <select
                value={form.scopeKind}
                onChange={(e) => setForm((p) => ({ ...p, scopeKind: e.target.value as any }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none"
              >
                <option value="all">All Vehicles</option>
                <option value="carType">Specific Car Types</option>
                <option value="carModel">Specific Car Models</option>
              </select>
            </div>

            {form.scopeKind === "carType" && (
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-slate-700 mb-2">Car Types</label>
                <SearchableDropdown
                  multiSelect
                  options={carTypeOptions}
                  value={form.carTypeIds}
                  onChange={(v) => setForm(p => ({ ...p, carTypeIds: v as string[] }))}
                  placeholder="Select vehicle categories..."
                />
              </div>
            )}

            {form.scopeKind === "carModel" && (
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-slate-700 mb-2">Car Models</label>
                <SearchableDropdown
                  multiSelect
                  options={carModelOptions}
                  value={form.carModelIds}
                  onChange={(v) => setForm(p => ({ ...p, carModelIds: v as string[] }))}
                  placeholder="Select specific models..."
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Locations (Optional)</label>
              <SearchableDropdown
                multiSelect
                options={locationOptions}
                value={form.locationIds}
                onChange={(v) => setForm(p => ({ ...p, locationIds: v as string[] }))}
                placeholder="Apply only to these areas..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Levels (Optional)</label>
              <SearchableDropdown
                multiSelect
                options={levelOptions}
                value={form.levelIds}
                onChange={(v) => setForm(p => ({ ...p, levelIds: v as string[] }))}
                placeholder="Apply to all locations in these levels..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={form.startAt}
                onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={form.endAt}
                onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Price Adjustment</label>
              <div className="flex gap-2">
                <select
                  value={form.adjustmentKind}
                  onChange={(e) => setForm((p) => ({ ...p, adjustmentKind: e.target.value as any }))}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (₱)</option>
                </select>
                <input
                  type="number"
                  value={form.adjustmentValue}
                  onChange={(e) => setForm((p) => ({ ...p, adjustmentValue: e.target.value }))}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-green-500"
                  placeholder={form.adjustmentKind === "percent" ? "10" : "500"}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Use negative numbers for discounts (e.g. -15%).</p>
            </div>

            <div className="md:col-span-4 flex justify-end pt-4">
              <button
                onClick={onSave}
                disabled={saving}
                className={`px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:scale-105 active:scale-95 ${saving ? "bg-slate-300 text-slate-600" : "bg-green-700 text-white hover:bg-green-800"}`}
              >
                {saving ? "Saving Changes..." : editingId ? "Update Schedule" : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'table' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  {sorted.length} schedules found
                </span>
             </div>
             <FilterDropdown
                filters={filterConfigs}
                onApply={(filters) => setActiveFilters(filters)}
             />
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Schedule</th>
                    <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Scope</th>
                    <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Active Period</th>
                    <th className="p-6 text-left text-xs font-black uppercase text-slate-500 tracking-wider">Adjustment</th>
                    <th className="p-6 text-right text-xs font-black uppercase text-slate-500 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const isHighlighted = s.id === highlightId;
                    return (
                      <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-all ${isHighlighted ? 'bg-amber-50 ring-2 ring-amber-200 ring-inset' : ''}`}>
                        <td className="p-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {s.enabled ? "Active" : "Paused"}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">PRIORITY {s.priority}</span>
                          </div>
                          <p className="font-black text-slate-900 text-lg">{s.name}</p>
                          {(s.locationIds?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.locationIds?.map(lid => (
                                <span key={lid} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{locations.find(l => l.id === lid)?.name || lid}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          {s.scope.kind === "all" && <span className="text-sm font-bold text-slate-800">Global (All Vehicles)</span>}
                          {s.scope.kind === "carType" && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Categories</span>
                              <div className="flex flex-wrap gap-1">
                                {s.scope.carTypeIds.map(tid => (
                                  <span key={tid} className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{titleFromId(tid)}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {s.scope.kind === "carModel" && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Specific Models</span>
                              <div className="flex flex-wrap gap-1">
                                {s.scope.carModelIds.map(mid => (
                                  <span key={mid} className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{carModels.find(m => m.id === mid)?.name || mid}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-xs font-bold text-slate-700">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 inline-block">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 w-10 uppercase tracking-tighter">Start</span>
                              <span>{s.startAt ? s.startAt.toLocaleDateString() : "Anytime"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 w-10 uppercase tracking-tighter">End</span>
                              <span>{s.endAt ? s.endAt.toLocaleDateString() : "Indefinite"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className={`inline-flex flex-col p-3 rounded-2xl border ${s.adjustment.percent && s.adjustment.percent > 0 ? 'bg-orange-50 border-orange-200' : s.adjustment.percent && s.adjustment.percent < 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-[9px] font-black uppercase text-slate-400 mb-1">Adjustment</span>
                            <span className={`text-xl font-black ${s.adjustment.percent && s.adjustment.percent > 0 ? 'text-orange-700' : s.adjustment.percent && s.adjustment.percent < 0 ? 'text-green-700' : 'text-slate-900'}`}>
                              {s.adjustment.kind === "flat" ? `₱${s.adjustment.amount.toLocaleString()}` : `${s.adjustment.percent}%`}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => onEdit(s)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(s.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td className="p-20 text-center" colSpan={5}>
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                              <List className="w-10 h-10 text-slate-200" />
                           </div>
                           <div>
                              <p className="text-slate-900 font-black text-xl">No schedules found</p>
                              <p className="text-slate-500 font-medium">Try clearing filters or create a new schedule.</p>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h3 className="text-xl font-black text-slate-900 min-w-[200px] text-center">{monthName}</h3>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
             </div>
             <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Today
              </button>
          </div>

          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-black text-slate-400 tracking-widest">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((d, i) => (
              <div key={i} className={`min-h-[140px] p-2 border-b border-r border-slate-100 transition-colors ${d.day === null ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}>
                {d.day && (
                  <div className="flex flex-col h-full">
                    <span className={`text-xs font-bold mb-2 ${d.date?.toDateString() === new Date().toDateString() ? 'w-6 h-6 flex items-center justify-center bg-green-700 text-white rounded-full' : 'text-slate-400'}`}>
                      {d.day}
                    </span>
                    <div className="space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                      {d.schedules?.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => onEdit(s)}
                          className={`px-2 py-1 rounded text-[9px] font-black truncate cursor-pointer transition-all hover:scale-105 ${s.adjustment.percent && s.adjustment.percent > 0 ? 'bg-orange-100 text-orange-800' : s.adjustment.percent && s.adjustment.percent < 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          <div className="flex items-center gap-1">
                            <Zap className="w-2 h-2" />
                            {s.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Pro-Tips for Scheduling
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stacking Rules</p>
            <p className="text-xs text-slate-600 leading-relaxed">Schedules do <strong>not</strong> stack. If multiple apply, the system picks the one with highest priority.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Coverage</p>
            <p className="text-xs text-slate-600 leading-relaxed">Scope: All Vehicles + No Locations = System-wide adjustment (e.g. general price increase).</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level Scoping</p>
            <p className="text-xs text-slate-600 leading-relaxed">Selecting a Level (e.g. City) automatically applies to all locations marked as that level.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Highlighting</p>
            <p className="text-xs text-slate-600 leading-relaxed">Navigating from the Rate Spreadsheet will automatically highlight and open the active schedule for editing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
