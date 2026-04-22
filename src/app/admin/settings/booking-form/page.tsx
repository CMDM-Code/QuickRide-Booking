'use client';

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { BookingFormConfig, BookingFormCustomField, BookingFormFieldType } from "@/lib/types";
import { DEFAULT_BOOKING_FORM_CONFIG, normalizeBookingFormConfig } from "@/lib/booking-form-config";

function clampInt(v: any, min: number, max: number) {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function BookingFormSettingsPage() {
  const [config, setConfig] = useState<BookingFormConfig>(DEFAULT_BOOKING_FORM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newField, setNewField] = useState({
    key: "",
    label: "",
    type: "text" as BookingFormFieldType,
    required: false,
    placeholder: "",
    optionsText: ""
  });

  async function refresh() {
    setLoading(true);
    if (!db) {
      setConfig(DEFAULT_BOOKING_FORM_CONFIG);
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "system_config", "booking_form"));
      const raw = snap.exists() ? snap.data() : null;
      setConfig(normalizeBookingFormConfig(raw));
    } catch (e) {
      console.error(e);
      setConfig(DEFAULT_BOOKING_FORM_CONFIG);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const customFields = useMemo(() => config.custom_fields || [], [config.custom_fields]);

  function updateCustomField(key: string, patch: Partial<BookingFormCustomField>) {
    setConfig((prev) => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).map((f) => (f.key === key ? { ...f, ...patch } : f))
    }));
  }

  function removeCustomField(key: string) {
    setConfig((prev) => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).filter((f) => f.key !== key)
    }));
  }

  function moveField(key: string, dir: -1 | 1) {
    setConfig((prev) => {
      const arr = [...(prev.custom_fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = arr.findIndex((f) => f.key === key);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      const a = arr[idx];
      const b = arr[next];
      const ao = a.order ?? idx;
      const bo = b.order ?? next;
      a.order = bo;
      b.order = ao;
      return { ...prev, custom_fields: arr };
    });
  }

  function addCustomField() {
    const key = normalizeKey(newField.key);
    if (!key) return alert("Custom field key is required.");
    if (customFields.some((f) => f.key === key)) return alert("Custom field key already exists.");

    const options =
      newField.type === "select"
        ? newField.optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const nextOrder = (customFields.reduce((m, f) => Math.max(m, f.order ?? 0), 0) || 0) + 10;

    const f: BookingFormCustomField = {
      key,
      label: newField.label.trim() || key,
      type: newField.type,
      required: Boolean(newField.required),
      enabled: true,
      placeholder: newField.placeholder,
      options,
      order: nextOrder
    };

    setConfig((prev) => ({ ...prev, custom_fields: [...(prev.custom_fields || []), f] }));
    setNewField({ key: "", label: "", type: "text", required: false, placeholder: "", optionsText: "" });
  }

  async function save() {
    if (!db) return;
    setSaving(true);
    try {
      const payload = normalizeBookingFormConfig(config);
      await setDoc(
        doc(db, "system_config", "booking_form"),
        {
          ...payload,
          updated_at: serverTimestamp()
        },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert("Save failed: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Loading booking form settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Booking Form Settings</h1>
          <p className="text-slate-600 mt-1">Control fields, constraints, and custom fields (stored as map on bookings).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold">🔄</button>
          <button
            onClick={save}
            disabled={saving}
            className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              saved ? "bg-green-600 text-white" : "bg-green-700 hover:bg-green-800 text-white"
            } ${saving ? "opacity-60" : ""}`}
          >
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Core Fields</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Locations</p>
              <input
                type="checkbox"
                checked={config.fields.locations?.enabled ?? true}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    fields: { ...p.fields, locations: { ...(p.fields.locations || DEFAULT_BOOKING_FORM_CONFIG.fields.locations!), enabled: e.target.checked } }
                  }))
                }
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Max destinations</label>
                <input
                  type="number"
                  value={config.fields.locations?.maxDestinations ?? 3}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fields: { ...p.fields, locations: { ...(p.fields.locations || DEFAULT_BOOKING_FORM_CONFIG.fields.locations!), maxDestinations: clampInt(e.target.value, 1, 20) } }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Multi-destination</label>
                <select
                  value={String(config.fields.locations?.allowMultiDestination ?? true)}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fields: { ...p.fields, locations: { ...(p.fields.locations || DEFAULT_BOOKING_FORM_CONFIG.fields.locations!), allowMultiDestination: e.target.value === "true" } }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Specific address / notes</p>
              <input
                type="checkbox"
                checked={config.fields.specific_address?.enabled ?? true}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    fields: { ...p.fields, specific_address: { ...(p.fields.specific_address || DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!), enabled: e.target.checked } }
                  }))
                }
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Required</label>
                <select
                  value={String(config.fields.specific_address?.required ?? false)}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fields: { ...p.fields, specific_address: { ...(p.fields.specific_address || DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!), required: e.target.value === "true" } }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="false">Optional</option>
                  <option value="true">Required</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Label</label>
                <input
                  value={config.fields.specific_address?.label ?? DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!.label}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fields: { ...p.fields, specific_address: { ...(p.fields.specific_address || DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!), label: e.target.value } }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Placeholder</label>
                <input
                  value={config.fields.specific_address?.placeholder ?? ""}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fields: { ...p.fields, specific_address: { ...(p.fields.specific_address || DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!), placeholder: e.target.value } }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">With driver toggle</p>
              <input
                type="checkbox"
                checked={config.fields.with_driver?.enabled ?? true}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    fields: { ...p.fields, with_driver: { ...(p.fields.with_driver || DEFAULT_BOOKING_FORM_CONFIG.fields.with_driver!), enabled: e.target.checked } }
                  }))
                }
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Start/end date</p>
              <input
                type="checkbox"
                checked={config.fields.start_end?.enabled ?? true}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    fields: { ...p.fields, start_end: { ...(p.fields.start_end || DEFAULT_BOOKING_FORM_CONFIG.fields.start_end!), enabled: e.target.checked } }
                  }))
                }
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-600 mb-1">Minimum hours</label>
              <input
                type="number"
                value={config.fields.start_end?.minHours ?? 12}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    fields: { ...p.fields, start_end: { ...(p.fields.start_end || DEFAULT_BOOKING_FORM_CONFIG.fields.start_end!), minHours: clampInt(e.target.value, 1, 240) } }
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Custom Fields</h2>

        <div className="grid md:grid-cols-6 gap-3 items-end mb-6">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Key</label>
            <input value={newField.key} onChange={(e) => setNewField((p) => ({ ...p, key: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold font-mono text-xs" placeholder="e.g. flight_no" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Label</label>
            <input value={newField.label} onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" placeholder="Flight number" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
            <select value={newField.type} onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value as BookingFormFieldType }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white">
              {(["text", "number", "date", "select", "textarea"] as BookingFormFieldType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Required</label>
            <select value={String(newField.required)} onChange={(e) => setNewField((p) => ({ ...p, required: e.target.value === "true" }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button onClick={addCustomField} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-black">
              Add
            </button>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1">Placeholder</label>
            <input value={newField.placeholder} onChange={(e) => setNewField((p) => ({ ...p, placeholder: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1">Options (select only, comma-separated)</label>
            <input value={newField.optionsText} onChange={(e) => setNewField((p) => ({ ...p, optionsText: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" placeholder="Option A, Option B" />
          </div>
        </div>

        <div className="space-y-3">
          {customFields.map((f) => (
            <div key={f.key} className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{f.label}</p>
                  <p className="text-[10px] font-mono text-slate-500">{f.key} • {f.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveField(f.key, -1)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">↑</button>
                  <button onClick={() => moveField(f.key, 1)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">↓</button>
                  <button onClick={() => removeCustomField(f.key)} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-xs hover:bg-red-100">Remove</button>
                </div>
              </div>

              <div className="grid md:grid-cols-6 gap-3 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Label</label>
                  <input value={f.label} onChange={(e) => updateCustomField(f.key, { label: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Enabled</label>
                  <select value={String(f.enabled !== false)} onChange={(e) => updateCustomField(f.key, { enabled: e.target.value === "true" })} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Required</label>
                  <select value={String(Boolean(f.required))} onChange={(e) => updateCustomField(f.key, { required: e.target.value === "true" })} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Placeholder</label>
                  <input value={f.placeholder || ""} onChange={(e) => updateCustomField(f.key, { placeholder: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" />
                </div>
                {f.type === "select" && (
                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Options (comma-separated)</label>
                    <input
                      value={(f.options || []).join(", ")}
                      onChange={(e) => updateCustomField(f.key, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {customFields.length === 0 && (
            <div className="p-10 text-center text-slate-500 font-semibold border border-dashed border-slate-200 rounded-2xl">
              No custom fields yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

