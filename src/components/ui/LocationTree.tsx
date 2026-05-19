'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, MapPin, Plus, Edit3, GitBranch, Eye } from 'lucide-react';

export interface TreeNode {
  id: string;
  name: string;
  levelId?: string;
  levelName?: string;
  parentId?: string;
  childCount: number;
}

interface LocationTreeProps {
  nodes: TreeNode[];
  byId: Record<string, TreeNode>;
  children: Record<string, string[]>;
  roots: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery?: string;
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onChangeParent: (id: string) => void;
  /** When true, hides the inline action buttons (Parent / Child / Edit). Used in read-only pickers like Rate Management. */
  readOnly?: boolean;
}

export function LocationTree({
  nodes,
  byId,
  children,
  roots,
  selectedId,
  onSelect,
  searchQuery = '',
  onAddChild,
  onEdit,
  onChangeParent,
  readOnly = false,
}: LocationTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(roots));

  // When searching, auto-expand all nodes that have matching descendants
  const matchingIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const matches = new Set<string>();
    for (const n of nodes) {
      if (
        n.name.toLowerCase().includes(q) ||
        (n.levelName || '').toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q)
      ) {
        matches.add(n.id);
      }
    }
    return matches;
  }, [nodes, searchQuery]);

  // Ancestors of matching nodes should be expanded
  const expandedForSearch = useMemo(() => {
    if (!matchingIds) return null;
    const toExpand = new Set<string>();
    for (const id of matchingIds) {
      let current = byId[id]?.parentId;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        seen.add(current);
        toExpand.add(current);
        current = byId[current]?.parentId;
      }
    }
    return toExpand;
  }, [matchingIds, byId]);

  const isExpanded = useCallback(
    (id: string) => {
      if (expandedForSearch) return expandedForSearch.has(id) || (matchingIds?.has(id) ?? false);
      return expanded.has(id);
    },
    [expanded, expandedForSearch, matchingIds]
  );

  const isVisible = useCallback(
    (id: string) => {
      if (!matchingIds) return true;
      if (matchingIds.has(id)) return true;
      if (expandedForSearch?.has(id)) return true;
      // Check if any descendant matches
      const stack = [...(children[id] || [])];
      const seen = new Set<string>();
      while (stack.length) {
        const cid = stack.pop()!;
        if (seen.has(cid)) continue;
        seen.add(cid);
        if (matchingIds.has(cid)) return true;
        for (const gc of children[cid] || []) stack.push(gc);
      }
      return false;
    },
    [matchingIds, expandedForSearch, children]
  );

  function toggleExpand(id: string) {
    if (expandedForSearch) return; // Don't toggle during search
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(id: string, depth: number): React.ReactNode {
    const node = byId[id];
    if (!node) return null;
    if (!isVisible(id)) return null;

    const hasChildren = (children[id] || []).length > 0;
    const nodeExpanded = isExpanded(id);
    const isSelected = selectedId === id;
    const isDefault = id.toLowerCase() === 'default';
    const isMatch = matchingIds?.has(id);

    return (
      <div key={id}>
        {/* Node row */}
        <div
          className={`group flex items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 border ${
            isSelected ? '' : 'border-transparent'
          }`}
          style={
            isSelected
              ? { backgroundColor: "var(--success-bg)", borderColor: "var(--success)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", paddingLeft: `${12 + depth * 20}px` }
              : { backgroundColor: "transparent", paddingLeft: `${12 + depth * 20}px` }
          }
          onClick={() => onSelect(isSelected ? null : id)}
        >
          {/* Expand/collapse chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(id);
            }}
            className={`w-5 h-5 flex items-center justify-center rounded-md transition-colors ${
              hasChildren ? '' : 'text-transparent'
            }`}
            style={hasChildren ? { color: "var(--text-secondary)" } : {}}
          >
            {hasChildren &&
              (nodeExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              ))}
          </button>

          {/* Icon */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}
            style={
              isDefault
                ? { backgroundColor: "var(--warning-bg)", color: "var(--warning)" }
                : depth === 0
                ? { backgroundColor: "var(--success-bg)", color: "var(--success)" }
                : depth === 1
                ? { backgroundColor: "var(--info-bg)", color: "var(--info)" }
                : { backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }
            }
          >
            <MapPin className="w-3.5 h-3.5" />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold text-sm truncate`}
                style={{
                  color: isMatch ? "var(--success)" : "var(--text-primary)",
                  textDecoration: isMatch ? "underline" : "none",
                  textDecorationColor: isMatch ? "var(--success-bg)" : "inherit"
                }}
              >
                {node.name}
              </span>
              {isDefault && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }}>
                  fallback
                </span>
              )}
              {node.levelName && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                  {node.levelName}
                </span>
              )}
              {!node.levelName && !isDefault && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }}>
                  unregistered
                </span>
              )}
            </div>
            {hasChildren && (
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {(children[id] || []).length} child{(children[id] || []).length !== 1 ? 'ren' : ''}
              </span>
            )}
          </div>

          {/* Inline ID */}
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded hidden group-hover:inline-flex shrink-0"
            style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
            {id}
          </span>
        </div>

        {/* Action buttons when selected — hidden in readOnly mode */}
        {isSelected && !readOnly && (
          <div
            className="flex items-center gap-2 py-2 animate-in fade-in slide-in-from-top-1 duration-200"
            style={{ paddingLeft: `${44 + depth * 20}px` }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeParent(id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: "var(--text-primary)" }}
              title="Change or create parent"
            >
              <GitBranch className="w-3 h-3" />
              Parent
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: "var(--color-primary)" }}
              title="Add child location"
            >
              <Plus className="w-3 h-3" />
              Child
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleExpand(id);
                }
              }}
              disabled={!hasChildren}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--info-bg)", color: "var(--info)", borderColor: "var(--info)" }}
              title="View children"
            >
              <Eye className="w-3 h-3" />
              Children
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", borderColor: "var(--border-default)" }}
              title="Edit location"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          </div>
        )}

        {/* Children */}
        {hasChildren && nodeExpanded && (
          <div className="relative">
            {/* Connector line */}
            <div
              className="absolute top-0 bottom-0 border-l-2"
              style={{ borderColor: "var(--border-subtle)", left: `${22 + depth * 20}px` }}
            />
            {(children[id] || []).map((childId) => renderNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {roots.map((rootId) => renderNode(rootId, 0))}
      {roots.length === 0 && (
        <div className="text-center py-12 font-medium" style={{ color: "var(--text-muted)" }}>
          No locations found. Create a root location to get started.
        </div>
      )}
    </div>
  );
}
