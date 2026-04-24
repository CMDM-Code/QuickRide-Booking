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
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";

type Loc = {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
};

function norm(s: any) {
  return String(s ?? "").trim();
}

function buildTree(locations: Loc[]) {
  const byId: Record<string, Loc> = Object.fromEntries(locations.map((l) => [l.id, l]));
  const children: Record<string, string[]> = {};
  const roots: string[] = [];

  for (const l of locations) {
    const p = l.parentId;
    if (!p || !byId[p]) roots.push(l.id);
    else (children[p] ||= []).push(l.id);
  }

  // stable ordering
  const sortIds = (ids: string[]) => ids.sort((a, b) => (byId[a]?.name || a).localeCompare(byId[b]?.name || b));
  sortIds(roots);
  for (const k of Object.keys(children)) sortIds(children[k]);

  const ordered: { id: string; depth: number }[] = [];
  const walk = (id: string, depth: number, seen: Set<string>) => {
    if (seen.has(id)) return;
    seen.add(id);
    ordered.push({ id, depth });
    for (const c of children[id] || []) walk(c, depth + 1, seen);
  };

  const seen = new Set<string>();
  for (const r of roots) walk(r, 0, seen);
  // include any disconnected nodes
  for (const l of locations) if (!seen.has(l.id)) walk(l.id, 0, seen);

  return { byId, children, ordered };
}

function isDescendant(tree: { children: Record<string, string[]> }, ancestorId: string, maybeDescendantId: string) {
  const stack = [...(tree.children[ancestorId] || [])];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === maybeDescendantId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of tree.children[id] || []) stack.push(c);
  }
  return false;
}

