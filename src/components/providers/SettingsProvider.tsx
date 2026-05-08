'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { FullSystemConfig, getDefaultFullConfig, fetchFullConfig } from '@/lib/settings-service';

interface SettingsContextValue {
  settings: FullSystemConfig;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: getDefaultFullConfig(),
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FullSystemConfig>(getDefaultFullConfig());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const cfg = await fetchFullConfig();
      setSettings(cfg);
      setError(null);
    } catch (err: any) {
      console.warn('[SettingsProvider] Failed to fetch settings:', err);
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refresh every 60 seconds to pick up admin changes
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}
