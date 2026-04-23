'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandingConfig } from '@/lib/types';
import { fetchBrandingConfig, DEFAULT_BRANDING_CONFIG } from '@/lib/branding-service';

interface BrandingContextType {
  branding: BrandingConfig;
  refreshBranding: () => Promise<void>;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING_CONFIG);
  const [loading, setLoading] = useState(true);

  const refreshBranding = async () => {
    const config = await fetchBrandingConfig();
    setBranding(config);
    setLoading(false);
    
    // Apply theme colors to CSS variables
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-brand', config.theme_colors.primary);
      document.documentElement.style.setProperty('--secondary-brand', config.theme_colors.secondary);
    }
  };

  useEffect(() => {
    refreshBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding, loading }}>
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
