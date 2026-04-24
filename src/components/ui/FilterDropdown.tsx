'use client';

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

export interface ActiveFilters {
  [key: string]: string | string[];
}

interface FilterDropdownProps {
  filters: FilterConfig[];
  onApply: (filters: ActiveFilters) => void;
  children: (activeFilters: ActiveFilters) => ReactNode;
}

export function FilterDropdown({ filters, onApply, children }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<ActiveFilters>({});
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleFilter(key: string, value: string) {
    const filter = filters.find((f) => f.key === key);
    if (!filter) return;

    setTempFilters((prev) => {
      if (filter.multiSelect) {
        const current = (prev[key] as string[]) || [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [key]: updated };
      } else {
        const current = prev[key];
        if (current === value) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: value };
      }
    });
  }

  function handleApply() {
    setActiveFilters(tempFilters);
    onApply(tempFilters);
    setIsOpen(false);
  }

  function handleClear() {
    setTempFilters({});
    setActiveFilters({});
    onApply({});
    setIsOpen(false);
  }

  function removeFilter(key: string, value?: string) {
    const filter = filters.find((f) => f.key === key);
    if (!filter) return;

    if (filter.multiSelect && value) {
      const current = (activeFilters[key] as string[]) || [];
      const updated = current.filter((v) => v !== value);
      const newFilters = { ...activeFilters, [key]: updated };
      if (updated.length === 0) delete newFilters[key];
      setActiveFilters(newFilters);
      setTempFilters(newFilters);
      onApply(newFilters);
    } else {
      const { [key]: _, ...rest } = activeFilters;
      setActiveFilters(rest);
      setTempFilters(rest);
      onApply(rest);
    }
  }

  const activeFilterCount = Object.values(activeFilters).reduce((count, val) => {
    if (Array.isArray(val)) return count + val.length;
    return count + (val ? 1 : 0);
  }, 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-3">
        {/* Active filter badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(activeFilters).map(([key, value]) => {
              const filter = filters.find((f) => f.key === key);
              if (!filter) return null;

              if (Array.isArray(value)) {
                return value.map((v) => {
                  const opt = filter.options.find((o) => o.value === v);
                  return (
                    <span
                      key={`${key}-${v}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-lg"
                    >
                      {filter.label}: {opt?.label || v}
                      <button
                        onClick={() => removeFilter(key, v)}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                });
              } else {
                const opt = filter.options.find((o) => o.value === value);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-lg"
                  >
                    {filter.label}: {opt?.label || value}
                    <button
                      onClick={() => removeFilter(key)}
                      className="hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              }
            })}
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            isOpen
              ? "bg-green-700 text-white"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-white text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900">Filter Options</h3>
            <p className="text-xs text-slate-500">Select filters and click Apply to narrow results</p>
          </div>

          <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {filter.label}
                  {filter.multiSelect && (
                    <span className="text-xs text-slate-400 font-normal ml-1">(multi-select)</span>
                  )}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${filter.label.toLowerCase()}...`}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    onChange={(e) => {
                      // Could implement live filtering here
                    }}
                  />
                </div>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {filter.options.map((option) => {
                    const isSelected = filter.multiSelect
                      ? ((tempFilters[filter.key] as string[]) || []).includes(option.value)
                      : tempFilters[filter.key] === option.value;

                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-green-50 text-green-800"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {filter.multiSelect ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter(filter.key, option.value)}
                            className="accent-green-700"
                          />
                        ) : (
                          <input
                            type="radio"
                            name={filter.key}
                            checked={isSelected}
                            onChange={() => toggleFilter(filter.key, option.value)}
                            className="accent-green-700"
                          />
                        )}
                        <span className="text-sm">{option.label}</span>
                      </label>
                    );
                  })}
                  {filter.options.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">No options available</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-xl transition-all"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">{children(activeFilters)}</div>
    </div>
  );
}

export function useFilters(initialFilters: ActiveFilters = {}) {
  const [filters, setFilters] = useState<ActiveFilters>(initialFilters);

  function applyFilters(newFilters: ActiveFilters) {
    setFilters(newFilters);
  }

  function clearFilters() {
    setFilters({});
  }

  return { filters, applyFilters, clearFilters };
}