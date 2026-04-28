'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandingConfig } from '@/lib/types';
import { fetchBrandingConfig, DEFAULT_BRANDING_CONFIG } from '@/lib/branding-service';

interface BrandingContextType {
  branding: BrandingConfig;
  refreshBranding: () => Promise<void>;
  loading: boolean;
  isDarkMode: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

function applyThemeToCSS(config: BrandingConfig, isDark: boolean) {
  if (typeof document === 'undefined') return;

  // Deep merge with defaults to handle missing theme structure
  const mergedConfig: BrandingConfig = {
    ...DEFAULT_BRANDING_CONFIG,
    ...config,
    light_theme: { ...DEFAULT_BRANDING_CONFIG.light_theme, ...(config.light_theme || {}) },
    dark_theme: { ...DEFAULT_BRANDING_CONFIG.dark_theme, ...(config.dark_theme || {}) },
    scope: { ...DEFAULT_BRANDING_CONFIG.scope, ...(config.scope || {}) }
  };

  // Select theme based on dark mode
  const theme = isDark ? mergedConfig.dark_theme : mergedConfig.light_theme;

  const root = document.documentElement;

  // Core brand colors
  root.style.setProperty('--brand-primary', theme.primary);
  root.style.setProperty('--brand-secondary', theme.secondary);
  root.style.setProperty('--brand-accent', theme.accent);
  root.style.setProperty('--brand-bg', theme.background);
  root.style.setProperty('--brand-text', theme.text);
  root.style.setProperty('--brand-success', theme.success);
  root.style.setProperty('--brand-warning', theme.warning);
  root.style.setProperty('--brand-error', theme.error);

  // Semantic colors (mapped to brand colors)
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-success', theme.success);
  root.style.setProperty('--color-warning', theme.warning);
  root.style.setProperty('--color-error', theme.error);

  // Connect to design tokens - map branding colors to the design system
  // Primary color and its shades
  root.style.setProperty('--color-primary-500', theme.primary);
  root.style.setProperty('--color-primary-600', theme.primary);
  root.style.setProperty('--color-primary-700', theme.primary);

  // Accent color
  root.style.setProperty('--color-accent-500', theme.accent);
  root.style.setProperty('--color-accent-600', theme.accent);

  // Background colors
  root.style.setProperty('--bg-primary', theme.background);
  root.style.setProperty('--bg-secondary', isDark ? '#1e293b' : '#ffffff');
  root.style.setProperty('--bg-tertiary', isDark ? '#334155' : '#f1f5f9');

  // Text colors
  root.style.setProperty('--text-primary', theme.text);
  root.style.setProperty('--text-secondary', isDark ? '#94a3b8' : '#475569');
  root.style.setProperty('--text-tertiary', isDark ? '#64748b' : '#94a3b8');

  // Header background
  root.style.setProperty('--header-bg', isDark ? '#1e293b' : '#ffffff');

  // Border colors
  root.style.setProperty('--border-subtle', isDark ? '#334155' : '#e2e8f0');
  root.style.setProperty('--border-default', isDark ? '#475569' : '#cbd5e1');

  // Legacy compatibility
  root.style.setProperty('--primary-brand', theme.primary);
  root.style.setProperty('--secondary-brand', theme.secondary);
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);

  // Set dark mode class
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const refreshBranding = async () => {
    const fetchedConfig = await fetchBrandingConfig();
    // Merge with defaults to ensure all fields exist
    const config = { ...DEFAULT_BRANDING_CONFIG, ...fetchedConfig };
    setBranding(config);
    setLoading(false);
    
    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    // Apply theme colors to CSS variables
    applyThemeToCSS(config, prefersDark);
  };

  useEffect(() => {
    refreshBranding();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      // Use merged config to ensure all fields exist
      const mergedConfig = { ...DEFAULT_BRANDING_CONFIG, ...branding };
      applyThemeToCSS(mergedConfig, e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Re-apply theme when branding changes
  useEffect(() => {
    if (!loading) {
      // Merge with defaults to ensure all fields exist
      const mergedConfig = { ...DEFAULT_BRANDING_CONFIG, ...branding };
      applyThemeToCSS(mergedConfig, isDarkMode);
    }
  }, [branding, isDarkMode, loading]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding, loading, isDarkMode }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
