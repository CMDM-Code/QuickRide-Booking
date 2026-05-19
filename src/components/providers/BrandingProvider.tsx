'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandingConfig, ThemeTokens } from '@/lib/types';
import { fetchBrandingConfig, DEFAULT_BRANDING_CONFIG } from '@/lib/branding-service';

interface BrandingContextType {
  branding: BrandingConfig;
  refreshBranding: () => Promise<void>;
  loading: boolean;
  isDarkMode: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// CSS VARIABLE MAP
// Maps every ThemeTokens key → one or more CSS custom property names.
// The first entry is the canonical var; subsequent entries are aliases kept
// for backward-compat with existing components that use legacy var names.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_TO_CSS_VARS: Record<keyof ThemeTokens, string[]> = {
  // Brand
  primary: [
    '--color-primary', '--color-primary-500', '--color-primary-600',
    '--brand-primary', '--primary-brand', '--theme-primary',
  ],
  primary_hover: [
    '--color-primary-700', '--color-primary-800',
  ],
  secondary: [
    '--color-secondary', '--brand-secondary', '--secondary-brand', '--theme-secondary',
  ],
  accent: [
    '--color-accent', '--color-accent-500', '--color-accent-600',
    '--brand-accent', '--theme-accent',
  ],

  // Backgrounds
  bg_base: ['--bg-primary', '--brand-bg', '--color-background'],
  bg_surface: ['--bg-secondary', '--bg-elevated'],
  bg_subtle: ['--bg-tertiary'],
  bg_inverse: ['--bg-inverse'],

  // Text
  text_primary: ['--text-primary', '--brand-text', '--color-text'],
  text_secondary: ['--text-secondary'],
  text_muted: ['--text-muted', '--text-tertiary'],
  text_inverse: ['--text-inverse'],
  text_link: ['--text-link'],

  // Borders
  border_subtle: ['--border-subtle'],
  border_default: ['--border-default'],
  border_strong: ['--border-strong', '--border-focus'],

  // Semantic
  success: ['--color-success', '--brand-success'],
  success_bg: ['--color-success-light'],
  warning: ['--color-warning', '--brand-warning'],
  warning_bg: ['--color-warning-light'],
  error: ['--color-error', '--brand-error'],
  error_bg: ['--color-error-light'],
  info: ['--color-info'],
  info_bg: ['--color-info-light'],

  // Layout chrome
  sidebar_bg: ['--sidebar-bg'],
  sidebar_text: ['--sidebar-text'],
  sidebar_text_active: ['--sidebar-text-active'],
  sidebar_item_active_bg: ['--sidebar-item-active'],
  header_bg: ['--header-bg'],
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE APPLY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a ThemeTokens object to :root CSS custom properties.
 * Safe to call at any time — will no-op during SSR.
 */
export function applyThemeToCSS(tokens: ThemeTokens, isDark: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Apply every token → its CSS variable(s)
  (Object.keys(TOKEN_TO_CSS_VARS) as (keyof ThemeTokens)[]).forEach((key) => {
    const value = tokens[key];
    if (!value) return;
    TOKEN_TO_CSS_VARS[key].forEach((cssVar) => {
      root.style.setProperty(cssVar, value);
    });
  });

  // Toggle dark-mode class
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Exported alias for the branding page to call on every draft change
 * (live preview without saving).
 */
export const applyDraftTheme = applyThemeToCSS;

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

function mergeWithDefaults(config: BrandingConfig): BrandingConfig {
  return {
    ...DEFAULT_BRANDING_CONFIG,
    ...config,
    light_theme: { ...DEFAULT_BRANDING_CONFIG.light_theme, ...(config.light_theme || {}) },
    dark_theme: { ...DEFAULT_BRANDING_CONFIG.dark_theme, ...(config.dark_theme || {}) },
    scope: { ...DEFAULT_BRANDING_CONFIG.scope, ...(config.scope || {}) },
  };
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const refreshBranding = async () => {
    const fetchedConfig = await fetchBrandingConfig();
    const config = mergeWithDefaults(fetchedConfig);
    setBranding(config);
    setLoading(false);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    applyThemeToCSS(prefersDark ? config.dark_theme : config.light_theme, prefersDark);
  };

  useEffect(() => {
    refreshBranding();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      setBranding((current) => {
        const merged = mergeWithDefaults(current);
        applyThemeToCSS(e.matches ? merged.dark_theme : merged.light_theme, e.matches);
        return merged;
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Re-apply whenever branding state changes (e.g. after a save/refresh)
  useEffect(() => {
    if (!loading) {
      const tokens = isDarkMode ? branding.dark_theme : branding.light_theme;
      applyThemeToCSS(tokens, isDarkMode);
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
