'use client';

import { useState, useEffect } from "react";
import { useBranding } from "@/components/providers/BrandingProvider";
import { updateBrandingConfig, uploadLogo } from "@/lib/branding-service";
import { BrandingConfig } from "@/lib/types";
import { ColorWheel } from "@/components/ui/ColorWheel";
import { 
  Palette, 
  Upload, 
  Save, 
  RefreshCcw, 
  Type, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function BrandingSettingsPage() {
  const { branding, refreshBranding } = useBranding();
  const [config, setConfig] = useState<BrandingConfig>(branding);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (branding) setConfig(branding);
  }, [branding]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateBrandingConfig(config);
      await refreshBranding();
      setMessage({ type: 'success', text: 'Branding updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update branding.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);
    try {
      const url = await uploadLogo(file);
      setConfig(prev => ({ ...prev, logo_url: url }));
      setMessage({ type: 'success', text: 'Logo uploaded! Don\'t forget to save changes.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload logo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const updateColor = (key: 'primary' | 'secondary', value: string) => {
    setConfig(prev => ({
      ...prev,
      theme_colors: {
        ...prev.theme_colors,
        [key]: value
      }
    }));
  };

  if (!mounted || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Branding Customization</h1>
          <p className="text-slate-500 font-medium mt-1">Personalize the system identity and visual theme.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Visual Identity */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8 h-full">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Type className="w-6 h-6 text-blue-600" />
              Visual Identity
            </h2>

            <div className="space-y-6">
              <label className="block">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">System Name</span>
                <input
                  type="text"
                  value={config.system_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, system_name: e.target.value }))}
                  className="mt-2 w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="e.g. QuickRide Booking"
                />
              </label>

              <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">System Logo</span>
                <div className="mt-4 flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group shrink-0">
                    <img 
                      src={config.logo_url} 
                      alt="Preview" 
                      className="w-full h-full object-contain p-2"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <RefreshCcw className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-6 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all h-24">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Upload Logo</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme & Colors */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8 h-full">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Palette className="w-6 h-6 text-purple-600" />
              Theme & Colors
            </h2>

            <div className="space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Primary Brand Color</span>
                <div className="flex items-start gap-8">
                  <div className="w-32 h-32 shrink-0">
                    <ColorWheel 
                      value={config.theme_colors.primary} 
                      onChange={(c) => updateColor('primary', c)} 
                      size={128}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="w-full h-12 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: config.theme_colors.primary }}></div>
                     <input
                        type="text"
                        value={config.theme_colors.primary.toUpperCase()}
                        onChange={(e) => updateColor('primary', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-bold text-slate-600 outline-none"
                      />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Secondary Brand Color</span>
                <div className="flex items-start gap-8">
                  <div className="w-32 h-32 shrink-0">
                    <ColorWheel 
                      value={config.theme_colors.secondary} 
                      onChange={(c) => updateColor('secondary', c)} 
                      size={128}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="w-full h-12 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: config.theme_colors.secondary }}></div>
                     <input
                        type="text"
                        value={config.theme_colors.secondary.toUpperCase()}
                        onChange={(e) => updateColor('secondary', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-bold text-slate-600 outline-none"
                      />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">UI Preview</span>
              <div className="mt-4 flex gap-3">
                <button 
                  className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] text-white shadow-lg transition-all"
                  style={{ backgroundColor: config.theme_colors.primary }}
                >
                  Primary Action
                </button>
                <button 
                  className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] text-white shadow-lg transition-all"
                  style={{ backgroundColor: config.theme_colors.secondary }}
                >
                  Secondary Action
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
