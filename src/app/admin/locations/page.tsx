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
import { X, Save, Trash2 } from "lucide-react";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const levelOptions = useMemo(() => levels.map((l) => ({ value: l.id, label: l.name })), [levels]);

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

  const filteredRoots = useMemo(() => {
    const levelFilter = activeFilters.level as string;
    if (!levelFilter) return tree.roots;

    const matchingIds = new Set<string>();
    for (const loc of locations) {
      if (levelFilter === '__unregistered__') {
        if (!loc.levelId && loc.id.toLowerCase() !== 'default') matchingIds.add(loc.id);
      } else {
        if (loc.levelId === levelFilter) matchingIds.add(loc.id);
      }
    }

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

  const parentOptions: DropdownOption[] = useMemo(() => {
    const ordered: DropdownOption[] = [{ value: '', label: '(no parent — root level)' }];
    function walk(id: string, depth: number, seen: Set<string>) {
      if (seen.has(id)) return;
      seen.add(id);
      const loc = tree.byId[id];
      if (!loc) return;
      const disabled = editingId === id || (editingId ? isDescendant(tree, editingId, id) : false);
      ordered.push({ value: id, label: loc.name, depth, disabled });
      for (const c of tree.children[id] || []) walk(c, depth + 1, seen);
    }
    const seen = new Set<string>();
    for (const r of tree.roots) walk(r, 0, seen);
    for (const l of locations) if (!seen.has(l.id)) walk(l.id, 0, seen);
    return ordered;
  }, [tree, locations, editingId]);

  const levelDropdownOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: '(no level)' },
    ...levels.map((l) => ({ value: l.id, label: l.name })),
  ], [levels]);

  function startCreate(parentId?: string) {
    setEditingId(null);
    setForm({ name: "", levelId: "", parentId: parentId || "" });
    setDrawerOpen(true);
  }

  function startEdit(id: string) {
    const l = tree.byId[id];
    if (!l) return;
    setEditingId(id);
    setForm({ name: l.name || "", levelId: l.levelId || "", parentId: l.parentId || "" });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setEditingId(null);
    setForm({ name: "", levelId: "", parentId: "" });
    setDrawerOpen(false);
  }

  async function save() {
    if (!db) return;
    const name = norm(form.name);
    const levelId = norm(form.levelId);
    const parentId = norm(form.parentId);

    if (!name) { alert("Name is required."); return; }

    const isDefault = (editingId || "").toLowerCase() === "default";
    if (isDefault && (levelId || parentId)) {
      alert("Default location cannot have a parent/level changed.");
      return;
    }

    if (editingId) {
      if (parentId && parentId === editingId) { alert("Parent cannot be the same as the node."); return; }
      if (parentId && isDescendant(tree, editingId, parentId)) { alert("Invalid parent: would create a cycle."); return; }
    }

    setSaving(true);
    try {
      const docData: any = {
        name,
        levelId: levelId || null,
        parentId: parentId || null,
      };
      const levelObj = levelId ? levelsById[levelId] : null;
      docData.type = levelObj ? levelObj.name : null;

      if (editingId) {
        await updateDoc(doc(db, "locations", editingId), { ...docData, updated_at: serverTimestamp() });
      } else {
        await addDoc(collection(db, "locations"), { ...docData, created_at: serverTimestamp() });
      }
      await refresh();
      closeDrawer();
    } catch (e: any) {
      console.error(e);
      alert("Failed to save location: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!db) return;
    if (id.toLowerCase() === "default") { alert("Default location cannot be deleted."); return; }
    const childCount = (tree.children[id] || []).length;
    if (childCount > 0) { alert("Cannot delete a location that still has children."); return; }
    if (!confirm("Delete this location?")) return;
    try {
      await deleteDoc(doc(db, "locations", id));
      await refresh();
      if (selectedId === id) setSelectedId(null);
      closeDrawer();
    } catch (e: any) {
      console.error(e);
      alert("Failed to delete: " + (e?.message ?? "unknown error"));
    }
  }

  async function handleChangeParent() {
    if (!db || !changingParentId) return;
    const parentId = norm(newParentId);

    if (parentId && parentId === changingParentId) { alert("Parent cannot be the same as the node."); return; }
    if (parentId && isDescendant(tree, changingParentId, parentId)) { alert("Invalid parent: would create a circular reference."); return; }

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
    <div className="flex flex-col gap-6" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Location Management</h1>
          <p className="text-slate-600">Infinite nesting with parent chain fallback.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">🔄</button>
          <button
            onClick={() => startCreate()}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
          >
            + Create Root
          </button>
        </div>
      </div>

      {/* Full-width Hierarchy Tree */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-3xl-plus border border-slate-200 shadow-sm">
        {/* Header — overflow-visible so FilterDropdown popup is not clipped */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Hierarchy</h2>
            <FilterDropdown
              filters={filterConfigs}
              onApply={(filters) => setActiveFilters(filters)}
            />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
          />
        </div>

        {/* Independently scrollable tree */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
          <LocationTree
            nodes={treeNodes}
            byId={treeById}
            children={tree.children}
            roots={filteredRoots}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (!id && drawerOpen) closeDrawer();
            }}
            searchQuery={search}
            onAddChild={(parentId) => {
              setSelectedId(null);
              startCreate(parentId);
            }}
            onEdit={(id) => {
              setSelectedId(id);
              startEdit(id);
            }}
            onChangeParent={(id) => {
              setChangingParentId(id);
              setNewParentId(tree.byId[id]?.parentId || "");
            }}
          />
        </div>
      </div>

      {/* ── Location Form Drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900">
              <div>
                <h2 className="text-xl font-black text-white">
                  {editingId ? "Edit Location" : "New Location"}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                  {editingId ? `ID: ${editingId}` : "Adding to collection"}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                {/* General Information */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    General Information
                  </label>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Display Name</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-base transition-all"
                        placeholder="e.g. Davao City"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Classification Level</label>
                      <SearchableDropdown
                        options={levelDropdownOptions}
                        value={form.levelId}
                        onChange={(v) => setForm((p) => ({ ...p, levelId: v as string }))}
                        placeholder="Select level..."
                        disabled={(editingId || "").toLowerCase() === "default"}
                      />
                    </div>
                  </div>
                </div>

                {/* Hierarchy Placement */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Hierarchy Placement
                  </label>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 border-dashed space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Parent Location</label>
                      <SearchableDropdown
                        options={parentOptions}
                        value={form.parentId}
                        onChange={(v) => setForm((p) => ({ ...p, parentId: v as string }))}
                        placeholder="(no parent — root)"
                        disabled={(editingId || "").toLowerCase() === "default"}
                      />
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-2xl border" style={{ backgroundColor: "var(--info-bg)", borderColor: "var(--info)" }}>
                      <span className="text-lg">💡</span>
                      <p className="text-xs font-bold leading-relaxed" style={{ color: "var(--info)" }}>
                        This location will inherit pricing rules from its parent if specific rates are not defined.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                {editingId && editingId.toLowerCase() !== "default" && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Danger Zone</p>
                    <button
                      onClick={() => remove(editingId)}
                      className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Permanently
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={closeDrawer}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className={`px-8 py-3 rounded-2xl font-black transition-all shadow-xl active:scale-95 flex items-center gap-2 ${
                  saving ? "bg-slate-300 text-slate-500" : "bg-green-700 hover:bg-green-800 text-white shadow-green-700/20"
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : editingId ? "Update Location" : "Create Location"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Change Parent Modal ── */}
      {changingParentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Reparent Node</h2>
              <p className="text-sm font-bold text-slate-500 mt-2">
                Moving <span className="text-green-700">{tree.byId[changingParentId]?.name}</span>
              </p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Target Parent</label>
                <SearchableDropdown
                  options={parentOptions.filter((o) => o.value !== changingParentId)}
                  value={newParentId}
                  onChange={(v) => setNewParentId(v as string)}
                  placeholder="Select new parent..."
                />
              </div>
              <div className="p-4 rounded-2xl border flex gap-3" style={{ backgroundColor: "var(--warning-bg)", borderColor: "var(--warning)" }}>
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] font-bold leading-normal" style={{ color: "var(--warning)" }}>
                  All sub-locations under this node will also be moved. This may affect inherited pricing for the entire branch.
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-subtle)" }}>
              <button
                onClick={() => { setChangingParentId(null); setNewParentId(""); }}
                className="flex-1 px-4 py-4 font-bold rounded-2xl transition-all"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeParent}
                disabled={saving}
                className="flex-[2] px-4 py-4 font-bold rounded-2xl transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--text-inverse)" }}
              >
                {saving ? "Moving..." : "Apply Move"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
