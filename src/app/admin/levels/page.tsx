'use client';

import { useEffect, useState } from "react";
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
import { LocationLevel } from "@/lib/types";

export default function LevelManagementPage() {
  const [levels, setLevels] = useState<LocationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [search, setSearch] = useState("");

  const [locations, setLocations] = useState<any[]>([]);

  async function refresh() {
    setLoading(true);
    if (!db) {
      setLevels([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    try {
      const [levelsSnap, locsSnap] = await Promise.all([
        getDocs(query(collection(db, "levels"), orderBy("order", "asc"))),
        getDocs(collection(db, "locations"))
      ]);
      const levelsData = levelsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LocationLevel));
      const locsData = locsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLevels(levelsData);
      setLocations(locsData);
    } catch (e) {
      console.error(e);
      setLevels([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startCreate() {
    setEditingId(null);
    setFormName("");
    setFormOrder(levels.length);
  }

  function startEdit(id: string) {
    const level = levels.find((l) => l.id === id);
    if (!level) return;
    setEditingId(id);
    setFormName(level.name);
    setFormOrder(level.order);
  }

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormOrder(levels.length);
  }

  async function save() {
    if (!db) return;
    const name = formName.trim();
    if (!name) {
      alert("Level name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "levels", editingId), {
          name,
          order: formOrder,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "levels"), {
          name,
          order: formOrder,
          created_at: serverTimestamp()
        });
      }
      await refresh();
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save level.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLevel(id: string) {
    const usageCount = locations.filter(l => l.levelId === id).length;
    let confirmMsg = "Delete this level?";
    if (usageCount > 0) {
      confirmMsg = `This level is currently used by ${usageCount} location(s). Deleting it will leave them unassigned. Proceed?`;
    }

    if (!confirm(confirmMsg)) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "levels", id));
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete level.");
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const newLevels = [...levels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    setLevels(newLevels);
    for (let i = 0; i < newLevels.length; i++) {
      if (db) {
        await updateDoc(doc(db, "levels", newLevels[i].id), { order: i });
      }
    }
    await refresh();
  }

  async function moveDown(index: number) {
    if (index === levels.length - 1) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    setLevels(newLevels);
    for (let i = 0; i < newLevels.length; i++) {
      if (db) {
        await updateDoc(doc(db, "levels", newLevels[i].id), { order: i });
      }
    }
    await refresh();
  }

  const filteredLevels = search.trim()
    ? levels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : levels;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Level Management</h1>
          <p className="text-slate-600 mt-1">Manage location hierarchy levels (Region, City, Branch, etc.)</p>
        </div>
        <button
          onClick={startCreate}
          className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold shadow-lg transition-all"
        >
          + New Level
        </button>
      </div>

      {/* Create/Edit Form */}
      {(editingId !== null || formName !== "" || editingId === null && document.activeElement) && (
        <div className="card border-2 border-green-200 bg-green-50/30">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {editingId ? "Edit Level" : "Create New Level"}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Level Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Region, City, Branch, Zone"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Display Order</label>
              <input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update Level" : "Create Level"}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search levels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </div>

      {/* Levels Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading levels...</p>
        </div>
      ) : filteredLevels.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">No levels found. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Order</th>
                <th className="text-left px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Level Name</th>
                <th className="text-left px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Locations Using</th>
                <th className="text-right px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLevels.map((level, index) => {
                const usageCount = locations.filter(l => l.levelId === level.id).length;
                return (
                  <tr key={level.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">{level.order}</span>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === levels.length - 1}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{level.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${usageCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        {usageCount} location(s)
                      </span>
                    </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(level.id)}
                        className="px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-lg transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteLevel(level.id)}
                        className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-900 mb-2">💡 About Levels</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Deleting a level does <strong>not</strong> delete associated locations.</li>
          <li>• Locations without a level can remain indefinitely and can be assigned later.</li>
          <li>• Use drag handles or arrow buttons to reorder levels.</li>
          <li>• Levels are used to categorize locations in the hierarchy tree.</li>
        </ul>
      </div>
    </div>
  );
}