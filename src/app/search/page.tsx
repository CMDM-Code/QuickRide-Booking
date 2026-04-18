'use client';

import { useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cars' | 'bookings' | 'users'>('all');

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Search Results</h1>
          <input
            type="text"
            placeholder="Search vehicles, bookings, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-5 py-4 rounded-xl border border-slate-300 text-lg"
            autoFocus
          />
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {(['all', 'cars', 'bookings', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab
                  ? 'bg-green-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="card p-12 text-center">
          <p className="text-slate-500">Enter a search term to find results</p>
        </div>
      </div>
    </div>
  );
}
