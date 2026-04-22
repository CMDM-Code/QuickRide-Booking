'use client';

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { withTimeout } from "@/lib/api-utils";
import { overlaps, normalizeSchedule, type PricingSchedule } from "@/lib/schedules";

type FormState = {
  name: string;
  enabled: boolean;
  priority: number;
  scopeKind: "all" | "carType" | "carModel";
  scopeId: string;
  locationIdsText: string; // comma-separated
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

function parseLocations(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PricingSchedulesPage() {
  const [schedules, setSchedules] = useState<PricingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    enabled: true,
    priority: 0,
    scopeKind: "all",
    scopeId: "",
    locationIdsText: "",
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
      const snap = await withTimeout(getDocs(collection(db, "pricing_schedules")), 8000);
      const data = snap.docs.map((d) => normalizeSchedule({ id: d.id, ...d.data() }));
      setSchedules(data);
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
    return [...schedules].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const at = a.createdAt?.getTime() ?? 0;
      const bt = b.createdAt?.getTime() ?? 0;
      return bt - at;
    });
  }, [schedules]);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      enabled: true,
      priority: 0,
      scopeKind: "all",
      scopeId: "",
      locationIdsText: "",
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
          ? { kind: "carType" as const, carTypeId: form.scopeId.trim() }
          : { kind: "carModel" as const, carModelId: form.scopeId.trim() };

    const adjustment =
      form.adjustmentKind === "flat"
        ? { kind: "flat" as const, amount: Number(form.adjustmentValue || 0) }
        : { kind: "percent" as const, percent: Number(form.adjustmentValue || 0) };

    const locationIds = parseLocations(form.locationIdsText);

    return {
      name: form.name.trim() || "Schedule",
      enabled: form.enabled,
      priority: Number(form.priority || 0),
      scope,
      locationIds: locationIds.length > 0 ? locationIds : undefined,
      startAt,
      endAt,
      adjustment,
      createdAt: null
    };
  }

  function overlapWarning(draft: Omit<PricingSchedule, "id">) {
    const probe: PricingSchedule = { ...draft, id: "draft" };
    const overlapped = schedules.filter((s) => overlaps(s, probe));
    if (overlapped.length === 0) return null;
    return `Warning: overlaps with ${overlapped.length} existing schedule(s). Effective schedule will be chosen by priority, then newest.`;
  }

  async function onSave() {
    if (!db) return;

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
          created_at: serverTimestamp()
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
      scopeId:
        s.scope.kind === "carType"
          ? s.scope.carTypeId
          : s.scope.kind === "carModel"
            ? s.scope.carModelId
            : "",
      locationIdsText: (s.locationIds ?? []).join(", "),
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
          <p className="text-slate-600">Temporary or permanent adjustments that override base pricing.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">🔄</button>
          <button onClick={resetForm} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black">
            New Schedule
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-black text-slate-900">{editingId ? "Edit Schedule" : "Create Schedule"}</h2>
          {warning && <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">{warning}</span>}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              placeholder="Peak Season, Promo, Event..."
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${saving ? "bg-slate-300 text-slate-600" : "bg-green-700 text-white hover:bg-green-800"}`}
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Enabled</label>
            <select
              value={form.enabled ? "yes" : "no"}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "yes" }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
            >
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value || 0) }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Scope</label>
            <select
              value={form.scopeKind}
              onChange={(e) => setForm((p) => ({ ...p, scopeKind: e.target.value as any, scopeId: "" }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
            >
              <option value="all">All cars</option>
              <option value="carType">Specific car type</option>
              <option value="carModel">Specific car model</option>
            </select>
          </div>

          {(form.scopeKind === "carType" || form.scopeKind === "carModel") && (
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {form.scopeKind === "carType" ? "Car type ID (pricing_sheets doc id)" : "Car model ID"}
              </label>
              <input
                value={form.scopeId}
                onChange={(e) => setForm((p) => ({ ...p, scopeId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs"
                placeholder={form.scopeKind === "carType" ? "e.g. mini_van" : "e.g. mazda_da17_24"}
              />
            </div>
          )}

          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-700 mb-2">Location IDs (optional, comma-separated)</label>
            <input
              value={form.locationIdsText}
              onChange={(e) => setForm((p) => ({ ...p, locationIdsText: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs"
              placeholder="gensan, davao_del_sur, r11, default"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Start date (optional)</label>
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">End date (optional)</label>
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Adjustment</label>
            <div className="flex gap-2">
              <select
                value={form.adjustmentKind}
                onChange={(e) => setForm((p) => ({ ...p, adjustmentKind: e.target.value as any }))}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
              >
                <option value="percent">Percent</option>
                <option value="flat">Flat (PHP)</option>
              </select>
              <input
                value={form.adjustmentValue}
                onChange={(e) => setForm((p) => ({ ...p, adjustmentValue: e.target.value }))}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold"
                placeholder={form.adjustmentKind === "percent" ? "10" : "500"}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Applied to the <span className="font-bold">total base price</span> (before driver fee), non-stacking.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Schedule</th>
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Scope</th>
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Window</th>
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Adjustment</th>
                <th className="p-6 text-right text-sm font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {s.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span className="text-[10px] font-black text-slate-400">P{String(s.priority)}</span>
                    </div>
                    <p className="font-black text-slate-900 mt-2">{s.name}</p>
                    {s.locationIds && s.locationIds.length > 0 && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1">loc: {s.locationIds.join(", ")}</p>
                    )}
                  </td>
                  <td className="p-6 text-sm font-bold text-slate-800">
                    {s.scope.kind === "all" && "All cars"}
                    {s.scope.kind === "carType" && `Car type: ${s.scope.carTypeId}`}
                    {s.scope.kind === "carModel" && `Car model: ${s.scope.carModelId}`}
                  </td>
                  <td className="p-6 text-xs font-bold text-slate-700">
                    <div className="space-y-1">
                      <div>Start: {s.startAt ? toIsoDateInput(s.startAt) : "—"}</div>
                      <div>End: {s.endAt ? toIsoDateInput(s.endAt) : "—"}</div>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-black text-slate-900">
                    {s.adjustment.kind === "flat" ? `₱${s.adjustment.amount.toLocaleString()}` : `${s.adjustment.percent}%`}
                  </td>
                  <td className="p-6 text-right space-x-2">
                    <button onClick={() => onEdit(s)} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black">
                      Edit
                    </button>
                    <button onClick={() => onDelete(s.id)} className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="p-10 text-center text-slate-500 font-semibold" colSpan={5}>
                    No schedules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

