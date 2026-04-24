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
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { withTimeout } from "@/lib/api-utils";
import { FilterDropdown, FilterConfig, ActiveFilters } from "@/components/ui/FilterDropdown";
import { LocationTree, TreeNode } from "@/components/ui/LocationTree";
import { SearchableDropdown, DropdownOption } from "@/components/ui/SearchableDropdown";
import { LocationLevel } from "@/lib/types";

type Loc = {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
  levelId?: string;
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

  const sortIds = (ids: string[]) => ids.sort((a, b) => (byId[a]?.name || a).localeCompare(byId[b]?.name || b));
  sortIds(roots);
  for (const k of Object.keys(children)) sortIds(children[k]);

  return { byId, children, roots };
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

function countChildren(tree: { children: Record<string, string[]> }, id: string): number {
  return (tree.children[id] || []).length;
}

export default function LocationManagementPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [levels, setLevels] = useState<LocationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", levelId: "", parentId: "" });

  // Change parent modal
  const [changingParentId, setChangingParentId] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState("");

  async function refresh() {
    setLoading(true);
    if (!db) {
      setLocations([]);
      setLevels([]);
      setLoading(false);
      return;
    }
    try {
      const [locSnap, levSnap] = await Promise.all([
        withTimeout(getDocs(collection(db, "locations")), 8000),
        getDocs(query(collection(db, "levels"), orderBy("order", "asc")))
      ]);
      const locData = locSnap.docs.map((d: any) => ({
        id: d.id,
        name: d.data().name,
        type: d.data().type,
        parentId: d.data().parentId,
        levelId: d.data().levelId || null,
      })) as Loc[];
      const levData = levSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LocationLevel));
      setLocations(locData);
      setLevels(levData);
    } catch (e) {
      console.error(e);
      setLocations([]);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const tree = useMemo(() => buildTree(locations), [locations]);
  const levelsById = useMemo(() => Object.fromEntries(levels.map((l) => [l.id, l])), [levels]);

  // Build tree nodes with level names
  const treeNodes: TreeNode[] = useMemo(
    () =>
      locations.map((l) => ({
        id: l.id,
        name: l.name,
        levelId: l.levelId || undefined,
        levelName: l.levelId ? levelsById[l.levelId]?.name : l.type || undefined,
        parentId: l.parentId,
        childCount: countChildren(tree, l.id),
      })),
    [locations, levelsById, tree]
  );
  const treeById = useMemo(() => Object.fromEntries(treeNodes.map((n) => [n.id, n])), [treeNodes]);

  // Filter configs
  const levelOptions = useMemo(() => {
    return levels.map((l) => ({ value: l.id, label: l.name }));
  }, [levels]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'level',
      label: 'Level',
      options: [
        ...levelOptions,
        { value: '__unregistered__', label: 'Unregistered (no level)' },
      ],
    },
  ];

  // Filter tree roots based on active filters
  const filteredRoots = useMemo(() => {
    const levelFilter = activeFilters.level as string;
    if (!levelFilter) return tree.roots;

    // Show only nodes matching the filter (plus their ancestors for context)
    const matchingIds = new Set<string>();
    for (const loc of locations) {
      if (levelFilter === '__unregistered__') {
        if (!loc.levelId && loc.id.toLowerCase() !== 'default') matchingIds.add(loc.id);
      } else {
        if (loc.levelId === levelFilter) matchingIds.add(loc.id);
      }
    }

    // Also include ancestors of matching nodes
    for (const id of matchingIds) {
      let current = tree.byId[id]?.parentId;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        seen.add(current);
        matchingIds.add(current);
        current = tree.byId[current]?.parentId;
      }
    }

    return tree.roots.filter((r) => matchingIds.has(r));
  }, [tree, activeFilters, locations]);

  // Parent dropdown options (for the tree)
  const parentOptions: DropdownOption[] = useMemo(() => {
    const ordered: DropdownOption[] = [{ value: '', label: '(no parent — root level)' }];
    function walk(id: string, depth: number, seen: Set<string>) {
      if (seen.has(id)) return;
      seen.add(id);
      const loc = tree.byId[id];
      if (!loc) return;
      const disabled = editingId === id || (editingId ? isDescendant(tree, editingId, id) : false);
      ordered.push({
        value: id,
        label: loc.name,
        depth,
        disabled,
      });
      for (const c of tree.children[id] || []) walk(c, depth + 1, seen);
    }
    const seen = new Set<string>();
    for (const r of tree.roots) walk(r, 0, seen);
    for (const l of locations) if (!seen.has(l.id)) walk(l.id, 0, seen);
    return ordered;
  }, [tree, locations, editingId]);

  // Level dropdown options
  const levelDropdownOptions: DropdownOption[] = useMemo(() => {
    return [
      { value: '', label: '(no level)' },
      ...levels.map((l) => ({ value: l.id, label: l.name })),
    ];
  }, [levels]);

  function startCreate(parentId?: string) {
    setEditingId(null);
    setForm({ name: "", levelId: "", parentId: parentId || "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(id: string) {
    const l = tree.byId[id];
    if (!l) return;
    setEditingId(id);
    setForm({ name: l.name || "", levelId: l.levelId || "", parentId: l.parentId || "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", levelId: "", parentId: "" });
    setShowForm(false);
  }

  async function save() {
    if (!db) return;
    const name = norm(form.name);
    const levelId = norm(form.levelId);
    const parentId = norm(form.parentId);

    if (!name) {
      alert("Name is required.");
      return;
    }

    const isDefault = (editingId || "").toLowerCase() === "default";
    if (isDefault && (levelId || parentId)) {
      alert("Default location cannot have a parent/level changed.");
      return;
    }

    if (editingId) {
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
      const docData: any = {
        name,
        levelId: levelId || null,
        parentId: parentId || null,
      };

      // Also keep type field synced for backward compat
      const levelObj = levelId ? levelsById[levelId] : null;
      docData.type = levelObj ? levelObj.name : null;

      if (editingId) {
        await updateDoc(doc(db, "locations", editingId), {
          ...docData,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "locations"), {
          ...docData,
          created_at: serverTimestamp(),
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
      if (selectedId === id) setSelectedId(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to delete: " + (e?.message ?? "unknown error"));
    }
  }

  // Change parent handler
  async function handleChangeParent() {
    if (!db || !changingParentId) return;
    const parentId = norm(newParentId);

    if (parentId && parentId === changingParentId) {
      alert("Parent cannot be the same as the node.");
      return;
    }
    if (parentId && isDescendant(tree, changingParentId, parentId)) {
      alert("Invalid parent: would create a circular reference.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "locations", changingParentId), {
        parentId: parentId || null,
        updated_at: serverTimestamp(),
      });
      await refresh();
      setChangingParentId(null);
      setNewParentId("");
    } catch (e: any) {
      console.error(e);
      alert("Failed to change parent: " + (e?.message ?? "unknown error"));
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
            {() => (
              <button onClick={() => startCreate()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black">
                Add Root Location
              </button>
            )}
          </FilterDropdown>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-black text-slate-900">{editingId ? "Edit Location" : "Create Location"}</h2>
            <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">
              Cancel
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold"
                placeholder="e.g. Davao Region, South Cotabato"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Level</label>
              <SearchableDropdown
                options={levelDropdownOptions}
                value={form.levelId}
                onChange={(v) => setForm((p) => ({ ...p, levelId: v as string }))}
                placeholder="Select a level..."
                disabled={(editingId || "").toLowerCase() === "default"}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Parent</label>
              <SearchableDropdown
                options={parentOptions}
                value={form.parentId}
                onChange={(v) => setForm((p) => ({ ...p, parentId: v as string }))}
                placeholder="(no parent)"
                disabled={(editingId || "").toLowerCase() === "default"}
              />
              <p className="text-[10px] text-slate-500 mt-2 font-semibold">Parent chain defines fallback priority.</p>
            </div>

            <div className="md:col-span-3 flex items-center justify-between pt-2">
              {editingId && (
                <button
                  onClick={() => remove(editingId)}
                  disabled={(editingId || "").toLowerCase() === "default"}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                >
                  Delete Location
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={save}
                disabled={saving}
                className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                  saving ? "bg-slate-300 text-slate-600" : "bg-green-700 hover:bg-green-800 text-white"
                }`}
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Parent Modal */}
      {changingParentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Change Parent</h2>
              <p className="text-sm text-slate-500 mt-1">
                Moving <strong>{tree.byId[changingParentId]?.name}</strong> — all children will automatically follow.
              </p>
            </div>
            <div className="p-6">
              <SearchableDropdown
                options={parentOptions.filter((o) => o.value !== changingParentId)}
                value={newParentId}
                onChange={(v) => setNewParentId(v as string)}
                placeholder="Select new parent..."
              />
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={handleChangeParent}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl transition-all"
              >
                {saving ? "Moving..." : "Apply"}
              </button>
              <button
                onClick={() => {
                  setChangingParentId(null);
                  setNewParentId("");
                }}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, level, id..."
          className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none w-[360px]"
        />
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold text-slate-600">
            {locations.length} locations • {levels.length} levels
          </div>
        </div>
      </div>

      {/* Location Tree */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4">
        <LocationTree
          nodes={treeNodes}
          byId={treeById}
          children={tree.children}
          roots={filteredRoots}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchQuery={search}
          onAddChild={(parentId) => startCreate(parentId)}
          onEdit={(id) => startEdit(id)}
          onChangeParent={(id) => {
            setChangingParentId(id);
            setNewParentId(tree.byId[id]?.parentId || "");
          }}
        />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-900 mb-2">💡 Location Tree</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click a location to select it and see action buttons.</li>
          <li>• Use <strong>Parent</strong> to change hierarchy — children auto-follow.</li>
          <li>• Use <strong>Child</strong> to create nested locations.</li>
          <li>• Locations without a level show as <span className="bg-orange-50 text-orange-500 px-1 rounded text-xs font-bold">unregistered</span>.</li>
          <li>• Pricing uses parent chain fallback (most specific → root → default).</li>
        </ul>
      </div>
    </div>
  );
}