export default function LocationManagementPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", parentId: "" });

  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");

  async function refresh() {
    setLoading(true);
    if (!db) {
      setLocations([]);
      setLoading(false);
      return;
    }
    try {
      const snap = await withTimeout(getDocs(collection(db, "locations")), 8000);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).map((x) => ({
        id: x.id,
        name: x.name,
        type: x.type,
        parentId: x.parentId
      })) as Loc[];
      setLocations(data);
    } catch (e) {
      console.error(e);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const tree = useMemo(() => buildTree(locations), [locations]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of locations) if (l.type) set.add(l.type);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Location Type',
      options: typeOptions.map(t => ({ value: t, label: t }))
    }
  ];

  const filteredOrdered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilter = activeFilters.type as string;
    return tree.ordered.filter(({ id }) => {
      const l = tree.byId[id];
      if (!l) return false;

      const matchesSearch = !q || (
        String(l.name || "").toLowerCase().includes(q) ||
        String(l.type || "").toLowerCase().includes(q) ||
        String(l.id || "").toLowerCase().includes(q)
      );

      const matchesType = !typeFilter || String(l.type || "") === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [search, tree, activeFilters]);

  function startCreate(parentId?: string) {
    setEditingId(null);
    setForm({ name: "", type: "", parentId: parentId || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(id: string) {
    const l = tree.byId[id];
    if (!l) return;
    setEditingId(id);
    setForm({ name: l.name || "", type: l.type || "", parentId: l.parentId || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", type: "", parentId: "" });
  }

  async function save() {
    if (!db) return;
    const name = norm(form.name);
    const type = norm(form.type);
    const parentId = norm(form.parentId);

    if (!name) {
      alert("Name is required.");
      return;
    }

    const isDefault = (editingId || "").toLowerCase() === "default";
    if (isDefault && (type || parentId)) {
      alert("Default location cannot have a parent/type changed.");
      return;
    }

    if (editingId) {
      // prevent cycles
      if (parentId && parentId === editingId) {
        alert("Parent cannot be the same as the node.");
        return;
      }
      if (parentId && isDescendant(tree, editingId, parentId)) {
        alert("Invalid parent: would create a cycle.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "locations", editingId), {
          name,
          type: type || null,
          parentId: parentId || null,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "locations"), {
          name,
          type: type || null,
          parentId: parentId || null,
          created_at: serverTimestamp()
        });
      }
      await refresh();
      resetForm();
    } catch (e: any) {
      console.error(e);
      alert("Failed to save location: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!db) return;
    if (id.toLowerCase() === "default") {
      alert("Default location cannot be deleted.");
      return;
    }
    const childCount = (tree.children[id] || []).length;
    if (childCount > 0) {
      alert("Cannot delete a location that still has children. Reassign or delete its children first.");
      return;
    }
    if (!confirm("Delete this location?")) return;
    try {
      await deleteDoc(doc(db, "locations", id));
      await refresh();
    } catch (e: any) {
      console.error(e);
      alert("Failed to delete: " + (e?.message ?? "unknown error"));
    }
  }

  async function bulkRenameType() {
    if (!db) return;
    const from = norm(renameFrom);
    const to = norm(renameTo);
    if (!from || !to) {
      alert("Both 'from' and 'to' type names are required.");
      return;
    }
    const affected = locations.filter((l) => (l.type || "") === from);
    if (affected.length === 0) {
      alert("No locations match that type.");
      return;
    }
    if (!confirm(`Rename type "${from}" → "${to}" for ${affected.length} locations?`)) return;

    setSaving(true);
    try {
      await Promise.all(
        affected.map((l) =>
          updateDoc(doc(db, "locations", l.id), {
            type: to,
            updated_at: serverTimestamp()
          })
        )
      );
      setRenameFrom("");
      setRenameTo("");
      await refresh();
    } catch (e: any) {
      console.error(e);
      alert("Bulk rename failed: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium">Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Location Management</h1>
          <p className="text-slate-600">Infinite nesting using parent chain fallback (most specific → root → default).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">🔄</button>
          <FilterDropdown
            filters={filterConfigs}
            onApply={(filters) => setActiveFilters(filters)}
          >
            {(activeFilters) => (
              <button onClick={() => startCreate()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black">
                Add Root Location
              </button>
            )}
          </FilterDropdown>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-slate-900">{editingId ? "Edit Location" : "Create Location"}</h2>
          {editingId && (
            <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">
              Cancel
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold"
              placeholder="e.g. Davao Region, South Cotabato, General Santos City"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Type / Level</label>
            <input
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
              placeholder="Region / Province / City / ..."
              disabled={(editingId || "").toLowerCase() === "default"}
              list="loc-types"
            />
            <datalist id="loc-types">
              {typeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Parent (optional)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
              disabled={(editingId || "").toLowerCase() === "default"}
            >
              <option value="">(no parent)</option>
              {tree.ordered.map(({ id, depth }) => (
                <option key={id} value={id} disabled={editingId === id || (editingId ? isDescendant(tree, editingId, id) : false)}>
                  {"—".repeat(Math.min(depth, 6))} {tree.byId[id]?.name || id} [{id}]
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-2 font-semibold">Parent chain defines fallback priority (walk up until root).</p>
          </div>

          <div className="md:col-span-4 flex items-center justify-end gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                saving ? "bg-slate-300 text-slate-600" : "bg-green-700 hover:bg-green-800 text-white"
              }`}
            >
              {saving ? "Saving..." : (editingId ? "Save Changes" : "Create Location")}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
        <h2 className="text-lg font-black text-slate-900 mb-3">Rename a Level (Bulk)</h2>
        <p className="text-xs text-slate-600 mb-4">Example: rename “Province” to “State” across all locations. This does not change hierarchy — only the label stored in `type`.</p>
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">From</label>
            <input value={renameFrom} onChange={(e) => setRenameFrom(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" list="loc-types" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">To</label>
            <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
          </div>
          <div className="md:col-span-2">
            <button onClick={bulkRenameType} disabled={saving} className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black disabled:bg-slate-300 disabled:text-slate-600">
              Apply Rename
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, id..."
          className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none w-[360px]"
        />
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold text-slate-600">
            {filteredOrdered.length} shown / {locations.length} total
          </div>
          {activeFilters.type && (
            <button
              onClick={() => setActiveFilters({})}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Location</th>
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Type</th>
                <th className="p-6 text-left text-sm font-bold text-slate-500 uppercase">Parent</th>
                <th className="p-6 text-right text-sm font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrdered.map(({ id, depth }) => {
                const l = tree.byId[id];
                if (!l) return null;
                const parent = l.parentId ? tree.byId[l.parentId] : null;
                const isDefault = l.id.toLowerCase() === "default";
                return (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900" style={{ paddingLeft: `${Math.min(depth, 10) * 14}px` }}>
                          {l.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{l.id}</span>
                        {isDefault && <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">fallback</span>}
                      </div>
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-800">{l.type || "—"}</td>
                    <td className="p-6 text-sm font-bold text-slate-700">{parent ? `${parent.name} (${parent.id})` : "—"}</td>
                    <td className="p-6 text-right space-x-2">
                      <button onClick={() => startCreate(l.id)} className="px-3 py-2 bg-green-50 text-green-800 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100">
                        Add child
                      </button>
                      <button onClick={() => startEdit(l.id)} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black">
                        Edit
                      </button>
                      <button onClick={() => remove(l.id)} disabled={isDefault} className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrdered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 font-semibold">
                    No locations match your search.
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

