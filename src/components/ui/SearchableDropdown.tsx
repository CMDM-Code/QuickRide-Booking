'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  depth?: number;
  disabled?: boolean;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multiSelect = false,
  disabled = false,
  className = '',
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) return null;
    if (multiSelect) return `${selectedValues.length} selected`;
    const opt = options.find((o) => o.value === selectedValues[0]);
    return opt?.label || selectedValues[0];
  }, [selectedValues, options, multiSelect]);

  function handleSelect(optValue: string) {
    if (multiSelect) {
      const arr = Array.isArray(value) ? value : [];
      const updated = arr.includes(optValue)
        ? arr.filter((v) => v !== optValue)
        : [...arr, optValue];
      onChange(updated);
    } else {
      onChange(optValue);
      setIsOpen(false);
      setSearch('');
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(multiSelect ? [] : '');
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border bg-white text-sm font-bold transition-all outline-none ${
          isOpen
            ? 'border-green-500 ring-2 ring-green-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={displayLabel ? 'text-slate-900' : 'text-slate-400 font-normal'}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 rounded-md"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500/20 outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No results found</p>
            )}
            {filtered.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-green-50 text-green-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  style={opt.depth ? { paddingLeft: `${12 + opt.depth * 16}px` } : undefined}
                >
                  {multiSelect && (
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-green-600 border-green-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  {opt.depth !== undefined && opt.depth > 0 && (
                    <span className="text-slate-300 text-xs">{'—'.repeat(opt.depth)}</span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Selected badges for multi-select */}
          {multiSelect && selectedValues.length > 0 && (
            <div className="p-2 border-t border-slate-100 flex flex-wrap gap-1">
              {selectedValues.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-md"
                  >
                    {opt?.label || v}
                    <button type="button" onClick={() => handleSelect(v)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
